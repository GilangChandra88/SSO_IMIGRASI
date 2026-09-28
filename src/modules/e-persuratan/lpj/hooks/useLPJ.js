/**
 * useLPJMyTasks — Hook untuk Dashboard: Tugas LPJ per User
 * =========================================================
 * Menggunakan collectionGroup query untuk ambil semua surat_items
 * yang di-assign ke user ini, lintas semua packs, yang belum selesai
 * dan sudah bisa dikerjakan (tidak blocked).
 */

import { useState, useEffect } from 'react';
import {
  collectionGroup,
  collection,
  doc,
  addDoc,
  setDoc,
  updateDoc,
  onSnapshot,
  query,
  where,
  orderBy,
  serverTimestamp,
  writeBatch,
  getDocs,
  runTransaction,
} from 'firebase/firestore';
import { db } from '@/config/firebase';
import { generateSuratItems, PERJADIN_PHASES } from '../data/packTemplates';

// ─── Hook: Tugas LPJ untuk Dashboard (per user) ───────────────────────────────

/**
 * Ambil semua surat_items yang ditugaskan ke user ini:
 * - is_blocked = false (sudah bisa dikerjakan)
 * - status != 'completed'
 * Menggunakan collectionGroup untuk query lintas semua packs.
 *
 * @param {string} userUid
 */
export function useMyLPJTasks(userUid) {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userUid) {
      setLoading(false);
      return;
    }

    // Query collectionGroup: surat_items lintas semua lpj_packs
    const q = query(
      collectionGroup(db, 'surat_items'),
      where('assigned_to', '==', userUid),
      where('is_blocked', '==', false),
    );

    const unsub = onSnapshot(
      q,
      (snap) => {
        const all = snap.docs.map((d) => ({
          id: d.id,
          packId: d.ref.parent.parent.id, // ambil packId dari path
          ...d.data(),
        }));
        // Filter client-side: hanya yang belum selesai
        setTasks(all.filter((t) => t.status !== 'completed' && t.status !== 'not_required'));
        setLoading(false);
      },
      (err) => {
        // Jika index belum ada → fallback ke empty (akan ada error di console)
        console.warn('useMyLPJTasks: index belum siap atau error:', err.message);
        setTasks([]);
        setLoading(false);
      },
    );

    return unsub;
  }, [userUid]);

  return { tasks, loading };
}

// ─── Hook: Daftar Semua Pack ──────────────────────────────────────────────────

/**
 * Subscribe ke semua lpj_packs.
 * Admin: lihat semua. User biasa: hanya pack yang dia terlibat.
 */
export function useLPJPacks({ isAdmin = false, userUid = '' } = {}) {
  const [packs, setPacks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!userUid) return;

    let q;
    if (isAdmin) {
      q = query(collection(db, 'lpj_packs'), orderBy('created_at', 'desc'));
    } else {
      q = query(
        collection(db, 'lpj_packs'),
        where('pegawai_uids', 'array-contains', userUid),
        orderBy('created_at', 'desc'),
      );
    }

    const unsub = onSnapshot(
      q,
      (snap) => {
        setPacks(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
        setLoading(false);
      },
      (err) => {
        console.error('useLPJPacks error:', err);
        setError('Gagal memuat data paket LPJ.');
        setLoading(false);
      },
    );

    return unsub;
  }, [isAdmin, userUid]);

  return { packs, loading, error };
}

// ─── Hook: Detail Pack + Surat Items ─────────────────────────────────────────

export function useLPJPackDetail(packId) {
  const [pack, setPack] = useState(null);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!packId) return;

    const packUnsub = onSnapshot(
      doc(db, 'lpj_packs', packId),
      (snap) => {
        if (snap.exists()) setPack({ id: snap.id, ...snap.data() });
        else setError('Paket tidak ditemukan.');
        setLoading(false);
      },
      (err) => {
        console.error(err);
        setError('Gagal memuat paket.');
        setLoading(false);
      },
    );

    const itemsUnsub = onSnapshot(
      query(collection(db, 'lpj_packs', packId, 'surat_items'), orderBy('urutan', 'asc')),
      (snap) => setItems(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
      (err) => console.error('items error:', err),
    );

    return () => {
      packUnsub();
      itemsUnsub();
    };
  }, [packId]);

  return { pack, items, loading, error };
}

// ─── Operasi: Buat Paket Baru ─────────────────────────────────────────────────

/**
 * Bisa dipanggil oleh siapa saja (admin atau member biasa).
 */
export async function createLPJPack(data) {
  const {
    type,
    judul,
    perihal,
    tujuan,
    tanggal_mulai,
    tanggal_selesai,
    mak,
    pegawai_list = [],
    created_by,
  } = data;

  const assignees = {
    admin: { uid: created_by.uid, nama: created_by.nama },
    bendahara: { uid: created_by.uid, nama: created_by.nama },
  };

  const suratItems = generateSuratItems(type, pegawai_list, assignees);

  // Kumpulkan semua UID yang terlibat (pembuat + pegawai)
  const pegawai_uids = [created_by.uid, ...pegawai_list.map((p) => p.uid).filter(Boolean)];
  // Hapus duplikat
  const uniqueUids = [...new Set(pegawai_uids)];

  const progress = {
    total: suratItems.length,
    completed: 0,
    in_progress: 0,
    not_started: suratItems.length,
    percentage: 0,
    stuck_items: [],
    age_days: 0,
  };

  // Generate Sequential ID
  const now = new Date();
  const year = now.getFullYear().toString();
  const month = (now.getMonth() + 1).toString().padStart(2, '0');

  const counterRef = doc(db, 'counters', `lpj_${year}`);
  let newPackId = '';

  await runTransaction(db, async (transaction) => {
    const counterDoc = await transaction.get(counterRef);
    let nextSeq = 1;
    if (counterDoc.exists()) {
      nextSeq = (counterDoc.data().count || 0) + 1;
      transaction.update(counterRef, { count: nextSeq });
    } else {
      transaction.set(counterRef, { count: 1 });
    }

    const seqString = nextSeq.toString().padStart(4, '0');
    newPackId = `LPJ-${year}-${month}-${seqString}`;
  });

  const packRef = doc(db, 'lpj_packs', newPackId);

  await setDoc(packRef, {
    id: newPackId,
    type,
    judul,
    perihal,
    tujuan: tujuan || '',
    tanggal_mulai,
    tanggal_selesai,
    mak: mak || '',
    status: 'in_progress',
    pegawai_list,
    pegawai_uids: uniqueUids,
    progress,
    created_by: created_by.uid,
    created_by_nama: created_by.nama,
    created_at: serverTimestamp(),
    updated_at: serverTimestamp(),
    completed_at: null,
    nomor_bundle: newPackId,
  });

  // Batch write semua surat_items
  const batch = writeBatch(db);
  suratItems.forEach((item) => {
    const itemRef = doc(collection(db, 'lpj_packs', newPackId, 'surat_items'), item.id);
    batch.set(itemRef, {
      ...item,
      created_at: serverTimestamp(),
      updated_at: serverTimestamp(),
    });
  });
  await batch.commit();

  return newPackId;
}

// ─── Operasi: Update Status Surat Item ───────────────────────────────────────

/**
 * Update status item. Progress recalc & dependency unlock ditangani
 * oleh Cloud Function (onSuratItemUpdated) secara otomatis.
 * Client hanya perlu update status item saja.
 */
export async function updateSuratItemStatus(packId, itemId, newStatus, updatedBy, extraData = {}) {
  const itemRef = doc(db, 'lpj_packs', packId, 'surat_items', itemId);
  const now = serverTimestamp();

  const updates = {
    status: newStatus,
    updated_at: now,
    ...extraData,
  };

  if (newStatus === 'in_progress' && !extraData.started_at) {
    updates.started_at = now;
    updates.started_by = updatedBy.uid;
    updates.started_by_nama = updatedBy.nama;
  }

  if (newStatus === 'completed') {
    updates.completed_at = now;
    updates.completed_by = updatedBy.uid;
    updates.completed_by_nama = updatedBy.nama;
  }

  await updateDoc(itemRef, updates);
  // Progress & unlock otomatis via Cloud Function
}

// ─── Operasi lain ─────────────────────────────────────────────────────────────

export async function reassignSuratItem(packId, itemId, pegawai) {
  await updateDoc(doc(db, 'lpj_packs', packId, 'surat_items', itemId), {
    assigned_to: pegawai.uid,
    assigned_name: pegawai.nama,
    updated_at: serverTimestamp(),
  });
}

export async function archiveLPJPack(packId) {
  await updateDoc(doc(db, 'lpj_packs', packId), {
    status: 'archived',
    updated_at: serverTimestamp(),
  });
}

// ─── Sync SPD Items (Dynamic generation based on SP) ───────────────────
export async function syncSPDItems(packId, spFormData) {
  const pegawaiListStrings = spFormData.pegawai_list;
  if (!pegawaiListStrings || !Array.isArray(pegawaiListStrings)) return;

  const pegawaiArr = pegawaiListStrings
    .map((str) => {
      const lines = str.split('\n');
      return {
        nama: lines[0],
        uid: '',
        nip: lines.find((l) => l.startsWith('NIP.'))?.replace('NIP. ', '') || '',
        fullString: str,
      };
    })
    .filter((p) => p.nama);

  const itemsRef = collection(db, 'lpj_packs', packId, 'surat_items');
  const spdQuery = query(itemsRef, where('kode', '==', 'SPD'));
  const spdSnap = await getDocs(spdQuery);
  const existingSPDs = spdSnap.docs.map((d) => ({ id: d.id, ...d.data() }));

  const batch = writeBatch(db);

  // Update existing SPDs with synced fields
  existingSPDs.forEach((spd) => {
    let changed = false;
    const newData = { ...(spd.data || {}) };

    // Sync nomor_sp -> nomor_spd
    if (spFormData.nomor_sp !== undefined && newData.nomor_spd !== spFormData.nomor_sp) {
      newData.nomor_spd = spFormData.nomor_sp;
      changed = true;
    }

    if (changed) {
      const itemRef = doc(itemsRef, spd.id);
      batch.update(itemRef, { data: newData });
    }
  });

  const existingNames = existingSPDs.map((s) => s.assigned_name || s.surat_nama.split(' — ')[1]);
  const newPegawai = pegawaiArr.filter((p) => !existingNames.includes(p.nama));

  let spdTemplate = null;
  PERJADIN_PHASES.forEach((phase) => {
    const found = phase.items.find((i) => i.kode === 'SPD');
    if (found) spdTemplate = { ...found, phase_id: phase.id, phase_label: phase.label };
  });

  if (spdTemplate) {
    newPegawai.forEach((p) => {
      const uniqueId = `${spdTemplate.template_id}-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      const itemRef = doc(itemsRef, uniqueId);
      batch.set(itemRef, {
        id: uniqueId,
        definition_id: spdTemplate.definition_id,
        kode: spdTemplate.kode,
        surat_nama: `${spdTemplate.surat_nama} — ${p.nama}`,
        icon: spdTemplate.icon || '',
        warna: spdTemplate.warna || '#1e293b',
        urutan: spdTemplate.urutan,
        phase_id: spdTemplate.phase_id,
        phase_label: spdTemplate.phase_label,
        depends_on: spdTemplate.depends_on || [],
        is_hub: false,
        status: 'not_started',
        is_blocked: true,
        assigned_to: p.uid || '',
        assigned_name: p.nama,
        data: {
          pegawai: p.fullString,
          nomor_spd: spFormData.nomor_sp || '',
        },
        nomor_surat: '',
        instance_id: '',
        created_at: serverTimestamp(),
        updated_at: serverTimestamp(),
      });
    });
  }

  // Handle deletions (pegawai removed from SP)
  const currentPegawaiNames = pegawaiArr.map((p) => p.nama);
  const deletedSPDs = existingSPDs.filter((spd) => {
    const spdName = spd.assigned_name || spd.surat_nama.split(' — ')[1];
    return !currentPegawaiNames.includes(spdName);
  });

  deletedSPDs.forEach((spd) => {
    batch.delete(doc(itemsRef, spd.id));
  });

  await batch.commit();
}

// ─── Sync isi SPD lain saat salah satu SPD diedit ───────────────────────────
export async function syncOtherSPDsData(packId, currentItemId, formData, isComplete = false) {
  const safeData = { ...formData };
  delete safeData.pegawai; // abaikan pegawai pelaksana
  delete safeData.nomor_spd; // biarkan jika tiap orang beda nomor

  const itemsRef = collection(db, 'lpj_packs', packId, 'surat_items');
  const spdQuery = query(itemsRef, where('kode', '==', 'SPD'));
  const spdSnap = await getDocs(spdQuery);

  const batch = writeBatch(db);
  let updatedCount = 0;

  spdSnap.docs.forEach((docSnap) => {
    if (docSnap.id === currentItemId) return;

    const existingData = docSnap.data().data || {};
    const newData = { ...existingData, ...safeData };

    batch.update(docSnap.ref, {
      data: newData,
      is_data_complete: isComplete,
      updated_at: serverTimestamp(),
    });
    updatedCount++;
  });

  if (updatedCount > 0) {
    await batch.commit();
  }
}

// ─── Migrasi: Beri ID ke LPJ lama ─────────────────────────────────────────────
export async function migrateMissingLPJIds() {
  const packsRef = collection(db, 'lpj_packs');
  const snap = await getDocs(packsRef);

  let migrated = 0;
  for (const docSnap of snap.docs) {
    const data = docSnap.data();
    if (!data.nomor_bundle || !data.nomor_bundle.startsWith('LPJ-')) {
      // Perlu digenerate
      const createdAt = data.created_at?.toDate ? data.created_at.toDate() : new Date();
      const year = createdAt.getFullYear().toString();
      const month = (createdAt.getMonth() + 1).toString().padStart(2, '0');

      const counterRef = doc(db, 'counters', `lpj_${year}`);
      let newPackId = '';

      await runTransaction(db, async (transaction) => {
        const counterDoc = await transaction.get(counterRef);
        let nextSeq = 1;
        if (counterDoc.exists()) {
          nextSeq = (counterDoc.data().count || 0) + 1;
          transaction.update(counterRef, { count: nextSeq });
        } else {
          transaction.set(counterRef, { count: 1 });
        }

        const seqString = nextSeq.toString().padStart(4, '0');
        newPackId = `LPJ-${year}-${month}-${seqString}`;
      });

      await updateDoc(doc(db, 'lpj_packs', docSnap.id), {
        nomor_bundle: newPackId,
      });
      migrated++;
    }
  }
  return migrated;
}

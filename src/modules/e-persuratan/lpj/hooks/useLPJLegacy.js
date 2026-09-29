/**
 * Fungsi LPJ format lama (surat_items per dokumen). Masih diimpor Dashboard dan
 * SuratForm (mode LPJ); dihapus setelah keduanya pindah ke model skema 2.
 */

import { useState, useEffect } from 'react';
import {
  collectionGroup,
  collection,
  doc,
  onSnapshot,
  query,
  where,
  serverTimestamp,
  writeBatch,
  getDocs,
} from 'firebase/firestore';
import { db } from '@/config/firebase';
import { PERJADIN_PHASES } from '../data/packTemplates';

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

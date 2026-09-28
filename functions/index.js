/**
 * Firebase Cloud Functions — Sistem Imigrasi LPJ
 * ================================================
 * 
 * Functions yang tersedia:
 * 
 * 1. onSuratItemUpdated
 *    Trigger: saat status surat_item berubah di Firestore
 *    Aksi:
 *    a) Recalculate progress pack (completed/total/percentage)
 *    b) Jika item completed → cek & unlock item berikutnya yang dependensinya terpenuhi
 *    c) Update status pack jadi 'completed' jika semua item selesai
 *
 * 2. onPackCreated (optional - untuk future notifications)
 *    Trigger: saat pack baru dibuat
 *    Aksi: kirim notifikasi ke pegawai yang terlibat
 */

const functions = require('firebase-functions/v1');
const { initializeApp } = require('firebase-admin/app');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');

initializeApp();
// Wajib: arahkan Admin SDK ke database 'imigrasi', bukan '(default)'
const db = getFirestore('imigrasi');

// ─── Function 1: onSuratItemUpdated (Gen 1) ──────────────────────────────────

exports.onSuratItemUpdated = functions
  .region('asia-southeast1')
  .firestore
  .database('imigrasi')
  .document('lpj_packs/{packId}/surat_items/{itemId}')
  .onUpdate(async (change, context) => {
    const before = change.before.data();
    const after  = change.after.data();

    // Hanya proses jika status berubah
    if (before.status === after.status && before.is_blocked === after.is_blocked) {
      return null;
    }

    const packId = context.params.packId;
    const packRef = db.collection('lpj_packs').doc(packId);

    try {
      // ── Step 1: Ambil semua surat_items pack ini ────────────────────────────
      const itemsSnap = await packRef.collection('surat_items').get();
      const allItems = itemsSnap.docs.map((d) => ({ id: d.id, ...d.data() }));

      // ── Step 2: Recalculate progress ────────────────────────────────────────
      const total      = allItems.length;
      const completed  = allItems.filter((i) => i.status === 'completed').length;
      const inProgress = allItems.filter((i) => i.status === 'in_progress').length;
      const notStarted = allItems.filter((i) => i.status === 'not_started').length;
      const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
      const isAllDone  = completed === total && total > 0;

      // Hitung waktu proses: berapa lama pack sudah berjalan
      const packSnap = await packRef.get();
      const packData = packSnap.data();
      const createdAt = packData?.created_at?.toDate?.() || new Date();
      const ageInDays = Math.floor((Date.now() - createdAt.getTime()) / (1000 * 60 * 60 * 24));

      // Cari bottleneck: item yang is_blocked=false tapi not_started paling lama
      const stuckItems = allItems
        .filter((i) => !i.is_blocked && i.status === 'not_started')
        .map((i) => i.id);

      await packRef.update({
        'progress.total':       total,
        'progress.completed':   completed,
        'progress.in_progress': inProgress,
        'progress.not_started': notStarted,
        'progress.percentage':  percentage,
        'progress.stuck_items': stuckItems, // items yang bisa dikerjakan tapi belum dimulai
        'progress.age_days':    ageInDays,
        status:      isAllDone ? 'completed' : 'in_progress',
        completed_at: isAllDone ? FieldValue.serverTimestamp() : null,
        updated_at:  FieldValue.serverTimestamp(),
      });

      // ── Step 3: Jika item baru selesai → unlock dependencies ────────────────
      if (after.status === 'completed' && before.status !== 'completed') {
        // Kumpulkan semua completed item IDs (termasuk yang baru saja selesai)
        const completedIds = new Set(
          allItems
            .filter((i) => i.status === 'completed')
            .map((i) => i.id)
        );

        const batch = db.batch();
        let hasUnlocks = false;

        allItems.forEach((item) => {
          // Skip item yang sudah completed atau tidak punya dependency
          if (item.status === 'completed') return;
          if (!item.depends_on || item.depends_on.length === 0) return;
          if (!item.is_blocked) return; // Sudah tidak blocked

          // Cek apakah semua dependency sudah selesai
          const allDepsMet = item.depends_on.every((dep) => {
            // Exact match
            if (completedIds.has(dep)) return true;

            // Prefix match: untuk SPD yang punya id seperti "surat-perjalanan-dinas-NIP123"
            const prefixItems = allItems.filter(
              (i) => i.id === dep || i.id.startsWith(dep + '-')
            );
            if (prefixItems.length === 0) return false;
            return prefixItems.every((i) => completedIds.has(i.id));
          });

          if (allDepsMet) {
            const itemRef = packRef.collection('surat_items').doc(item.id);
            batch.update(itemRef, {
              is_blocked:  false,
              updated_at: FieldValue.serverTimestamp(),
            });
            hasUnlocks = true;
          }
        });

        if (hasUnlocks) {
          await batch.commit();
          console.log(`[onSuratItemUpdated] Unlocked dependent items for pack ${packId}`);
        }
      }

      console.log(`[onSuratItemUpdated] Pack ${packId}: ${completed}/${total} (${percentage}%)`);
      return null;

    } catch (error) {
      console.error('[onSuratItemUpdated] Error:', error);
      throw error;
    }
  });

// ─── Function 2: onPackCreated (Gen 1) ────────────────────────────────────────

exports.onPackCreated = functions
  .region('asia-southeast1')
  .firestore
  .database('imigrasi')
  .document('lpj_packs/{packId}')
  .onCreate(async (snap, context) => {
    const pack = snap.data();
    const packId = context.params.packId;

    console.log(`[onPackCreated] New pack: ${packId} — "${pack.judul}" (${pack.type})`);
    return null;
  });

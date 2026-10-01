import React from 'react';
import { FaChevronRight, FaPen, FaPlus, FaTrashAlt } from 'react-icons/fa';
import { ADMIN, GOLD, STATUS } from '@/utils/uiTokens';
import { ROW } from './hierarkiKelas';
import { formatRupiah, indentKelas, tipeBerikut } from './hierarkiUtils';
import KonfirmasiHapus from './KonfirmasiHapus';

function PohonBaris({ node, depth, ctx }) {
  const { indeks, hierarchy, tipeAkhir, denganPagu, tertutup, onToggle, sorotId, pendingHapus } =
    ctx;
  const { aksi, sibuk } = ctx;
  const anak = indeks.anakDari(node.id);
  const punyaAnak = anak.length > 0;
  const tutup = tertutup.has(node.id);
  const tipeAnak = tipeBerikut(hierarchy, node.type);
  const isAkhir = node.type === tipeAkhir;
  const menungguHapus = pendingHapus === node.id;

  return (
    <>
      <div
        data-node-id={node.id}
        className={`${ROW.row} ${indentKelas(depth)} ${sorotId === node.id ? GOLD.tintBg : ''}`}
      >
        <button
          type="button"
          aria-label={tutup ? 'Buka cabang' : 'Tutup cabang'}
          className={`${ROW.toggle} ${punyaAnak ? 'cursor-pointer' : 'invisible'} ${punyaAnak && !tutup ? 'rotate-90' : ''}`}
          onClick={() => punyaAnak && onToggle(node.id)}
        >
          <FaChevronRight size={10} />
        </button>
        <span className={ROW.kode}>{node.kode || '-'}</span>
        <span className={isAkhir ? ROW.nameItem : ROW.name}>
          {node.name}
          {denganPagu && isAkhir && (
            <span className={`font-semibold text-[11.5px] ${STATUS.goodInk}`}>
              {' '}
              · Rp {formatRupiah(node.pagu)}
            </span>
          )}
        </span>
        <span className={ROW.type}>{node.type}</span>
        <span className={menungguHapus ? ROW.actionsShow : ROW.actions}>
          {menungguHapus ? (
            <KonfirmasiHapus
              onYa={() => aksi.hapus(node.id)}
              onBatal={aksi.batalHapus}
              busy={sibuk}
            />
          ) : (
            <>
              {tipeAnak && (
                <button
                  type="button"
                  className={ADMIN.rowBtn}
                  title={`Tambah ${tipeAnak}`}
                  aria-label={`Tambah ${tipeAnak}`}
                  onClick={() => aksi.tambah(node.id, tipeAnak)}
                >
                  <FaPlus size={11} />
                </button>
              )}
              <button
                type="button"
                className={ADMIN.rowBtn}
                title="Edit"
                aria-label="Edit"
                onClick={() => aksi.ubah(node.id)}
              >
                <FaPen size={11} />
              </button>
              <button
                type="button"
                className={ADMIN.rowBtn}
                title="Hapus"
                aria-label="Hapus"
                onClick={() => aksi.mintaHapus(node.id)}
              >
                <FaTrashAlt size={11} />
              </button>
            </>
          )}
        </span>
      </div>
      {punyaAnak &&
        !tutup &&
        anak.map((c) => <PohonBaris key={c.id} node={c} depth={depth + 1} ctx={ctx} />)}
    </>
  );
}

/** Tampilan Pohon (.mak-tree-wrap): baris berjenjang dengan aksi tambah/edit/hapus. */
export default function PohonView({ wadahRef, pesanKosong, ...ctx }) {
  const akar = ctx.indeks.anakDari(null);
  return (
    <div className={ROW.wrap} ref={wadahRef}>
      {akar.length === 0 ? (
        <p className={ADMIN.empty}>{pesanKosong}</p>
      ) : (
        <div className={ROW.inner}>
          {akar.map((n) => (
            <PohonBaris key={n.id} node={n} depth={0} ctx={ctx} />
          ))}
        </div>
      )}
    </div>
  );
}

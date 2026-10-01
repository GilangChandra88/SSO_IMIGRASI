import React from 'react';
import { FaFileAlt, FaFolder, FaPen, FaPlus, FaTrashAlt } from 'react-icons/fa';
import { ADMIN, FONT, STATUS, T } from '@/utils/uiTokens';
import { ROW } from './hierarkiKelas';
import { formatRupiah, tipeBerikut } from './hierarkiUtils';
import KonfirmasiHapus from './KonfirmasiHapus';

const KARTU = `relative flex flex-col gap-2 p-3.5 rounded-xl border text-left ${T.surface} ${T.border} hover:border-[#CBD3DE] dark:hover:border-[#304864] hover:shadow-[0_1px_2px_rgba(16,26,44,.07)]`;

/** Tampilan Explorer: jejak (breadcrumb) + kartu folder per tingkat, kartu "Tambah X". */
export default function ExplorerView(props) {
  const { indeks, hierarchy, tipeAkhir, denganPagu, jalur, setJalur, pendingHapus } = props;
  const { aksi, sibuk } = props;

  // Abaikan bagian jalur yang node-nya sudah terhapus
  const jalurSah = [];
  for (const id of jalur) {
    if (!indeks.byId.has(id)) break;
    jalurSah.push(id);
  }
  const parentId = jalurSah.length ? jalurSah[jalurSah.length - 1] : null;
  const anak = indeks.anakDari(parentId);
  const tipeTambah = tipeBerikut(hierarchy, parentId ? indeks.byId.get(parentId).type : null);

  const crumb = (current) =>
    `font-semibold px-2 py-1 rounded-[7px] whitespace-nowrap ${
      current ? `${T.ink} cursor-default` : `${T.ink2} ${T.hoverSurface2} cursor-pointer`
    }`;

  return (
    <div>
      <div className="flex flex-wrap items-center gap-1 mb-3.5 text-[13px]">
        <button type="button" className={crumb(jalurSah.length === 0)} onClick={() => setJalur([])}>
          {hierarchy[0]}
        </button>
        {jalurSah.map((id, idx) => {
          const n = indeks.byId.get(id);
          return (
            <React.Fragment key={id}>
              <span className={`text-[11px] ${T.inkMuted}`}>›</span>
              <button
                type="button"
                className={crumb(idx === jalurSah.length - 1)}
                onClick={() => setJalur(jalurSah.slice(0, idx + 1))}
              >
                {(n.kode ? `${n.kode} - ` : '') + n.name}
              </button>
            </React.Fragment>
          );
        })}
      </div>

      {anak.length === 0 && !tipeTambah ? (
        <p className={ADMIN.empty}>Tidak ada data di sini.</p>
      ) : (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(190px,1fr))] gap-3">
          {anak.map((n) => {
            const isAkhir = n.type === tipeAkhir;
            const menungguHapus = pendingHapus === n.id;
            const buka = () => setJalur([...jalurSah, n.id]);
            const isi = (
              <>
                <div
                  className={`w-[34px] h-[34px] rounded-[9px] grid place-items-center shrink-0 ${isAkhir ? `${STATUS.goodBg} ${STATUS.goodInk}` : `${STATUS.infoBg} ${STATUS.infoInk}`}`}
                >
                  {isAkhir ? <FaFileAlt size={13} /> : <FaFolder size={13} />}
                </div>
                <div className={`${FONT.mono} text-[11px] ${T.inkMuted}`}>{n.kode || '-'}</div>
                <div className={`text-[13px] font-semibold leading-[1.35] ${T.ink}`}>{n.name}</div>
                <div className={`mt-auto text-[11.5px] font-semibold ${T.ink2}`}>
                  {isAkhir
                    ? denganPagu
                      ? `Rp ${formatRupiah(n.pagu)}`
                      : n.type
                    : `${indeks.anakDari(n.id).length} data`}
                </div>
                <div
                  className={`absolute top-2 right-2 ${menungguHapus ? ROW.actionsShow : ROW.actions}`}
                  onClick={(e) => e.stopPropagation()}
                  onKeyDown={(e) => e.stopPropagation()}
                >
                  {menungguHapus ? (
                    <KonfirmasiHapus
                      onYa={() => aksi.hapus(n.id)}
                      onBatal={aksi.batalHapus}
                      busy={sibuk}
                    />
                  ) : (
                    <>
                      <button
                        type="button"
                        className={ADMIN.rowBtn}
                        title="Edit"
                        aria-label="Edit"
                        onClick={() => aksi.ubah(n.id)}
                      >
                        <FaPen size={11} />
                      </button>
                      <button
                        type="button"
                        className={ADMIN.rowBtn}
                        title="Hapus"
                        aria-label="Hapus"
                        onClick={() => aksi.mintaHapus(n.id)}
                      >
                        <FaTrashAlt size={11} />
                      </button>
                    </>
                  )}
                </div>
              </>
            );
            return isAkhir ? (
              <div key={n.id} className={`group ${KARTU}`}>
                {isi}
              </div>
            ) : (
              <div
                key={n.id}
                role="button"
                tabIndex={0}
                className={`group cursor-pointer ${KARTU}`}
                onClick={buka}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    buka();
                  }
                }}
              >
                {isi}
              </div>
            );
          })}
          {tipeTambah && (
            <button
              type="button"
              className={`flex flex-col items-center justify-center gap-1.5 min-h-[118px] rounded-xl border-[1.5px] border-dashed text-[12.5px] font-semibold cursor-pointer bg-transparent ${T.borderStrong} ${T.inkMuted} ${T.hoverSurface2} hover:text-[#55627A] dark:hover:text-[#A7B6CB]`}
              onClick={() => aksi.tambah(parentId, tipeTambah)}
            >
              <FaPlus size={15} />
              <span>Tambah {tipeTambah}</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}

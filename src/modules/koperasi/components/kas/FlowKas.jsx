import { FaArrowDown, FaArrowRight, FaArrowUp, FaExchangeAlt } from 'react-icons/fa';
import { K } from '../../ui/kelas';
import { rupiah, tanggalPendek } from '../../ui/format';
import { LABEL_JENIS } from '../../data/jenisJurnal';
import { useFlowKas } from '../../hooks/useFlowKas';

function Baris({ m }) {
  const pindah = m.dari && m.ke;
  const masuk = !m.dari;
  const Ikon = pindah ? FaExchangeAlt : masuk ? FaArrowDown : FaArrowUp;
  return (
    <li className={`${K.kartu} flex items-start gap-3`}>
      <span
        className={masuk && !pindah ? K.ikonMasuk : pindah ? K.ikonBulat : K.ikonKeluar}
        aria-hidden="true"
      >
        <Ikon size={13} />
      </span>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-3">
          <span className={K.judulBaris}>{LABEL_JENIS[m.jenis] ?? m.jenis}</span>
          <span className={K.nominal}>
            {pindah ? '' : masuk ? '+' : '−'}
            {rupiah(m.jumlah)}
          </span>
        </div>
        <p className={`${K.teks} flex flex-wrap items-center gap-1.5 mt-0.5`}>
          {pindah ? (
            <>
              {m.dari.nama} <FaArrowRight size={10} aria-label="ke" /> {m.ke.nama}
            </>
          ) : (
            (m.ke || m.dari).nama
          )}
        </p>
        {m.keterangan && <p className={`${K.redup} break-words`}>{m.keterangan}</p>}
        <p className={K.redup}>{tanggalPendek(m.tanggal)}</p>
      </div>
    </li>
  );
}

/** Riwayat setiap perputaran uang di rekening kas/bank, terbaru di atas. */
export default function FlowKas() {
  const { flow, memuat, memuatLagi, adaLagi, muatLagi } = useFlowKas();
  if (memuat) return <p className={K.kosong}>Memuat…</p>;
  if (!flow.length) return <p className={K.kosong}>Belum ada perputaran uang.</p>;
  return (
    <>
      <ul className="flex flex-col gap-2.5">
        {flow.map((m) => (
          <Baris key={m.id} m={m} />
        ))}
      </ul>
      {adaLagi && (
        <button
          type="button"
          className={`${K.tombolKedua} mt-3`}
          disabled={memuatLagi}
          onClick={muatLagi}
        >
          {memuatLagi ? 'Memuat…' : 'Muat lagi'}
        </button>
      )}
    </>
  );
}

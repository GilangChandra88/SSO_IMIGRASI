import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaBirthdayCake, FaCalendarAlt, FaGift, FaUserEdit } from 'react-icons/fa';
import { useAuth } from '@/context/AuthContext';
import { useUnitKerja } from '@/context/useUnitKerja';
import ToastViewport from '@/components/ToastViewport';
import { AngkaBerjalan } from '@/components/animasi';
import { ANIM, jedaKe } from '@/utils/animasi';
import { tanggalIso, tahunIni } from '@/utils/nilai';
import { pantauUcapanUntuk } from '@/utils/ulangTahun';
import { labelUnit, unitBagian } from '@/utils/unitKerja';
import { FONT } from '@/utils/uiTokens';
import { useDaftarPegawai } from '../hooks/useDaftarPegawai';
import { pantauStatusUltah } from '../services/ultahDb';
import { daftarUltah, formatBulan, formatTanggalPendek, labelHari } from '../utils/ultahTerdekat';
import AvatarPegawai from '../components/AvatarPegawai';
import ModalKejutanUltah from '../components/ModalKejutanUltah';
import { K } from '../ui/kelas';

const RENTANG = [
  [30, '30 hari'],
  [90, '3 bulan'],
  [366, 'Setahun'],
];

const keteranganPegawai = (p, unitById) =>
  [p.jabatanNama, labelUnit(unitBagian(unitById, p.unitId)) || p.seksi].filter(Boolean).join(' · ');

/** Kartu pegawai yang berulang tahun hari ini: status kejutan & ucapan tahun ini (langsung). */
function KartuHariIni({ pegawai, unitById, urutan, onKejutan }) {
  const [status, setStatus] = useState(undefined);
  const [ucapan, setUcapan] = useState(null);
  useEffect(() => pantauStatusUltah(pegawai.id, setStatus), [pegawai.id]);
  useEffect(() => pantauUcapanUntuk(pegawai.id, setUcapan), [pegawai.id]);

  const dilihat = status?.kejutanTahun === tahunIni();
  const belumDibalas = ucapan?.filter((u) => !u.terimaKasih).length ?? 0;
  return (
    <li
      className={`${K.permukaan2} rounded-[14px] p-4 flex flex-wrap items-center gap-3 ${ANIM.muncul} ${jedaKe(urutan)}`}
    >
      <AvatarPegawai pegawai={pegawai} ukuran="lg" />
      <div className="flex-1 min-w-[12rem]">
        <p className={`font-bold ${K.teks}`}>{pegawai.nama}</p>
        <p className={`text-[12.5px] ${K.teks2}`}>
          Genap {pegawai.ultah.usia} tahun
          {keteranganPegawai(pegawai, unitById) && ` · ${keteranganPegawai(pegawai, unitById)}`}
        </p>
        <div className="flex flex-wrap gap-1.5 mt-2">
          <span className={`${K.lencana} ${dilihat ? K.lencanaOk : K.lencanaNetral}`}>
            {status === undefined
              ? 'Memuat…'
              : dilihat
                ? 'Kejutan sudah dilihat'
                : 'Kejutan belum dilihat'}
          </span>
          <span className={`${K.lencana} ${belumDibalas ? K.lencanaWaspada : K.lencanaNetral}`}>
            {ucapan === null
              ? 'Memuat…'
              : `${ucapan.length} ucapan${belumDibalas ? `, ${belumDibalas} belum dibalas` : ''}`}
          </span>
        </div>
      </div>
      <button type="button" onClick={onKejutan} className={K.tombolKecil}>
        <FaGift className={K.aksen} /> Kejutan
      </button>
    </li>
  );
}

function Statistik({ label, nilai, waspada }) {
  return (
    <div className={`${K.permukaan2} rounded-[14px] px-4 py-3`}>
      <p className={`text-[10.5px] font-bold uppercase tracking-[.06em] ${K.teks2}`}>{label}</p>
      <AngkaBerjalan
        nilai={nilai}
        className={`${FONT.head} block text-[22px] font-extrabold mt-0.5 ${waspada && nilai ? K.teksWaspada : K.teks}`}
      />
    </div>
  );
}

/**
 * Ulang tahun pegawai: siapa yang berulang tahun hari ini (status kejutan & ucapan), ulang tahun
 * terdekat, dan pegawai yang tanggal lahirnya belum diisi. Pengaturan kejutan (status, uji
 * tampilan, reset) lewat ModalKejutanUltah. Kejutan muncul otomatis saat pegawai login di hari
 * ulang tahunnya; rekan kerja mengirim ucapan dari Portal.
 */
export default function UlangTahun() {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const { pegawai, memuat } = useDaftarPegawai();
  const unit = useUnitKerja();
  const [rentang, setRentang] = useState(30);
  const [kejutan, setKejutan] = useState(null); // pegawai yang dibuka di ModalKejutanUltah

  const hariIni = tanggalIso();
  const daftar = useMemo(() => daftarUltah(pegawai, hariIni), [pegawai, hariIni]);
  const hariIniSaja = daftar.filter((p) => p.ultah.hari === 0);
  const akanDatang = daftar.filter((p) => p.ultah.hari > 0 && p.ultah.hari <= rentang);
  const tanpaTanggal = pegawai.filter((p) => p.aktif !== false && !p.tanggalLahir);
  const perBulan = useMemo(() => {
    const grup = new Map();
    akanDatang.forEach((p) => {
      const bulan = formatBulan(p.ultah.tanggal);
      if (!grup.has(bulan)) grup.set(bulan, []);
      grup.get(bulan).push(p);
    });
    return [...grup.entries()];
  }, [akanDatang]);

  return (
    <div className={K.latar}>
      <div className={K.halaman}>
        <section className={K.kartu}>
          <h1 className={K.h1}>Ulang Tahun Pegawai</h1>
          <p className={K.sub}>
            Pegawai yang berulang tahun hari ini dan dalam waktu dekat. Kejutan muncul otomatis saat
            pegawai login di hari ulang tahunnya; rekan kerja mengirim ucapan dari Portal.
          </p>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 mt-4">
            <Statistik label="Hari ini" nilai={hariIniSaja.length} />
            <Statistik
              label="7 hari ke depan"
              nilai={daftar.filter((p) => p.ultah.hari > 0 && p.ultah.hari <= 7).length}
            />
            <Statistik
              label="30 hari ke depan"
              nilai={daftar.filter((p) => p.ultah.hari > 0 && p.ultah.hari <= 30).length}
            />
            <Statistik label="Tanggal lahir kosong" nilai={tanpaTanggal.length} waspada />
          </div>
        </section>

        <section className={`${K.kartu} mt-4`}>
          <div className={K.kepala}>
            <div>
              <h2 className={K.judulSeksi}>
                <FaBirthdayCake className={`inline mr-2 -mt-1 ${K.aksen}`} />
                Hari ini
              </h2>
              <p className={K.subSeksi}>
                {formatTanggalPendek(hariIni)}. Buka "Kejutan" untuk melihat status, mencoba
                tampilan, atau mereset kejutan.
              </p>
            </div>
          </div>
          {memuat ? (
            <p className={K.kosong}>Memuat data pegawai…</p>
          ) : hariIniSaja.length === 0 ? (
            <p className={K.kosong}>Tidak ada pegawai yang berulang tahun hari ini.</p>
          ) : (
            <ul className="grid grid-cols-1 lg:grid-cols-2 gap-2.5">
              {hariIniSaja.map((p, i) => (
                <KartuHariIni
                  key={p.id}
                  pegawai={p}
                  unitById={unit.byId}
                  urutan={i}
                  onKejutan={() => setKejutan(p)}
                />
              ))}
            </ul>
          )}
        </section>

        <section className={`${K.kartu} mt-4`}>
          <div className={K.kepala}>
            <div>
              <h2 className={K.judulSeksi}>
                <FaCalendarAlt className={`inline mr-2 -mt-1 ${K.aksen}`} />
                Ulang tahun terdekat
              </h2>
              <p className={K.subSeksi}>{akanDatang.length} pegawai dalam rentang ini.</p>
            </div>
            <div className={K.seg} role="tablist" aria-label="Rentang waktu">
              {RENTANG.map(([nilai, label]) => (
                <button
                  key={nilai}
                  type="button"
                  role="tab"
                  aria-selected={rentang === nilai}
                  onClick={() => setRentang(nilai)}
                  className={rentang === nilai ? K.segAktif : K.segBtn}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          <div key={rentang} className={ANIM.muncul}>
            {memuat ? (
              <p className={K.kosong}>Memuat data pegawai…</p>
            ) : perBulan.length === 0 ? (
              <p className={K.kosong}>Tidak ada ulang tahun dalam rentang ini.</p>
            ) : (
              <div className="space-y-4">
                {perBulan.map(([bulan, isi]) => (
                  <div key={bulan}>
                    <p className={K.judulBagian}>{bulan}</p>
                    <ul className={`${K.wadah} divide-y ${K.pembatas}`}>
                      {isi.map((p) => (
                        <li
                          key={p.id}
                          className={`flex flex-wrap items-center gap-x-3 gap-y-1.5 px-3.5 py-3 ${K.sorot}`}
                        >
                          <div className="w-[5.5rem] shrink-0">
                            <p className={`text-[13px] font-bold ${K.teks}`}>
                              {formatTanggalPendek(p.ultah.tanggal)}
                            </p>
                            <p
                              className={`text-[11.5px] font-semibold ${p.ultah.hari <= 7 ? K.aksen : K.redup}`}
                            >
                              {labelHari(p.ultah.hari)}
                            </p>
                          </div>
                          <AvatarPegawai pegawai={p} />
                          <div className="flex-1 min-w-[10rem]">
                            <p className={`text-[13.5px] font-semibold ${K.teks}`}>{p.nama}</p>
                            <p className={`text-[12px] ${K.redup}`}>
                              {keteranganPegawai(p, unit.byId) || '—'}
                            </p>
                          </div>
                          <span className={`${K.lencana} ${K.lencanaAksen}`}>
                            {p.ultah.usia} tahun
                          </span>
                          <button
                            type="button"
                            onClick={() => setKejutan(p)}
                            title="Kejutan ulang tahun"
                            aria-label={`Kejutan ulang tahun ${p.nama}`}
                            className={K.tombolIkon}
                          >
                            <FaGift size={13} />
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {!memuat && tanpaTanggal.length > 0 && (
          <section className={`${K.kartu} mt-4`}>
            <div className={K.kepala}>
              <div>
                <h2 className={K.judulSeksi}>Tanggal lahir belum diisi</h2>
                <p className={K.subSeksi}>
                  {tanpaTanggal.length} pegawai aktif tidak akan muncul di sini dan tidak mendapat
                  kejutan sampai tanggal lahirnya diisi.
                </p>
              </div>
              <button
                type="button"
                onClick={() => navigate('/kepegawaian')}
                className={K.tombolKecil}
              >
                <FaUserEdit /> Buka Data Pegawai
              </button>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {tanpaTanggal.map((p) => (
                <span key={p.id} className={`${K.lencana} ${K.lencanaNetral}`}>
                  {p.nama}
                </span>
              ))}
            </div>
          </section>
        )}
      </div>

      {kejutan && (
        <ModalKejutanUltah
          pegawai={kejutan}
          uid={currentUser?.uid}
          onUji={() => navigate(`/?uji-ultah=${kejutan.id}`)}
          onClose={() => setKejutan(null)}
        />
      )}
      <ToastViewport />
    </div>
  );
}

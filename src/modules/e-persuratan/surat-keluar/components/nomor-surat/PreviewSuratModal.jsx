import React from 'react';
import { FaFileAlt, FaPrint, FaTimes } from 'react-icons/fa';
import { ADMIN, FONT, NAVY, T } from '@/utils/uiTokens';

/** Pratinjau surat dari riwayat (kertas A4 + kop), bisa dicetak lewat browser. */
export default function PreviewSuratModal({ surat, onClose }) {
  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-[rgba(10,18,32,.55)] print:bg-white print:inset-auto print:relative print:w-full print:p-0">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="judul-preview-surat"
        className={`${FONT.body} ${T.surface} flex flex-col max-h-[95vh] w-[1000px] max-w-[95vw] rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,.35)] overflow-hidden print:shadow-none print:max-h-none print:w-full print:max-w-none print:rounded-none`}
      >
        <div
          className={`flex justify-between items-center gap-3 px-[22px] py-4 border-b shrink-0 print:hidden ${T.border}`}
        >
          <div className="min-w-0">
            <h3 id="judul-preview-surat" className={`${ADMIN.modalTitle} flex items-center gap-2`}>
              <FaFileAlt size={14} className={NAVY.text} />
              Preview Dokumen
            </h3>
            <p className={`${FONT.mono} text-xs mt-1 break-all ${T.inkMuted}`}>{surat.nomor}</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button type="button" onClick={() => window.print()} className={ADMIN.btnAdd}>
              <FaPrint size={13} />
              <span className="hidden sm:inline">Cetak</span>
            </button>
            <button type="button" onClick={onClose} className={ADMIN.modalClose} aria-label="Tutup">
              <FaTimes size={16} />
            </button>
          </div>
        </div>

        <div className={`overflow-y-auto p-4 sm:p-8 print:p-0 print:bg-white flex-1 ${T.surface2}`}>
          {/* Document Paper */}
          <div className="bg-white mx-auto shadow-sm print:shadow-none min-h-[1056px] w-[816px] print:w-full text-black pl-[3cm] pr-[2cm] py-[2cm] print:p-0 font-['Times_New_Roman',Times,serif] text-[16px]">
            {/* Header / KOP Placeholder */}
            <div className="border-b-[4px] border-black pb-2 mb-8 flex items-center text-center relative font-['Arial',Helvetica,sans-serif]">
              <img
                src="/logo-imigrasi.png"
                alt="Logo Imigrasi"
                className="w-[90px] h-[90px] shrink-0 object-contain"
              />
              <div className="flex-1 ml-4 pr-10">
                <h3 className="leading-tight uppercase text-[13px]">
                  KEMENTERIAN IMIGRASI DAN PEMASYARAKATAN REPUBLIK INDONESIA
                </h3>
                <h3 className="leading-tight uppercase text-[13px]">
                  DIREKTORAT JENDERAL IMIGRASI
                </h3>
                <h3 className="leading-tight uppercase text-[13px]">
                  KANTOR WILAYAH DIREKTORAT JENDERAL IMIGRASI BALI
                </h3>
                <h2 className="font-bold leading-tight uppercase mt-0.5 text-[16px]">
                  KANTOR IMIGRASI KELAS II TPI BULELENG
                </h2>
                <p className="mt-0.5 text-[11px]">
                  Jl. Raya Singaraja Seririt, Pemaron, Buleleng, Bali. Telepon (0362) 32174
                </p>
                <p className="text-[11px]">
                  Laman: www.singaraja.imigrasi.go.id Pos-el: kanim_singaraja@imigrasi.go.id
                </p>
              </div>
            </div>

            {/* Judul Surat */}
            <div className="text-center mb-8">
              <h2 className="font-bold text-[17px] uppercase tracking-wider">
                {surat.templateId ? surat.templateNama : 'SURAT PERINTAH'}
              </h2>
              <div className="flex justify-center items-center mt-0.5">
                <span className="font-bold mr-1 text-[14px]">NOMOR :</span>
                <span className="font-bold text-[14px]">{surat.nomor}</span>
              </div>
            </div>

            {/* Isi Surat */}
            <div className="flex-1 flex flex-col gap-3 text-justify text-[15px] leading-snug">
              {surat.templateId ? (
                <div className="flex flex-col gap-3">
                  {Object.entries(surat.fields || {}).map(([key, value]) => {
                    if (value === null || value === undefined || value === '') return null;
                    if (Array.isArray(value) && value.length === 0) return null;
                    if (key.startsWith('separator')) {
                      return (
                        <div
                          key={key}
                          className="text-center font-bold tracking-widest my-4 text-[15px]"
                        >
                          {value}
                        </div>
                      );
                    }

                    let renderedValue;
                    if (Array.isArray(value)) {
                      if (typeof value[0] === 'object') {
                        renderedValue = (
                          <div className="flex flex-col gap-4">
                            {value.map((p, idx) => (
                              <div key={idx} className="flex items-start w-full">
                                <span className="w-[25px] shrink-0 pt-1">{idx + 1}.</span>
                                <div className="flex-1 grid grid-cols-[110px_15px_1fr] gap-y-1 text-[15px] w-full">
                                  <span>Nama</span>
                                  <span>:</span>
                                  <span className="font-semibold">{p.nama}</span>
                                  <span>NIP</span>
                                  <span>:</span>
                                  <span>{p.nip}</span>
                                  <span>Pangkat/Gol.</span>
                                  <span>:</span>
                                  <span>{p.pangkat}</span>
                                  <span>Jabatan</span>
                                  <span>:</span>
                                  <span>{p.jabatan}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        );
                      } else {
                        renderedValue = (
                          <div className="flex flex-col gap-1 w-full">
                            {value.map((str, idx) => (
                              <div key={idx} className="flex items-start w-full">
                                <span className="w-[25px] shrink-0 pt-1">{idx + 1}.</span>
                                <div
                                  className="flex-1 w-full leading-relaxed py-1 whitespace-pre-wrap"
                                  dangerouslySetInnerHTML={{ __html: str || '' }}
                                />
                              </div>
                            ))}
                          </div>
                        );
                      }
                    } else if (typeof value === 'object') {
                      renderedValue = (
                        <div className="grid grid-cols-[110px_15px_1fr] gap-y-1 text-[15px]">
                          <span>Nama</span>
                          <span>:</span>
                          <span className="font-semibold">{value.nama}</span>
                          <span>NIP</span>
                          <span>:</span>
                          <span>{value.nip}</span>
                          <span>Pangkat/Gol.</span>
                          <span>:</span>
                          <span>{value.pangkat}</span>
                          <span>Jabatan</span>
                          <span>:</span>
                          <span>{value.jabatan}</span>
                        </div>
                      );
                    } else {
                      renderedValue = (
                        <div
                          className="leading-relaxed py-1 whitespace-pre-wrap w-full"
                          dangerouslySetInnerHTML={{ __html: value || '' }}
                        />
                      );
                    }

                    return (
                      <div key={key} className="grid grid-cols-[110px_1fr] gap-2">
                        <div className="pt-1 uppercase">{key.replace(/_/g, ' ')}</div>
                        <div className="flex items-start w-full">
                          <span className="w-[20px] shrink-0 pt-1 text-center">:</span>
                          <div className="flex-1 w-full">{renderedValue}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-[110px_1fr] gap-2">
                    <div className="pt-1">Menimbang</div>
                    <div className="flex items-start w-full">
                      <span className="w-[20px] shrink-0 pt-1 text-center">:</span>
                      <div className="flex-1 w-full leading-relaxed py-1">{surat.menimbang}</div>
                    </div>

                    <div className="pt-1">Dasar</div>
                    <div className="flex items-start">
                      <span className="w-[20px] shrink-0 pt-1 text-center">:</span>
                      <div className="flex-1 flex flex-col gap-1 w-full">
                        {(Array.isArray(surat.dasar) ? surat.dasar : [surat.dasar]).map(
                          (item, index) => (
                            <div key={index} className="flex items-start">
                              <span className="w-[25px] shrink-0 pt-1">{index + 1}.</span>
                              <div className="flex-1 w-full leading-relaxed py-1">{item}</div>
                            </div>
                          ),
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="text-center font-bold tracking-widest my-4 text-[15px]">
                    M E N U G A S K A N :
                  </div>

                  <div className="grid grid-cols-[110px_1fr] gap-2">
                    <div className="pt-1">Kepada</div>
                    <div className="flex items-start w-full">
                      <span className="w-[20px] shrink-0 pt-1 text-center">:</span>
                      <div className="flex-1 w-full flex flex-col gap-4">
                        {(Array.isArray(surat.kepada) ? surat.kepada : []).map((pegawai, index) => (
                          <div key={index} className="flex items-start w-full">
                            <span className="w-[25px] shrink-0 pt-1">{index + 1}.</span>
                            <div className="flex-1 grid grid-cols-[110px_15px_1fr] gap-y-1 text-[15px] w-full">
                              <span>Nama</span>
                              <span>:</span>
                              <span className="font-semibold">{pegawai.nama}</span>
                              <span>NIP</span>
                              <span>:</span>
                              <span>{pegawai.nip}</span>
                              <span>Pangkat/Gol.</span>
                              <span>:</span>
                              <span>{pegawai.pangkat}</span>
                              <span>Jabatan</span>
                              <span>:</span>
                              <span>{pegawai.jabatan}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="pt-1">Untuk</div>
                    <div className="flex items-start w-full">
                      <span className="w-[20px] shrink-0 pt-1 text-center">:</span>
                      <div className="flex-1 w-full flex flex-col gap-1">
                        {(Array.isArray(surat.untuk) ? surat.untuk : [surat.untuk]).map(
                          (item, index) => (
                            <div key={index} className="flex items-start w-full">
                              <span className="w-[25px] shrink-0 pt-1">{index + 1}.</span>
                              <div className="flex-1 w-full leading-relaxed py-1">{item}</div>
                            </div>
                          ),
                        )}
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Footer */}
            <div className="break-inside-avoid">
              <div className="mt-16 grid grid-cols-[1fr_250px] gap-4">
                <div className="flex items-end pb-8">
                  {/* QR Code Placeholder */}
                  <div className="w-24 h-24 bg-slate-100 border-2 border-slate-300 flex items-center justify-center text-xs text-slate-400 font-sans text-center p-2">
                    QR Code TTE
                  </div>
                </div>
                <div className="text-[15px] flex flex-col">
                  <div className="flex mb-1 items-center">
                    <span>{surat.tempat}</span>
                    <span className="mr-2">,</span>
                    <span>
                      {surat.tanggal
                        ? new Date(surat.tanggal).toLocaleDateString('id-ID', {
                            day: 'numeric',
                            month: 'long',
                            year: 'numeric',
                          })
                        : ''}
                    </span>
                  </div>
                  <div className="mb-2 uppercase">Kepala,</div>

                  {/* Signature Space */}
                  <div className="h-[60px]"></div>

                  <div className="mt-2">
                    <div className="font-bold w-full rounded">
                      {typeof surat.penandatangan === 'string'
                        ? surat.penandatangan
                        : surat.penandatangan?.nama}
                    </div>
                  </div>
                </div>
              </div>

              {/* Footer Notes */}
              <div className="mt-16 text-center text-[11px] leading-tight pt-4 border-t border-black">
                Dokumen ini telah ditandatangani secara elektronik menggunakan sertifikat elektronik
                <br />
                yang diterbitkan oleh Balai Besar Sertifikasi Elektronik (BSrE), Badan Siber dan
                Sandi Negara (BSSN).
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

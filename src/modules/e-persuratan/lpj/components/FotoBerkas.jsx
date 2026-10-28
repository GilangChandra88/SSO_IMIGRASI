import React from 'react';
import { bukaBerkas, pesanGagalUnggah } from '@/utils/berkasStorage';
import { showToast } from '@/utils/toastStore';
import { useUrlBerkas } from '@/utils/useUrlBerkas';
import { T } from '@/utils/uiTokens';

/**
 * Pratinjau kecil foto unggahan (URL lokal dari getBlob, tanpa link publik); klik membuka foto
 * ukuran penuh di tab baru.
 * @param {{ foto: { path, nama }, className?: string }} props
 */
export default function FotoBerkas({ foto, className = 'block w-full h-24 object-cover' }) {
  const { url } = useUrlBerkas(foto.path);
  const buka = () =>
    bukaBerkas(foto).catch((err) =>
      showToast(pesanGagalUnggah(err, 'Foto gagal dibuka.'), 'error'),
    );
  return (
    <button type="button" onClick={buka} title="Buka di tab baru" className="block w-full">
      {url ? (
        <img src={url} alt={foto.nama} className={className} />
      ) : (
        <div className={`h-24 animate-pulse ${T.surface}`} />
      )}
    </button>
  );
}

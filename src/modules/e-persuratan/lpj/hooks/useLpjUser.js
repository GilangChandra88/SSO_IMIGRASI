import { useMemo } from 'react';
import { useAuth } from '@/context/AuthContext';
import { keOrang } from '@/context/usePegawaiRingkas';

/**
 * Pengguna login untuk modul LPJ. Hak di sini hanya untuk tampilan; rules & Function yang
 * menegakkannya. pegawaiLogin = salinan beku Orang dari dokumen pegawai sendiri (null sampai termuat).
 */
export function useLpjUser() {
  const { currentUser, userData, pegawaiId, isKeuangan, isSuperAdmin } = useAuth();
  const pegawaiLogin = useMemo(() => keOrang(userData), [userData]);
  return {
    uid: currentUser?.uid || '',
    pegawaiId: pegawaiId || '',
    nama: userData?.nama || 'Pengguna',
    isAdmin: !!isKeuangan,
    isSuperAdmin: !!isSuperAdmin,
    pegawaiLogin,
  };
}

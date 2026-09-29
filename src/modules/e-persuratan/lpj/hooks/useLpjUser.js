import { useAuth } from '@/context/AuthContext';
import { toPegawaiRef } from '../utils/emptyModels';
import { namaPengguna } from './useLPJ';

/**
 * Data pengguna login untuk modul LPJ: uid, nama, hak admin, dan referensi pegawai
 * (null bila akun tidak punya dokumen `pegawai`, mis. Super Admin bawaan).
 */
export function useLpjUser() {
  const { currentUser, userData, isAdmin, isSuperAdmin } = useAuth();
  const uid = currentUser?.uid || '';
  const pegawaiLogin =
    userData?.id && userData?.nama ? toPegawaiRef({ ...userData, authUid: uid }) : null;
  return {
    uid,
    nama: namaPengguna(currentUser, userData),
    isAdmin: !!(isAdmin || isSuperAdmin),
    pegawaiLogin,
  };
}

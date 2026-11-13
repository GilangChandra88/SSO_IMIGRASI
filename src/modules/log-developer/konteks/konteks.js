import { createContext, useContext } from 'react';

/** { baca(tampilan, opsi), kunci(), terkunciPada } dari GerbangLogDev. */
export const KonteksLogDev = createContext(null);

export const useLogDev = () => useContext(KonteksLogDev);

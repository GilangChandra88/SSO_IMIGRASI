/**
 * Ilustrasi kapibara (SVG buatan sendiri, tanpa berkas gambar) sebagai pengecoh di captcha.
 * gaya: 'jeruk' (jeruk di kepala), 'pesta' (topi pesta), 'berendam' (berendam di air).
 */
const LATAR = { jeruk: '#CDEBC0', pesta: '#F7E3B5', berendam: '#BFE3F5' };

export default function Kapibara({ gaya = 'jeruk', className = '' }) {
  return (
    <svg viewBox="0 0 100 100" className={className} aria-hidden="true">
      <rect width="100" height="100" fill={LATAR[gaya] || LATAR.jeruk} />
      {gaya === 'jeruk' && <path d="M0 84 Q25 78 50 84 T100 84 V100 H0Z" fill="#9BCB84" />}

      {/* badan & kepala */}
      <ellipse cx="50" cy="86" rx="36" ry="22" fill="#9C6B3D" />
      <circle cx="29" cy="31" r="6.5" fill="#7E5430" />
      <circle cx="71" cy="31" r="6.5" fill="#7E5430" />
      <rect x="23" y="28" width="54" height="48" rx="22" fill="#B07D4A" />
      <ellipse cx="50" cy="61" rx="19" ry="13" fill="#8C5F35" />

      {/* wajah santai: mata setengah terpejam */}
      <path
        d="M33 46 Q38 42 43 46 M57 46 Q62 42 67 46"
        fill="none"
        stroke="#2B1E12"
        strokeWidth="2.6"
        strokeLinecap="round"
      />
      <ellipse cx="44" cy="57" rx="2.2" ry="1.6" fill="#2B1E12" />
      <ellipse cx="56" cy="57" rx="2.2" ry="1.6" fill="#2B1E12" />
      <path
        d="M45 65 Q50 68 55 65"
        fill="none"
        stroke="#2B1E12"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <ellipse cx="31" cy="55" rx="4" ry="2.5" fill="#D99A8B" opacity=".55" />
      <ellipse cx="69" cy="55" rx="4" ry="2.5" fill="#D99A8B" opacity=".55" />

      {gaya === 'jeruk' && (
        <>
          <circle cx="50" cy="22" r="10" fill="#F59E0B" />
          <circle cx="47" cy="19" r="2.5" fill="#FCD34D" opacity=".8" />
          <path d="M50 12 Q56 7 60 11 Q55 14 50 12Z" fill="#4D9A3F" />
        </>
      )}
      {gaya === 'pesta' && (
        <>
          <path d="M38 30 L50 3 L62 30Z" fill="#2A78D6" />
          <path d="M42 21 L58 21 M45 13 L55 13" stroke="#FCD34D" strokeWidth="3" />
          <circle cx="50" cy="4" r="4" fill="#E8C37A" />
        </>
      )}
      {gaya === 'berendam' && (
        <>
          <path d="M0 74 Q12 70 25 74 T50 74 T75 74 T100 74 V100 H0Z" fill="#5BA8E0" />
          <path
            d="M10 82 Q16 79 22 82 M70 88 Q76 85 82 88"
            fill="none"
            stroke="#D6ECFA"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </>
      )}
    </svg>
  );
}

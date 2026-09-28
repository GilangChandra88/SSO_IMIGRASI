import js from '@eslint/js';
import globals from 'globals';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import prettier from 'eslint-config-prettier';

export default [
  // "functions" adalah paket Node terpisah (Cloud Functions) dan tidak ikut di-lint di sini.
  { ignores: ['dist', 'node_modules', 'functions'] },
  js.configs.recommended,
  {
    files: ['**/*.{js,jsx}'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: globals.browser,
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    settings: { react: { version: 'detect' } },
    plugins: { react, 'react-hooks': reactHooks, 'react-refresh': reactRefresh },
    rules: {
      ...react.configs.recommended.rules,
      ...react.configs['jsx-runtime'].rules,
      'react/prop-types': 'off', // proyek ini tidak memakai PropTypes
      'react/no-unescaped-entities': 'off', // teks antarmuka berbahasa Indonesia memakai tanda kutip biasa
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
      'no-unused-vars': [
        'warn',
        { varsIgnorePattern: '^(_|React$)', argsIgnorePattern: '^_', caughtErrors: 'none' },
      ],
    },
  },
  {
    // Larik data baris berisi elemen JSX (bukan daftar hasil .map): peringatan key di sini positif palsu.
    files: ['src/components/SuratPreview/SuratPreviewCanvas.jsx'],
    rules: { 'react/jsx-key': 'warn' },
  },
  ...moduleBoundaryRules(),
  {
    files: ['*.config.js'],
    languageOptions: { globals: globals.node },
  },
  prettier, // harus terakhir: mematikan aturan gaya yang bentrok dengan Prettier
];

/**
 * Batas antar modul (lihat CLAUDE.md, bagian "Struktur folder").
 *  - Aplikasi (sso, e-persuratan, inventory, kepegawaian) tidak boleh saling mengimpor.
 *  - Sub-modul e-persuratan hanya boleh saling mengimpor lewat index.js-nya,
 *    dan hanya untuk arah: dashboard -> lpj dan surat-keluar -> lpj.
 *  - Kode bersama (components, layouts, data, utils, config, context) tidak boleh mengimpor dari modules/.
 * Aturan mencakup impor beralias ("@/modules/...") maupun relatif ("../../lpj/..."). Untuk lintas folder
 * tetap gunakan alias "@/".
 */
function moduleBoundaryRules() {
  const APPS = ['sso', 'e-persuratan', 'inventory', 'kepegawaian'];
  const SUBS = ['dashboard', 'lpj', 'surat-keluar', 'data-master'];
  // Pola berbasis NAMA FOLDER agar berlaku untuk impor beralias (@/modules/x) maupun relatif (../../x).
  const whole = (name) => [`**/${name}`, `**/${name}/**`];
  const deepOnly = (name) => [`**/${name}/*`]; // isi di dalam folder; index.js folder itu sendiri tetap boleh

  const otherApps = (self) => APPS.filter((a) => a !== self).flatMap(whole);
  const sibling = (self, allowedPublic = []) =>
    SUBS.filter((s) => s !== self).flatMap((s) =>
      allowedPublic.includes(s) ? deepOnly(s) : whole(s),
    );

  // "paths" melarang impor persis dari satu alamat; "patterns" bergaya .gitignore (mencakup isi folder).
  const rule = (files, group, message, paths = []) => ({
    files,
    rules: { 'no-restricted-imports': ['error', { paths, patterns: [{ group, message }] }] },
  });

  const appMsg =
    'Aplikasi tidak boleh mengimpor aplikasi lain. Pindahkan kode bersama ke src/components, src/utils, dst.';
  const subMsg =
    'Sub-modul e-persuratan hanya boleh mengimpor sub-modul lain lewat index.js dan hanya dashboard->lpj / surat-keluar->lpj.';

  return [
    rule(['src/modules/sso/**'], otherApps('sso'), appMsg),
    rule(['src/modules/inventory/**'], otherApps('inventory'), appMsg),
    rule(['src/modules/kepegawaian/**'], otherApps('kepegawaian'), appMsg),
    // AppModule.jsx dan index.js e-Persuratan menyusun sub-modulnya, jadi boleh mengimpor sub-modul.
    rule(['src/modules/e-persuratan/*.{js,jsx}'], otherApps('e-persuratan'), appMsg),
    ...SUBS.map((sub) =>
      rule(
        [`src/modules/e-persuratan/${sub}/**`],
        [
          ...otherApps('e-persuratan'),
          ...sibling(sub, sub === 'dashboard' || sub === 'surat-keluar' ? ['lpj'] : []),
          '**/AppModule',
        ],
        subMsg,
        // index aplikasi (AppModule) - hindari impor melingkar
        [
          {
            name: '@/modules/e-persuratan',
            message: 'Sub-modul tidak boleh mengimpor AppModule aplikasinya.',
          },
        ],
      ),
    ),
    rule(
      [
        'src/components/**',
        'src/layouts/**',
        'src/data/**',
        'src/utils/**',
        'src/config/**',
        'src/context/**',
      ],
      whole('modules'),
      'Kode bersama tidak boleh mengimpor dari src/modules. Balik arahnya: modul yang mengimpor kode bersama.',
    ),
  ];
}

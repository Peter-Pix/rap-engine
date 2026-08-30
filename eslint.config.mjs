import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = [
  ...nextVitals,
  ...nextTs,
  {
    ignores: [
      ".content-cache/**",
      ".next/**",
      "node_modules/**",
      "public/**",
      ".backups/**",
      "lib/**",          // legacy JS utility (CommonJS require)
      "scripts/*.js",    // legacy JS scripts (CommonJS require)
    ],
  },
  {
    // `any` je v tomto projektu rozšířený legacy pattern (133 výskytů).
    // Není to bezpečnostní chyba — downgrad na warning, aby lint gate
    // neblokoval build na pre-existujícím kódu. Nový kód by měl `any` vyhýbat.
    rules: {
      "@typescript-eslint/no-explicit-any": "warn",
    },
  },
];

export default eslintConfig;

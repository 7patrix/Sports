import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = [
  { ignores: ["coverage/**", "playwright-report/**", "test-results/**", ".next/**"] },
  ...nextVitals,
  ...nextTs
];

export default eslintConfig;

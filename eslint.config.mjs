// eslint-config-next v16 ships a native flat config; `core-web-vitals`
// re-exports the base config (which includes the TypeScript setup) plus the
// Core Web Vitals rule set — the flat-config equivalent of the old
// `extends: ["next/core-web-vitals", "next/typescript"]`.
import nextCoreWebVitals from "eslint-config-next/core-web-vitals";

const eslintConfig = [
  ...nextCoreWebVitals,
  { ignores: ["public/wasm/**"] },
];

export default eslintConfig;

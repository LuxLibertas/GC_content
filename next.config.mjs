/** @type {import('next').NextConfig} */
const nextConfig = {
  // The Rust/WASM module is fetched at runtime from /public/wasm/ (see
  // hooks/useGcWasm.ts) and is never processed by the bundler, so no
  // webpack/Turbopack WASM config is needed here.

  // Next 16 `next dev` otherwise writes AGENTS.md / CLAUDE.md into the repo
  // root; opt out and keep agent instructions out of version control.
  agentRules: false,
}

export default nextConfig

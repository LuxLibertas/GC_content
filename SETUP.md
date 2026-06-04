# GC Scope — Setup

## Prerequisites

| Tool | Install |
|------|---------|
| Node.js 18+ | https://nodejs.org |
| Rust toolchain | `curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs \| sh` |
| wasm-pack | `cargo install wasm-pack` |

Verify: `node -v`, `rustc --version`, `wasm-pack --version`

---

## Build order (WASM must come first)

### 1. Build the Rust/WASM module

```bash
cd gc-wasm
wasm-pack build --target web --out-dir ../public/wasm
```

This outputs `gc_wasm.js`, `gc_wasm_bg.wasm`, and type declarations into
`public/wasm/`. The Next.js app fetches them at runtime from `/wasm/`.

### 2. Install JS dependencies

```bash
cd gc-scope
npm install
```

### 3. Run the dev server

```bash
npm run dev
```

Open http://localhost:3000

---

## Production build

```bash
npm run build
npm start
```

---

## Notes

- **WASM before npm**: If `public/wasm/` is missing, the app loads but computation
  will fail with a module-not-found error. Always run step 1 first.
- The app is fully offline-capable once built — no CDN calls, all assets local.
- Computation runs client-side only. There is no server, API, or backend.
- Session data is persisted in `localStorage` under the key `gc_scope_saved`.

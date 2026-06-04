declare module '/wasm/gc_wasm.js' {
  export function calculate_gc_windows(sequence: string, window_size: number): Float64Array
  export function calculate_statistics(sequence: string): {
    total_length: number
    gc_count: number
    at_count: number
    gc_percent: number
    at_percent: number
    n_count: number
    longest_gc_run: number
    longest_at_run: number
  }
  export default function init(
    module_or_path?: string | Request | URL | Response | BufferSource | WebAssembly.Module
  ): Promise<void>
}

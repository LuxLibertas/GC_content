'use client'

import { useState, useEffect, useRef } from 'react'

interface GcWasmModule {
  calculate_gc_windows: (sequence: string, windowSize: number) => Float64Array
  calculate_statistics: (sequence: string) => {
    total_length: number
    gc_count: number
    at_count: number
    gc_percent: number
    at_percent: number
    n_count: number
    longest_gc_run: number
    longest_at_run: number
  }
}

interface UseGcWasmReturn {
  calculateWindows: (sequence: string, windowSize: number) => Float64Array | null
  calculateStatistics: (sequence: string) => GcWasmModule['calculate_statistics'] extends (...args: never[]) => infer R ? R : never
  ready: boolean
  error: string | null
}

export function useGcWasm(): UseGcWasmReturn {
  const [ready, setReady] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const moduleRef = useRef<GcWasmModule | null>(null)

  useEffect(() => {
    if (typeof window === 'undefined') return

    let cancelled = false

    async function init() {
      try {
        // webpackIgnore keeps this out of the bundle — loaded at runtime from /public
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-expect-error: path resolved at runtime from Next.js public dir
        const wasm = await import(/* webpackIgnore: true */ '/wasm/gc_wasm.js')
        await wasm.default('/wasm/gc_wasm_bg.wasm')
        if (!cancelled) {
          moduleRef.current = wasm as unknown as GcWasmModule
          setReady(true)
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : 'Failed to load WASM module')
        }
      }
    }

    init()
    return () => { cancelled = true }
  }, [])

  const calculateWindows = (sequence: string, windowSize: number): Float64Array | null => {
    if (!moduleRef.current) return null
    return moduleRef.current.calculate_gc_windows(sequence, windowSize)
  }

  const calculateStatistics = (sequence: string) => {
    if (!moduleRef.current) return null as never
    return moduleRef.current.calculate_statistics(sequence)
  }

  return { calculateWindows, calculateStatistics, ready, error }
}

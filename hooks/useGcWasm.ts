'use client'

import { useState, useEffect, useRef, useCallback } from 'react'

export interface GcStatistics {
  total_length: number
  gc_count: number
  at_count: number
  gc_percent: number
  at_percent: number
  n_count: number
  longest_gc_run: number
  longest_at_run: number
}

interface GcWasmModule {
  calculate_gc_windows: (sequence: string, windowSize: number) => Float64Array
  calculate_statistics: (sequence: string) => GcStatistics
}

interface UseGcWasmReturn {
  calculateWindows: (sequence: string, windowSize: number) => Float64Array | null
  calculateStatistics: (sequence: string) => GcStatistics | null
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
        // webpackIgnore/turbopackIgnore keep this out of the bundle — loaded at
        // runtime from /public/wasm/ so the bundler never resolves the path.
        // The module shape is declared ambiently in types/wasm.d.ts.
        const wasm = await import(
          /* webpackIgnore: true */ /* turbopackIgnore: true */ '/wasm/gc_wasm.js'
        )
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

  // Stable identities: both only read the (stable) moduleRef, so downstream
  // useCallback/useMemo consumers don't churn on every render.
  const calculateWindows = useCallback(
    (sequence: string, windowSize: number): Float64Array | null => {
      if (!moduleRef.current) return null
      return moduleRef.current.calculate_gc_windows(sequence, windowSize)
    },
    []
  )

  const calculateStatistics = useCallback(
    (sequence: string): GcStatistics | null => {
      if (!moduleRef.current) return null
      return moduleRef.current.calculate_statistics(sequence)
    },
    []
  )

  return { calculateWindows, calculateStatistics, ready, error }
}

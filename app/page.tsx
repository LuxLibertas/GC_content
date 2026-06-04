'use client'

import { useState, useCallback, useEffect } from 'react'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts'
import { useGcWasm } from '@/hooks/useGcWasm'

const MAX_BASES = 1000

function DnaIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#00D4FF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 15c6.667-6 13.333 0 20-6" />
      <path d="M9 22c1.798-1.998 2.518-3.995 2.807-5.993" />
      <path d="M15 2c-1.798 1.999-2.518 3.997-2.807 5.994" />
      <path d="m17 6-2.5-2.5" />
      <path d="m14 8.5-1-1" />
      <path d="m7 18 2.5 2.5" />
      <path d="m3.5 14.5.5.5" />
      <path d="m20 9 .5.5" />
      <path d="m6.5 17.5 1 1" />
      <path d="m16.5 6.5 1 1" />
    </svg>
  )
}

function sanitise(raw: string): string {
  return raw.toUpperCase().replace(/[^ATGCN]/g, '')
}

interface Statistics {
  total_length: number
  gc_count: number
  at_count: number
  gc_percent: number
  at_percent: number
  n_count: number
  longest_gc_run: number
  longest_at_run: number
}

interface SavedSession {
  sequence: string
  windowSize: number
  timestamp: string
  statistics: Statistics
}

interface ChartPoint {
  position: number
  gc: number
}

function StatTile({
  label,
  value,
  colour,
}: {
  label: string
  value: string | number
  colour: 'teal' | 'amber' | 'slate'
}) {
  const colourClass =
    colour === 'teal'
      ? 'text-[#00D4FF]'
      : colour === 'amber'
      ? 'text-amber-400'
      : 'text-slate-300'

  return (
    <div className="flex flex-col gap-1 p-4 rounded-xl bg-slate-900/60 border border-slate-700/40">
      <span className="text-xs text-slate-500 uppercase tracking-widest font-mono">{label}</span>
      <span className={`text-2xl font-bold font-mono ${colourClass}`}>{value}</span>
    </div>
  )
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm font-mono">
      <div className="text-slate-400">Position {label}</div>
      <div className="text-[#00D4FF] font-bold">{payload[0].value.toFixed(1)}% GC</div>
    </div>
  )
}

export default function Home() {
  const { calculateWindows, calculateStatistics, ready, error } = useGcWasm()

  const [rawInput, setRawInput] = useState('')
  const [sequence, setSequence] = useState('')
  const [windowSize, setWindowSize] = useState(20)
  const [chartData, setChartData] = useState<ChartPoint[]>([])
  const [statistics, setStatistics] = useState<Statistics | null>(null)
  const [hasResults, setHasResults] = useState(false)
  const [savedSession, setSavedSession] = useState<SavedSession | null>(null)
  const [resultsVisible, setResultsVisible] = useState(false)

  useEffect(() => {
    try {
      const raw = localStorage.getItem('gc_scope_saved')
      if (raw) setSavedSession(JSON.parse(raw) as SavedSession)
    } catch {}
  }, [])

  const handleInput = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const raw = e.target.value
    setRawInput(raw)
    setSequence(sanitise(raw))
  }, [])

  const runAnalysis = useCallback(
    (seq: string, win: number) => {
      if (!ready) return
      const windows = calculateWindows(seq, win)
      const stats = calculateStatistics(seq)
      if (!windows || !stats) return

      const points: ChartPoint[] = Array.from(windows).map((gc, i) => ({
        position: i + 1,
        gc: Math.round(gc * 10) / 10,
      }))

      setChartData(points)
      setStatistics(stats)
      setHasResults(true)
      setResultsVisible(false)
      requestAnimationFrame(() => {
        requestAnimationFrame(() => setResultsVisible(true))
      })
    },
    [ready, calculateWindows, calculateStatistics]
  )

  const handleAnalyse = useCallback(() => {
    runAnalysis(sequence, windowSize)
  }, [sequence, windowSize, runAnalysis])

  const handleClear = useCallback(() => {
    setRawInput('')
    setSequence('')
    setChartData([])
    setStatistics(null)
    setHasResults(false)
    setResultsVisible(false)
  }, [])

  const handleExportCSV = useCallback(() => {
    const rows = ['Position,GC_Percent', ...chartData.map((p) => `${p.position},${p.gc}`)]
    const blob = new Blob([rows.join('\n')], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'gc_content.csv'
    a.click()
    URL.revokeObjectURL(url)
  }, [chartData])

  const handleSave = useCallback(() => {
    if (!statistics) return
    const session: SavedSession = {
      sequence,
      windowSize,
      timestamp: new Date().toISOString(),
      statistics,
    }
    localStorage.setItem('gc_scope_saved', JSON.stringify(session))
    setSavedSession(session)
  }, [sequence, windowSize, statistics])

  const handleLoad = useCallback(() => {
    if (!savedSession) return
    const seq = savedSession.sequence
    setRawInput(seq)
    setSequence(seq)
    setWindowSize(savedSession.windowSize)
    setTimeout(() => runAnalysis(seq, savedSession.windowSize), 50)
  }, [savedSession, runAnalysis])

  const handleClearSaved = useCallback(() => {
    localStorage.removeItem('gc_scope_saved')
    setSavedSession(null)
  }, [])

  const validCount = sequence.length
  const overLimit = validCount > MAX_BASES
  const canAnalyse = ready && validCount >= windowSize && !overLimit

  return (
    <main className="min-h-screen bg-[#0F1117] px-4 py-8 md:px-8">
      {!ready && !error && (
        <div className="mb-6 flex items-center gap-3 rounded-xl border border-[#00D4FF]/20 bg-slate-900/80 px-5 py-3 text-sm font-mono text-[#00D4FF]">
          <span className="relative flex h-3 w-3">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#00D4FF] opacity-75" />
            <span className="relative inline-flex h-3 w-3 rounded-full bg-[#00D4FF]" />
          </span>
          Initialising computation engine...
        </div>
      )}
      {error && (
        <div className="mb-6 rounded-xl border border-red-700/50 bg-red-950/40 px-5 py-3 text-sm font-mono text-red-400">
          WASM error: {error}
        </div>
      )}

      <header className="mb-8">
        <div className="flex items-center gap-3 mb-1">
          <DnaIcon />
          <h1 className="text-3xl font-bold tracking-tight text-white">GC Scope</h1>
        </div>
        <p className="text-slate-400 text-sm font-mono ml-10">Sliding Window GC Content Analyser</p>
        <div className="mt-3 ml-10 h-0.5 w-32 bg-gradient-to-r from-[#00D4FF] to-[#39FF14] rounded-full" />
      </header>

      <section className="mb-6 rounded-xl border border-slate-700/50 bg-slate-900/60 p-6 card-glow transition-shadow duration-300">
        <div className="mb-4">
          <label className="mb-2 block text-xs font-mono text-slate-400 uppercase tracking-widest">
            DNA Sequence
          </label>
          <textarea
            value={rawInput}
            onChange={handleInput}
            placeholder="Paste DNA sequence here (A, T, G, C, N — up to 1000 bases)"
            spellCheck={false}
            className="w-full h-32 resize-none rounded-lg border border-slate-700/60 bg-slate-950/80 p-3 font-mono text-sm text-slate-200 placeholder-slate-600 focus:border-[#00D4FF]/50 focus:outline-none focus:ring-1 focus:ring-[#00D4FF]/30 transition-colors"
          />
          <div className="mt-1.5 flex gap-4 font-mono text-xs">
            <span className="text-slate-500">
              Raw chars: <span className="text-slate-300">{rawInput.length}</span>
            </span>
            <span className="text-slate-500">
              Valid bases:{' '}
              <span className={overLimit ? 'text-red-400 font-bold' : 'text-[#39FF14]'}>
                {validCount}
              </span>
              {overLimit && ' — exceeds 1000 limit'}
            </span>
          </div>
        </div>

        <div className="mb-6">
          <label className="mb-2 block text-xs font-mono text-slate-400 uppercase tracking-widest">
            Window Size:{' '}
            <span className="text-[#00D4FF] text-base font-bold">{windowSize}</span>{' '}
            bases
          </label>
          <input
            type="range"
            min={10}
            max={50}
            value={windowSize}
            onChange={(e) => setWindowSize(Number(e.target.value))}
            className="w-full max-w-sm"
          />
          <div className="mt-1 flex justify-between max-w-sm font-mono text-xs text-slate-600">
            <span>10</span>
            <span>50</span>
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={handleAnalyse}
            disabled={!canAnalyse}
            className="rounded-lg bg-[#00D4FF] px-6 py-2 text-sm font-bold text-slate-950 transition-all hover:bg-[#00D4FF]/90 hover:shadow-[0_0_20px_rgba(0,212,255,0.4)] disabled:cursor-not-allowed disabled:opacity-30"
          >
            Analyse
          </button>
          <button
            onClick={handleClear}
            className="rounded-lg border border-[#00D4FF]/50 px-6 py-2 text-sm font-bold text-[#00D4FF] transition-all hover:border-[#00D4FF] hover:bg-[#00D4FF]/10"
          >
            Clear
          </button>
        </div>
      </section>

      {hasResults && (
        <div
          className="space-y-6 transition-opacity duration-500"
          style={{ opacity: resultsVisible ? 1 : 0 }}
        >
          <section className="rounded-xl border border-slate-700/50 bg-slate-900/60 p-6 card-glow transition-shadow duration-300">
            <h2 className="mb-4 font-mono text-sm font-bold text-slate-300 uppercase tracking-widest">
              Sliding Window GC Content (window ={' '}
              <span className="text-[#00D4FF]">{windowSize}</span> bases)
            </h2>
            <ResponsiveContainer width="100%" height={320}>
              <AreaChart data={chartData} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="gcGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#00D4FF" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#39FF14" stopOpacity={0.05} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis
                  dataKey="position"
                  tick={{ fill: '#64748b', fontSize: 11, fontFamily: 'monospace' }}
                  label={{ value: 'Window Position', position: 'insideBottom', offset: -2, fill: '#475569', fontSize: 11 }}
                />
                <YAxis
                  domain={[0, 100]}
                  tick={{ fill: '#64748b', fontSize: 11, fontFamily: 'monospace' }}
                  tickFormatter={(v: number) => `${v}%`}
                />
                <Tooltip content={<CustomTooltip />} />
                <ReferenceLine y={50} stroke="#ef4444" strokeDasharray="4 4" strokeOpacity={0.6} />
                <Area
                  type="monotone"
                  dataKey="gc"
                  stroke="#00D4FF"
                  strokeWidth={2}
                  fill="url(#gcGradient)"
                  dot={false}
                  activeDot={{ r: 4, fill: '#00D4FF', stroke: '#0F1117', strokeWidth: 2 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </section>

          {statistics && (
            <section className="rounded-xl border border-slate-700/50 bg-slate-900/60 p-6 card-glow transition-shadow duration-300">
              <h2 className="mb-4 font-mono text-sm font-bold text-slate-300 uppercase tracking-widest">
                Sequence Statistics
              </h2>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <StatTile label="Total Bases" value={statistics.total_length} colour="slate" />
                <StatTile label="GC Count" value={statistics.gc_count} colour="teal" />
                <StatTile label="GC %" value={`${statistics.gc_percent}%`} colour="teal" />
                <StatTile label="Longest GC Run" value={statistics.longest_gc_run} colour="teal" />
                <StatTile label="AT Count" value={statistics.at_count} colour="amber" />
                <StatTile label="AT %" value={`${statistics.at_percent}%`} colour="amber" />
                <StatTile label="Longest AT Run" value={statistics.longest_at_run} colour="amber" />
                <StatTile label="N (Ambiguous)" value={statistics.n_count} colour="slate" />
              </div>
            </section>
          )}

          <section className="rounded-xl border border-slate-700/50 bg-slate-900/60 p-6 card-glow transition-shadow duration-300">
            <h2 className="mb-4 font-mono text-sm font-bold text-slate-300 uppercase tracking-widest">
              Export &amp; Session
            </h2>
            <div className="flex flex-wrap gap-3">
              <button
                onClick={handleExportCSV}
                className="rounded-lg border border-[#39FF14]/50 px-4 py-2 text-sm font-bold text-[#39FF14] transition-all hover:border-[#39FF14] hover:bg-[#39FF14]/10"
              >
                Export CSV
              </button>
              <button
                onClick={handleSave}
                disabled={!statistics}
                className="rounded-lg border border-slate-600 px-4 py-2 text-sm font-bold text-slate-300 transition-all hover:border-slate-400 hover:bg-slate-700/30 disabled:opacity-30"
              >
                Save to Browser
              </button>
              <button
                onClick={handleLoad}
                disabled={!savedSession}
                className="rounded-lg border border-slate-600 px-4 py-2 text-sm font-bold text-slate-300 transition-all hover:border-slate-400 hover:bg-slate-700/30 disabled:opacity-30"
              >
                Load Saved
              </button>
              <button
                onClick={handleClearSaved}
                disabled={!savedSession}
                className="rounded-lg border border-red-800/50 px-4 py-2 text-sm font-bold text-red-400 transition-all hover:border-red-600 hover:bg-red-950/30 disabled:opacity-30"
              >
                Clear Saved
              </button>
            </div>
            <p className="mt-3 font-mono text-xs text-slate-500">
              {savedSession
                ? `Saved: ${new Date(savedSession.timestamp).toLocaleString()}`
                : 'No saved session'}
            </p>
          </section>
        </div>
      )}

      {!hasResults && savedSession && (
        <section className="rounded-xl border border-slate-700/50 bg-slate-900/60 p-6 card-glow transition-shadow duration-300">
          <h2 className="mb-4 font-mono text-sm font-bold text-slate-300 uppercase tracking-widest">
            Saved Session
          </h2>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={handleLoad}
              className="rounded-lg border border-[#00D4FF]/50 px-4 py-2 text-sm font-bold text-[#00D4FF] transition-all hover:border-[#00D4FF] hover:bg-[#00D4FF]/10"
            >
              Load Saved
            </button>
            <button
              onClick={handleClearSaved}
              className="rounded-lg border border-red-800/50 px-4 py-2 text-sm font-bold text-red-400 transition-all hover:border-red-600 hover:bg-red-950/30"
            >
              Clear Saved
            </button>
          </div>
          <p className="mt-3 font-mono text-xs text-slate-500">
            Saved: {new Date(savedSession.timestamp).toLocaleString()}
          </p>
        </section>
      )}
    </main>
  )
}

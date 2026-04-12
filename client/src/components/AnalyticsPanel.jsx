/**
 * AnalyticsPanel.jsx
 * Displays NDVI-based green space statistics.
 * Styled to match the Green Space Mapper design system (dark/light mode).
 */
import { Trees, Building2, Globe, Download, RefreshCw, AlertTriangle } from 'lucide-react';

export default function AnalyticsPanel({ result, loading, error, progress, onReset, darkMode }) {
  const dark = darkMode;

  /* ── Loading skeleton ───────────────────────────────────────────────────── */
  if (loading) {
    return (
      <div className={`flex flex-col gap-4 p-5 h-full ${dark ? 'text-green-300' : 'text-green-800'}`}>
        <div className="flex items-center gap-2 mb-2">
          <Trees size={20} className="text-green-500 animate-spin" style={{ animationDuration: '2s' }} />
          <span className="font-semibold text-sm">Analyzing region…</span>
        </div>
        {[1, 2, 3, 4].map(i => (
          <div
            key={i}
            className={`h-16 rounded-xl animate-pulse ${dark ? 'bg-green-900/30' : 'bg-green-100'}`}
            style={{ animationDelay: `${i * 0.1}s` }}
          />
        ))}
        {progress ? (
          <div className="mt-2">
            <p className={`text-xs ${dark ? 'text-green-500' : 'text-green-600'}`}>
              {progress.message}
            </p>
            <div className="w-full h-1 mt-2 bg-green-100 dark:bg-green-900/50 rounded-full overflow-hidden">
              <div 
                className="h-full bg-green-500 transition-all duration-300 ease-out"
                style={{ width: `${(progress.step / progress.total) * 100}%` }}
              />
            </div>
          </div>
        ) : (
          <p className={`text-xs mt-2 ${dark ? 'text-green-500' : 'text-green-600'}`}>
            Connecting to stream…
            <br />This may take a few moments.
          </p>
        )}
      </div>
    );
  }

  /* ── Error state ────────────────────────────────────────────────────────── */
  if (error) {
    return (
      <div className="flex flex-col gap-4 p-5 h-full">
        <div className={`rounded-xl p-4 text-sm ${dark ? 'bg-red-900/40 text-red-300 border border-red-800/50' : 'bg-red-50 text-red-700 border border-red-200'}`}>
          <p className="font-semibold mb-1">Analysis Failed</p>
          <p className="text-xs leading-relaxed">{error}</p>
        </div>
        <button
          onClick={onReset}
          className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium
            bg-green-500 text-white hover:bg-green-600 transition-colors duration-200 shadow"
        >
          <RefreshCw size={15} />
          Try Again
        </button>
      </div>
    );
  }

  /* ── Empty state ────────────────────────────────────────────────────────── */
  if (!result) {
    return (
      <div className={`flex flex-col items-center justify-center gap-4 p-8 h-full text-center
        ${dark ? 'text-green-600' : 'text-green-400'}`}>
        <Trees size={48} strokeWidth={1.5} />
        <div>
          <p className={`font-semibold text-sm ${dark ? 'text-green-300' : 'text-green-700'}`}>
            No analysis yet
          </p>
          <p className="text-xs mt-1 leading-relaxed">
            Search for a city or draw a polygon on the map, then click&nbsp;
            <strong>Analyze Region</strong>.
          </p>
        </div>
      </div>
    );
  }

  /* ── Results ────────────────────────────────────────────────────────────── */
  const {
    region_name,
    total_area_km2,
    green_area_km2,
    non_green_area_km2,
    green_percentage,
    note,
  } = result;

  const pct = Math.min(100, Math.max(0, green_percentage));

  /** Smart format: more decimals for sub-km² values */
  const fmtArea = (v) => {
    if (v === null || v === undefined) return '—';
    if (v >= 100)  return `${v.toFixed(1)} km²`;
    if (v >= 1)    return `${v.toFixed(2)} km²`;
    if (v >= 0.01) return `${v.toFixed(4)} km²`;
    return `${(v * 1000).toFixed(2)} m²`;
  };

  const handleExportCSV = () => {
    const rows = [
      ['Metric', 'Value'],
      ['Region', region_name],
      ['Total Area', fmtArea(total_area_km2)],
      ['Green Area', fmtArea(green_area_km2)],
      ['Non-Green Area', fmtArea(non_green_area_km2)],
      ['Green Coverage (%)', green_percentage.toFixed(2)],
    ];
    const csv = rows.map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `green-analysis-${region_name.replace(/\s+/g, '-')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col gap-4 p-5 h-full overflow-y-auto fade-up">

      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className={`text-xs font-medium uppercase tracking-wider mb-1
            ${dark ? 'text-green-600' : 'text-green-500'}`}>
            Green Space Analysis
          </div>
          <h2 className={`font-bold text-base leading-tight ${dark ? 'text-green-100' : 'text-green-900'}`}>
            {region_name}
          </h2>
        </div>
        <button
          onClick={onReset}
          title="Reset"
          className={`p-1.5 rounded-lg transition-colors duration-200
            ${dark ? 'text-green-500 hover:bg-green-900/50' : 'text-green-500 hover:bg-green-50'}`}
        >
          <RefreshCw size={15} />
        </button>
      </div>

      {/* Green % badge */}
      <div className={`rounded-2xl p-5 text-center
        ${dark ? 'bg-green-900/30 border border-green-900/50' : 'bg-green-50 border border-green-200'}`}>
        <div className={`text-5xl font-extrabold tabular-nums
          ${pct >= 40 ? 'text-green-500' : pct >= 20 ? 'text-yellow-500' : 'text-red-400'}`}>
          {green_percentage.toFixed(1)}%
        </div>
        <div className={`text-xs font-medium mt-1 ${dark ? 'text-green-400' : 'text-green-600'}`}>
          Green Coverage
        </div>

        {/* Progress bar */}
        <div className={`mt-4 rounded-full h-2 overflow-hidden ${dark ? 'bg-green-950' : 'bg-green-200'}`}>
          <div
            className="h-full rounded-full transition-all duration-1000 ease-out"
            style={{
              width: `${pct}%`,
              background: pct >= 40
                ? 'linear-gradient(90deg, #16a34a, #22c55e)'
                : pct >= 20
                  ? 'linear-gradient(90deg, #ca8a04, #eab308)'
                  : 'linear-gradient(90deg, #dc2626, #f87171)',
            }}
          />
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 gap-3">
        <StatCard
          icon={<Globe size={18} className={dark ? 'text-green-400' : 'text-green-600'} />}
          label="Total Area"
          value={fmtArea(total_area_km2)}
          dark={dark}
          accent="blue"
        />
        <StatCard
          icon={<Trees size={18} className="text-green-500" />}
          label="🌿 Green Area"
          value={fmtArea(green_area_km2)}
          dark={dark}
          accent="green"
        />
        <StatCard
          icon={<Building2 size={18} className={dark ? 'text-slate-400' : 'text-slate-500'} />}
          label="🏙️ Non-Green Area"
          value={fmtArea(non_green_area_km2)}
          dark={dark}
          accent="grey"
        />
      </div>

      {/* NDVI info */}
      <div className={`text-xs rounded-xl p-3 leading-relaxed
        ${dark ? 'bg-[#0a1a0d] text-green-600 border border-green-950' : 'bg-green-50/60 text-green-700 border border-green-100'}`}>
        <span className="font-semibold">Source:</span> Sentinel-2 L2A · NDVI &gt; 0.3 classified as vegetation.
        Pixel resolution: 10 m.
      </div>

      {/* Note (for clamped regions) */}
      {note && (
        <div className={`text-xs rounded-xl p-3 leading-relaxed flex gap-2 items-start
          ${dark ? 'bg-yellow-900/20 text-yellow-500 border border-yellow-900/40' : 'bg-yellow-50 text-yellow-700 border border-yellow-200'}`}>
          <AlertTriangle size={14} className="flex-shrink-0 mt-0.5" />
          <span>{note}</span>
        </div>
      )}

      {/* Export CSV */}
      <button
        onClick={handleExportCSV}
        className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium
          border transition-all duration-200 mt-auto
          border-green-500 text-green-600 hover:bg-green-500 hover:text-white"
      >
        <Download size={15} />
        Export CSV
      </button>
    </div>
  );
}

/* ── Sub-component ──────────────────────────────────────────────────────────── */
function StatCard({ icon, label, value, dark, accent }) {
  const accentBg = {
    green: dark ? 'bg-green-900/20 border-green-900/40' : 'bg-green-50 border-green-200',
    blue:  dark ? 'bg-blue-900/20 border-blue-900/30'  : 'bg-blue-50 border-blue-200',
    grey:  dark ? 'bg-slate-800/40 border-slate-700/40' : 'bg-slate-50 border-slate-200',
  }[accent] || '';

  return (
    <div className={`flex items-center gap-3 rounded-xl p-3.5 border ${accentBg} transition-all duration-200`}>
      <div className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center
        ${dark ? 'bg-black/20' : 'bg-white'} shadow-sm`}>
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <div className={`text-xs ${dark ? 'text-green-600' : 'text-green-500'}`}>{label}</div>
        <div className={`font-bold text-sm tabular-nums truncate ${dark ? 'text-green-100' : 'text-green-900'}`}>
          {value}
        </div>
      </div>
    </div>
  );
}

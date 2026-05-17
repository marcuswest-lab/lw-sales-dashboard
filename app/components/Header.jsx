'use client';

export default function Header({ asOf, onRefresh, refreshing }) {
  return (
    <header className="bg-olive text-white px-4 py-3 sm:py-4">
      <div className="max-w-6xl mx-auto flex items-center justify-between gap-2">
        <div className="min-w-0">
          <h1 className="text-lg sm:text-2xl font-bold truncate">LW Dashboard</h1>
          <p className="text-[10px] sm:text-sm opacity-75 truncate">
            {asOf ? 'As of ' + new Date(asOf).toLocaleString() : 'Loading…'}
          </p>
        </div>
        <button
          onClick={onRefresh}
          className="flex-shrink-0 inline-flex items-center gap-2 bg-white/10 hover:bg-white/20 active:bg-white/30 px-3 py-2 rounded text-sm transition"
        >
          <svg
            className={'h-4 w-4 ' + (refreshing ? 'spinner' : '')}
            viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
          >
            <path d="M21 12a9 9 0 1 1-3.5-7.1" />
            <path d="M21 4v5h-5" />
          </svg>
          <span className="hidden sm:inline">Refresh</span>
        </button>
      </div>
    </header>
  );
}

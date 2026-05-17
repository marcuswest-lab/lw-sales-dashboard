'use client';

// Two-level nav: top row = sections, bottom row = sub-tabs for current section
export default function Nav({ section, setSection, tab, setTab, config }) {
  const sections = Object.keys(config);
  const tabs = config[section] || [];

  return (
    <nav className="bg-sand border-b border-olive">
      {/* Section row */}
      <div className="max-w-6xl mx-auto flex overflow-x-auto scroll-x border-b border-olive/20">
        {sections.map((s) => {
          const on = s === section;
          return (
            <button
              key={s}
              onClick={() => {
                setSection(s);
                // reset to first sub-tab of new section
                const first = config[s]?.[0]?.key;
                if (first) setTab(first);
              }}
              className={
                'flex-shrink-0 px-4 py-3 text-sm font-bold uppercase tracking-wide transition ' +
                (on ? 'bg-olive text-white' : 'text-olive/80 hover:bg-olive/10')
              }
            >
              {s}
            </button>
          );
        })}
      </div>
      {/* Sub-tab row */}
      <div className="max-w-6xl mx-auto flex overflow-x-auto scroll-x">
        {tabs.map((t) => {
          const on = t.key === tab;
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={
                'flex-shrink-0 px-4 py-2.5 text-sm font-medium border-b-2 transition ' +
                (on ? 'border-olive text-olive' : 'border-transparent text-olive/60 hover:text-olive')
              }
            >
              {t.label}
            </button>
          );
        })}
      </div>
    </nav>
  );
}

'use client';

// Three-level nav: sections → tabs → optional sub-tabs.
// A tab can declare `subTabs: [...]` and the nav will render a third row.
export default function Nav({ section, setSection, tab, setTab, subTab, setSubTab, config }) {
  const sections = Object.keys(config);
  const tabs = config[section] || [];
  const activeTab = tabs.find((t) => t.key === tab);
  const subTabs = activeTab?.subTabs || [];

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
                const firstTab = config[s]?.[0];
                if (firstTab) {
                  setTab(firstTab.key);
                  const firstSub = firstTab.subTabs?.[0]?.key;
                  setSubTab && setSubTab(firstSub || null);
                }
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
              onClick={() => {
                setTab(t.key);
                const firstSub = t.subTabs?.[0]?.key;
                setSubTab && setSubTab(firstSub || null);
              }}
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
      {/* Sub-sub-tab row (only when active tab has subTabs) */}
      {subTabs.length > 0 && (
        <div className="max-w-6xl mx-auto flex overflow-x-auto scroll-x border-t border-olive/10 bg-sand/50">
          {subTabs.map((st) => {
            const on = st.key === subTab;
            return (
              <button
                key={st.key}
                onClick={() => setSubTab(st.key)}
                className={
                  'flex-shrink-0 px-3 py-2 text-xs font-medium uppercase tracking-wide transition ' +
                  (on ? 'text-olive border-b-2 border-olive' : 'text-olive/50 hover:text-olive')
                }
              >
                {st.label}
              </button>
            );
          })}
        </div>
      )}
    </nav>
  );
}

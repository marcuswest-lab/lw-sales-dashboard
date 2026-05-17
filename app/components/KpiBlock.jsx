import KpiCard from './KpiCard';

// Renders a grid of KPI cards from an array of { label, value, variant } entries.
export default function KpiBlock({ title, items, cols = 5 }) {
  const gridClass =
    cols === 4 ? 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4' :
    cols === 3 ? 'grid-cols-2 sm:grid-cols-3' :
                 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-5';
  return (
    <div>
      {title && <h2 className="text-lg font-bold mb-3">{title}</h2>}
      <div className={`grid ${gridClass} gap-2 sm:gap-3`}>
        {items.map((it, i) => (
          <KpiCard key={i} label={it.label} value={it.value} variant={it.variant} />
        ))}
      </div>
    </div>
  );
}

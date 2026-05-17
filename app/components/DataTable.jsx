// Generic table with sticky first column. Columns is an array of
// { key, label, align ('left'|'right'), format (val, row) => string, variant? }.
export default function DataTable({ rows, columns, emptyMsg = 'No data.' }) {
  if (!rows || !rows.length) {
    return <p className="p-4 text-sm opacity-60">{emptyMsg}</p>;
  }

  return (
    <div className="overflow-auto scroll-x rounded-lg shadow-sm bg-white max-h-[70vh]">
      <table className="min-w-full">
        <thead className="bg-olive text-white text-xs uppercase tracking-wide sticky top-0 z-10">
          <tr>
            {columns.map((c, i) => (
              <th
                key={c.key}
                className={
                  'px-3 py-2 bg-olive ' + (c.align === 'right' ? 'text-right' : 'text-left') +
                  (i === 0 ? ' sticky left-0 z-20' : '')
                }
              >
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, ri) => {
            const rowBg = ri % 2 ? 'bg-stone-50' : 'bg-white';
            return (
              <tr key={ri} className={rowBg + ' text-sm'}>
                {columns.map((c, ci) => {
                  const val = c.format ? c.format(r[c.key], r) : r[c.key];
                  const variantClass =
                    c.variant === 'money' ? 'text-green-700' :
                    c.variant === 'bold'  ? 'font-medium' : '';
                  return (
                    <td
                      key={c.key}
                      className={
                        'px-3 py-2 ' +
                        (c.align === 'right' ? 'text-right ' : '') +
                        (ci === 0 ? `sticky-col font-medium whitespace-nowrap ${rowBg} ` : '') +
                        variantClass
                      }
                    >
                      {val}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

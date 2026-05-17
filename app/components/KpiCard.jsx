export default function KpiCard({ label, value, variant }) {
  const valColor =
    variant === 'money'  ? 'text-green-700' :
    variant === 'accent' ? 'text-olive' :
    variant === 'warn'   ? 'text-amber-700' :
                            'text-olive';
  return (
    <div className="bg-white rounded-lg p-3 sm:p-4 shadow-sm">
      <div className="text-[10px] sm:text-xs uppercase tracking-wide opacity-60">{label}</div>
      <div className={'text-lg sm:text-2xl font-bold mt-1 ' + valColor}>{value}</div>
    </div>
  );
}

import DataTable from '../components/DataTable';
import { fmtNum, fmtPct, fmtMoney, reformatMonthLabel } from '@/lib/format';

export default function SalesTracker({ title, data, labelHeader, isMonth }) {
  const rows = isMonth
    ? (data || []).map((r) => ({ ...r, label: reformatMonthLabel(r.label) }))
    : data || [];

  const columns = [
    { key: 'label',       label: labelHeader, align: 'left' },
    { key: 'callsBooked', label: 'Calls',     align: 'right', format: fmtNum },
    { key: 'liveCalls',   label: 'Live',      align: 'right', format: fmtNum },
    { key: 'showRate',    label: 'Show %',    align: 'right', format: fmtPct, variant: 'bold' },
    { key: 'sales',       label: 'Sales',     align: 'right', format: fmtNum, variant: 'bold' },
    { key: 'closeRate',   label: 'Close %',   align: 'right', format: fmtPct, variant: 'bold' },
    { key: 'cash',        label: 'Cash',      align: 'right', format: fmtMoney, variant: 'money' },
    { key: 'revenue',     label: 'Revenue',   align: 'right', format: fmtMoney, variant: 'money' }
  ];

  return (
    <div>
      <h2 className="text-lg font-bold mb-3">{title}</h2>
      <DataTable rows={rows} columns={columns} />
    </div>
  );
}

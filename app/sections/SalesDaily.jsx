import DataTable from '../components/DataTable';
import { fmtNum, fmtPct, fmtMoney } from '@/lib/format';

const columns = [
  {
    key: 'label', label: 'Date', align: 'left',
    format: (v, r) => (
      <div>
        <div>{v}</div>
        <div className="text-[10px] opacity-60">{r.dayName}</div>
      </div>
    )
  },
  { key: 'callsBooked', label: 'Calls',    align: 'right', format: fmtNum },
  { key: 'liveCalls',   label: 'Live',     align: 'right', format: fmtNum },
  { key: 'showRate',    label: 'Show %',   align: 'right', format: fmtPct, variant: 'bold' },
  { key: 'offersMade',  label: 'Offers',   align: 'right', format: fmtNum },
  { key: 'sales',       label: 'Sales',    align: 'right', format: fmtNum, variant: 'bold' },
  { key: 'closeRate',   label: 'Close %',  align: 'right', format: fmtPct, variant: 'bold' },
  { key: 'cash',        label: 'Cash',     align: 'right', format: fmtMoney, variant: 'money' },
  { key: 'revenue',     label: 'Revenue',  align: 'right', format: fmtMoney, variant: 'money' }
];

export default function SalesDaily({ data }) {
  return (
    <div>
      <h2 className="text-lg font-bold mb-3">Daily (Last 30 Days)</h2>
      <DataTable rows={data || []} columns={columns} />
    </div>
  );
}

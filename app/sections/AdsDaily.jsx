import DataTable from '../components/DataTable';
import { fmtNum, fmtMoney, fmtRoas } from '@/lib/format';

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
  { key: 'spend',       label: 'Spend',    align: 'right', format: (v) => fmtMoney(v, 2) },
  { key: 'leads',       label: 'Leads',    align: 'right', format: fmtNum },
  { key: 'cpl',         label: 'CPL',      align: 'right', format: (v) => fmtMoney(v, 2) },
  { key: 'bookedCalls', label: 'Booked',   align: 'right', format: fmtNum },
  { key: 'costPerBC',   label: 'Cost/BC',  align: 'right', format: (v) => fmtMoney(v, 2) },
  { key: 'sales',       label: 'Sales',    align: 'right', format: fmtNum, variant: 'bold' },
  { key: 'cpa',         label: 'CPA',      align: 'right', format: (v) => fmtMoney(v, 2) },
  { key: 'revenue',     label: 'Revenue',  align: 'right', format: fmtMoney, variant: 'money' },
  { key: 'roas',        label: 'ROAS',     align: 'right', format: fmtRoas, variant: 'money' }
];

export default function AdsDaily({ data, title }) {
  return (
    <div>
      <h2 className="text-lg font-bold mb-3">{title || 'Daily (Last 30 Days)'}</h2>
      <DataTable rows={data || []} columns={columns} />
    </div>
  );
}

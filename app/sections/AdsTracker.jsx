import DataTable from '../components/DataTable';
import { fmtNum, fmtMoney, fmtRoas, reformatMonthLabel } from '@/lib/format';

export default function AdsTracker({ title, data, labelHeader, isMonth }) {
  const rows = isMonth
    ? (data || []).map((r) => ({ ...r, label: reformatMonthLabel(r.label) }))
    : data || [];

  const columns = [
    { key: 'label',       label: labelHeader, align: 'left' },
    { key: 'spend',       label: 'Spend',     align: 'right', format: (v) => fmtMoney(v, 2) },
    { key: 'leads',       label: 'Leads',     align: 'right', format: fmtNum },
    { key: 'cpl',         label: 'CPL',       align: 'right', format: (v) => fmtMoney(v, 2) },
    { key: 'bookedCalls', label: 'Booked',    align: 'right', format: fmtNum },
    { key: 'costPerBC',   label: 'Cost/BC',   align: 'right', format: (v) => fmtMoney(v, 2) },
    { key: 'sales',       label: 'Sales',     align: 'right', format: fmtNum, variant: 'bold' },
    { key: 'cpa',         label: 'CPA',       align: 'right', format: (v) => fmtMoney(v, 2) },
    { key: 'revenue',     label: 'Revenue',   align: 'right', format: fmtMoney, variant: 'money' },
    { key: 'roas',        label: 'ROAS',      align: 'right', format: fmtRoas, variant: 'money' }
  ];

  return (
    <div>
      <h2 className="text-lg font-bold mb-3">{title}</h2>
      <DataTable rows={rows} columns={columns} />
    </div>
  );
}

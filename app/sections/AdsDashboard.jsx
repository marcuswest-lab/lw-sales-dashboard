import KpiBlock from '../components/KpiBlock';
import { fmtNum, fmtMoney, fmtRoas } from '@/lib/format';

function block(d) {
  return [
    { label: 'Spend',         value: fmtMoney(d.spend, 2),    variant: 'warn' },
    { label: 'Leads',         value: fmtNum(d.leads) },
    { label: 'CPL',           value: fmtMoney(d.cpl, 2) },
    { label: 'Booked Calls',  value: fmtNum(d.bookedCalls), variant: 'accent' },
    { label: 'Cost / BC',     value: fmtMoney(d.costPerBC, 2) },
    { label: 'Sales',         value: fmtNum(d.sales), variant: 'accent' },
    { label: 'CPA',           value: fmtMoney(d.cpa, 2) },
    { label: 'Revenue',       value: fmtMoney(d.revenue),   variant: 'money' },
    { label: 'ROAS',          value: fmtRoas(d.roas),       variant: 'money' }
  ];
}

export default function AdsDashboard({ data }) {
  if (!data) return null;
  return (
    <div className="grid gap-6">
      <KpiBlock title="Yesterday"    items={block(data.yesterday)} />
      <KpiBlock title="Week to Date" items={block(data.wtd)} />
      <KpiBlock title="Month to Date" items={block(data.mtd)} />
      {data.pace && <KpiBlock title="Pace (Projected Month-End)" items={block(data.pace)} />}
    </div>
  );
}

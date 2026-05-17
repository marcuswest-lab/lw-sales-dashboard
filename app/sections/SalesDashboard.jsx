import KpiBlock from '../components/KpiBlock';
import { fmtNum, fmtPct, fmtMoney } from '@/lib/format';

function block(d) {
  return [
    { label: 'Calls Booked',   value: fmtNum(d.callsBooked) },
    { label: 'Live Calls',     value: fmtNum(d.liveCalls) },
    { label: 'Show Rate',      value: fmtPct(d.showRate), variant: 'accent' },
    { label: 'Offers Made',    value: fmtNum(d.offersMade) },
    { label: 'Offer Rate',     value: fmtPct(d.offerRate) },
    { label: 'Sales',          value: fmtNum(d.sales), variant: 'accent' },
    { label: 'Close (Live)',   value: fmtPct(d.closeRateLive) },
    { label: 'Close (Offer)',  value: fmtPct(d.closeRateOffers) },
    { label: 'Cash',           value: fmtMoney(d.cashCollected), variant: 'money' },
    { label: 'Revenue',        value: fmtMoney(d.revenue), variant: 'money' }
  ];
}

export default function SalesDashboard({ data }) {
  if (!data) return null;
  return (
    <div className="grid gap-6">
      <KpiBlock title="Yesterday"    items={block(data.yesterday)} />
      <KpiBlock title="Week to Date" items={block(data.wtd)} />
      <KpiBlock title="Month to Date" items={block(data.mtd)} />
    </div>
  );
}

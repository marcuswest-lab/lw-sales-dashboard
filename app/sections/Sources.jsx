'use client';

import { useMemo, useState } from 'react';
import DataTable from '../components/DataTable';
import KpiBlock from '../components/KpiBlock';
import { fmtNum, fmtMoney } from '@/lib/format';

const columns = [
  { key: 'source',   label: 'Source',   align: 'left' },
  { key: 'bookings', label: 'Bookings', align: 'right', format: fmtNum, variant: 'bold' },
  { key: 'revenue',  label: 'Revenue',  align: 'right', format: fmtMoney, variant: 'money' }
];

export default function Sources({ data, mode = 'monthly' }) {
  const rows = data || [];

  // All-Time view: filter to just the All-Time rows
  if (mode === 'all-time') {
    const allTimeRows = rows.filter((r) => r.month === 'All-Time');
    const totalBookings = allTimeRows.reduce((a, r) => a + (Number(r.bookings) || 0), 0);
    const totalRevenue  = allTimeRows.reduce((a, r) => a + (Number(r.revenue)  || 0), 0);

    if (!allTimeRows.length) {
      return <p className="p-4 text-sm opacity-60">No all-time source data.</p>;
    }

    return (
      <div>
        <h2 className="text-lg font-bold mb-3">Sales by Source — All-Time</h2>
        <div className="mb-4">
          <KpiBlock
            cols={3}
            items={[
              { label: 'Sources',  value: fmtNum(allTimeRows.length) },
              { label: 'Bookings', value: fmtNum(totalBookings) },
              { label: 'Revenue',  value: fmtMoney(totalRevenue), variant: 'money' }
            ]}
          />
        </div>
        <DataTable rows={allTimeRows} columns={columns} />
      </div>
    );
  }

  // Monthly view: exclude All-Time, show pills per real month
  const monthlyRows = rows.filter((r) => r.month !== 'All-Time');

  const months = useMemo(() => {
    const seen = new Set();
    monthlyRows.forEach((r) => seen.add(r.month));
    return Array.from(seen);
  }, [monthlyRows]);

  const [active, setActive] = useState(months[0]);

  const filtered = useMemo(() => {
    return monthlyRows.filter((r) => r.month === (active || months[0]));
  }, [monthlyRows, active, months]);

  const totalBookings = filtered.reduce((a, r) => a + (Number(r.bookings) || 0), 0);
  const totalRevenue  = filtered.reduce((a, r) => a + (Number(r.revenue)  || 0), 0);

  if (!months.length) {
    return <p className="p-4 text-sm opacity-60">No source data.</p>;
  }

  return (
    <div>
      <h2 className="text-lg font-bold mb-3">Sales by Source — Monthly</h2>
      <div className="flex flex-wrap gap-2 mb-3">
        {months.map((m) => {
          const on = m === (active || months[0]);
          return (
            <button
              key={m}
              onClick={() => setActive(m)}
              className={
                'px-3 py-1.5 rounded text-sm transition ' +
                (on ? 'bg-olive text-white' : 'bg-white border border-olive text-olive')
              }
            >
              {m}
            </button>
          );
        })}
      </div>

      <div className="mb-4">
        <KpiBlock
          cols={3}
          items={[
            { label: 'Sources',  value: fmtNum(filtered.length) },
            { label: 'Bookings', value: fmtNum(totalBookings) },
            { label: 'Revenue',  value: fmtMoney(totalRevenue), variant: 'money' }
          ]}
        />
      </div>

      <DataTable rows={filtered} columns={columns} />
    </div>
  );
}

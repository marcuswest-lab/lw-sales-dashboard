'use client';

import { useMemo, useState } from 'react';
import DataTable from '../components/DataTable';
import KpiBlock from '../components/KpiBlock';
import { fmtNum, fmtMoney } from '@/lib/format';

// Sales tab — every booking the team has closed. Aggregated KPIs at top + full table.

const columns = [
  { key: 'date',       label: 'Date',         align: 'left' },
  { key: 'rep',        label: 'Sales Rep',    align: 'left' },
  { key: 'mediaBuyer', label: 'Media Buyer',  align: 'left' },
  { key: 'source',     label: 'Source',       align: 'left' },
  { key: 'type',       label: 'Type',         align: 'left' },
  { key: 'length',     label: 'Length',       align: 'left' },
  { key: 'closed',     label: 'Closed',       align: 'right', format: fmtMoney, variant: 'money' },
  { key: 'collected',  label: 'Collected',    align: 'right', format: fmtMoney, variant: 'money' }
];

// MM/dd/yyyy → first-of-month label "MMM YYYY"
function ymOf(mmddyyyy) {
  const m = String(mmddyyyy).match(/^(\d{2})\/\d{2}\/(\d{4})$/);
  if (!m) return null;
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return months[parseInt(m[1], 10) - 1] + ' ' + m[2];
}

export default function SalesLog({ data }) {
  const rows = data || [];

  // Build a Set of unique month labels in descending order
  const monthOptions = useMemo(() => {
    const seen = new Set();
    rows.forEach((r) => {
      const ym = ymOf(r.date);
      if (ym) seen.add(ym);
    });
    return Array.from(seen);
  }, [rows]);

  const [filter, setFilter] = useState('all');

  const filtered = useMemo(() => {
    if (filter === 'all') return rows;
    return rows.filter((r) => ymOf(r.date) === filter);
  }, [rows, filter]);

  // Aggregates
  const totalClosed    = filtered.reduce((a, r) => a + (Number(r.closed) || 0), 0);
  const totalCollected = filtered.reduce((a, r) => a + (Number(r.collected) || 0), 0);

  return (
    <div>
      <div className="flex flex-wrap gap-2 mb-3">
        <button
          onClick={() => setFilter('all')}
          className={
            'px-3 py-1.5 rounded text-sm transition ' +
            (filter === 'all' ? 'bg-olive text-white' : 'bg-white border border-olive text-olive')
          }
        >
          All-Time
        </button>
        {monthOptions.map((m) => (
          <button
            key={m}
            onClick={() => setFilter(m)}
            className={
              'px-3 py-1.5 rounded text-sm transition ' +
              (filter === m ? 'bg-olive text-white' : 'bg-white border border-olive text-olive')
            }
          >
            {m}
          </button>
        ))}
      </div>

      <div className="mb-4">
        <KpiBlock
          cols={3}
          items={[
            { label: 'Bookings',  value: fmtNum(filtered.length) },
            { label: 'Closed',    value: fmtMoney(totalClosed),    variant: 'money' },
            { label: 'Collected', value: fmtMoney(totalCollected), variant: 'money' }
          ]}
        />
      </div>

      <DataTable rows={filtered} columns={columns} emptyMsg="No bookings for this period." />
    </div>
  );
}

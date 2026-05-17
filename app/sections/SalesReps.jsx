'use client';

import { useState, useEffect } from 'react';
import KpiBlock from '../components/KpiBlock';
import DataTable from '../components/DataTable';
import { fmtNum, fmtPct, fmtMoney } from '@/lib/format';

const monthCols = [
  { key: 'label',       label: 'Month',    align: 'left' },
  { key: 'callsBooked', label: 'Calls',    align: 'right', format: fmtNum },
  { key: 'liveCalls',   label: 'Live',     align: 'right', format: fmtNum },
  { key: 'showRate',    label: 'Show %',   align: 'right', format: fmtPct, variant: 'bold' },
  { key: 'offersMade',  label: 'Offers',   align: 'right', format: fmtNum },
  { key: 'sales',       label: 'Sales',    align: 'right', format: fmtNum, variant: 'bold' },
  { key: 'closeRate',   label: 'Close %',  align: 'right', format: fmtPct, variant: 'bold' },
  { key: 'cash',        label: 'Cash',     align: 'right', format: fmtMoney, variant: 'money' },
  { key: 'revenue',     label: 'Revenue',  align: 'right', format: fmtMoney, variant: 'money' }
];

export default function SalesReps({ data }) {
  // Only show reps with > 0 calls total
  const visibleReps = (data || []).filter(
    (r) => r.total && Number(r.total.callsBooked) > 0
  );

  const [active, setActive] = useState(visibleReps[0]?.name);

  // If reps list changes (e.g. data reloaded), keep selection valid
  useEffect(() => {
    if (!visibleReps.find((r) => r.name === active) && visibleReps[0]) {
      setActive(visibleReps[0].name);
    }
  }, [visibleReps, active]);

  if (!visibleReps.length) {
    return <p className="p-4 text-sm opacity-60">No rep data.</p>;
  }

  const rep = visibleReps.find((r) => r.name === active);
  if (!rep) return null;
  const t = rep.total;

  return (
    <div>
      <div className="flex flex-wrap gap-2 mb-4">
        {visibleReps.map((r) => {
          const on = r.name === active;
          return (
            <button
              key={r.name}
              onClick={() => setActive(r.name)}
              className={
                'px-3 py-2 rounded text-sm font-medium transition ' +
                (on
                  ? 'bg-olive text-white'
                  : 'bg-white border border-olive text-olive hover:bg-olive/5')
              }
            >
              {r.name}
            </button>
          );
        })}
      </div>

      <h3 className="text-base font-bold mb-2">{rep.name} · All-Time</h3>
      <div className="mb-6">
        <KpiBlock
          cols={4}
          items={[
            { label: 'Calls',    value: fmtNum(t.callsBooked) },
            { label: 'Live',     value: fmtNum(t.liveCalls) },
            { label: 'Show %',   value: fmtPct(t.showRate), variant: 'accent' },
            { label: 'Offers',   value: fmtNum(t.offersMade) },
            { label: 'Sales',    value: fmtNum(t.sales), variant: 'accent' },
            { label: 'Close %',  value: fmtPct(t.closeRate) },
            { label: 'Cash',     value: fmtMoney(t.cash), variant: 'money' },
            { label: 'Revenue',  value: fmtMoney(t.revenue), variant: 'money' }
          ]}
        />
      </div>

      <h3 className="text-base font-bold mb-2">{rep.name} · By Month</h3>
      <DataTable rows={[...(rep.months || [])].reverse()} columns={monthCols} />
    </div>
  );
}

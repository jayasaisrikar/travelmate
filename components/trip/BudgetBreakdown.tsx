'use client';

import { formatCurrency } from '@/lib/utils';
import type { BudgetBreakdown as BudgetBreakdownType } from '@/lib/travel-types';

type BudgetBreakdownProps = {
  breakdown?: BudgetBreakdownType | null;
  total?: number | string | null;
};

const entries: Array<{ key: keyof BudgetBreakdownType; label: string }> = [
  { key: 'flights', label: 'Flights' },
  { key: 'hotels', label: 'Hotels' },
  { key: 'food', label: 'Food' },
  { key: 'activities', label: 'Activities' },
  { key: 'transport', label: 'Transport' },
  { key: 'misc', label: 'Misc' },
];

export function BudgetBreakdown({ breakdown, total }: BudgetBreakdownProps) {
  const hasBreakdown = Boolean(breakdown && entries.some(entry => typeof breakdown[entry.key] === 'number'));
  const totalValue =
    typeof total === 'number'
      ? total
      : typeof total === 'string'
        ? Number.parseFloat(total.replace(/[^0-9.]+/g, ''))
        : Number.NaN;

  return (
    <section className="rounded-[28px] border border-[#DDDCE8] bg-white p-5 shadow-[0_16px_48px_rgba(46,40,51,0.06)] sm:p-6">
      <div className="text-xs font-bold uppercase tracking-[0.22em] text-[#8A869C]">Budget</div>
      <h2 className="mt-1 text-2xl font-black tracking-tight">Where the money goes</h2>

      {hasBreakdown ? (
        <>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {entries.map(({ key, label }) => {
              const value = breakdown?.[key];

              if (typeof value !== 'number') {
                return null;
              }

              return (
                <div key={label} className="rounded-[20px] border border-[#DDDCE8] bg-[#FBFAFF] px-4 py-3">
                  <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#8A869C]">{label}</div>
                  <div className="mt-1 text-lg font-black text-[#3F3D56]">{formatCurrency(value)}</div>
                </div>
              );
            })}
          </div>

          <div className="mt-4 rounded-[20px] border border-[#6C63FF]/20 bg-[#EEEDFE] px-4 py-3">
            <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#6C63FF]">Estimated total</div>
            <div className="mt-1 text-2xl font-black text-[#3F3D56]">
              {Number.isFinite(totalValue) ? formatCurrency(totalValue) : typeof total === 'string' && total.trim() ? total : 'Not set'}
            </div>
          </div>
        </>
      ) : (
        <div className="mt-4 rounded-[24px] border border-dashed border-[#DDDCE8] bg-[#FBFAFF] p-5 text-sm leading-6 text-[#6F6C82]">
          No detailed budget breakdown was generated yet. The saved trip budget still appears in the main summary.
        </div>
      )}
    </section>
  );
}

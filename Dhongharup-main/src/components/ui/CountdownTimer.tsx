import { useFlashSaleCountdown } from '@/lib/catalog';

export function CountdownTimer({ endsAt, compact }: { endsAt: string; compact?: boolean }) {
  const r = useFlashSaleCountdown(endsAt);
  if (!r || r.done) return <span className="text-danger text-xs font-semibold">Sale ended</span>;

  const Cell = ({ v, l }: { v: number; l: string }) => (
    <div className="flex flex-col items-center">
      <span className="tabular-nums font-mono font-semibold text-ink-50">{String(v).padStart(2, '0')}</span>
      {!compact && <span className="text-[8px] uppercase tracking-wider text-ink-400">{l}</span>}
    </div>
  );

  return (
    <div className={`flex items-center gap-1.5 ${compact ? '' : 'rounded-lg bg-black/40 px-2 py-1'}`}>
      <Cell v={r.h} l="hrs" />
      <span className="text-gold-400">:</span>
      <Cell v={r.m} l="min" />
      <span className="text-gold-400">:</span>
      <Cell v={r.s} l="sec" />
    </div>
  );
}

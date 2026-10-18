import { Star } from 'lucide-react';
import { classNames } from '@/lib/format';

export function StarRating({ rating, size = 14, className }: { rating: number; size?: number; className?: string }) {
  return (
    <div className={classNames('flex items-center gap-0.5', className)}>
      {[1, 2, 3, 4, 5].map((i) => {
        const fill = Math.max(0, Math.min(1, rating - (i - 1)));
        return (
          <span key={i} className="relative inline-block" style={{ width: size, height: size }}>
            <Star size={size} className="absolute inset-0 text-ink-600" />
            <span className="absolute inset-0 overflow-hidden" style={{ width: `${fill * 100}%` }}>
              <Star size={size} className="text-gold-400 fill-gold-400" />
            </span>
          </span>
        );
      })}
    </div>
  );
}

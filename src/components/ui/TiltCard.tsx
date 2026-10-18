import { motion, type HTMLMotionProps } from 'framer-motion';
import { useRef, type ReactNode } from 'react';
import { classNames } from '@/lib/format';

interface TiltCardProps extends HTMLMotionProps<'div'> {
  children: ReactNode;
  intensity?: number; // max rotation degrees
  className?: string;
  glow?: boolean;
}

export function TiltCard({ children, intensity = 8, className, glow, ...props }: TiltCardProps) {
  const ref = useRef<HTMLDivElement>(null);

  const handleMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width - 0.5;
    const py = (e.clientY - rect.top) / rect.height - 0.5;
    el.style.transform = `perspective(900px) rotateY(${px * intensity}deg) rotateX(${-py * intensity}deg) translateZ(6px)`;
    el.style.setProperty('--mx', `${(px + 0.5) * 100}%`);
    el.style.setProperty('--my', `${(py + 0.5) * 100}%`);
  };

  const handleLeave = () => {
    const el = ref.current;
    if (!el) return;
    el.style.transform = 'perspective(900px) rotateY(0) rotateX(0) translateZ(0)';
  };

  return (
    <motion.div
      ref={ref}
      onMouseMove={handleMove}
      onMouseLeave={handleLeave}
      className={classNames('transition-transform duration-300 will-change-transform', glow && 'group', className)}
      style={{
        transformStyle: 'preserve-3d',
        background: 'radial-gradient(600px circle at var(--mx,50%) var(--my,50%), rgba(255,255,255,0.08), transparent 40%)',
      }}
      {...props}
    >
      {children}
    </motion.div>
  );
}

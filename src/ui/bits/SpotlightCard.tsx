/*
 * Adapted from React Bits Components/SpotlightCard (https://github.com/DavidHDev/react-bits,
 * MIT + Commons Clause, by David Haz). Kept: a soft light and a glowing rim that follow the
 * pointer, and follow keyboard focus inside the card. Changed: colours come from the theme
 * tokens, the animation loop is replaced by one CSS-variable update per pointer move, and
 * nothing moves for reduced motion.
 */
import { useRef, type HTMLAttributes } from 'react';
import { cx } from '../primitives';

export default function SpotlightCard({ className, children, ...rest }: HTMLAttributes<HTMLDivElement>) {
  const ref = useRef<HTMLDivElement>(null);

  const place = (x: number, y: number) => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    el.style.setProperty('--spot-x', `${x - r.left}px`);
    el.style.setProperty('--spot-y', `${y - r.top}px`);
  };

  return (
    <div
      ref={ref}
      className={cx('spotlight', className)}
      onPointerMove={(e) => place(e.clientX, e.clientY)}
      onFocus={(e) => {
        const b = (e.target as HTMLElement).getBoundingClientRect();
        place(b.left + b.width / 2, b.top + b.height / 2);
      }}
      {...rest}
    >
      <span className="spotlight-light" aria-hidden />
      {children}
      <span className="spotlight-rim" aria-hidden />
    </div>
  );
}

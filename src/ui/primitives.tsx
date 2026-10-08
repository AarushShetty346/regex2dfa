import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { Tooltip } from '@ark-ui/react/tooltip';
import { Portal } from '@ark-ui/react/portal';
import { CircleAlert, CircleCheck, Info } from 'lucide-react';

/** Join class names, skipping falsy ones. */
export function cx(...parts: (string | false | null | undefined)[]) {
  return parts.filter(Boolean).join(' ');
}

type ButtonVariant = 'primary' | 'secondary' | 'ghost';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: 'sm' | 'md';
}

/** Text button. Icons go inside as children, marked aria-hidden. */
export function Button({ variant = 'secondary', size = 'md', className, type = 'button', ...rest }: ButtonProps) {
  return <button type={type} className={cx('btn', `btn-${variant}`, size === 'sm' && 'btn-sm', className)} {...rest} />;
}

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Accessible name, also shown as the tooltip. */
  label: string;
  /** Tooltip text when it should say more than the name (e.g. a shortcut). */
  hint?: string;
  variant?: 'ghost' | 'secondary';
}

/** Square icon-only button with an Ark UI tooltip. */
export function IconButton({ label, hint, variant = 'ghost', className, children, ...rest }: IconButtonProps) {
  return (
    <Tooltip.Root openDelay={350} closeDelay={50} positioning={{ placement: 'top' }}>
      <Tooltip.Trigger asChild>
        <button type="button" aria-label={label} className={cx('icon-btn', `icon-btn-${variant}`, className)} {...rest}>
          {children}
        </button>
      </Tooltip.Trigger>
      <Portal>
        <Tooltip.Positioner>
          <Tooltip.Content className="tooltip">{hint ?? label}</Tooltip.Content>
        </Tooltip.Positioner>
      </Portal>
    </Tooltip.Root>
  );
}

type Tone = 'info' | 'success' | 'danger' | 'neutral';

const CALLOUT_ICON: Record<Tone, ReactNode> = {
  info: <Info size={16} aria-hidden />,
  success: <CircleCheck size={16} aria-hidden />,
  danger: <CircleAlert size={16} aria-hidden />,
  neutral: <Info size={16} aria-hidden />,
};

interface CalloutProps {
  tone?: Tone;
  role?: 'alert' | 'status';
  className?: string;
  id?: string;
  children: ReactNode;
}

/** A message block with an icon: errors, verdicts, notes. Tone is also carried by the icon shape. */
export function Callout({ tone = 'info', role, className, id, children }: CalloutProps) {
  return (
    <div className={cx('callout', `callout-${tone}`, className)} role={role} id={id}>
      <span className="callout-icon">{CALLOUT_ICON[tone]}</span>
      <div className="callout-body">{children}</div>
    </div>
  );
}

/** Small text pill. Always carries text, never colour alone. */
export function Badge({ tone = 'neutral', children }: { tone?: 'neutral' | 'success' | 'muted'; children: ReactNode }) {
  return <span className={cx('badge', `badge-${tone}`)}>{children}</span>;
}

/** Keyboard key. */
export function Kbd({ children }: { children: ReactNode }) {
  return <kbd className="kbd">{children}</kbd>;
}

/** Page title block. The h1 takes focus after navigation (see App). */
export function PageIntro({ kicker, title, children }: { kicker: ReactNode; title: string; children?: ReactNode }) {
  return (
    <header className="page-intro">
      <p className="page-kicker">{kicker}</p>
      <h1 tabIndex={-1}>{title}</h1>
      {children && <p className="page-lede">{children}</p>}
    </header>
  );
}

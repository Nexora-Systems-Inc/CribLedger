// ============================================================
// CribLedger — UI Component Library
// ============================================================

import React from 'react';
import type { User, ObligationStatus, WagerStatus, MatchStatus, SettlementStatus } from '@/types';
import { APP_CONFIG } from '@/config/supabase';

// ── Card ──────────────────────────────────────────────────────
interface CardProps { children: React.ReactNode; className?: string; hover?: boolean; gold?: boolean; onClick?: () => void; }
export function Card({ children, className = '', hover = false, gold = false, onClick }: CardProps) {
  return (
    <div
      onClick={onClick}
      className={`rounded-xl card-glass shadow-card overflow-hidden
        ${hover ? 'card-glass-hover cursor-pointer' : ''}
        ${gold  ? 'border-gold-400/25 shadow-gold'   : ''}
        ${className}`}
    >
      {children}
    </div>
  );
}
export function CardHeader({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <div className={`px-5 py-4 border-b border-gold-400/10 ${className}`}>{children}</div>;
}
export function CardBody({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <div className={`px-5 py-4 ${className}`}>{children}</div>;
}

// ── Button ─────────────────────────────────────────────────────
type BtnVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline';
type BtnSize    = 'sm' | 'md' | 'lg' | 'xl';
interface BtnProps { children: React.ReactNode; variant?: BtnVariant; size?: BtnSize; className?: string; disabled?: boolean; onClick?: () => void; type?: 'button' | 'submit'; }
export function Button({ children, variant = 'primary', size = 'md', className = '', disabled = false, onClick, type = 'button' }: BtnProps) {
  const V: Record<BtnVariant, string> = {
    primary:   'bg-gold-400 hover:bg-gold-300 active:bg-gold-500 text-felt-950 shadow-gold hover:shadow-gold-lg',
    secondary: 'bg-felt-700 hover:bg-felt-600 border border-gold-400/20 hover:border-gold-400/40 text-ivory-100',
    ghost:     'hover:bg-felt-700/60 text-ivory-200/70 hover:text-ivory-100',
    danger:    'bg-crimson-600 hover:bg-crimson-500 text-white',
    outline:   'border border-gold-400/30 hover:border-gold-400/60 text-gold-300 hover:bg-gold-400/10',
  };
  const S: Record<BtnSize, string> = {
    sm: 'px-3 py-1.5 text-xs', md: 'px-4 py-2 text-sm', lg: 'px-5 py-2.5 text-sm', xl: 'px-7 py-3.5 text-base',
  };
  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className={`font-body font-medium rounded-lg transition-all duration-200 inline-flex items-center gap-2
        disabled:opacity-40 disabled:cursor-not-allowed ${V[variant]} ${S[size]} ${className}`}
    >
      {children}
    </button>
  );
}

// ── Badge ──────────────────────────────────────────────────────
type BadgeVariant = 'default' | 'gold' | 'green' | 'red' | 'blue' | 'active' | 'completed' | 'pending';
export function Badge({ children, variant = 'default', className = '' }: { children: React.ReactNode; variant?: BadgeVariant; className?: string }) {
  const V: Record<BadgeVariant, string> = {
    default:   'bg-felt-700 text-ivory-200/70 border border-felt-600',
    gold:      'bg-gold-400/15 text-gold-300 border border-gold-400/25',
    green:     'bg-emerald-500/15 text-emerald-400 border border-emerald-500/25',
    red:       'bg-crimson-500/15 text-crimson-400 border border-crimson-500/25',
    blue:      'bg-blue-500/15 text-blue-300 border border-blue-500/25',
    active:    'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 animate-pulse',
    completed: 'bg-felt-700/80 text-ivory-200/60 border border-felt-600',
    pending:   'bg-gold-400/10 text-gold-400 border border-gold-400/20',
  };
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium font-body ${V[variant]} ${className}`}>
      {children}
    </span>
  );
}

// ── Status badges using domain types ─────────────────────────
export function WagerStatusBadge({ status }: { status: WagerStatus }) {
  const map: Record<WagerStatus, { label: string; variant: BadgeVariant }> = {
    proposed:  { label: 'Proposed',  variant: 'pending' },
    accepted:  { label: 'Accepted',  variant: 'blue' },
    declined:  { label: 'Declined',  variant: 'red' },
    cancelled: { label: 'Cancelled', variant: 'default' },
    active:    { label: '● Active',  variant: 'active' },
    settled:   { label: 'Settled',   variant: 'completed' },
    voided:    { label: 'Voided',    variant: 'default' },
  };
  const { label, variant } = map[status];
  return <Badge variant={variant}>{label}</Badge>;
}

export function MatchStatusBadge({ status }: { status: MatchStatus }) {
  const map: Record<MatchStatus, { label: string; variant: BadgeVariant }> = {
    pending:   { label: 'Pending',   variant: 'pending' },
    active:    { label: '● Live',    variant: 'active' },
    completed: { label: 'Completed', variant: 'completed' },
    cancelled: { label: 'Cancelled', variant: 'default' },
    disputed:  { label: 'Disputed',  variant: 'red' },
  };
  const { label, variant } = map[status];
  return <Badge variant={variant}>{label}</Badge>;
}

export function ObligationStatusBadge({ status }: { status: ObligationStatus }) {
  const map: Record<ObligationStatus, { label: string; variant: BadgeVariant }> = {
    outstanding:    { label: 'Owed',       variant: 'red' },
    partially_paid: { label: 'Partial',    variant: 'gold' },
    paid:           { label: 'Paid',       variant: 'green' },
    disputed:       { label: 'Disputed',   variant: 'red' },
    written_off:    { label: 'Written Off',variant: 'default' },
  };
  const { label, variant } = map[status];
  return <Badge variant={variant}>{label}</Badge>;
}

export function SettlementStatusBadge({ status }: { status: SettlementStatus }) {
  const map: Record<SettlementStatus, { label: string; variant: BadgeVariant }> = {
    pending:     { label: 'Pending',     variant: 'pending' },
    confirmed:   { label: 'Confirmed',   variant: 'blue' },
    paid:        { label: 'Paid',        variant: 'green' },
    disputed:    { label: 'Disputed',    variant: 'red' },
    written_off: { label: 'Written Off', variant: 'default' },
  };
  const { label, variant } = map[status];
  return <Badge variant={variant}>{label}</Badge>;
}

// ── Balance display ────────────────────────────────────────────
export function Balance({ amount, size = 'md', className = '' }: { amount: number; size?: 'sm' | 'md' | 'lg' | 'xl'; className?: string }) {
  const color = amount >= 0 ? 'text-emerald-400' : 'text-crimson-400';
  const sizes = { sm: 'text-sm', md: 'text-base', lg: 'text-xl', xl: 'text-3xl' };
  const sign  = amount >= 0 ? '+' : '-';
  return (
    <span className={`font-mono font-medium tabular-nums ${color} ${sizes[size]} ${className}`}>
      {sign}{APP_CONFIG.CURRENCY_SYMBOL}{Math.abs(amount).toFixed(2)}
    </span>
  );
}

// ── Debt display (always shows direction) ─────────────────────
export function DebtAmount({ amount, className = '' }: { amount: number; className?: string }) {
  return (
    <span className={`font-mono font-medium tabular-nums text-crimson-400 ${className}`}>
      {APP_CONFIG.CURRENCY_SYMBOL}{Math.abs(amount).toFixed(2)}
    </span>
  );
}

// ── Player avatar ──────────────────────────────────────────────
export function PlayerAvatar({ user, size = 'md', className = '' }: { user: User; size?: 'sm' | 'md' | 'lg' | 'xl'; className?: string }) {
  const sizes = { sm: 'w-7 h-7 text-xs', md: 'w-9 h-9 text-sm', lg: 'w-11 h-11 text-base', xl: 'w-14 h-14 text-lg' };
  const initials = user.display_name.slice(0, 2).toUpperCase();
  return (
    <div
      className={`${sizes[size]} rounded-full flex items-center justify-center font-display font-bold shrink-0 ${className}`}
      style={{ backgroundColor: `${user.avatar_color}22`, color: user.avatar_color, border: `1.5px solid ${user.avatar_color}44` }}
    >
      {initials}
    </div>
  );
}

// ── Input / Select ─────────────────────────────────────────────
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> { label?: string; error?: string; }
export function Input({ label, id, error, className = '', ...props }: InputProps) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && <label htmlFor={id} className="text-xs font-medium text-ivory-200/60 font-body uppercase tracking-wider">{label}</label>}
      <input
        id={id}
        className={`input-gold bg-felt-900 border ${error ? 'border-crimson-500' : 'border-felt-600'} rounded-lg px-3 py-2.5 text-sm text-ivory-100 placeholder-ivory-200/25 w-full font-body ${className}`}
        {...props}
      />
      {error && <span className="text-xs text-crimson-400">{error}</span>}
    </div>
  );
}

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> { label?: string; }
export function Select({ label, id, children, className = '', ...props }: SelectProps) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && <label htmlFor={id} className="text-xs font-medium text-ivory-200/60 font-body uppercase tracking-wider">{label}</label>}
      <select
        id={id}
        className={`input-gold bg-felt-900 border border-felt-600 rounded-lg px-3 py-2.5 text-sm text-ivory-100 w-full font-body cursor-pointer ${className}`}
        {...props}
      >
        {children}
      </select>
    </div>
  );
}

// ── Layout helpers ─────────────────────────────────────────────
export function GoldDivider({ className = '' }: { className?: string }) {
  return <div className={`gold-divider my-4 ${className}`} />;
}

export function SectionTitle({
  children, subtitle, action, className = '',
}: { children: React.ReactNode; subtitle?: string; action?: React.ReactNode; className?: string }) {
  return (
    <div className={`flex items-start justify-between gap-2 mb-4 ${className}`}>
      <div>
        <h2 className="text-xl font-display font-semibold text-ivory-100">{children}</h2>
        {subtitle && <p className="text-xs text-ivory-200/45 mt-0.5 font-body">{subtitle}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

export function StatCell({ label, value, color }: { label: string; value: string | number; color?: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs text-ivory-200/45 font-body uppercase tracking-wider">{label}</span>
      <span className={`text-sm font-mono font-medium ${color ?? 'text-ivory-100'}`}>{value}</span>
    </div>
  );
}

export function EmptyState({ icon, title, description, action }: {
  icon?: React.ReactNode; title: string; description?: string; action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-10 text-center">
      {icon && <div className="text-3xl mb-3 opacity-30">{icon}</div>}
      <p className="font-display text-ivory-100/55 text-lg">{title}</p>
      {description && <p className="font-body text-ivory-200/35 text-sm mt-1">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function Spinner({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const s = { sm: 'w-4 h-4', md: 'w-6 h-6', lg: 'w-8 h-8' };
  return (
    <div className={`${s[size]} border-2 border-gold-400/20 border-t-gold-400 rounded-full animate-spin`} />
  );
}

export function LoadingCard() {
  return (
    <Card className="flex items-center justify-center py-12">
      <Spinner />
    </Card>
  );
}

export function SuitRow({ className = '' }: { className?: string }) {
  return (
    <div className={`flex gap-3 text-lg opacity-[0.18] select-none ${className}`}>
      <span className="text-crimson-400">♥</span>
      <span className="text-ivory-100">♠</span>
      <span className="text-crimson-400">♦</span>
      <span className="text-ivory-100">♣</span>
    </div>
  );
}

// ── Obligation row (reusable) ──────────────────────────────────
import type { ObligationWithParties } from '@/types';
import { obligationBalance } from '@/lib/calculations';

export function ObligationRow({ ob, currentUserId }: { ob: ObligationWithParties; currentUserId: string }) {
  const remaining = obligationBalance(ob);
  const userIsDebtor = ob.debtor_id === currentUserId;
  return (
    <div className="flex items-center justify-between py-3 px-4 rounded-lg bg-felt-800/50 border border-felt-600/40">
      <div className="min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          {userIsDebtor
            ? <span className="text-sm font-body text-ivory-100">You owe <strong>{ob.creditor.display_name}</strong></span>
            : <span className="text-sm font-body text-ivory-100"><strong>{ob.debtor.display_name}</strong> owes you</span>
          }
          <ObligationStatusBadge status={ob.status} />
        </div>
        {ob.notes && <p className="text-xs text-ivory-200/40 font-body mt-0.5 italic">{ob.notes}</p>}
        {ob.status === 'partially_paid' && (
          <p className="text-xs text-ivory-200/40 font-body mt-0.5">
            ${ob.amount_paid.toFixed(2)} paid of ${ob.amount.toFixed(2)}
          </p>
        )}
      </div>
      <DebtAmount amount={remaining} className="ml-4 shrink-0" />
    </div>
  );
}

import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Swords, PlusCircle, Clock, Users, Banknote,
  Inbox, Menu, X, UserCog,
} from 'lucide-react';
import { useUIStore } from '@/stores/useUIStore';
import { SuitRow } from '@/components/ui';

const NAV = [
  { to: '/',               label: 'Dashboard',    icon: LayoutDashboard },
  { to: '/matches',        label: 'Active',       icon: Swords },
  { to: '/create',         label: 'New Match',    icon: PlusCircle },
  { to: '/history',        label: 'History',      icon: Clock },
  { to: '/players',        label: 'Standings',    icon: Users },
  { to: '/settle',         label: 'Settlements',  icon: Banknote },
  { to: '/inbox',          label: 'Wager Inbox',  icon: Inbox },
  { to: '/manage-players', label: 'Manage Players', icon: UserCog },
];

// Bottom nav shows the first 5 items (most common actions on mobile)
const BOTTOM_NAV = NAV.slice(0, 5);

function NavItem({
  to, label, icon: Icon, onClick,
}: { to: string; label: string; icon: React.ElementType; onClick?: () => void }) {
  return (
    <NavLink
      to={to}
      onClick={onClick}
      end={to === '/'}
      className={({ isActive }) =>
        `flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all duration-200 font-body text-sm
        ${isActive
          ? 'bg-gold-400/12 text-gold-300 border border-gold-400/18'
          : 'text-ivory-200/55 hover:text-ivory-100 hover:bg-felt-700/55'}`
      }
    >
      {({ isActive }) => (
        <>
          <Icon size={15} className={isActive ? 'text-gold-400' : ''} />
          <span>{label}</span>
          {isActive && <span className="ml-auto w-1 h-1 rounded-full bg-gold-400" />}
        </>
      )}
    </NavLink>
  );
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { sidebarOpen, setSidebarOpen } = useUIStore();

  return (
    <div className="min-h-screen flex bg-felt-950">
      {/* Sidebar — desktop */}
      <aside className="hidden md:flex flex-col w-56 shrink-0 bg-felt-900 border-r border-gold-400/10">
        <div className="px-5 py-5 border-b border-gold-400/10">
          <div className="flex items-center gap-2.5 mb-3">
            <div className="w-8 h-8 rounded-lg bg-gold-400/15 border border-gold-400/25 flex items-center justify-center text-gold-400 font-display font-bold text-xs">
              CL
            </div>
            <span className="font-display text-base font-semibold text-ivory-100">CribLedger</span>
          </div>
          <SuitRow />
        </div>

        <nav className="flex-1 px-3 py-4 flex flex-col gap-0.5 overflow-y-auto">
          {NAV.map(n => <NavItem key={n.to} {...n} />)}
        </nav>

        <div className="px-5 py-3 border-t border-gold-400/10">
          <p className="text-[10px] text-ivory-200/20 font-body">Private Cribbage League · v2</p>
        </div>
      </aside>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setSidebarOpen(false)}
          />
          <aside className="absolute left-0 top-0 bottom-0 w-60 bg-felt-900 border-r border-gold-400/10 flex flex-col z-10">
            <div className="px-5 py-5 border-b border-gold-400/10 flex items-center justify-between">
              <span className="font-display text-base font-semibold text-ivory-100">CribLedger</span>
              <button onClick={() => setSidebarOpen(false)} className="text-ivory-200/40 hover:text-ivory-100">
                <X size={18} />
              </button>
            </div>
            <nav className="flex-1 px-3 py-4 flex flex-col gap-0.5 overflow-y-auto">
              {NAV.map(n => (
                <NavItem key={n.to} {...n} onClick={() => setSidebarOpen(false)} />
              ))}
            </nav>
          </aside>
        </div>
      )}

      {/* Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile header */}
        <header className="md:hidden flex items-center justify-between px-4 py-3 bg-felt-900 border-b border-gold-400/10 sticky top-0 z-40">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-md bg-gold-400/15 border border-gold-400/25 flex items-center justify-center text-gold-400 font-display font-bold text-[10px]">
              CL
            </div>
            <span className="font-display text-sm font-semibold text-ivory-100">CribLedger</span>
          </div>
          <button
            onClick={() => setSidebarOpen(true)}
            className="text-ivory-200/55 hover:text-ivory-100 p-1"
          >
            <Menu size={20} />
          </button>
        </header>

        <main className="flex-1 overflow-auto">
          <div className="max-w-4xl mx-auto px-4 py-6 pb-24 md:pb-8">
            {children}
          </div>
        </main>
      </div>

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 bg-felt-900/95 backdrop-blur-md border-t border-gold-400/10 z-40">
        <div className="flex items-center justify-around px-1 py-2">
          {BOTTOM_NAV.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                `flex flex-col items-center gap-0.5 px-2 py-1 rounded-lg transition-colors
                ${isActive ? 'text-gold-400' : 'text-ivory-200/35 hover:text-ivory-100'}`
              }
            >
              {({ isActive }) => (
                <>
                  <Icon size={17} className={isActive ? 'text-gold-400' : ''} />
                  <span className="text-[9px] font-body">{label}</span>
                </>
              )}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
}

import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Card, CardHeader, CardBody, Balance, PlayerAvatar, Badge,
  Button, SectionTitle, SuitRow, EmptyState, LoadingCard,
  MatchStatusBadge, ObligationStatusBadge, DebtAmount, GoldDivider,
} from '@/components/ui';
import {
  useUserBalances, useUsers, useActiveMatches,
  usePendingMatches, useCompletedMatches, useOutstandingObligations,
} from '@/hooks/useData';
import { PlusCircle, Clock, Trophy, Swords, Banknote, ChevronRight, Timer } from 'lucide-react';
import { formatCurrency, formatRelativeTime, obligationBalance } from '@/lib/calculations';

export default function Dashboard() {
  const navigate = useNavigate();
  const { data: balances, isLoading: balLoading }   = useUserBalances();
  const { data: users = [] }                         = useUsers();
  const { data: activeMatches = [] }                 = useActiveMatches();
  const { data: pendingMatches = [] }                = usePendingMatches();
  const { data: completedMatches = [] }              = useCompletedMatches();
  const { data: outstanding = [] }                   = useOutstandingObligations();

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-3xl font-display font-bold text-ivory-100">The Ledger</h1>
          <p className="text-sm text-ivory-200/45 font-body mt-0.5">Private cribbage league</p>
        </div>
        <SuitRow />
      </div>

      {/* Stats row — now 5 stats including Pending */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
        {[
          { label: 'Players',   value: users.length,            icon: '♠' },
          { label: 'Pending',   value: pendingMatches.length,   icon: '⏳', pending: pendingMatches.length > 0 },
          { label: 'Active',    value: activeMatches.length,    icon: '●', accent: activeMatches.length > 0 },
          { label: 'Completed', value: completedMatches.length, icon: '♣' },
          { label: 'Wagers', value: 0, icon: '⚡' },
          { label: 'Unpaid',    value: outstanding.length,      icon: '♦', warn: outstanding.length > 0 },
        ].map(({ label, value, icon, accent, warn, pending }) => (
          <Card
            key={label}
            className={accent ? 'animate-pulse-gold' : ''}
            hover={pending || accent}
            onClick={
              pending ? () => navigate('/matches') :
              accent  ? () => navigate('/matches') :
              undefined
            }
          >
            <CardBody className="py-3">
              <div className="flex items-center gap-1.5 mb-1">
                <span className={`text-sm ${accent ? 'text-emerald-400' : warn ? 'text-crimson-400' : pending && value > 0 ? 'text-amber-400' : 'text-gold-400/50'}`}>
                  {icon}
                </span>
                <span className="text-xs text-ivory-200/45 font-body uppercase tracking-wider">{label}</span>
              </div>
              <p className={`text-2xl font-display font-bold ${
                warn    && value > 0 ? 'text-crimson-400' :
                accent  && value > 0 ? 'text-emerald-400' :
                pending && value > 0 ? 'text-amber-300'   :
                'text-ivory-100'
              }`}>{value}</p>
            </CardBody>
          </Card>
        ))}
      </div>

      {/* ── Pending matches alert ── */}
      {pendingMatches.length > 0 && (
        <Card className="mb-4 cursor-pointer border border-amber-400/20 bg-amber-400/4"
          onClick={() => navigate('/matches')}>
          <CardBody className="py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Timer size={14} className="text-amber-400 shrink-0" />
                <span className="text-sm font-body text-ivory-100">
                  <span className="font-semibold text-amber-300">{pendingMatches.length} match{pendingMatches.length > 1 ? 'es' : ''}</span>
                  <span className="text-ivory-200/55"> waiting to start</span>
                </span>
              </div>
              <span className="text-xs text-amber-400/70 font-body flex items-center gap-1">
                Lobby <ChevronRight size={12} />
              </span>
            </div>
          </CardBody>
        </Card>
      )}

      {/* Active match alert */}
      {activeMatches.length > 0 && (
        <Card gold className="mb-5 cursor-pointer" onClick={() => navigate(`/matches/${activeMatches[0].id}`)}>
          <CardBody className="py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-sm font-body text-ivory-100">
                  <span className="font-semibold">{activeMatches.length} match{activeMatches.length > 1 ? 'es' : ''}</span>
                  <span className="text-ivory-200/55"> in progress</span>
                </span>
              </div>
              <span className="text-xs text-gold-400 font-body flex items-center gap-1">View <ChevronRight size={12} /></span>
            </div>
          </CardBody>
        </Card>
      )}

      <div className="grid md:grid-cols-5 gap-5">
        {/* Leaderboard */}
        <Card className="md:col-span-3">
          <CardHeader>
            <SectionTitle subtitle="Ranked by net balance from transactions">
              Leaderboard
            </SectionTitle>
          </CardHeader>
          <CardBody className="py-2 px-2">
            {balLoading ? (
              <div className="py-6 flex justify-center"><div className="w-5 h-5 border-2 border-gold-400/20 border-t-gold-400 rounded-full animate-spin" /></div>
            ) : (balances ?? []).length === 0 ? (
              <EmptyState icon="♠" title="No balances yet" description="Complete a match to generate ledger entries" />
            ) : (balances ?? []).map((ub, i) => {
              const user = users.find(u => u.id === ub.user_id);
              if (!user) return null;
              const rankIcons = ['♛', '2', '3'];
              return (
                <div
                  key={ub.user_id}
                  className="flex items-center gap-3 py-2.5 px-3 rounded-lg hover:bg-felt-700/35 cursor-pointer transition-all"
                  onClick={() => navigate(`/players/${user.id}`)}
                >
                  <span className={`text-base font-display w-5 text-center shrink-0 ${i === 0 ? 'text-gold-300' : i === 1 ? 'text-ivory-200/70' : i === 2 ? 'text-amber-700' : 'text-ivory-200/30'}`}>
                    {i < 3 ? rankIcons[i] : i + 1}
                  </span>
                  <PlayerAvatar user={user} size="sm" />
                  <span className="flex-1 text-sm font-body text-ivory-100">{user.display_name}</span>
                  <Balance amount={ub.balance} size="sm" />
                </div>
              );
            })}
          </CardBody>
        </Card>

        {/* Right column */}
        <div className="md:col-span-2 flex flex-col gap-4">
          <Card>
            <CardBody>
              <p className="text-xs text-ivory-200/45 font-body uppercase tracking-wider mb-3">Quick Actions</p>
              <div className="flex flex-col gap-2">
                <Button variant="primary" size="md" className="w-full justify-center" onClick={() => navigate('/create')}>
                  <PlusCircle size={15} /> New Match
                </Button>
                <Button variant="secondary" size="md" className="w-full justify-center" onClick={() => navigate('/settle')}>
                  <Banknote size={15} /> Settlements
                </Button>
                <Button variant="ghost" size="md" className="w-full justify-center" onClick={() => navigate('/history')}>
                  <Clock size={14} /> View History
                </Button>
              </div>
            </CardBody>
          </Card>

          {/* Outstanding obligations */}
          <Card className="flex-1">
            <CardHeader>
              <p className="text-sm font-display font-semibold text-ivory-100">Open Debts</p>
              <p className="text-xs text-ivory-200/40 font-body mt-0.5">Obligations awaiting payment</p>
            </CardHeader>
            <CardBody className="pt-2 px-3 flex flex-col gap-2">
              {outstanding.length === 0 ? (
                <EmptyState icon="♣" title="All clear" description="No outstanding debts" />
              ) : outstanding.slice(0, 4).map(ob => {
                const debtor   = users.find(u => u.id === ob.debtor_id);
                const creditor = users.find(u => u.id === ob.creditor_id);
                const remaining = obligationBalance(ob);
                return (
                  <div key={ob.id} className="flex items-center justify-between py-2 px-3 rounded-lg bg-felt-800/50 border border-felt-600/30">
                    <div className="flex items-center gap-2 min-w-0">
                      {debtor && <PlayerAvatar user={debtor} size="sm" />}
                      <span className="text-xs text-ivory-200/60 font-body truncate">
                        → {creditor?.display_name}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <DebtAmount amount={remaining} className="text-xs" />
                      <ObligationStatusBadge status={ob.status} />
                    </div>
                  </div>
                );
              })}
              {outstanding.length > 4 && (
                <Button variant="ghost" size="sm" className="w-full justify-center" onClick={() => navigate('/settle')}>
                  +{outstanding.length - 4} more
                </Button>
              )}
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
}

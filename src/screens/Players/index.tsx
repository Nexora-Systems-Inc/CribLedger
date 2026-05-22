import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useUsers, useUserBalances, useObligations } from '@/hooks/useData';
import {
  Card, CardBody, Balance, PlayerAvatar, SectionTitle, SuitRow,
  LoadingCard, DebtAmount,
} from '@/components/ui';
import { ChevronRight, Target, Trophy } from 'lucide-react';
import { bilateralObligationNet } from '@/lib/mockData';
import type { Obligation } from '@/types';

export default function Players() {
  const navigate = useNavigate();
  const { data: users      = [], isLoading: uLoading } = useUsers();
  const { data: balances   = [] }                      = useUserBalances();
  const { data: obligations = [] }                     = useObligations();

  if (uLoading) return <LoadingCard />;

  const leaderboard = users.map(u => {
    const bal = balances.find(b => b.user_id === u.id);
    return { ...u, balance: bal?.balance ?? 0 };
  }).sort((a, b) => b.balance - a.balance);

  const upCount   = leaderboard.filter(u => u.balance > 0).length;
  const downCount = leaderboard.filter(u => u.balance < 0).length;

  return (
    <div className="animate-fade-in">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-3xl font-display font-bold text-ivory-100">Players</h1>
          <p className="text-sm text-ivory-200/45 font-body mt-0.5">All members, ranked by balance</p>
        </div>
        <SuitRow />
      </div>

      <div className="grid grid-cols-3 gap-3 mb-6">
        <Card><CardBody className="py-3 text-center">
          <p className="text-2xl font-display font-bold text-ivory-100">{leaderboard.length}</p>
          <p className="text-xs text-ivory-200/40 font-body mt-0.5">Players</p>
        </CardBody></Card>
        <Card><CardBody className="py-3 text-center">
          <p className="text-2xl font-display font-bold text-emerald-400">{upCount}</p>
          <p className="text-xs text-ivory-200/40 font-body mt-0.5">Up</p>
        </CardBody></Card>
        <Card><CardBody className="py-3 text-center">
          <p className="text-2xl font-display font-bold text-crimson-400">{downCount}</p>
          <p className="text-xs text-ivory-200/40 font-body mt-0.5">Down</p>
        </CardBody></Card>
      </div>

      <SectionTitle subtitle="Tap a player for full profile">Standings</SectionTitle>
      {leaderboard.map((user, i) => {
        const rankIcons = ['♛', '2', '3'];
        const outstanding = obligations.filter(
          o => (o.debtor_id === user.id || o.creditor_id === user.id) &&
               (o.status === 'outstanding' || o.status === 'partially_paid'),
        );
        const totalOwed = outstanding
          .filter(o => o.debtor_id === user.id)
          .reduce((s, o) => s + (o.amount - o.amount_paid), 0);
        const totalOwing = outstanding
          .filter(o => o.creditor_id === user.id)
          .reduce((s, o) => s + (o.amount - o.amount_paid), 0);

        return (
          <Card key={user.id} hover className="mb-3" onClick={() => navigate(`/players/${user.id}`)}>
            <CardBody>
              <div className="flex items-center gap-3">
                <span className={`text-base font-display w-6 text-center shrink-0 ${
                  i === 0 ? 'text-gold-300' : i === 1 ? 'text-ivory-200/65' : i === 2 ? 'text-amber-700' : 'text-ivory-200/25'
                }`}>
                  {i < 3 ? rankIcons[i] : i + 1}
                </span>
                <PlayerAvatar user={user} size="md" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-body font-medium text-ivory-100">{user.display_name}</p>
                  {(totalOwed > 0 || totalOwing > 0) && (
                    <p className="text-xs text-ivory-200/35 font-body mt-0.5">
                      {totalOwed > 0  && <span className="text-crimson-400/70">owes ${totalOwed.toFixed(2)}</span>}
                      {totalOwed > 0 && totalOwing > 0 && <span className="mx-1.5 text-ivory-200/20">·</span>}
                      {totalOwing > 0 && <span className="text-emerald-400/70">owed ${totalOwing.toFixed(2)}</span>}
                    </p>
                  )}
                </div>
                <Balance amount={user.balance} size="sm" />
                <ChevronRight size={13} className="text-gold-400/25 shrink-0" />
              </div>
            </CardBody>
          </Card>
        );
      })}
    </div>
  );
}

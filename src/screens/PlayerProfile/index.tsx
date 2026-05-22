import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Card, CardBody, CardHeader, Button, Balance, PlayerAvatar,
  GoldDivider, SuitRow, MatchStatusBadge, ObligationStatusBadge,
  DebtAmount, EmptyState, LoadingCard, StatCell,
} from '@/components/ui';
import {
  useUser, useUserBalances, useMatches, useObligationsForUser,
  useExternalWagers, useUsers,
} from '@/hooks/useData';
import { obligationBalance, formatDate, calcMatchPayout } from '@/lib/calculations';
import { ArrowLeft, Trophy, Target, TrendingDown, Banknote } from 'lucide-react';

export default function PlayerProfile() {
  const { id = '' }   = useParams();
  const navigate      = useNavigate();

  const { data: user,         isLoading: uLoading }  = useUser(id);
  const { data: balances    = [] }                   = useUserBalances();
  const { data: allMatches  = [] }                   = useMatches();
  const { data: obligations = [] }                   = useObligationsForUser(id);
  const { data: allWagers   = [] }                   = useExternalWagers();
  const { data: allUsers    = [] }                   = useUsers();

  if (uLoading) return <LoadingCard />;
  if (!user) return <EmptyState icon="♠" title="Player not found" />;

  const balance   = balances.find(b => b.user_id === id)?.balance ?? 0;
  const myMatches = allMatches.filter(m => m.player_a_id === id || m.player_b_id === id);
  const completed = myMatches.filter(m => m.status === 'completed');
  const wins      = completed.filter(m => m.winner_id === id).length;
  const losses    = completed.length - wins;
  const winRate   = completed.length > 0 ? Math.round((wins / completed.length) * 100) : 0;

  const myWagers  = allWagers.filter(w => w.proposer_id === id || w.counterparty_id === id);
  const outstandingObs = obligations.filter(o => o.status === 'outstanding' || o.status === 'partially_paid');
  const totalOwed   = outstandingObs.filter(o => o.debtor_id   === id).reduce((s, o) => s + obligationBalance(o), 0);
  const totalOwing  = outstandingObs.filter(o => o.creditor_id === id).reduce((s, o) => s + obligationBalance(o), 0);

  return (
    <div className="animate-fade-in max-w-2xl mx-auto">
      <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="mb-5">
        <ArrowLeft size={13} /> Players
      </Button>

      {/* Header */}
      <Card className="mb-5">
        <CardBody>
          <div className="flex items-start gap-4">
            <PlayerAvatar user={user} size="xl" />
            <div className="flex-1">
              <h1 className="text-2xl font-display font-bold text-ivory-100">{user.display_name}</h1>
              <p className="text-xs text-ivory-200/35 font-body mt-0.5">Member since {formatDate(user.created_at)}</p>
              <div className="mt-3">
                <Balance amount={balance} size="xl" />
                <p className="text-xs text-ivory-200/35 font-body mt-0.5">Net balance from transactions</p>
              </div>
            </div>
          </div>

          <GoldDivider />

          {/* Win rate bar */}
          <div className="flex flex-col gap-1.5">
            <div className="flex justify-between text-xs font-body text-ivory-200/45">
              <span>{wins}W</span>
              <span className="text-gold-300 font-mono">{winRate}% win rate</span>
              <span>{losses}L</span>
            </div>
            <div className="h-1.5 rounded-full bg-felt-700 overflow-hidden">
              <div className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 transition-all duration-700 rounded-full"
                style={{ width: `${winRate}%` }} />
            </div>
          </div>
        </CardBody>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-5">
        {[
          { label: 'Matches',  value: completed.length, icon: Target },
          { label: 'Wins',     value: wins,     icon: Trophy,       color: 'text-emerald-400' },
          { label: 'Losses',   value: losses,   icon: TrendingDown, color: 'text-crimson-400' },
          { label: 'Owed',     value: totalOwed   > 0 ? `$${totalOwed.toFixed(2)}`   : '—', icon: Banknote, color: totalOwed   > 0 ? 'text-crimson-400' : undefined },
          { label: 'Owing',    value: totalOwing  > 0 ? `$${totalOwing.toFixed(2)}`  : '—', icon: Banknote, color: totalOwing  > 0 ? 'text-emerald-400' : undefined },
          { label: 'Side Bets', value: myWagers.length, icon: Target },
        ].map(({ label, value, icon: Icon, color }) => (
          <Card key={label}>
            <CardBody className="py-3">
              <div className="flex items-center gap-1.5 mb-1">
                <Icon size={11} className="text-gold-400/45" />
                <span className="text-xs text-ivory-200/40 font-body uppercase tracking-wider">{label}</span>
              </div>
              <p className={`text-xl font-display font-bold ${color ?? 'text-ivory-100'}`}>{value}</p>
            </CardBody>
          </Card>
        ))}
      </div>

      {/* Match history */}
      <Card className="mb-5">
        <CardHeader>
          <p className="text-sm font-display font-semibold text-ivory-100">Match History</p>
        </CardHeader>
        <CardBody className="pt-2 flex flex-col gap-2">
          {completed.length === 0 ? (
            <EmptyState icon="♣" title="No matches yet" />
          ) : completed.slice(0, 8).map(match => {
            const isA   = match.player_a_id === id;
            const oppId = isA ? match.player_b_id : match.player_a_id;
            const opp   = allUsers.find(u => u.id === oppId);
            const won   = match.winner_id === id;
            const payout = match.player_a_score !== null && match.player_b_score !== null
              ? calcMatchPayout(match.player_a_score, match.player_b_score, match.point_wager, match.winner_bonus)
              : null;

            return (
              <div key={match.id}
                className="flex items-center justify-between py-2.5 px-3 rounded-lg bg-felt-800/40 border border-felt-600/30 cursor-pointer hover:border-gold-400/18 transition-colors"
                onClick={() => navigate(`/matches/${match.id}`)}>
                <div className="flex items-center gap-2">
                  {opp && <PlayerAvatar user={opp} size="sm" />}
                  <div>
                    <span className="text-xs text-ivory-200/55 font-body">vs {opp?.display_name}</span>
                    <p className="text-xs text-ivory-200/30 font-body">
                      {isA ? match.player_a_score : match.player_b_score} – {isA ? match.player_b_score : match.player_a_score}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {payout !== null && (
                    <Balance amount={won ? payout : -payout} size="sm" />
                  )}
                  <span className={`text-xs font-mono px-1.5 py-0.5 rounded ${won ? 'text-emerald-400 bg-emerald-500/10' : 'text-crimson-400 bg-crimson-500/10'}`}>
                    {won ? 'W' : 'L'}
                  </span>
                </div>
              </div>
            );
          })}
        </CardBody>
      </Card>

      {/* Outstanding obligations */}
      {outstandingObs.length > 0 && (
        <Card>
          <CardHeader>
            <p className="text-sm font-display font-semibold text-ivory-100">Open Obligations</p>
          </CardHeader>
          <CardBody className="pt-2 flex flex-col gap-2">
            {outstandingObs.map(ob => {
              const other = allUsers.find(u => u.id === (ob.debtor_id === id ? ob.creditor_id : ob.debtor_id));
              const remaining = obligationBalance(ob);
              const youOwe = ob.debtor_id === id;
              return (
                <div key={ob.id} className="flex items-center justify-between py-2.5 px-3 rounded-lg bg-felt-800/40 border border-felt-600/30">
                  <div className="flex items-center gap-2">
                    {other && <PlayerAvatar user={other} size="sm" />}
                    <div>
                      <span className="text-xs text-ivory-100 font-body">
                        {youOwe ? 'You owe' : 'Owed by'} <strong>{other?.display_name}</strong>
                      </span>
                      <p className="text-xs text-ivory-200/30 font-body capitalize">{ob.source.replace('_', ' ')}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <DebtAmount amount={remaining} className="text-sm" />
                    <ObligationStatusBadge status={ob.status} />
                  </div>
                </div>
              );
            })}
          </CardBody>
        </Card>
      )}
    </div>
  );
}

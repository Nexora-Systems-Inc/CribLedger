import React, { useState, useMemo } from 'react';
import {
  Card, CardBody, CardHeader, Button, SuitRow, EmptyState,
  PlayerAvatar, MatchStatusBadge, WagerStatusBadge, GoldDivider,
  DebtAmount, LoadingCard,
} from '@/components/ui';
import { useCompletedMatches, useUsers, useObligations, useExternalWagers } from '@/hooks/useData';
import { calcMatchPayout, formatDate, impliedOddsLabel, obligationBalance } from '@/lib/calculations';
import { Filter, X, Clock, Trophy } from 'lucide-react';

export default function MatchHistory() {
  const { data: matches = [], isLoading } = useCompletedMatches();
  const { data: users   = [] }            = useUsers();
  const { data: obligations = [] }        = useObligations();
  const { data: wagers  = [] }            = useExternalWagers();

  const [filterPlayerId, setFilterPlayerId] = useState('');
  const [filterRange,    setFilterRange]    = useState('');
  const [expandedId,     setExpandedId]     = useState<string | null>(null);

  const filtered = useMemo(() => {
    let r = matches;
    if (filterPlayerId) r = r.filter(m => m.player_a_id === filterPlayerId || m.player_b_id === filterPlayerId);
    if (filterRange === '7d')  r = r.filter(m => Date.now() - new Date(m.completed_at!).getTime() < 7  * 86_400_000);
    if (filterRange === '30d') r = r.filter(m => Date.now() - new Date(m.completed_at!).getTime() < 30 * 86_400_000);
    return r;
  }, [matches, filterPlayerId, filterRange]);

  if (isLoading) return <LoadingCard />;

  return (
    <div className="animate-fade-in">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-3xl font-display font-bold text-ivory-100">History</h1>
          <p className="text-sm text-ivory-200/45 font-body mt-0.5">All completed matches</p>
        </div>
        <SuitRow />
      </div>

      {/* Filters */}
      <Card className="mb-5">
        <CardBody className="py-3">
          <div className="flex items-center gap-2 flex-wrap">
            <Filter size={13} className="text-ivory-200/35 shrink-0" />
            <select value={filterPlayerId} onChange={e => setFilterPlayerId(e.target.value)}
              className="input-gold bg-felt-800 border border-felt-600 rounded-lg px-2.5 py-1.5 text-xs text-ivory-100 font-body">
              <option value="">All players</option>
              {users.map(u => <option key={u.id} value={u.id}>{u.display_name}</option>)}
            </select>
            <select value={filterRange} onChange={e => setFilterRange(e.target.value)}
              className="input-gold bg-felt-800 border border-felt-600 rounded-lg px-2.5 py-1.5 text-xs text-ivory-100 font-body">
              <option value="">All time</option>
              <option value="7d">Last 7 days</option>
              <option value="30d">Last 30 days</option>
            </select>
            {(filterPlayerId || filterRange) && (
              <Button variant="ghost" size="sm" onClick={() => { setFilterPlayerId(''); setFilterRange(''); }}>
                <X size={11} /> Clear
              </Button>
            )}
            <span className="ml-auto text-xs text-ivory-200/30 font-body">{filtered.length} matches</span>
          </div>
        </CardBody>
      </Card>

      {filtered.length === 0 ? (
        <Card><CardBody><EmptyState icon={<Clock size={28} className="text-gold-400/25 mx-auto" />} title="No matches found" /></CardBody></Card>
      ) : filtered.map(match => {
        const playerA  = users.find(u => u.id === match.player_a_id);
        const playerB  = users.find(u => u.id === match.player_b_id);
        const winner   = match.winner_id ? users.find(u => u.id === match.winner_id) : null;
        const payout   = match.player_a_score !== null && match.player_b_score !== null
          ? calcMatchPayout(match.player_a_score, match.player_b_score, match.point_wager, match.winner_bonus)
          : null;

        const matchObs = obligations.filter(o => o.match_id === match.id);
        const matchWagers = wagers.filter(w => w.match_id === match.id);
        const isExpanded  = expandedId === match.id;

        return (
          <Card key={match.id} hover className="mb-3" onClick={() => setExpandedId(isExpanded ? null : match.id)}>
            <CardBody>
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex -space-x-2 shrink-0">
                    {playerA && <PlayerAvatar user={playerA} size="sm" className="ring-2 ring-felt-900" />}
                    {playerB && <PlayerAvatar user={playerB} size="sm" className="ring-2 ring-felt-900" />}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-body font-medium text-ivory-100">
                      {playerA?.display_name} <span className="text-ivory-200/35">vs</span> {playerB?.display_name}
                    </p>
                    <div className="flex items-center gap-2 text-xs text-ivory-200/45 font-body mt-0.5 flex-wrap">
                      <span>{match.player_a_score} – {match.player_b_score}</span>
                      {winner && <><span>·</span><span className="flex items-center gap-1"><Trophy size={9} className="text-gold-400" />{winner.display_name}</span></>}
                    </div>
                  </div>
                </div>
                <div className="shrink-0 text-right">
                  {payout !== null && <p className="text-sm font-mono text-ivory-100">${payout.toFixed(2)}</p>}
                  <p className="text-xs text-ivory-200/30 font-body mt-0.5">{match.completed_at ? formatDate(match.completed_at) : ''}</p>
                </div>
              </div>

              {isExpanded && (
                <div className="mt-4 animate-slide-up">
                  <GoldDivider className="mb-3" />
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-3">
                    <div><p className="text-xs text-ivory-200/40 font-body">Pt Wager</p><p className="text-sm font-mono text-ivory-100">${match.point_wager}/pt</p></div>
                    <div><p className="text-xs text-ivory-200/40 font-body">Bonus</p><p className="text-sm font-mono text-ivory-100">${match.winner_bonus}</p></div>
                    {payout !== null && <div><p className="text-xs text-ivory-200/40 font-body">Match Payout</p><p className="text-sm font-mono text-ivory-100">${payout.toFixed(2)}</p></div>}
                  </div>

                  {/* Obligations created */}
                  {matchObs.length > 0 && (
                    <>
                      <p className="text-xs text-ivory-200/35 font-body uppercase tracking-wider mb-2">Obligations Created</p>
                      {matchObs.map(ob => {
                        const debtor   = users.find(u => u.id === ob.debtor_id);
                        const creditor = users.find(u => u.id === ob.creditor_id);
                        return (
                          <div key={ob.id} className="flex items-center justify-between py-1.5 px-3 rounded bg-felt-800/50 mb-1">
                            <span className="text-xs font-body text-ivory-200/60">
                              {debtor?.display_name} → {creditor?.display_name}
                              <span className="text-ivory-200/30 ml-1">({ob.source})</span>
                            </span>
                            <DebtAmount amount={obligationBalance(ob)} className="text-xs" />
                          </div>
                        );
                      })}
                    </>
                  )}

                  {/* Side wagers summary */}
                  {matchWagers.length > 0 && (
                    <>
                      <p className="text-xs text-ivory-200/35 font-body uppercase tracking-wider mb-2 mt-3">Side Wagers</p>
                      {matchWagers.map(w => {
                        const prop = users.find(u => u.id === w.proposer_id);
                        const cp   = users.find(u => u.id === w.counterparty_id);
                        const pick = users.find(u => u.id === w.proposer_picks_player_id);
                        return (
                          <div key={w.id} className="flex items-center justify-between py-1.5 px-3 rounded bg-felt-800/50 mb-1">
                            <span className="text-xs font-body text-ivory-200/60">
                              {prop?.display_name} backs {pick?.display_name} vs {cp?.display_name}
                            </span>
                            <WagerStatusBadge status={w.status} />
                          </div>
                        );
                      })}
                    </>
                  )}

                  {match.notes && <p className="text-xs italic text-ivory-200/30 font-body mt-2">"{match.notes}"</p>}
                </div>
              )}
            </CardBody>
          </Card>
        );
      })}
    </div>
  );
}

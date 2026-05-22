import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Card, CardHeader, CardBody, Button, Input, Balance, PlayerAvatar,
  GoldDivider, SuitRow, WagerStatusBadge, MatchStatusBadge,
  LoadingCard, EmptyState, DebtAmount, StatCell,
} from '@/components/ui';
import { useMatch, useWagersForMatch, useUsers, useFinalizeMatch } from '@/hooks/useData';
import { useMatchStore } from '@/stores/useMatchStore';
import { calcMatchPayout, calcExternalWagerOutcome, impliedOddsLabel, formatRelativeTime } from '@/lib/calculations';
import { ArrowLeft, Swords, CheckCircle, Trophy, AlertCircle } from 'lucide-react';

export default function ActiveMatch() {
  const { id = '' } = useParams();
  const navigate = useNavigate();

  const { data: match, isLoading: matchLoading } = useMatch(id);
  const { data: wagers = [] }                    = useWagersForMatch(id);
  const { data: users  = [] }                    = useUsers();
  const finalizeMatch                            = useFinalizeMatch();
  const { optimisticScores, updateOptimisticScores } = useMatchStore();

  const [scoreAStr, setScoreAStr] = useState('');
  const [scoreBStr, setScoreBStr] = useState('');
  const [confirmStep, setConfirmStep] = useState(false);

  if (matchLoading) return <LoadingCard />;
  if (!match) return <EmptyState icon="♠" title="Match not found" />;

  const playerA = users.find(u => u.id === match.player_a_id);
  const playerB = users.find(u => u.id === match.player_b_id);
  const winner  = match.winner_id ? users.find(u => u.id === match.winner_id) : null;

  const scoreA = parseInt(scoreAStr) || 0;
  const scoreB = parseInt(scoreBStr) || 0;
  const isCompleted = match.status === 'completed';
  const isActive    = match.status === 'active';

  const displayScoreA = isCompleted ? (match.player_a_score ?? 0) : scoreA;
  const displayScoreB = isCompleted ? (match.player_b_score ?? 0) : scoreB;

  const previewPayout = isActive && (scoreA > 0 || scoreB > 0)
    ? calcMatchPayout(scoreA, scoreB, match.point_wager, match.winner_bonus)
    : null;

  const leadId = displayScoreA > displayScoreB ? match.player_a_id
    : displayScoreB > displayScoreA ? match.player_b_id
    : null;

  const handleFinalize = async () => {
    await finalizeMatch.mutateAsync({ matchId: id, scoreA, scoreB });
    setConfirmStep(false);
  };

  const handleScoreChange = (which: 'a' | 'b', val: string) => {
    const a = which === 'a' ? parseInt(val) || 0 : scoreA;
    const b = which === 'b' ? parseInt(val) || 0 : scoreB;
    if (which === 'a') setScoreAStr(val);
    else               setScoreBStr(val);
    updateOptimisticScores(id, a, b);
  };

  // Post-finalize: show obligation that was created
  const matchPayout = isCompleted && match.player_a_score !== null && match.player_b_score !== null
    ? calcMatchPayout(match.player_a_score, match.player_b_score, match.point_wager, match.winner_bonus)
    : null;
  const loser = winner
    ? users.find(u => u.id === (match.winner_id === match.player_a_id ? match.player_b_id : match.player_a_id))
    : null;

  return (
    <div className="animate-fade-in max-w-2xl mx-auto">
      <div className="flex items-center gap-2 mb-5">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)}><ArrowLeft size={13} /> Back</Button>
        <div className="flex-1" />
        <MatchStatusBadge status={match.status} />
      </div>

      {/* Scoreboard */}
      <Card className="mb-5">
        <CardBody>
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-xl font-display font-bold text-ivory-100">Match</h1>
            <SuitRow />
          </div>

          <div className="flex items-center justify-around py-4">
            {[
              { user: playerA, score: displayScoreA, playerId: match.player_a_id },
              { user: playerB, score: displayScoreB, playerId: match.player_b_id },
            ].map(({ user, score, playerId }, i) => (
              <React.Fragment key={playerId}>
                {i === 1 && (
                  <div className="flex flex-col items-center gap-1">
                    <Swords size={18} className="text-gold-400/35" />
                    <span className="text-xs text-ivory-200/25 font-body">vs</span>
                  </div>
                )}
                <div className={`flex flex-col items-center gap-2 transition-opacity ${leadId && leadId !== playerId ? 'opacity-40' : ''}`}>
                  {user && <PlayerAvatar user={user} size="xl" />}
                  <p className="font-display text-base font-semibold text-ivory-100">{user?.display_name}</p>
                  <p className={`text-5xl font-mono font-bold ${leadId === playerId ? 'text-gold-300' : 'text-ivory-100'}`}>
                    {score}
                  </p>
                </div>
              </React.Fragment>
            ))}
          </div>

          <div className="flex items-center justify-center gap-3 mt-1 text-xs text-ivory-200/35 font-body">
            <span>${match.point_wager}/pt</span>
            <span>·</span>
            <span>${match.winner_bonus} bonus</span>
            {match.notes && <><span>·</span><span className="italic">{match.notes}</span></>}
          </div>
        </CardBody>
      </Card>

      {/* Score entry (active only) */}
      {isActive && (
        <Card className="mb-5">
          <CardHeader>
            <p className="text-sm font-display font-semibold text-ivory-100">Enter Final Scores</p>
          </CardHeader>
          <CardBody className="flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-3">
              <Input label={`${playerA?.display_name ?? 'Player A'} Score`} type="number" min="0" max="121"
                value={scoreAStr} onChange={e => handleScoreChange('a', e.target.value)} placeholder="0" />
              <Input label={`${playerB?.display_name ?? 'Player B'} Score`} type="number" min="0" max="121"
                value={scoreBStr} onChange={e => handleScoreChange('b', e.target.value)} placeholder="0" />
            </div>

            {previewPayout !== null && (
              <div className="flex items-center justify-between py-2 px-3 rounded-lg bg-gold-400/5 border border-gold-400/12">
                <span className="text-xs text-ivory-200/45 font-body">
                  Payout ({Math.abs(scoreA - scoreB)} pt diff) → obligation created on finalize
                </span>
                <span className="text-sm font-mono text-gold-300">${previewPayout.toFixed(2)}</span>
              </div>
            )}

            {!confirmStep ? (
              <Button variant="primary" size="lg" className="w-full justify-center"
                onClick={() => setConfirmStep(true)} disabled={scoreA === 0 && scoreB === 0}>
                <CheckCircle size={15} /> Finalize Match
              </Button>
            ) : (
              <div className="flex flex-col gap-2">
                <div className="flex items-start gap-2 py-2.5 px-3 rounded-lg bg-gold-400/8 border border-gold-400/18 text-sm text-gold-300 font-body">
                  <AlertCircle size={14} className="shrink-0 mt-0.5" />
                  <span>This will settle all active side wagers and create obligation records. Scores are final.</span>
                </div>
                <div className="flex gap-2">
                  <Button variant="secondary" size="md" className="flex-1 justify-center" onClick={() => setConfirmStep(false)}>Cancel</Button>
                  <Button variant="primary" size="md" className="flex-1 justify-center" onClick={handleFinalize}
                    disabled={finalizeMatch.isPending}>
                    <CheckCircle size={14} /> {finalizeMatch.isPending ? 'Settling…' : 'Confirm & Settle'}
                  </Button>
                </div>
              </div>
            )}
          </CardBody>
        </Card>
      )}

      {/* Obligation created (post-finalize) */}
      {isCompleted && winner && loser && matchPayout !== null && (
        <Card gold className="mb-5 animate-slide-up">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Trophy size={14} className="text-gold-400" />
              <span className="text-sm font-display font-semibold text-ivory-100">Obligation Created</span>
            </div>
          </CardHeader>
          <CardBody className="flex flex-col gap-3">
            <div className="flex items-center justify-between py-3 px-4 rounded-lg bg-gold-400/8 border border-gold-400/18">
              <div>
                <p className="text-xs text-ivory-200/45 font-body">Debt record</p>
                <p className="text-sm text-ivory-100 font-body mt-0.5">
                  <strong>{loser.display_name}</strong> owes <strong>{winner.display_name}</strong>
                </p>
                <p className="text-xs text-ivory-200/35 font-body">{Math.abs((match.player_a_score ?? 0) - (match.player_b_score ?? 0))} pt diff · not yet paid</p>
              </div>
              <DebtAmount amount={matchPayout} className="text-xl" />
            </div>
            <p className="text-xs text-ivory-200/35 font-body">
              Go to <span className="text-gold-400 cursor-pointer" onClick={() => navigate('/settle')}>Settlements</span> to record payment when money changes hands.
            </p>
          </CardBody>
        </Card>
      )}

      {/* Side wagers */}
      {wagers.length > 0 && (
        <Card>
          <CardHeader>
            <p className="text-sm font-display font-semibold text-ivory-100">Side Wagers</p>
            <p className="text-xs text-ivory-200/40 font-body mt-0.5">{wagers.length} peer-to-peer bet{wagers.length > 1 ? 's' : ''}</p>
          </CardHeader>
          <CardBody className="pt-2 flex flex-col gap-2">
            {wagers.map(w => {
              const proposer     = users.find(u => u.id === w.proposer_id);
              const counterparty = users.find(u => u.id === w.counterparty_id);
              const backedPlayer = users.find(u => u.id === w.proposer_picks_player_id);
              const oddsLabel    = impliedOddsLabel(w.proposer_amount, w.counterparty_amount);
              const wagerWinner  = w.winner_id ? users.find(u => u.id === w.winner_id) : null;
              const wagerLoser   = w.loser_id  ? users.find(u => u.id === w.loser_id)  : null;

              return (
                <div key={w.id} className="py-3 px-4 rounded-lg bg-felt-800/45 border border-felt-600/35">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        {proposer && <PlayerAvatar user={proposer} size="sm" />}
                        <span className="text-sm text-ivory-100 font-body">
                          <strong>{proposer?.display_name}</strong>
                          <span className="text-ivory-200/45"> backs </span>
                          <strong>{backedPlayer?.display_name}</strong>
                        </span>
                      </div>
                      <p className="text-xs text-ivory-200/40 font-body mt-0.5">
                        vs {counterparty?.display_name} · ${w.proposer_amount}:${w.counterparty_amount} ({oddsLabel})
                      </p>
                      {wagerWinner && wagerLoser && (
                        <p className="text-xs font-body mt-1">
                          <span className="text-emerald-400">{wagerWinner.display_name} won</span>
                          <span className="text-ivory-200/35"> — obligation created</span>
                        </p>
                      )}
                    </div>
                    <WagerStatusBadge status={w.status} />
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

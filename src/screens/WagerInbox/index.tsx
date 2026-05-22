import React from 'react';
import {
  Card, CardBody, Button, SectionTitle, SuitRow, EmptyState,
  PlayerAvatar, WagerStatusBadge, LoadingCard,
} from '@/components/ui';
import { useExternalWagers, useUsers, useRespondToWager } from '@/hooks/useData';
import { impliedOddsLabel } from '@/lib/calculations';
import { CheckCircle, XCircle, Inbox } from 'lucide-react';

export default function WagerInbox() {
  const { data: wagers = [], isLoading } = useExternalWagers();
  const { data: users  = [] }            = useUsers();
  const respond = useRespondToWager();

  const proposed  = wagers.filter(w => w.status === 'proposed');
  const active    = wagers.filter(w => w.status === 'active');
  const settled   = wagers.filter(w => w.status === 'settled').slice(0, 10);

  const CURRENT_USER_ID = users.find(u => u.role === 'admin')?.id ?? 'u1';

  if (isLoading) return <LoadingCard />;

  const WagerCard = ({ w, showActions }: { w: typeof wagers[0]; showActions: boolean }) => {
    const proposer     = users.find(u => u.id === w.proposer_id);
    const counterparty = users.find(u => u.id === w.counterparty_id);
    const pickedPlayer = users.find(u => u.id === w.proposer_picks_player_id);
    const wagerWinner  = w.winner_id ? users.find(u => u.id === w.winner_id) : null;

    return (
      <Card className="mb-3">
        <CardBody>
          <div className="flex items-start justify-between gap-3 mb-3">
            <div className="flex items-center gap-2">
              {proposer && <PlayerAvatar user={proposer} size="sm" />}
              <div>
                <p className="text-sm font-body font-medium text-ivory-100">
                  {proposer?.display_name}
                  <span className="text-ivory-200/45 font-normal"> proposes to </span>
                  {counterparty?.display_name}
                </p>
                <p className="text-xs text-ivory-200/40 font-body mt-0.5">
                  {proposer?.display_name} backs <strong>{pickedPlayer?.display_name}</strong>
                </p>
              </div>
            </div>
            <WagerStatusBadge status={w.status} />
          </div>

          <div className="grid grid-cols-3 gap-2 text-xs mb-3">
            <div className="py-1.5 px-2 rounded bg-felt-800/50 text-center">
              <p className="text-ivory-200/40 mb-0.5">Proposer risks</p>
              <p className="font-mono text-ivory-100">${w.proposer_amount.toFixed(2)}</p>
            </div>
            <div className="py-1.5 px-2 rounded bg-felt-800/50 text-center">
              <p className="text-ivory-200/40 mb-0.5">Odds</p>
              <p className="font-mono text-gold-300">{impliedOddsLabel(w.proposer_amount, w.counterparty_amount)}</p>
            </div>
            <div className="py-1.5 px-2 rounded bg-felt-800/50 text-center">
              <p className="text-ivory-200/40 mb-0.5">CP risks</p>
              <p className="font-mono text-ivory-100">${w.counterparty_amount.toFixed(2)}</p>
            </div>
          </div>

          {w.notes && <p className="text-xs text-ivory-200/35 font-body italic mb-3">"{w.notes}"</p>}

          {wagerWinner && (
            <p className="text-xs font-body text-emerald-400 mb-2">
              ✓ {wagerWinner.display_name} won — obligation created
            </p>
          )}

          {showActions && w.counterparty_id === CURRENT_USER_ID && (
            <div className="flex gap-2">
              <Button variant="danger" size="sm" className="flex-1 justify-center"
                onClick={() => respond.mutate({ wagerId: w.id, action: 'decline' })}
                disabled={respond.isPending}>
                <XCircle size={13} /> Decline
              </Button>
              <Button variant="primary" size="sm" className="flex-1 justify-center"
                onClick={() => respond.mutate({ wagerId: w.id, action: 'accept' })}
                disabled={respond.isPending}>
                <CheckCircle size={13} /> Accept
              </Button>
            </div>
          )}

          {showActions && w.proposer_id === CURRENT_USER_ID && w.status === 'proposed' && (
            <Button variant="secondary" size="sm"
              onClick={() => respond.mutate({ wagerId: w.id, action: 'cancel' })}
              disabled={respond.isPending}>
              Withdraw Proposal
            </Button>
          )}
        </CardBody>
      </Card>
    );
  };

  return (
    <div className="animate-fade-in max-w-2xl mx-auto">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-3xl font-display font-bold text-ivory-100">Wager Inbox</h1>
          <p className="text-sm text-ivory-200/45 font-body mt-0.5">Proposals, active bets, and history</p>
        </div>
        <SuitRow />
      </div>

      {/* Pending proposals */}
      <SectionTitle subtitle={`${proposed.length} awaiting response`}>
        Pending Proposals
      </SectionTitle>
      {proposed.length === 0 ? (
        <Card className="mb-6"><CardBody>
          <EmptyState icon={<Inbox size={26} className="text-gold-400/30 mx-auto" />} title="No pending proposals" />
        </CardBody></Card>
      ) : (
        <div className="mb-6">{proposed.map(w => <WagerCard key={w.id} w={w} showActions={true} />)}</div>
      )}

      {/* Active wagers */}
      {active.length > 0 && (
        <>
          <SectionTitle subtitle="Locked in — awaiting match result">{active.length} Active</SectionTitle>
          <div className="mb-6">{active.map(w => <WagerCard key={w.id} w={w} showActions={false} />)}</div>
        </>
      )}

      {/* Settled */}
      {settled.length > 0 && (
        <>
          <SectionTitle subtitle="Completed side bets">Recent History</SectionTitle>
          {settled.map(w => <WagerCard key={w.id} w={w} showActions={false} />)}
        </>
      )}
    </div>
  );
}

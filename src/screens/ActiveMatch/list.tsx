import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useActiveMatches, useUsers } from '@/hooks/useData';
import {
  Card, CardBody, Button, SectionTitle, SuitRow, EmptyState,
  PlayerAvatar, MatchStatusBadge, LoadingCard,
} from '@/components/ui';
import { PlusCircle, ChevronRight, Swords } from 'lucide-react';
import { formatRelativeTime } from '@/lib/calculations';

export default function ActiveMatchesList() {
  const navigate = useNavigate();
  const { data: matches = [], isLoading } = useActiveMatches();
  const { data: users   = [] }            = useUsers();

  if (isLoading) return <LoadingCard />;

  return (
    <div className="animate-fade-in">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-3xl font-display font-bold text-ivory-100">Active Matches</h1>
          <p className="text-sm text-ivory-200/45 font-body mt-0.5">Games awaiting final scores</p>
        </div>
        <SuitRow />
      </div>

      <SectionTitle
        subtitle={`${matches.length} in progress`}
        action={
          <Button variant="primary" size="sm" onClick={() => navigate('/create')}>
            <PlusCircle size={13} /> New Match
          </Button>
        }
      >
        In Progress
      </SectionTitle>

      {matches.length === 0 ? (
        <Card>
          <CardBody>
            <EmptyState
              icon={<Swords size={28} className="text-gold-400/30 mx-auto" />}
              title="No active matches"
              description="Create a new match to get started"
              action={
                <Button variant="primary" size="md" onClick={() => navigate('/create')}>
                  <PlusCircle size={14} /> Start a Match
                </Button>
              }
            />
          </CardBody>
        </Card>
      ) : matches.map(match => {
        const playerA = users.find(u => u.id === match.player_a_id);
        const playerB = users.find(u => u.id === match.player_b_id);
        return (
          <Card key={match.id} hover className="mb-3" onClick={() => navigate(`/matches/${match.id}`)}>
            <CardBody>
              <div className="flex items-center gap-4">
                <div className="flex -space-x-3 shrink-0">
                  {playerA && <PlayerAvatar user={playerA} size="lg" className="ring-2 ring-felt-900" />}
                  {playerB && <PlayerAvatar user={playerB} size="lg" className="ring-2 ring-felt-900" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-display text-base font-semibold text-ivory-100">
                    {playerA?.display_name} <span className="text-ivory-200/35 font-body text-sm">vs</span> {playerB?.display_name}
                  </p>
                  <div className="flex items-center gap-2 mt-0.5 text-xs text-ivory-200/40 font-body">
                    <span>${match.point_wager}/pt</span>
                    <span>·</span>
                    <span>${match.winner_bonus} bonus</span>
                    {match.notes && <><span>·</span><span className="italic truncate max-w-[100px]">{match.notes}</span></>}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <MatchStatusBadge status={match.status} />
                  <ChevronRight size={14} className="text-gold-400/30" />
                </div>
              </div>
            </CardBody>
          </Card>
        );
      })}
    </div>
  );
}

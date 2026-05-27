import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  useActiveMatches,
  usePendingMatches,
  useUsers,
  useStartMatch,
} from "@/hooks/useData";
import {
  Card,
  CardBody,
  Button,
  SectionTitle,
  SuitRow,
  EmptyState,
  PlayerAvatar,
  MatchStatusBadge,
  LoadingCard,
} from "@/components/ui";
import {
  PlusCircle,
  ChevronRight,
  Swords,
  Timer,
  Play,
  AlertCircle,
} from "lucide-react";
import { formatRelativeTime } from "@/lib/calculations";
import type { Match } from "@/types";

// ── PendingMatchCard ──────────────────────────────────────────
// Displays one pending match with a "Start Match" button.
// Starting transitions it to active so it appears in the
// Active section below without a page reload.

function PendingMatchCard({
  match,
  users,
}: {
  match: Match;
  users: {
    id: string;
    display_name: string;
    avatar_color: string;
    role: string;
    auth_id: string | null;
    created_at: string;
    updated_at: string;
    is_active: boolean;
  }[];
}) {
  const navigate = useNavigate();
  const startMatch = useStartMatch();
  const [confirming, setConfirming] = useState(false);

  const playerA = users.find((u) => u.id === match.player_a_id);
  const playerB = users.find((u) => u.id === match.player_b_id);

  const handleStart = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirming) {
      setConfirming(true);
      return;
    }
    await startMatch.mutateAsync(match.id);
    setConfirming(false);
    navigate(`/matches/${match.id}`);
  };

  return (
    <Card key={match.id} className="mb-3 border border-amber-400/15">
      <CardBody>
        <div className="flex items-center gap-4">
          {/* Player avatars */}
          <div className="flex -space-x-3 shrink-0">
            {playerA && (
              <PlayerAvatar
                user={playerA}
                size="lg"
                className="ring-2 ring-felt-900"
              />
            )}
            {playerB && (
              <PlayerAvatar
                user={playerB}
                size="lg"
                className="ring-2 ring-felt-900"
              />
            )}
          </div>

          {/* Match info */}
          <div
            className="flex-1 min-w-0"
            onClick={() => navigate(`/matches/${match.id}`)}
          >
            <p className="font-display text-base font-semibold text-ivory-100 cursor-pointer">
              {playerA?.display_name}{" "}
              <span className="text-ivory-200/35 font-body text-sm">vs</span>{" "}
              {playerB?.display_name}
            </p>
            <div className="flex items-center gap-2 mt-0.5 text-xs text-ivory-200/40 font-body">
              <span>${match.point_wager}/pt</span>
              <span>·</span>
              <span>${match.winner_bonus} bonus</span>
              {match.notes && (
                <>
                  <span>·</span>
                  <span className="italic truncate max-w-[100px]">
                    {match.notes}
                  </span>
                </>
              )}
              <span>·</span>
              <span className="text-amber-400/70">
                {formatRelativeTime(match.created_at)}
              </span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 shrink-0">
            <MatchStatusBadge status={match.status} />
            {!confirming ? (
              <div className="flex items-center gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/matches/${match.id}?wager=true`)
                  }}
                >
                  + Wager
                </Button>

                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleStart}
                  disabled={startMatch.isPending}
                >
                  <Play size={12} /> Start
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-1.5">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    setConfirming(false);
                  }}
                >
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleStart}
                  disabled={startMatch.isPending}
                >
                  {startMatch.isPending ? "Starting…" : "Confirm"}
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Confirmation warning */}
        {confirming && (
          <div className="mt-3 flex items-start gap-2 py-2 px-3 rounded-lg bg-amber-400/6 border border-amber-400/15 text-xs text-amber-300 font-body">
            <AlertCircle size={12} className="shrink-0 mt-0.5" />
            <span>
              Starting the match will lock the wager terms and activate any
              accepted side bets. This cannot be undone.
            </span>
          </div>
        )}
      </CardBody>
    </Card>
  );
}

// ── Main list screen ──────────────────────────────────────────

export default function ActiveMatchesList() {
  const navigate = useNavigate();
  const { data: activeMatches = [], isLoading: activeLoading } =
    useActiveMatches();
  const { data: pendingMatches = [], isLoading: pendingLoading } =
    usePendingMatches();
  const { data: users = [] } = useUsers();

  const isLoading = activeLoading || pendingLoading;
  if (isLoading) return <LoadingCard />;

  const totalMatches = pendingMatches.length + activeMatches.length;

  return (
    <div className="animate-fade-in">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-3xl font-display font-bold text-ivory-100">
            Matches
          </h1>
          <p className="text-sm text-ivory-200/45 font-body mt-0.5">
            Pending lobby · active games
          </p>
        </div>
        <SuitRow />
      </div>

      {/* ── PENDING SECTION ── */}
      <SectionTitle
        subtitle={`${pendingMatches.length} awaiting start`}
        action={
          <Button
            variant="primary"
            size="sm"
            onClick={() => navigate("/create")}
          >
            <PlusCircle size={13} /> New Match
          </Button>
        }
      >
        <span className="flex items-center gap-2">
          <Timer size={14} className="text-amber-400" />
          Pending Lobby
        </span>
      </SectionTitle>

      {pendingMatches.length === 0 ? (
        <Card className="mb-6">
          <CardBody>
            <EmptyState
              icon={<Timer size={24} className="text-amber-400/30 mx-auto" />}
              title="No pending matches"
              description="Create a new match — it will appear here before it starts"
              action={
                <Button
                  variant="primary"
                  size="md"
                  onClick={() => navigate("/create")}
                >
                  <PlusCircle size={14} /> Create Match
                </Button>
              }
            />
          </CardBody>
        </Card>
      ) : (
        <div className="mb-6">
          {pendingMatches.map((match) => (
            <PendingMatchCard key={match.id} match={match} users={users} />
          ))}
        </div>
      )}

      {/* ── ACTIVE SECTION ── */}
      <SectionTitle subtitle={`${activeMatches.length} in progress`}>
        <span className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse inline-block" />
          In Progress
        </span>
      </SectionTitle>

      {activeMatches.length === 0 ? (
        <Card>
          <CardBody>
            <EmptyState
              icon={<Swords size={28} className="text-gold-400/30 mx-auto" />}
              title="No active matches"
              description={
                pendingMatches.length > 0
                  ? "Start a pending match above to begin play"
                  : "Create a match to get started"
              }
            />
          </CardBody>
        </Card>
      ) : (
        activeMatches.map((match) => {
          const playerA = users.find((u) => u.id === match.player_a_id);
          const playerB = users.find((u) => u.id === match.player_b_id);
          return (
            <Card
              key={match.id}
              hover
              className="mb-3"
              onClick={() => navigate(`/matches/${match.id}`)}
            >
              <CardBody>
                <div className="flex items-center gap-4">
                  <div className="flex -space-x-3 shrink-0">
                    {playerA && (
                      <PlayerAvatar
                        user={playerA}
                        size="lg"
                        className="ring-2 ring-felt-900"
                      />
                    )}
                    {playerB && (
                      <PlayerAvatar
                        user={playerB}
                        size="lg"
                        className="ring-2 ring-felt-900"
                      />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-display text-base font-semibold text-ivory-100">
                      {playerA?.display_name}{" "}
                      <span className="text-ivory-200/35 font-body text-sm">
                        vs
                      </span>{" "}
                      {playerB?.display_name}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5 text-xs text-ivory-200/40 font-body">
                      <span>${match.point_wager}/pt</span>
                      <span>·</span>
                      <span>${match.winner_bonus} bonus</span>
                      {match.started_at && (
                        <>
                          <span>·</span>
                          <span className="text-emerald-400/60">
                            started {formatRelativeTime(match.started_at)}
                          </span>
                        </>
                      )}
                      {match.notes && (
                        <>
                          <span>·</span>
                          <span className="italic truncate max-w-[100px]">
                            {match.notes}
                          </span>
                        </>
                      )}
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
        })
      )}

      {totalMatches === 0 && (
        <div className="mt-8 text-center">
          <Button
            variant="primary"
            size="lg"
            onClick={() => navigate("/create")}
          >
            <PlusCircle size={15} /> Create First Match
          </Button>
        </div>
      )}
    </div>
  );
}

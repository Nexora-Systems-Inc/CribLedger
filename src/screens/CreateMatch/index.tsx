import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Card, CardHeader, CardBody, Button, Input, Select,
  SectionTitle, GoldDivider, PlayerAvatar, Balance, SuitRow,
} from '@/components/ui';
import { useUsers, useCreateMatch, useProposeWager } from '@/hooks/useData';
import { impliedOddsLabel } from '@/lib/calculations';
import { validateWagerPick } from '@/lib/wagerUtils';
import { APP_CONFIG } from '@/config/supabase';
import { PlusCircle, Trash2, ChevronRight, Users, Zap, AlertCircle } from 'lucide-react';

// ─────────────────────────────────────────────────────────────
// Bet Slip — one proposed side wager row
// ─────────────────────────────────────────────────────────────
interface BetSlipData {
  proposer_id:              string;
  proposer_picks_player_id: string;
  counterparty_id:          string;
  proposer_amount:          string;
  counterparty_amount:      string;
  notes:                    string;
}
const EMPTY_SLIP: BetSlipData = {
  proposer_id: '', proposer_picks_player_id: '', counterparty_id: '',
  proposer_amount: '', counterparty_amount: '', notes: '',
};

function BetSlip({
  slip, index, matchPlayers, allUsers, onChange, onRemove,
}: {
  slip: BetSlipData;
  index: number;
  matchPlayers: { id: string; name: string }[];
  allUsers: { id: string; display_name: string }[];
  onChange: (i: number, field: keyof BetSlipData, val: string) => void;
  onRemove: (i: number) => void;
}) {
  const pa = parseFloat(slip.proposer_amount)    || 0;
  const ca = parseFloat(slip.counterparty_amount) || 0;
  const oddsLabel = pa > 0 && ca > 0 ? impliedOddsLabel(pa, ca) : '—';

  return (
    <div className="rounded-xl border border-felt-600/60 bg-felt-900/60 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2 bg-felt-800/50 border-b border-felt-600/40">
        <span className="text-xs font-mono text-gold-400/60">SLIP #{index + 1}</span>
        <button onClick={() => onRemove(index)} className="text-ivory-200/30 hover:text-crimson-400 transition-colors">
          <Trash2 size={13} />
        </button>
      </div>
      <div className="p-4 grid grid-cols-2 gap-3">
        <Select label="Proposer" value={slip.proposer_id} onChange={e => onChange(index, 'proposer_id', e.target.value)}>
          <option value="">Select…</option>
          {allUsers.map(u => <option key={u.id} value={u.id}>{u.display_name}</option>)}
        </Select>
        <Select label="Backs Player" value={slip.proposer_picks_player_id} onChange={e => onChange(index, 'proposer_picks_player_id', e.target.value)}>
          <option value="">Select…</option>
          {matchPlayers.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </Select>
        <Select label="Counterparty" value={slip.counterparty_id} onChange={e => onChange(index, 'counterparty_id', e.target.value)}>
          <option value="">Select…</option>
          {allUsers.filter(u => u.id !== slip.proposer_id).map(u => <option key={u.id} value={u.id}>{u.display_name}</option>)}
        </Select>
        <div className="flex flex-col gap-1.5">
          <span className="text-xs font-body text-ivory-200/60 uppercase tracking-wider">Odds</span>
          <div className="px-3 py-2.5 bg-felt-800/50 border border-felt-600/40 rounded-lg text-sm font-mono text-gold-300">{oddsLabel}</div>
        </div>
        <Input label="Proposer Risks ($)" type="number" min="0.01" step="0.25" value={slip.proposer_amount}
          onChange={e => onChange(index, 'proposer_amount', e.target.value)} placeholder="10.00" />
        <Input label="Counterparty Risks ($)" type="number" min="0.01" step="0.25" value={slip.counterparty_amount}
          onChange={e => onChange(index, 'counterparty_amount', e.target.value)} placeholder="10.00" />
        <div className="col-span-2">
          <Input label="Notes (optional)" value={slip.notes} onChange={e => onChange(index, 'notes', e.target.value)} placeholder="e.g. Zach backs Joey" />
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Create Match Screen
// ─────────────────────────────────────────────────────────────
export default function CreateMatch() {
  const navigate   = useNavigate();
  const { data: users = [] } = useUsers();
  const createMatch  = useCreateMatch();
  const proposeWager = useProposeWager();

  const [playerAId,    setPlayerAId]    = useState('');
  const [playerBId,    setPlayerBId]    = useState('');
  const [pointWager,   setPointWager]   = useState(String(APP_CONFIG.DEFAULT_POINT_WAGER));
  const [winnerBonus,  setWinnerBonus]  = useState(String(APP_CONFIG.DEFAULT_WINNER_BONUS));
  const [notes,        setNotes]        = useState('');
  const [slips,        setSlips]        = useState<BetSlipData[]>([]);
  const [errors,       setErrors]       = useState<Record<string, string>>({});

  const userA = users.find(u => u.id === playerAId);
  const userB = users.find(u => u.id === playerBId);
  const matchPlayers = [userA, userB].filter(Boolean).map(u => ({ id: u!.id, name: u!.display_name }));
  const ADMIN_ID = users.find(u => u.role === 'admin')?.id ?? 'u1'; // TODO: from auth

  const maxPayout = userA && userB && parseFloat(pointWager) > 0
    ? (121 * parseFloat(pointWager) + parseFloat(winnerBonus || '0')).toFixed(2)
    : null;

  const validate = (): boolean => {
    const e: Record<string, string> = {};
    if (!playerAId)              e.playerA    = 'Required';
    if (!playerBId)              e.playerB    = 'Required';
    if (playerAId === playerBId) e.playerB    = 'Must differ from Player A';
    if (!parseFloat(pointWager) || parseFloat(pointWager) <= 0) e.pointWager = 'Must be > 0';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleCreate = async () => {
    if (!validate()) return;

    const match = await createMatch.mutateAsync({
      input: {
        player_a_id: playerAId,
        player_b_id: playerBId,
        point_wager: parseFloat(pointWager),
        winner_bonus: parseFloat(winnerBonus) || 0,
        notes: notes || undefined,
      },
      createdBy: ADMIN_ID,
    });

    // Propose each valid slip
    const validSlips = slips.filter(
      s => s.proposer_id && s.proposer_picks_player_id && s.counterparty_id &&
           s.proposer_id !== s.counterparty_id &&
           parseFloat(s.proposer_amount) > 0 && parseFloat(s.counterparty_amount) > 0,
    );

    for (const slip of validSlips) {
      await proposeWager.mutateAsync({
        input: {
          match_id:                 match.id,
          proposer_id:              slip.proposer_id,
          proposer_picks_player_id: slip.proposer_picks_player_id,
          counterparty_id:          slip.counterparty_id,
          proposer_amount:          parseFloat(slip.proposer_amount),
          counterparty_amount:      parseFloat(slip.counterparty_amount),
          notes:                    slip.notes || undefined,
        },
        createdBy: ADMIN_ID,
      });
    }

    navigate(`/matches/${match.id}`);
  };

  const addSlip = () => setSlips(s => [...s, { ...EMPTY_SLIP }]);
  const updateSlip = (i: number, field: keyof BetSlipData, val: string) =>
    setSlips(s => s.map((slip, idx) => idx === i ? { ...slip, [field]: val } : slip));
  const removeSlip = (i: number) => setSlips(s => s.filter((_, idx) => idx !== i));

  return (
    <div className="animate-fade-in max-w-2xl mx-auto">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-3xl font-display font-bold text-ivory-100">New Match</h1>
          <p className="text-sm text-ivory-200/45 font-body mt-0.5">Set players, stakes, and side bets</p>
        </div>
        <SuitRow />
      </div>

      {/* Section A: Match setup */}
      <Card className="mb-5">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Users size={14} className="text-gold-400" />
            <span className="text-sm font-display font-semibold text-ivory-100">Match Setup</span>
          </div>
        </CardHeader>
        <CardBody className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Select label="Player A" value={playerAId} onChange={e => setPlayerAId(e.target.value)}>
                <option value="">Select…</option>
                {users.filter(u => u.id !== playerBId).map(u => <option key={u.id} value={u.id}>{u.display_name}</option>)}
              </Select>
              {errors.playerA && <p className="text-xs text-crimson-400 mt-1">{errors.playerA}</p>}
            </div>
            <div>
              <Select label="Player B" value={playerBId} onChange={e => setPlayerBId(e.target.value)}>
                <option value="">Select…</option>
                {users.filter(u => u.id !== playerAId).map(u => <option key={u.id} value={u.id}>{u.display_name}</option>)}
              </Select>
              {errors.playerB && <p className="text-xs text-crimson-400 mt-1">{errors.playerB}</p>}
            </div>
          </div>

          {userA && userB && (
            <div className="flex items-center justify-center gap-6 py-3 rounded-lg bg-felt-800/40 border border-felt-600/30">
              <div className="flex items-center gap-2">
                <PlayerAvatar user={userA} size="md" />
                <p className="text-sm font-medium text-ivory-100">{userA.display_name}</p>
              </div>
              <span className="text-ivory-200/25 font-display">vs</span>
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium text-ivory-100">{userB.display_name}</p>
                <PlayerAvatar user={userB} size="md" />
              </div>
            </div>
          )}

          <GoldDivider />

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Input label="$ Per Point" type="number" min="0.01" step="0.05" value={pointWager}
                onChange={e => setPointWager(e.target.value)} />
              {errors.pointWager && <p className="text-xs text-crimson-400 mt-1">{errors.pointWager}</p>}
            </div>
            <Input label="Winner Bonus ($)" type="number" min="0" step="0.25" value={winnerBonus}
              onChange={e => setWinnerBonus(e.target.value)} />
          </div>

          {maxPayout && (
            <div className="flex items-center justify-between py-2 px-3 rounded-lg bg-gold-400/5 border border-gold-400/12">
              <span className="text-xs text-ivory-200/45 font-body">Max payout (121pt diff)</span>
              <span className="text-sm font-mono text-gold-300">${maxPayout}</span>
            </div>
          )}

          <Input label="Match Notes (optional)" value={notes} onChange={e => setNotes(e.target.value)}
            placeholder="e.g. High stakes Friday night…" />
        </CardBody>
      </Card>

      {/* Section B: Side wagers */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Zap size={14} className="text-gold-400" />
              <span className="text-sm font-display font-semibold text-ivory-100">Side Wagers</span>
              <span className="text-xs text-ivory-200/40 font-body">(peer-to-peer proposals)</span>
            </div>
            <Button variant="outline" size="sm" onClick={addSlip} disabled={matchPlayers.length < 2}>
              <PlusCircle size={13} /> Add Slip
            </Button>
          </div>
        </CardHeader>
        <CardBody>
          {slips.length === 0 ? (
            <div className="text-center py-5">
              <p className="text-ivory-200/30 text-sm font-body">No side wagers yet.</p>
              <p className="text-ivory-200/20 text-xs font-body mt-1">
                {matchPlayers.length < 2 ? 'Select both players first.' : 'Propose direct bets between any two users.'}
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {slips.map((slip, i) => (
                <BetSlip key={i} slip={slip} index={i} matchPlayers={matchPlayers} allUsers={users}
                  onChange={updateSlip} onRemove={removeSlip} />
              ))}
            </div>
          )}
        </CardBody>
      </Card>

      <div className="flex items-center gap-2 text-xs text-ivory-200/35 font-body mb-4">
        <AlertCircle size={12} />
        Side wager proposals must be accepted by the counterparty before they activate.
      </div>

      <Button
        variant="primary" size="xl" className="w-full justify-center"
        onClick={handleCreate}
        disabled={!playerAId || !playerBId || createMatch.isPending}
      >
        <ChevronRight size={17} />
        {createMatch.isPending ? 'Creating…' : 'Create Match'}
      </Button>
    </div>
  );
}

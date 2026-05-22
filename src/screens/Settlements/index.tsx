import React, { useState, useMemo } from 'react';
import {
  Card, CardBody, CardHeader, Button, SectionTitle, SuitRow,
  EmptyState, PlayerAvatar, DebtAmount, Balance, GoldDivider,
  ObligationStatusBadge, SettlementStatusBadge, LoadingCard, Input, Select,
} from '@/components/ui';
import {
  useOutstandingObligations, useObligations, useSettlements,
  useUsers, useCreateSettlement, useConfirmSettlement,
} from '@/hooks/useData';
import { obligationBalance, formatDate } from '@/lib/calculations';
import { bilateralObligationNet } from '@/lib/mockData';
import { CheckCircle, Banknote, ArrowRight } from 'lucide-react';
import type { Obligation } from '@/types';

// ─────────────────────────────────────────────────────────────
// Bilateral debt summary card
// ─────────────────────────────────────────────────────────────
function BilateralCard({
  debtorId, creditorId, netAmount, obligations, users, onSettle,
}: {
  debtorId: string; creditorId: string; netAmount: number;
  obligations: Obligation[];
  users: import('@/types').User[];
  onSettle: (debtorId: string, creditorId: string, oblIds: string[]) => void;
}) {
  const debtor   = users.find(u => u.id === debtorId);
  const creditor = users.find(u => u.id === creditorId);
  if (!debtor || !creditor) return null;

  const relevantObs = obligations.filter(
    o => (o.debtor_id === debtorId && o.creditor_id === creditorId) ||
         (o.debtor_id === creditorId && o.creditor_id === debtorId),
  );

  return (
    <Card gold className="mb-4">
      <CardBody>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <PlayerAvatar user={debtor}   size="md" />
            <ArrowRight size={14} className="text-crimson-400/60" />
            <PlayerAvatar user={creditor} size="md" />
            <div>
              <p className="text-sm font-body text-ivory-100">
                <strong>{debtor.display_name}</strong>
                <span className="text-ivory-200/45"> owes </span>
                <strong>{creditor.display_name}</strong>
              </p>
              <p className="text-xs text-ivory-200/35 font-body">Net across {relevantObs.length} obligation{relevantObs.length > 1 ? 's' : ''}</p>
            </div>
          </div>
          <DebtAmount amount={netAmount} className="text-xl" />
        </div>

        <div className="flex flex-col gap-1.5 mb-3">
          {relevantObs.map(ob => (
            <div key={ob.id} className="flex items-center justify-between py-1.5 px-3 rounded bg-felt-800/50 text-xs">
              <div className="flex items-center gap-2">
                <ObligationStatusBadge status={ob.status} />
                <span className="text-ivory-200/50 font-body capitalize">{ob.source.replace('_', ' ')}</span>
                {ob.notes && <span className="text-ivory-200/30 font-body italic truncate max-w-[120px]">{ob.notes}</span>}
              </div>
              <DebtAmount amount={obligationBalance(ob)} className="text-xs" />
            </div>
          ))}
        </div>

        <Button
          variant="primary" size="sm"
          onClick={() => onSettle(debtorId, creditorId, relevantObs.map(o => o.id))}
        >
          <CheckCircle size={13} /> Record Payment
        </Button>
      </CardBody>
    </Card>
  );
}

// ─────────────────────────────────────────────────────────────
// Record payment modal
// ─────────────────────────────────────────────────────────────
function RecordPaymentPanel({
  debtorId, creditorId, maxAmount, obligationIds, users, onConfirm, onCancel,
}: {
  debtorId: string; creditorId: string; maxAmount: number; obligationIds: string[];
  users: any[];
  onConfirm: (amount: number, notes: string) => void;
  onCancel: () => void;
}) {
  const [amount, setAmount] = useState(maxAmount.toFixed(2));
  const [notes,  setNotes]  = useState('');
  const debtor   = users.find(u => u.id === debtorId);
  const creditor = users.find(u => u.id === creditorId);

  return (
    <Card gold className="mb-4 animate-slide-up">
      <CardHeader>
        <p className="text-sm font-display font-semibold text-ivory-100">Record Payment</p>
        <p className="text-xs text-ivory-200/40 font-body mt-0.5">
          {debtor?.display_name} → {creditor?.display_name}
        </p>
      </CardHeader>
      <CardBody className="flex flex-col gap-3">
        <Input label="Amount ($)" type="number" min="0.01" step="0.01" max={maxAmount}
          value={amount} onChange={e => setAmount(e.target.value)} />
        <Input label="Notes (optional)" value={notes} onChange={e => setNotes(e.target.value)}
          placeholder="e.g. Paid via Venmo" />
        <div className="flex gap-2 mt-1">
          <Button variant="secondary" size="md" className="flex-1 justify-center" onClick={onCancel}>Cancel</Button>
          <Button variant="primary" size="md" className="flex-1 justify-center"
            onClick={() => onConfirm(parseFloat(amount) || 0, notes)}
            disabled={parseFloat(amount) <= 0}>
            <CheckCircle size={14} /> Confirm
          </Button>
        </div>
      </CardBody>
    </Card>
  );
}

// ─────────────────────────────────────────────────────────────
// Settlements Screen
// ─────────────────────────────────────────────────────────────
export default function Settlements() {
  const { data: outstanding = [], isLoading: obsLoading } = useOutstandingObligations();
  const { data: allObs      = [] }                        = useObligations();
  const { data: settlements = [] }                        = useSettlements();
  const { data: users       = [] }                        = useUsers();
  const createSettlement  = useCreateSettlement();
  const confirmSettlement = useConfirmSettlement();

  const ADMIN_ID = users.find(u => u.role === 'admin')?.id ?? 'u1';

  const [settlePanel, setSettlePanel] = useState<{ debtorId: string; creditorId: string; oblIds: string[]; maxAmount: number } | null>(null);

  // Group outstanding obligations by debtor→creditor pair
  const bilateralPairs = useMemo(() => {
    const seen = new Set<string>();
    const pairs: { debtorId: string; creditorId: string; net: number }[] = [];

    for (const ob of outstanding) {
      const key = `${ob.debtor_id}:${ob.creditor_id}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const net = bilateralObligationNet(ob.creditor_id, ob.debtor_id, outstanding);
      if (net > 0) pairs.push({ debtorId: ob.debtor_id, creditorId: ob.creditor_id, net });
    }
    return pairs.sort((a, b) => b.net - a.net);
  }, [outstanding]);

  const handleSettle = (debtorId: string, creditorId: string, oblIds: string[]) => {
    const net = bilateralObligationNet(creditorId, debtorId, outstanding);
    setSettlePanel({ debtorId, creditorId, oblIds, maxAmount: Math.abs(net) });
  };

  const handleConfirmPayment = async (amount: number, notes: string) => {
    if (!settlePanel) return;
    const s = await createSettlement.mutateAsync({
      input: {
        debtor_id:    settlePanel.debtorId,
        creditor_id:  settlePanel.creditorId,
        amount,
        obligation_ids: settlePanel.oblIds,
        notes: notes || undefined,
      },
      createdBy: ADMIN_ID,
    });
    await confirmSettlement.mutateAsync(s.id);
    setSettlePanel(null);
  };

  return (
    <div className="animate-fade-in max-w-2xl mx-auto">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-3xl font-display font-bold text-ivory-100">Settlements</h1>
          <p className="text-sm text-ivory-200/45 font-body mt-0.5">Obligations vs. payments — two separate things</p>
        </div>
        <SuitRow />
      </div>

      {/* Explainer */}
      <Card className="mb-6">
        <CardBody className="py-3">
          <div className="grid grid-cols-2 gap-3 text-xs font-body">
            <div className="py-2 px-3 rounded-lg bg-crimson-500/8 border border-crimson-500/15">
              <p className="text-crimson-400 font-medium mb-1">Obligation</p>
              <p className="text-ivory-200/50">A debt created when a match or wager settles. "Mark owes Joey $4."</p>
            </div>
            <div className="py-2 px-3 rounded-lg bg-emerald-500/8 border border-emerald-500/15">
              <p className="text-emerald-400 font-medium mb-1">Settlement</p>
              <p className="text-ivory-200/50">A confirmed payment reducing that debt. "Mark paid Joey $4 via Venmo."</p>
            </div>
          </div>
        </CardBody>
      </Card>

      {/* Payment panel */}
      {settlePanel && (
        <RecordPaymentPanel
          debtorId={settlePanel.debtorId}
          creditorId={settlePanel.creditorId}
          maxAmount={settlePanel.maxAmount}
          obligationIds={settlePanel.oblIds}
          users={users}
          onConfirm={handleConfirmPayment}
          onCancel={() => setSettlePanel(null)}
        />
      )}

      {/* Outstanding debts */}
      <SectionTitle subtitle="Unpaid or partially paid obligations, grouped by pair">
        Outstanding Debts
      </SectionTitle>

      {obsLoading ? <LoadingCard /> :
        bilateralPairs.length === 0 ? (
          <Card><CardBody>
            <EmptyState icon="♣" title="All clear" description="No outstanding obligations" />
          </CardBody></Card>
        ) : bilateralPairs.map(pair => (
          <BilateralCard
            key={`${pair.debtorId}:${pair.creditorId}`}
            debtorId={pair.debtorId}
            creditorId={pair.creditorId}
            netAmount={pair.net}
            obligations={outstanding}
            users={users}
            onSettle={handleSettle}
          />
        ))
      }

      {/* Settlement history */}
      <GoldDivider className="my-6" />
      <SectionTitle subtitle="Confirmed payments on record">Payment History</SectionTitle>

      {settlements.length === 0 ? (
        <Card><CardBody><EmptyState icon="♦" title="No payments recorded yet" /></CardBody></Card>
      ) : settlements.map(s => {
        const debtor   = users.find(u => u.id === s.debtor_id);
        const creditor = users.find(u => u.id === s.creditor_id);
        return (
          <Card key={s.id} className="mb-3">
            <CardBody>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {debtor   && <PlayerAvatar user={debtor}   size="sm" />}
                  <ArrowRight size={12} className="text-ivory-200/30" />
                  {creditor && <PlayerAvatar user={creditor} size="sm" />}
                  <div>
                    <p className="text-sm font-body text-ivory-100">
                      {debtor?.display_name} → {creditor?.display_name}
                    </p>
                    {s.notes && <p className="text-xs text-ivory-200/35 font-body italic">{s.notes}</p>}
                    <p className="text-xs text-ivory-200/30 font-body">{formatDate(s.requested_at)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm text-ivory-100">${s.amount.toFixed(2)}</span>
                  <SettlementStatusBadge status={s.status} />
                </div>
              </div>
            </CardBody>
          </Card>
        );
      })}
    </div>
  );
}

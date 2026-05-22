import React, { useState, useMemo } from 'react';
import {
  Card, CardBody, CardHeader, Button, Input, Select,
  SectionTitle, SuitRow, PlayerAvatar, Badge, EmptyState,
  GoldDivider, Spinner,
} from '@/components/ui';
import {
  useAllUsers, useCreateUser, useUpdateUser, useSetUserActive,
} from '@/hooks/useData';
import type { User, UserRole } from '@/types';
import {
  UserPlus, Pencil, Power, PowerOff, Search, X,
  CheckCircle, Shield, Eye, Users,
} from 'lucide-react';

// ── Constants ─────────────────────────────────────────────────

const ROLE_OPTIONS: { value: UserRole; label: string }[] = [
  { value: 'player',    label: 'Player' },
  { value: 'admin',     label: 'Admin' },
  { value: 'spectator', label: 'Spectator' },
];

const AVATAR_COLORS = [
  '#f5b832', '#60a5fa', '#a78bfa', '#34d399',
  '#f472b6', '#fb923c', '#f87171', '#38bdf8',
  '#4ade80', '#e879f9', '#facc15', '#94a3b8',
];

const ROLE_BADGE_VARIANT: Record<UserRole, string> = {
  admin:     'gold',
  player:    'blue',
  spectator: 'default',
};

const ROLE_ICON: Record<UserRole, React.ElementType> = {
  admin:     Shield,
  player:    Users,
  spectator: Eye,
};

// ── Validation ────────────────────────────────────────────────

interface FormErrors { display_name?: string; role?: string; avatar_color?: string; }

function validateForm(name: string, role: string, color: string): FormErrors {
  const e: FormErrors = {};
  if (!name.trim())              e.display_name = 'Name is required';
  else if (name.trim().length < 2) e.display_name = 'Name must be at least 2 characters';
  else if (name.trim().length > 32) e.display_name = 'Name must be 32 characters or fewer';
  if (!role)                     e.role = 'Role is required';
  if (!color)                    e.avatar_color = 'Pick a color';
  return e;
}

// ── Color Picker ──────────────────────────────────────────────

function ColorPicker({
  value, onChange,
}: { value: string; onChange: (c: string) => void }) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-xs font-body text-ivory-200/60 uppercase tracking-wider">Avatar Color</span>
      <div className="flex flex-wrap gap-2">
        {AVATAR_COLORS.map(c => (
          <button
            key={c}
            type="button"
            onClick={() => onChange(c)}
            className="w-7 h-7 rounded-full transition-all duration-150 focus:outline-none"
            style={{
              backgroundColor: c,
              boxShadow: value === c
                ? `0 0 0 2px #060d08, 0 0 0 4px ${c}`
                : undefined,
              transform: value === c ? 'scale(1.15)' : undefined,
            }}
          />
        ))}
      </div>
    </div>
  );
}

// ── Player Form (shared by create + edit modals) ──────────────

interface PlayerFormProps {
  initial?: Partial<{ display_name: string; role: UserRole; avatar_color: string }>;
  onSubmit: (values: { display_name: string; role: UserRole; avatar_color: string }) => void;
  onCancel: () => void;
  isPending: boolean;
  submitLabel: string;
}

function PlayerForm({ initial, onSubmit, onCancel, isPending, submitLabel }: PlayerFormProps) {
  const [name,  setName]  = useState(initial?.display_name ?? '');
  const [role,  setRole]  = useState<UserRole>(initial?.role ?? 'player');
  const [color, setColor] = useState(initial?.avatar_color ?? AVATAR_COLORS[0]);
  const [errors, setErrors] = useState<FormErrors>({});

  const preview: User = {
    id: 'preview', auth_id: null, display_name: name || 'Name',
    role, avatar_color: color, is_active: true,
    created_at: '', updated_at: '',
  };

  const handleSubmit = () => {
    const e = validateForm(name, role, color);
    setErrors(e);
    if (Object.keys(e).length > 0) return;
    onSubmit({ display_name: name.trim(), role, avatar_color: color });
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Live preview */}
      <div className="flex items-center gap-3 py-3 px-4 rounded-xl bg-felt-800/60 border border-felt-600/40">
        <PlayerAvatar user={preview} size="lg" />
        <div>
          <p className="text-sm font-body font-medium text-ivory-100">{name || 'Player Name'}</p>
          <p className="text-xs text-ivory-200/40 font-body capitalize">{role}</p>
        </div>
      </div>

      <div>
        <Input
          label="Display Name"
          value={name}
          onChange={e => { setName(e.target.value); setErrors(prev => ({ ...prev, display_name: undefined })); }}
          placeholder="e.g. Joey"
          error={errors.display_name}
          maxLength={32}
        />
        {name.trim().length > 0 && (
          <p className="text-[10px] text-ivory-200/25 font-body mt-0.5 text-right">{name.trim().length}/32</p>
        )}
      </div>

      <div>
        <Select
          label="Role"
          value={role}
          onChange={e => { setRole(e.target.value as UserRole); setErrors(prev => ({ ...prev, role: undefined })); }}
        >
          {ROLE_OPTIONS.map(o => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </Select>
        {errors.role && <p className="text-xs text-crimson-400 mt-1">{errors.role}</p>}
        <p className="text-[10px] text-ivory-200/25 font-body mt-1">
          {role === 'admin'     && 'Can manage matches, players, and settle debts.'}
          {role === 'player'    && 'Can play matches and place side wagers.'}
          {role === 'spectator' && 'Can view only. Cannot play or bet.'}
        </p>
      </div>

      <ColorPicker value={color} onChange={c => { setColor(c); setErrors(prev => ({ ...prev, avatar_color: undefined })); }} />
      {errors.avatar_color && <p className="text-xs text-crimson-400">{errors.avatar_color}</p>}

      <GoldDivider className="my-0" />

      <div className="flex gap-2">
        <Button variant="secondary" size="md" className="flex-1 justify-center" onClick={onCancel} disabled={isPending}>
          Cancel
        </Button>
        <Button variant="primary" size="md" className="flex-1 justify-center" onClick={handleSubmit} disabled={isPending}>
          {isPending ? <Spinner size="sm" /> : <CheckCircle size={14} />}
          {isPending ? 'Saving…' : submitLabel}
        </Button>
      </div>
    </div>
  );
}

// ── Modal shell ───────────────────────────────────────────────

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/65 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md animate-slide-up">
        <Card gold className="shadow-gold-lg">
          <CardHeader>
            <div className="flex items-center justify-between">
              <span className="text-base font-display font-semibold text-ivory-100">{title}</span>
              <button onClick={onClose} className="text-ivory-200/35 hover:text-ivory-100 transition-colors">
                <X size={16} />
              </button>
            </div>
          </CardHeader>
          <CardBody>{children}</CardBody>
        </Card>
      </div>
    </div>
  );
}

// ── Player card ───────────────────────────────────────────────

function PlayerCard({
  user,
  onEdit,
  onToggle,
  isTogglePending,
}: {
  user: User;
  onEdit: (u: User) => void;
  onToggle: (u: User) => void;
  isTogglePending: boolean;
}) {
  const RoleIcon = ROLE_ICON[user.role];

  return (
    <div className={`flex items-center gap-3 p-4 rounded-xl border transition-all duration-200
      ${user.is_active
        ? 'bg-felt-800/50 border-felt-600/40 hover:border-gold-400/20'
        : 'bg-felt-900/40 border-felt-700/30 opacity-55'}`}
    >
      {/* Avatar */}
      <PlayerAvatar user={user} size="lg" className={!user.is_active ? 'grayscale' : ''} />

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-sm font-body font-medium text-ivory-100 truncate">{user.display_name}</p>
          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border
            ${user.role === 'admin'     ? 'bg-gold-400/12 text-gold-300 border-gold-400/20'
            : user.role === 'player'   ? 'bg-blue-500/12 text-blue-300 border-blue-500/20'
            : 'bg-felt-700 text-ivory-200/50 border-felt-600'}`}
          >
            <RoleIcon size={9} />
            {user.role}
          </span>
          {!user.is_active && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-felt-700 text-ivory-200/40 border border-felt-600">
              Inactive
            </span>
          )}
        </div>
        <p className="text-[10px] text-ivory-200/25 font-mono mt-0.5 truncate">{user.id}</p>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1.5 shrink-0">
        <button
          onClick={() => onEdit(user)}
          className="p-2 rounded-lg text-ivory-200/40 hover:text-ivory-100 hover:bg-felt-700/60 transition-all"
          title="Edit player"
        >
          <Pencil size={14} />
        </button>
        <button
          onClick={() => onToggle(user)}
          disabled={isTogglePending}
          className={`p-2 rounded-lg transition-all disabled:opacity-40
            ${user.is_active
              ? 'text-emerald-400/60 hover:text-crimson-400 hover:bg-crimson-500/10'
              : 'text-ivory-200/30 hover:text-emerald-400 hover:bg-emerald-500/10'}`}
          title={user.is_active ? 'Deactivate player' : 'Activate player'}
        >
          {user.is_active ? <PowerOff size={14} /> : <Power size={14} />}
        </button>
      </div>
    </div>
  );
}

// ── Main Screen ───────────────────────────────────────────────

export default function PlayerManagement() {
  const { data: users = [], isLoading } = useAllUsers();
  const createUser  = useCreateUser();
  const updateUser  = useUpdateUser();
  const setActive   = useSetUserActive();

  const [showCreate, setShowCreate]   = useState(false);
  const [editTarget, setEditTarget]   = useState<User | null>(null);
  const [search,     setSearch]       = useState('');
  const [roleFilter, setRoleFilter]   = useState<UserRole | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [togglingId, setTogglingId]   = useState<string | null>(null);

  const filtered = useMemo(() => {
    return users.filter(u => {
      if (search && !u.display_name.toLowerCase().includes(search.toLowerCase())) return false;
      if (roleFilter !== 'all' && u.role !== roleFilter) return false;
      if (statusFilter === 'active'   && !u.is_active) return false;
      if (statusFilter === 'inactive' && u.is_active)  return false;
      return true;
    });
  }, [users, search, roleFilter, statusFilter]);

  const stats = {
    total:   users.length,
    active:  users.filter(u => u.is_active).length,
    admins:  users.filter(u => u.role === 'admin').length,
  };

  const handleCreate = async (values: { display_name: string; role: UserRole; avatar_color: string }) => {
    await createUser.mutateAsync(values);
    setShowCreate(false);
  };

  const handleEdit = async (values: { display_name: string; role: UserRole; avatar_color: string }) => {
    if (!editTarget) return;
    await updateUser.mutateAsync({ id: editTarget.id, input: values });
    setEditTarget(null);
  };

  const handleToggle = async (user: User) => {
    setTogglingId(user.id);
    try {
      await setActive.mutateAsync({ id: user.id, is_active: !user.is_active });
    } finally {
      setTogglingId(null);
    }
  };

  const clearFilters = () => { setSearch(''); setRoleFilter('all'); setStatusFilter('all'); };
  const hasFilters   = search || roleFilter !== 'all' || statusFilter !== 'all';

  return (
    <>
      <div className="animate-fade-in">
        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-3xl font-display font-bold text-ivory-100">Players</h1>
            <p className="text-sm text-ivory-200/45 font-body mt-0.5">Manage league members</p>
          </div>
          <div className="flex items-center gap-2">
            <SuitRow />
            <Button variant="primary" size="md" onClick={() => setShowCreate(true)}>
              <UserPlus size={14} /> Add Player
            </Button>
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          {[
            { label: 'Total Players', value: stats.total,  color: 'text-ivory-100' },
            { label: 'Active',        value: stats.active, color: 'text-emerald-400' },
            { label: 'Admins',        value: stats.admins, color: 'text-gold-300' },
          ].map(({ label, value, color }) => (
            <Card key={label}>
              <CardBody className="py-3 text-center">
                <p className={`text-2xl font-display font-bold ${color}`}>{value}</p>
                <p className="text-xs text-ivory-200/40 font-body mt-0.5">{label}</p>
              </CardBody>
            </Card>
          ))}
        </div>

        {/* Filters */}
        <Card className="mb-5">
          <CardBody className="py-3">
            <div className="flex items-center gap-2 flex-wrap">
              {/* Search */}
              <div className="relative flex-1 min-w-[160px]">
                <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-ivory-200/30 pointer-events-none" />
                <input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search players…"
                  className="input-gold w-full bg-felt-900 border border-felt-600 rounded-lg pl-8 pr-3 py-2 text-xs text-ivory-100 placeholder-ivory-200/25 font-body"
                />
                {search && (
                  <button onClick={() => setSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-ivory-200/30 hover:text-ivory-100">
                    <X size={11} />
                  </button>
                )}
              </div>

              {/* Role filter */}
              <select
                value={roleFilter}
                onChange={e => setRoleFilter(e.target.value as UserRole | 'all')}
                className="input-gold bg-felt-900 border border-felt-600 rounded-lg px-2.5 py-2 text-xs text-ivory-100 font-body cursor-pointer"
              >
                <option value="all">All roles</option>
                {ROLE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>

              {/* Status filter */}
              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value as 'all' | 'active' | 'inactive')}
                className="input-gold bg-felt-900 border border-felt-600 rounded-lg px-2.5 py-2 text-xs text-ivory-100 font-body cursor-pointer"
              >
                <option value="all">All statuses</option>
                <option value="active">Active only</option>
                <option value="inactive">Inactive only</option>
              </select>

              {hasFilters && (
                <Button variant="ghost" size="sm" onClick={clearFilters}>
                  <X size={11} /> Clear
                </Button>
              )}

              <span className="ml-auto text-xs text-ivory-200/30 font-body">
                {filtered.length} / {users.length}
              </span>
            </div>
          </CardBody>
        </Card>

        {/* Player list */}
        {isLoading ? (
          <Card><CardBody className="flex justify-center py-10"><Spinner size="lg" /></CardBody></Card>
        ) : filtered.length === 0 ? (
          <Card>
            <CardBody>
              <EmptyState
                icon={<Users size={28} className="text-gold-400/30 mx-auto" />}
                title={hasFilters ? 'No players match filters' : 'No players yet'}
                description={hasFilters ? 'Try adjusting your search or filters' : 'Add the first player to get started'}
                action={!hasFilters ? (
                  <Button variant="primary" size="md" onClick={() => setShowCreate(true)}>
                    <UserPlus size={14} /> Add Player
                  </Button>
                ) : undefined}
              />
            </CardBody>
          </Card>
        ) : (
          <div className="flex flex-col gap-2">
            {/* Active players first, then inactive */}
            {[true, false].map(activeGroup => {
              const group = filtered.filter(u => u.is_active === activeGroup);
              if (group.length === 0) return null;
              return (
                <React.Fragment key={String(activeGroup)}>
                  {!activeGroup && filtered.some(u => u.is_active) && (
                    <div className="flex items-center gap-2 mt-3 mb-1">
                      <GoldDivider className="flex-1 my-0" />
                      <span className="text-[10px] text-ivory-200/25 font-body uppercase tracking-widest shrink-0">Inactive</span>
                      <GoldDivider className="flex-1 my-0" />
                    </div>
                  )}
                  {group.map(user => (
                    <PlayerCard
                      key={user.id}
                      user={user}
                      onEdit={setEditTarget}
                      onToggle={handleToggle}
                      isTogglePending={togglingId === user.id}
                    />
                  ))}
                </React.Fragment>
              );
            })}
          </div>
        )}

        {/* Footer hint */}
        {users.length > 0 && (
          <p className="text-[10px] text-ivory-200/20 font-body text-center mt-6">
            Deactivated players are hidden from match creation and wager proposals.
          </p>
        )}
      </div>

      {/* Create modal */}
      {showCreate && (
        <Modal title="Add Player" onClose={() => setShowCreate(false)}>
          <PlayerForm
            onSubmit={handleCreate}
            onCancel={() => setShowCreate(false)}
            isPending={createUser.isPending}
            submitLabel="Create Player"
          />
        </Modal>
      )}

      {/* Edit modal */}
      {editTarget && (
        <Modal title="Edit Player" onClose={() => setEditTarget(null)}>
          <PlayerForm
            initial={editTarget}
            onSubmit={handleEdit}
            onCancel={() => setEditTarget(null)}
            isPending={updateUser.isPending}
            submitLabel="Save Changes"
          />
        </Modal>
      )}
    </>
  );
}

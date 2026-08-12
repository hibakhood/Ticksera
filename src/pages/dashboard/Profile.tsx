import { useState, useRef, useEffect } from 'react';
import { useStore } from '../../store';
import { isSupabaseConfigured, getSupabase } from '../../lib/supabase';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import { TextArea } from '../../components/ui/Input';
import Badge from '../../components/ui/Badge';
import { Phone, MapPin, Edit, Save, Ticket, Star, Calendar, Monitor, Smartphone, Laptop, Shield, LogOut, AlertTriangle, Camera, Trash2, ShieldCheck, QrCode, KeyRound } from 'lucide-react';
import PageHeader from '../../components/ui/PageHeader';
import { cleanTicketTitle } from '../../utils/ticketTitle';

function DeviceIcon({ device }: { device: string }) {
  const d = device.toLowerCase();
  if (d.includes('iphone') || d.includes('android') || d.includes('mobile')) return <Smartphone className="w-4 h-4" />;
  if (d.includes('macbook') || d.includes('laptop')) return <Laptop className="w-4 h-4" />;
  return <Monitor className="w-4 h-4" />;
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function fileToAvatarDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const max = 256;
        let { width, height } = img;
        if (width > max || height > max) {
          const scale = Math.min(max / width, max / height);
          width = Math.round(width * scale);
          height = Math.round(height * scale);
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) { reject(new Error('Canvas not supported')); return; }
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.85));
      };
      img.onerror = () => reject(new Error('Invalid image'));
      img.src = reader.result as string;
    };
    reader.onerror = () => reject(new Error('Read failed'));
    reader.readAsDataURL(file);
  });
}

export default function Profile() {
  const { currentUser, updateUser, tickets, activeSessions, revokeSession, revokeAllOtherSessions } = useStore();
  const [editing, setEditing] = useState(false);
  const [revokeConfirm, setRevokeConfirm] = useState<string | null>(null);
  const [revokeAllConfirm, setRevokeAllConfirm] = useState(false);
  const [uploading, setUploading] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState({
    phone: currentUser?.phone || '',
    location: currentUser?.location || '',
    bio: currentUser?.bio || '',
  });

  const [mfaOn, setMfaOn] = useState(false);
  const [mfaLoading, setMfaLoading] = useState(false);
  const [mfaError, setMfaError] = useState('');
  const [mfaQr, setMfaQr] = useState<string | null>(null);
  const [mfaSecret, setMfaSecret] = useState('');
  const [mfaFactorId, setMfaFactorId] = useState('');
  const [mfaCode, setMfaCode] = useState('');

  const supabaseLive = isSupabaseConfigured();

  useEffect(() => {
    if (!supabaseLive) return;
    let active = true;
    void (async () => {
      try {
        const { data } = await getSupabase().auth.mfa.listFactors();
        if (active) setMfaOn((data?.totp ?? []).some(f => f.status === 'verified'));
      } catch { /* ignore */ }
    })();
    return () => { active = false; };
  }, [supabaseLive]);

  const handleEnroll = async () => {
    setMfaError('');
    setMfaLoading(true);
    try {
      const { data, error } = await getSupabase().auth.mfa.enroll({ factorType: 'totp' });
      if (error) { setMfaError(error.message ?? 'Could not start enrollment.'); return; }
      if (!data) { setMfaError('Could not start enrollment.'); return; }
      setMfaQr(`data:image/svg+xml;base64,${btoa(data.totp.qr_code)}`);
      setMfaSecret(data.totp.secret);
      setMfaFactorId(data.id);
      setMfaCode('');
    } catch {
      setMfaError('Could not start enrollment.');
    } finally {
      setMfaLoading(false);
    }
  };

  const handleVerifyMfa = async () => {
    setMfaError('');
    if (!mfaFactorId || mfaCode.trim().length < 6) { setMfaError('Enter the 6-digit code from your authenticator app.'); return; }
    setMfaLoading(true);
    try {
      const challenge = await getSupabase().auth.mfa.challenge({ factorId: mfaFactorId });
      if (challenge.error || !challenge.data?.id) { setMfaError(challenge.error?.message ?? 'Challenge failed.'); return; }
      const verify = await getSupabase().auth.mfa.verify({ factorId: mfaFactorId, challengeId: challenge.data.id, code: mfaCode.trim() });
      if (verify.error) { setMfaError(verify.error.message ?? 'That code did not verify.'); return; }
      setMfaOn(true);
      setMfaQr(null);
      setMfaSecret('');
      setMfaFactorId('');
      setMfaCode('');
    } catch {
      setMfaError('Could not verify the code.');
    } finally {
      setMfaLoading(false);
    }
  };

  const handleDisableMfa = async () => {
    setMfaError('');
    setMfaLoading(true);
    try {
      const { data } = await getSupabase().auth.mfa.listFactors();
      const factor = (data?.totp ?? []).find(f => f.status === 'verified');
      if (!factor) { setMfaOn(false); return; }
      const { error } = await getSupabase().auth.mfa.unenroll({ factorId: factor.id });
      if (error) { setMfaError(error.message ?? 'Could not disable MFA.'); return; }
      setMfaOn(false);
    } catch {
      setMfaError('Could not disable MFA.');
    } finally {
      setMfaLoading(false);
    }
  };

  if (!currentUser) return null;

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !file.type.startsWith('image/')) return;
    setUploading(true);
    try {
      const url = await fileToAvatarDataUrl(file);
      updateUser(currentUser.id, { avatar: url });
    } catch {
      /* ignore invalid uploads */
    }
    setUploading(false);
  };

  const handleRemoveAvatar = () => {
    updateUser(currentUser.id, { avatar: undefined });
  };

  const myTickets = currentUser.role === 'customer'
    ? tickets.filter(t => t.createdBy === currentUser.id)
    : tickets.filter(t => t.assignedTo === currentUser.id);

  const resolvedCount = myTickets.filter(t => t.status === 'resolved' || t.status === 'closed').length;
  const avgRating = myTickets.filter(t => t.rating).reduce((a, t) => a + (t.rating || 0), 0) / (myTickets.filter(t => t.rating).length || 1);

  const handleSave = () => { updateUser(currentUser.id, form); setEditing(false); };

  const roleColors: Record<string, 'success' | 'info' | 'warning' | 'purple' | 'danger'> = {
    super_admin: 'danger', support_manager: 'purple', technician: 'info', field_technician: 'warning', customer: 'success',
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-fade-in premium-surface rounded-2xl p-1">
      <PageHeader
        eyebrow="Account"
        title="Profile"
        subtitle="Manage your personal details, sessions and activity."
      />

      {/* Avatar + info card */}
      <Card className="card-premium relative overflow-hidden p-6 sm:p-8">
        <div className="absolute -right-12 -top-12 w-44 h-44 rounded-full bg-emerald-500/5" />
        <div className="relative flex flex-col sm:flex-row items-start gap-5 sm:gap-6">
          <div className="relative flex-shrink-0">
            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-3xl overflow-hidden bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white text-3xl font-bold shadow-lg shadow-emerald-500/25 ring-4 ring-emerald-500/10">
              {currentUser.avatar ? (
                <img src={currentUser.avatar} alt={currentUser.name} className="w-full h-full object-cover" />
              ) : (
                currentUser.name.charAt(0)
              )}
            </div>
            <input
              ref={avatarInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleAvatarChange}
            />
            <button
              onClick={() => avatarInputRef.current?.click()}
              disabled={uploading}
              title="Upload photo"
              className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-emerald-500 hover:bg-emerald-600 text-white flex items-center justify-center shadow-lg border-2 border-white dark:border-dark-card transition-all disabled:opacity-60"
            >
              {uploading
                ? <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                : <Camera className="w-4 h-4" />}
            </button>
            {currentUser.avatar && (
              <button
                onClick={handleRemoveAvatar}
                title="Remove photo"
                className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-red-500 hover:bg-red-600 text-white flex items-center justify-center shadow border-2 border-white dark:border-dark-card transition-all"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
              <h2 className="font-heading text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">{currentUser.name}</h2>
              <Badge variant={roleColors[currentUser.role]}>{currentUser.role.replace(/_/g, ' ')}</Badge>
            </div>
            <p className="text-sm text-slate-500 mt-1">{currentUser.email}</p>
            <div className="flex flex-wrap gap-4 mt-3 text-sm text-slate-600 dark:text-slate-400">
              {currentUser.phone && (
                <div className="flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" /> {currentUser.phone}
                </div>
              )}
              {currentUser.location && (
                <div className="flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" /> {currentUser.location}
                </div>
              )}
            </div>
            {currentUser.bio && <p className="mt-3 text-sm text-slate-600 dark:text-slate-400 leading-relaxed">{currentUser.bio}</p>}
          </div>
        </div>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { icon: Ticket,   label: 'Tickets',      value: myTickets.length,                      grad: 'from-blue-500 to-indigo-600' },
          { icon: Save,     label: 'Resolved',      value: resolvedCount,                         grad: 'from-emerald-500 to-teal-600' },
          { icon: Star,     label: 'Avg Rating',    value: avgRating.toFixed(1),                  grad: 'from-amber-500 to-orange-600' },
          { icon: Calendar, label: 'Member Since',  value: new Date(currentUser.createdAt).toLocaleDateString('en', { month: 'short', year: 'numeric' }), grad: 'from-violet-500 to-purple-600' },
        ].map((s, i) => (
          <Card key={i} className="card-premium p-4 text-center">
            <div className={`chip-icon w-10 h-10 rounded-xl bg-gradient-to-br ${s.grad} mx-auto mb-2.5`}>
              <s.icon className="w-4.5 h-4.5" />
            </div>
            <p className="font-heading text-xl font-bold text-slate-900 dark:text-white leading-none">{s.value}</p>
            <p className="text-xs text-slate-500 mt-1">{s.label}</p>
          </Card>
        ))}
      </div>

      {/* Edit Form */}
      <Card className="card-premium p-5 sm:p-6">
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-heading font-semibold text-slate-900 dark:text-white">Personal Information</h3>
          <Button variant={editing ? 'primary' : 'outline'} size="sm" onClick={() => editing ? handleSave() : setEditing(true)}>
            {editing ? <><Save className="w-3.5 h-3.5" /> Save</> : <><Edit className="w-3.5 h-3.5" /> Edit</>}
          </Button>
        </div>
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label="Phone" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} disabled={!editing} />
            <Input label="Location" value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} disabled={!editing} />
          </div>
          <TextArea label="Bio" rows={3} value={form.bio} onChange={e => setForm({ ...form, bio: e.target.value })} disabled={!editing} />
        </div>
      </Card>

      {/* Active Sessions */}
      <Card className="card-premium p-5 sm:p-6">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-emerald-500" />
            <h3 className="font-heading font-semibold text-slate-900 dark:text-white">Active Sessions</h3>
            <span className="text-xs bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 px-2 py-0.5 rounded-full font-medium">{activeSessions.length}</span>
          </div>
          {activeSessions.filter(s => !s.current).length > 0 && (
            <Button
              variant="outline"
              size="sm"
              className="text-red-500 hover:text-red-600 border-red-200 hover:border-red-300 hover:bg-red-50 dark:border-red-900/40 dark:hover:bg-red-900/10"
              onClick={() => setRevokeAllConfirm(true)}
            >
              <LogOut className="w-3.5 h-3.5" /> Sign out all others
            </Button>
          )}
        </div>

        {revokeAllConfirm && (
          <div className="mb-4 p-3 rounded-xl bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-900/40 flex items-start gap-3">
            <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-red-700 dark:text-red-400">Sign out all other sessions?</p>
              <p className="text-xs text-red-500 mt-0.5">This will immediately log out all devices except this one.</p>
              <div className="flex gap-2 mt-2">
                <Button size="sm" variant="primary" className="bg-red-500 hover:bg-red-600 shadow-none" onClick={() => { revokeAllOtherSessions(); setRevokeAllConfirm(false); }}>Confirm</Button>
                <Button size="sm" variant="outline" onClick={() => setRevokeAllConfirm(false)}>Cancel</Button>
              </div>
            </div>
          </div>
        )}

        <div className="space-y-3">
          {activeSessions.map(session => (
            <div key={session.id} className={`flex items-start gap-4 p-3.5 rounded-xl border transition-all ${session.current ? 'bg-emerald-50 dark:bg-emerald-900/10 border-emerald-200 dark:border-emerald-800' : 'bg-slate-50 dark:bg-slate-800/30 border-slate-200 dark:border-slate-700/50'}`}>
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${session.current ? 'bg-emerald-500 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400'}`}>
                <DeviceIcon device={session.device} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium text-sm text-slate-900 dark:text-white">{session.device}</span>
                  {session.current && <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-900/30 px-2 py-0.5 rounded-full uppercase tracking-wide">Current</span>}
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{session.browser} · {session.location}</p>
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">IP: {session.ip} · {timeAgo(session.lastActive)}</p>
              </div>
              {!session.current && (
                revokeConfirm === session.id ? (
                  <div className="flex gap-1.5 flex-shrink-0">
                    <Button size="sm" variant="primary" className="bg-red-500 hover:bg-red-600 shadow-none text-xs px-2 py-1" onClick={() => { revokeSession(session.id); setRevokeConfirm(null); }}>Yes, sign out</Button>
                    <Button size="sm" variant="outline" className="text-xs px-2 py-1" onClick={() => setRevokeConfirm(null)}>Cancel</Button>
                  </div>
                ) : (
                  <button onClick={() => setRevokeConfirm(session.id)} className="flex-shrink-0 text-xs text-slate-400 hover:text-red-500 transition-colors flex items-center gap-1 p-2.5 -m-1 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/10">
                    <LogOut className="w-3.5 h-3.5" /> Sign out
                  </button>
                )
              )}
            </div>
          ))}
        </div>
        <p className="text-xs text-slate-400 dark:text-slate-500 mt-4">If you see a session you don't recognise, sign it out immediately and change your password.</p>
      </Card>

      {/* Two-Factor Authentication */}
      <Card className="card-premium p-5 sm:p-6">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
            <h3 className="font-heading font-semibold text-slate-900 dark:text-white">Two-Factor Authentication</h3>
          </div>
          {mfaOn && <Badge variant="success">Enabled</Badge>}
        </div>
        {!supabaseLive ? (
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
            Two-factor authentication is available when Supabase is configured.
          </p>
        ) : mfaQr ? (
          <div className="mt-4 space-y-4">
            <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
              Scan this QR code with your authenticator app (Google Authenticator, 1Password, Authy), then enter the
              generated 6-digit code to confirm.
            </p>
            <div className="flex flex-col sm:flex-row items-start gap-5">
              <div className="p-3 bg-white rounded-2xl border border-slate-200 dark:border-slate-700">
                <img src={mfaQr} alt="MFA setup QR code" className="w-40 h-40" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-slate-400 mb-1">Manual setup secret</p>
                <code className="block font-mono text-xs text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2.5 py-2 rounded-lg break-all mb-4">{mfaSecret}</code>
                <div className="flex flex-col gap-2">
                  <Input
                    label="Verification code"
                    placeholder="000000"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    value={mfaCode}
                    onChange={e => { setMfaCode(e.target.value.replace(/\D/g, '').slice(0, 6)); setMfaError(''); }}
                    error={mfaError}
                  />
                  <div className="flex gap-2">
                    <Button size="sm" onClick={handleVerifyMfa} disabled={mfaLoading}>
                      <KeyRound className="w-3.5 h-3.5" /> Confirm & Enable
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => { setMfaQr(null); setMfaSecret(''); setMfaFactorId(''); setMfaError(''); }}>Cancel</Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : mfaOn ? (
          <div className="mt-3 flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <p className="text-sm text-slate-500 dark:text-slate-400 flex-1">
              Your account requires a 6-digit code on every new sign-in. Keep your authenticator app backed up.
            </p>
            <Button size="sm" variant="danger" onClick={handleDisableMfa} disabled={mfaLoading}>Disable MFA</Button>
          </div>
        ) : (
          <div className="mt-3 flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <p className="text-sm text-slate-500 dark:text-slate-400 flex-1">
              Add an extra layer of security. Once enabled, every sign-in asks for a code from your authenticator app.
            </p>
            <Button size="sm" onClick={handleEnroll} disabled={mfaLoading}>
              <QrCode className="w-3.5 h-3.5" /> Set up MFA
            </Button>
          </div>
        )}
        {mfaError && !mfaQr && <p className="text-xs text-red-500 mt-2">{mfaError}</p>}
      </Card>

      {/* Recent tickets */}
      <Card className="card-premium p-5 sm:p-6">
        <h3 className="font-heading font-semibold text-slate-900 dark:text-white mb-4">Recent Tickets</h3>
        {myTickets.length === 0 ? (
          <p className="text-sm text-slate-400 text-center py-6">No tickets yet</p>
        ) : (
          <div className="space-y-1">
            {[...myTickets].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 5).map(t => (
              <div key={t.id} className="flex items-center justify-between py-3 border-b border-slate-100 dark:border-slate-800 last:border-0 gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-900 dark:text-white truncate">{cleanTicketTitle(t.title)}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{new Date(t.createdAt).toLocaleDateString()}</p>
                </div>
                <Badge variant={t.status === 'resolved' ? 'success' : t.status === 'open' ? 'info' : 'warning'} className="flex-shrink-0">
                  {t.status.replace(/_/g, ' ')}
                </Badge>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

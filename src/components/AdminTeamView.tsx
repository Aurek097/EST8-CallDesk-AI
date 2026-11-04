import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  Users,
  UserPlus,
  ShieldCheck,
  Phone,
  Hash,
  Eye,
  Trash2,
  CheckCircle,
  XCircle,
  ExternalLink,
  Award,
  Sparkles,
  TrendingUp,
  Search,
  Filter,
  ArrowRight
} from 'lucide-react';
import { CRMUser } from '../types';

export const AdminTeamView: React.FC = () => {
  const {
    teamUsers,
    inviteDownline,
    toggleUserVerification,
    deleteDownline,
    switchUserView,
    viewingUserId,
    user: currentAdmin,
    setView
  } = useApp();

  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterRole, setFilterRole] = useState<'all' | 'agent' | 'admin'>('all');

  // New Agent Form State
  const [formName, setFormName] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formNpn, setFormNpn] = useState('');
  const [formStates, setFormStates] = useState('SC, NC, GA');
  const [formRole, setFormRole] = useState<'agent' | 'admin'>('agent');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  // Handle invitation
  const handleSubmitInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError('');
    if (!formEmail.trim() || !formName.trim()) {
      setSubmitError('Full name and Google email are required');
      return;
    }

    setIsSubmitting(true);
    try {
      const stateList = formStates
        .split(',')
        .map(s => s.trim().toUpperCase())
        .filter(Boolean)
        .map((st, idx) => ({
          id: String(idx + 1),
          st,
          num: formNpn || 'PENDING',
          home: idx === 0,
          exp: '2026-12-31'
        }));

      await inviteDownline({
        email: formEmail.trim().toLowerCase(),
        name: formName.trim(),
        phone: formPhone.trim(),
        npn: formNpn.trim(),
        role: formRole,
        initialStates: stateList
      });

      // Reset form
      setFormName('');
      setFormEmail('');
      setFormPhone('');
      setFormNpn('');
      setIsInviteOpen(false);
    } catch (err: any) {
      setSubmitError(err.message || 'Failed to pre-register agent');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredUsers = teamUsers.filter(u => {
    const matchesSearch =
      u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (u.npn && u.npn.includes(searchQuery));
    const matchesRole = filterRole === 'all' || u.role === filterRole;
    return matchesSearch && matchesRole;
  });

  const totalDownlines = teamUsers.filter(u => u.role === 'agent').length;
  const activeProducers = teamUsers.filter(u => u.isVerified).length;
  const totalTeamLeads = teamUsers.reduce((sum, u) => sum + (u.stats?.totalLeads || 0), 0);
  const totalTeamDials = teamUsers.reduce((sum, u) => sum + (u.stats?.dialsCount || 0), 0);
  const totalTeamAppts = teamUsers.reduce((sum, u) => sum + (u.stats?.apptsCount || 0), 0);

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Top Banner / Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wider bg-amber-500/10 text-amber-500 border border-amber-500/20">
              Super Admin Console
            </span>
            <span className="text-xs text-slate-400 font-mono">EST8 Hierarchy Manager</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-100 mt-1">
            Team & Downline Management
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Pre-register agents, enforce strict invite-only verification, and supervise downline dialing activity.
          </p>
        </div>

        <button
          onClick={() => setIsInviteOpen(true)}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-medium text-sm shadow-lg shadow-emerald-950/30 transition self-start md:self-auto"
        >
          <UserPlus className="w-4 h-4" /> Pre-Register Downline Agent
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span>Downline Agents</span>
            <Users className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-2xl font-bold text-slate-100 mt-2">{totalDownlines}</p>
          <span className="text-[11px] text-slate-500">Excluding Super Admin</span>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span>Active / Verified</span>
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-2xl font-bold text-slate-100 mt-2">{activeProducers}</p>
          <span className="text-[11px] text-emerald-500 font-medium">Authorized CRM access</span>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span>Team Leads</span>
            <Award className="w-4 h-4 text-blue-400" />
          </div>
          <p className="text-2xl font-bold text-slate-100 mt-2">{totalTeamLeads}</p>
          <span className="text-[11px] text-slate-500">Across all agent books</span>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span>Total Team Dials</span>
            <Phone className="w-4 h-4 text-purple-400" />
          </div>
          <p className="text-2xl font-bold text-slate-100 mt-2">{totalTeamDials}</p>
          <span className="text-[11px] text-slate-500">Outbound phone activities</span>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm col-span-2 lg:col-span-1">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span>Appts Booked</span>
            <TrendingUp className="w-4 h-4 text-amber-400" />
          </div>
          <p className="text-2xl font-bold text-slate-100 mt-2">{totalTeamAppts}</p>
          <span className="text-[11px] text-slate-500">Pipeline scheduled</span>
        </div>
      </div>

      {/* Roster Controls */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-lg">
        <div className="p-4 md:p-5 border-b border-slate-800 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by agent name, email or NPN..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-400" />
            <select
              value={filterRole}
              onChange={e => setFilterRole(e.target.value as any)}
              className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-emerald-500"
            >
              <option value="all">All Roles</option>
              <option value="agent">Downline Agents Only</option>
              <option value="admin">Super Admins</option>
            </select>
          </div>
        </div>

        {/* Roster Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-950/60 text-xs uppercase tracking-wider text-slate-400 border-b border-slate-800">
              <tr>
                <th className="py-3.5 px-4">Agent Name / Google Email</th>
                <th className="py-3.5 px-4">Role & Status</th>
                <th className="py-3.5 px-4">NPN / Phone</th>
                <th className="py-3.5 px-4 text-center">Leads</th>
                <th className="py-3.5 px-4 text-center">Dials</th>
                <th className="py-3.5 px-4 text-center">Appts</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredUsers.map(u => {
                const isCurrentAdmin = u.email.toLowerCase() === 'aurek97@gmail.com';
                const isViewingThis = viewingUserId === u.id;

                return (
                  <tr key={u.id} className="hover:bg-slate-800/40 transition">
                    {/* Name & Email */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-slate-200 text-xs">
                          {u.name.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-semibold text-slate-100 flex items-center gap-1.5">
                            {u.name}
                            {isCurrentAdmin && (
                              <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">
                                YOU
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-slate-400 font-mono">{u.email}</div>
                        </div>
                      </div>
                    </td>

                    {/* Role & Status */}
                    <td className="py-3.5 px-4">
                      <div className="flex flex-col gap-1 items-start">
                        <span
                          className={`px-2 py-0.5 rounded text-xs font-medium uppercase tracking-wide border ${
                            u.role === 'admin'
                              ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                              : 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                          }`}
                        >
                          {u.role === 'admin' ? 'Super Admin' : 'Agent'}
                        </span>

                        <button
                          disabled={isCurrentAdmin}
                          onClick={() => toggleUserVerification(u.id, !u.isVerified)}
                          className={`inline-flex items-center gap-1 text-[11px] font-semibold ${
                            u.isVerified
                              ? 'text-emerald-400 hover:text-emerald-300'
                              : 'text-red-400 hover:text-red-300'
                          } ${isCurrentAdmin ? 'opacity-80 cursor-default' : 'hover:underline'}`}
                        >
                          {u.isVerified ? (
                            <>
                              <CheckCircle className="w-3 h-3 text-emerald-400" /> Active & Verified
                            </>
                          ) : (
                            <>
                              <XCircle className="w-3 h-3 text-red-400" /> Access Suspended
                            </>
                          )}
                        </button>
                      </div>
                    </td>

                    {/* NPN / Phone */}
                    <td className="py-3.5 px-4 text-xs">
                      <div className="flex items-center gap-1 text-slate-300 font-mono">
                        <Hash className="w-3 h-3 text-slate-500" /> NPN: {u.npn || 'Not set'}
                      </div>
                      <div className="text-slate-400 text-[11px] mt-0.5">{u.phone || 'No phone'}</div>
                    </td>

                    {/* Stats */}
                    <td className="py-3.5 px-4 text-center font-mono font-medium text-slate-200">
                      {u.stats?.totalLeads ?? 0}
                    </td>
                    <td className="py-3.5 px-4 text-center font-mono font-medium text-slate-200">
                      {u.stats?.dialsCount ?? 0}
                    </td>
                    <td className="py-3.5 px-4 text-center font-mono font-medium text-emerald-400 font-semibold">
                      {u.stats?.apptsCount ?? 0}
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {/* Switch Desk */}
                        <button
                          onClick={() => {
                            switchUserView(isViewingThis ? null : u.id);
                            setView('dialer');
                          }}
                          className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition ${
                            isViewingThis
                              ? 'bg-amber-500 text-slate-950 border-amber-400'
                              : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
                          }`}
                          title="Open and supervise this agent's lead book"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          {isViewingThis ? 'Current Desk' : 'Open Desk'}
                        </button>

                        {/* Delete Agent (if not self) */}
                        {!isCurrentAdmin && (
                          <button
                            onClick={() => {
                              if (confirm(`Are you sure you want to remove downline agent ${u.name}? All their isolated leads and call logs will be removed.`)) {
                                deleteDownline(u.id);
                              }
                            }}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition"
                            title="Remove agent from CRM"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Invite Modal */}
      {isInviteOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl relative">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                  <UserPlus className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-slate-100 text-lg">Pre-Register Downline</h3>
              </div>
              <button
                onClick={() => setIsInviteOpen(false)}
                className="text-slate-500 hover:text-slate-300 text-lg leading-none p-1"
              >
                &times;
              </button>
            </div>

            <p className="text-xs text-slate-400 mt-3 leading-relaxed">
              Once pre-registered here, the downline agent will pass the verification gate immediately when logging in with their Google account.
            </p>

            {submitError && (
              <div className="mt-3 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs">
                {submitError}
              </div>
            )}

            <form onSubmit={handleSubmitInvite} className="mt-4 space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-300 font-medium mb-1">Agent Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Jason Miller"
                  value={formName}
                  onChange={e => setFormName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 placeholder-slate-600 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Google Email Address *</label>
                <input
                  type="email"
                  required
                  placeholder="agent.name@gmail.com"
                  value={formEmail}
                  onChange={e => setFormEmail(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 placeholder-slate-600 focus:outline-none focus:border-emerald-500"
                />
                <span className="text-[10px] text-slate-500 mt-0.5 block">Must match the email they use to sign into Google.</span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Phone Number</label>
                  <input
                    type="text"
                    placeholder="(803) 555-0199"
                    value={formPhone}
                    onChange={e => setFormPhone(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 placeholder-slate-600 focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-medium mb-1">NPN #</label>
                  <input
                    type="text"
                    placeholder="20491823"
                    value={formNpn}
                    onChange={e => setFormNpn(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 placeholder-slate-600 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Licensed States (Comma-separated)</label>
                <input
                  type="text"
                  placeholder="SC, NC, GA, FL"
                  value={formStates}
                  onChange={e => setFormStates(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 placeholder-slate-600 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Assigned Role</label>
                <select
                  value={formRole}
                  onChange={e => setFormRole(e.target.value as any)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-emerald-500"
                >
                  <option value="agent">Downline Agent (Isolated Leads)</option>
                  <option value="admin">Co-Administrator (Full Access)</option>
                </select>
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsInviteOpen(false)}
                  className="px-4 py-2 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-medium shadow-md transition disabled:opacity-50"
                >
                  {isSubmitting ? 'Registering...' : 'Authorize & Register Agent'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

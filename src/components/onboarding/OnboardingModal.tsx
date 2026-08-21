import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { useOrganization, useOrganizationList } from '@clerk/react';
import {
  Building,
  Users,
  LayoutGrid,
  Plus,
  Trash2,
  ArrowRight,
  Check,
  Sparkles,
  Kanban,
  Mail,
  Shield,
  Layers,
} from 'lucide-react';

interface MemberInvite {
  email: string;
  role: 'member' | 'admin';
  name?: string;
}

export const OnboardingModal: React.FC = () => {
  const { workspace, updateWorkspace, addUser, createBoard, boards } = useApp();
  const { user: authUser, inviteMember } = useAuth();
  const { organization } = useOrganization();
  const { createOrganization, setActive } = useOrganizationList();

  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Step 1: Workspace
  const [workspaceName, setWorkspaceName] = useState('Acme Team');
  const [workspaceDesc, setWorkspaceDesc] = useState('Collaborative workspace for tasks and project delivery.');
  const [accentColor, setAccentColor] = useState('#4f46e5');

  // Step 2: Team Invites
  const [invites, setInvites] = useState<MemberInvite[]>([
    { email: '', role: 'member', name: '' },
  ]);
  const [isSendingInvites, setIsSendingInvites] = useState(false);

  // Step 3: Starter Board
  const [boardTitle, setBoardTitle] = useState('Main Project Board');
  const [boardDesc, setBoardDesc] = useState('Central agile Kanban board for task tracking.');

  const ONBOARDING_KEY = 'kf_onboarding_completed_v3';

  useEffect(() => {
    // Open onboarding if user is logged in as admin and onboarding flag not present
    const completed = localStorage.getItem(ONBOARDING_KEY);
    if (!completed && authUser) {
      if (authUser.role === 'member') {
        // Members enter the workspace directly without re-configuring it
        localStorage.setItem(ONBOARDING_KEY, 'true');
        return;
      }
      setIsOpen(true);
      if (authUser.name && authUser.name !== 'User') {
        const firstName = authUser.name.split(' ')[0];
        setWorkspaceName(`${firstName}'s Workspace`);
      }
    }
  }, [authUser]);

  if (!isOpen) return null;

  const handleAddInviteRow = () => {
    setInvites([...invites, { email: '', role: 'member', name: '' }]);
  };

  const handleRemoveInviteRow = (index: number) => {
    setInvites(invites.filter((_, i) => i !== index));
  };

  const handleUpdateInvite = (index: number, field: keyof MemberInvite, value: any) => {
    const updated = [...invites];
    updated[index] = { ...updated[index], [field]: value };
    setInvites(updated);
  };

  const handleFinishOnboarding = async (skipInvites = false) => {
    // 1. Update workspace
    updateWorkspace({
      name: workspaceName.trim() || 'My Workspace',
      description: workspaceDesc.trim(),
      accentColor,
    });

    // 2. Create Clerk Organization if available
    let activeOrg = organization;
    if (createOrganization && !activeOrg) {
      try {
        const newOrg = await createOrganization({ name: workspaceName.trim() || 'My Workspace' });
        if (setActive && newOrg) {
          await setActive({ organization: newOrg.id });
        }
        activeOrg = newOrg;
      } catch (err) {
        console.log('Clerk createOrganization info:', err);
      }
    }

    // 3. Send Invites if not skipped
    if (!skipInvites) {
      setIsSendingInvites(true);
      const validInvites = invites.filter((inv) => inv.email.trim() && inv.email.includes('@'));

      for (const inv of validInvites) {
        const email = inv.email.trim().toLowerCase();
        const name = inv.name?.trim() || email.split('@')[0];

        addUser({
          name,
          email,
          role: inv.role,
          jobTitle: 'Team Member',
          avatar: `https://images.unsplash.com/photo-${1500000000000 + Math.floor(Math.random() * 1000000)}?w=150&auto=format&fit=crop&q=80`,
        });

        // Trigger Clerk Organization invitation & password setup email
        try {
          if (activeOrg) {
            await activeOrg.inviteMember({
              emailAddress: email,
              role: inv.role === 'admin' ? 'org:admin' : 'org:member',
            });
          } else {
            await inviteMember(email, name, inv.role, 'Team Member');
          }
        } catch (e) {
          console.error('Error inviting member', e);
        }
      }
      setIsSendingInvites(false);
    }

    // 4. Ensure starter board
    if (boards.length === 0) {
      createBoard(boardTitle.trim() || 'Main Project Board', boardDesc.trim(), accentColor);
    }

    // 5. Mark onboarding complete
    localStorage.setItem(ONBOARDING_KEY, 'true');
    setIsOpen(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-xl overflow-hidden animate-scale-up">
        {/* Top Progress Bar & Header */}
        <div className="bg-slate-900 px-6 py-5 text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 -mt-8 -mr-8 w-36 h-36 bg-brand-500/20 rounded-full blur-2xl" />

          <div className="flex items-center justify-between mb-4 relative z-10">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-brand-600 text-white flex items-center justify-center font-bold">
                <Kanban className="w-4 h-4" />
              </div>
              <span className="font-bold text-sm tracking-tight text-white">
                Workspace Quick Setup
              </span>
            </div>

            <div className="flex items-center gap-1.5 text-xs text-slate-400">
              <span className={`w-2 h-2 rounded-full ${step >= 1 ? 'bg-brand-400' : 'bg-slate-700'}`} />
              <span className={`w-2 h-2 rounded-full ${step >= 2 ? 'bg-brand-400' : 'bg-slate-700'}`} />
              <span className={`w-2 h-2 rounded-full ${step >= 3 ? 'bg-brand-400' : 'bg-slate-700'}`} />
              <span className="ml-1 text-[11px] font-semibold text-slate-300">Step {step} of 3</span>
            </div>
          </div>

          <h2 className="text-lg font-bold text-white relative z-10">
            {step === 1 && 'Name your workspace'}
            {step === 2 && 'Invite your team members'}
            {step === 3 && 'Set up your first project board'}
          </h2>
          <p className="text-xs text-slate-300 relative z-10 mt-0.5">
            {step === 1 && 'Give your team a central place to organize and track progress.'}
            {step === 2 && 'Add teammates who will collaborate with you. You can also skip this.'}
            {step === 3 && 'Configure your primary board to start creating tasks.'}
          </p>
        </div>

        {/* Modal Body Steps */}
        <div className="p-6">
          {/* STEP 1: Workspace Name & Details */}
          {step === 1 && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                  Workspace Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={workspaceName}
                  onChange={(e) => setWorkspaceName(e.target.value)}
                  placeholder="e.g. Acme Product Team"
                  className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 text-slate-900 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-600 transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                  Workspace Description
                </label>
                <textarea
                  rows={2}
                  value={workspaceDesc}
                  onChange={(e) => setWorkspaceDesc(e.target.value)}
                  placeholder="Brief summary of your team's focus..."
                  className="w-full px-3.5 py-2 rounded-lg border border-slate-200 text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-600 resize-none transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-2">
                  Brand Accent Color
                </label>
                <div className="flex items-center gap-2.5">
                  {[
                    { color: '#4f46e5', label: 'Indigo' },
                    { color: '#7c3aed', label: 'Purple' },
                    { color: '#0ea5e9', label: 'Sky' },
                    { color: '#10b981', label: 'Emerald' },
                    { color: '#f43f5e', label: 'Rose' },
                    { color: '#f59e0b', label: 'Amber' },
                  ].map((c) => (
                    <button
                      key={c.color}
                      type="button"
                      onClick={() => setAccentColor(c.color)}
                      className={`w-7 h-7 rounded-full flex items-center justify-center transition-transform ${
                        accentColor === c.color ? 'ring-2 ring-offset-2 ring-slate-900 scale-110' : 'hover:scale-105'
                      }`}
                      style={{ backgroundColor: c.color }}
                      title={c.label}
                    >
                      {accentColor === c.color && <Check className="w-3.5 h-3.5 text-white" />}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: Team Invites (With Skip Option) */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-600">
                  Teammate Emails
                </span>
                <span className="text-[11px] text-slate-400">
                  Password setup links will be emailed automatically
                </span>
              </div>

              <div className="space-y-2.5 max-h-56 overflow-y-auto pr-1">
                {invites.map((invite, index) => (
                  <div key={index} className="flex items-center gap-2 bg-slate-50 p-2 rounded-lg border border-slate-200/80">
                    <div className="flex-1">
                      <input
                        type="email"
                        value={invite.email}
                        onChange={(e) => handleUpdateInvite(index, 'email', e.target.value)}
                        placeholder="colleague@company.com"
                        className="w-full px-3 py-1.5 rounded-md border border-slate-200 text-xs text-slate-900 bg-white focus:outline-none focus:ring-1 focus:ring-brand-500"
                      />
                    </div>

                    <select
                      value={invite.role}
                      onChange={(e) => handleUpdateInvite(index, 'role', e.target.value as 'member' | 'admin')}
                      className="px-2.5 py-1.5 rounded-md border border-slate-200 text-xs text-slate-700 bg-white font-medium focus:outline-none"
                    >
                      <option value="member">Member</option>
                      <option value="admin">Admin</option>
                    </select>

                    {invites.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveInviteRow(index)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 rounded-md hover:bg-white cursor-pointer"
                        title="Remove"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              <button
                type="button"
                onClick={handleAddInviteRow}
                className="w-full py-2 border border-dashed border-slate-300 hover:border-brand-500 text-slate-600 hover:text-brand-600 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add another teammate</span>
              </button>
            </div>
          )}

          {/* STEP 3: First Board */}
          {step === 3 && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                  First Board Name
                </label>
                <input
                  type="text"
                  value={boardTitle}
                  onChange={(e) => setBoardTitle(e.target.value)}
                  placeholder="e.g. Sprint 1 / Product Delivery"
                  className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 text-slate-900 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-600 transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                  Default Workflow Columns
                </label>
                <div className="grid grid-cols-4 gap-2 pt-1">
                  {['To Do', 'In Progress', 'In Review', 'Done'].map((col, idx) => (
                    <div
                      key={idx}
                      className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-center text-xs font-bold text-slate-700"
                    >
                      {col}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer Controls */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
          {step > 1 ? (
            <button
              type="button"
              onClick={() => setStep((step - 1) as 1 | 2)}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 rounded-lg transition-colors cursor-pointer"
            >
              Back
            </button>
          ) : (
            <div />
          )}

          <div className="flex items-center gap-2">
            {step === 2 && (
              <button
                type="button"
                onClick={() => setStep(3)}
                className="px-4 py-2 text-xs font-semibold text-slate-500 hover:text-slate-800 rounded-lg transition-colors cursor-pointer"
              >
                Skip for now
              </button>
            )}

            {step < 3 ? (
              <button
                type="button"
                onClick={() => setStep((step + 1) as 2 | 3)}
                className="px-5 py-2.5 bg-brand-600 hover:bg-brand-700 active:bg-brand-800 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
              >
                <span>Continue</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            ) : (
              <button
                type="button"
                disabled={isSendingInvites}
                onClick={() => handleFinishOnboarding(false)}
                className="px-6 py-2.5 bg-brand-600 hover:bg-brand-700 active:bg-brand-800 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-md transition-all cursor-pointer"
              >
                <Sparkles className="w-4 h-4 text-amber-300" />
                <span>{isSendingInvites ? 'Sending Invites...' : 'Launch Workspace'}</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

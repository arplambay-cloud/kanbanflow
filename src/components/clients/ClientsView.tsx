import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Client } from '../../types';
import { Briefcase, Plus, Edit2, Trash2, X, CheckCircle2, Layers } from 'lucide-react';
import { ConfirmDialog } from '../common/ConfirmDialog';
import { ModalPortal } from '../common/ModalPortal';
import { notifySuccess } from '../../utils/toast';

const PRESET_COLORS = [
  '#7c3bed',
  '#ec4899',
  '#10b981',
  '#f59e0b',
  '#06b6d4',
  '#3b82f6',
  '#8b5cf6',
  '#ef4444',
];

export const ClientsView: React.FC = () => {
  const {
    clients,
    createClient,
    updateClient,
    deleteClient,
    tasks,
    columns,
    currentUser,
    openTaskModal,
  } = useApp();

  const isAdmin = currentUser?.role === 'admin';

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editing, setEditing] = useState<Client | null>(null);
  const [name, setName] = useState('');
  const [color, setColor] = useState(PRESET_COLORS[0]);
  const [error, setError] = useState('');
  const [toDelete, setToDelete] = useState<Client | null>(null);

  const doneColumnIds = new Set(
    columns.filter((c) => c.title.toLowerCase().includes('done')).map((c) => c.id)
  );

  const openCreate = () => {
    setEditing(null);
    setName('');
    setColor(PRESET_COLORS[0]);
    setError('');
    setIsModalOpen(true);
  };

  const openEdit = (client: Client) => {
    setEditing(client);
    setName(client.name);
    setColor(client.color || PRESET_COLORS[0]);
    setError('');
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setError('Please enter a client name');
      return;
    }

    const clash = clients.some(
      (c) => c.name.toLowerCase() === trimmed.toLowerCase() && c.id !== editing?.id
    );
    if (clash) {
      setError('A client with that name already exists');
      return;
    }

    if (editing) {
      updateClient(editing.id, { name: trimmed, color });
      notifySuccess('Updated ' + trimmed + '.');
    } else {
      createClient(trimmed, color);
      notifySuccess('Added ' + trimmed + '.');
    }
    setIsModalOpen(false);
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">Clients</h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Group work by the client it belongs to, instead of putting their name in the task
            title.
          </p>
        </div>

        <button
          onClick={openCreate}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white rounded-lg font-semibold text-xs sm:text-sm shadow-sm hover:shadow transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Add Client</span>
        </button>
      </div>

      {clients.length === 0 ? (
        <div className="bg-white rounded-xl border border-dashed border-slate-300 p-10 text-center">
          <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto mb-3">
            <Briefcase className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-800 mb-1">No clients yet</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Add your first client, then pick it on a task to keep all of their work together.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {clients.map((client) => {
            const clientTasks = tasks.filter((t) => t.clientId === client.id);
            const done = clientTasks.filter((t) => doneColumnIds.has(t.columnId));
            const open = clientTasks.length - done.length;

            return (
              <div
                key={client.id}
                className="bg-white rounded-xl border border-slate-200 shadow-subtle hover:shadow-card hover:border-slate-300 transition-all p-5 group"
              >
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span
                      className="w-3.5 h-3.5 rounded-md shrink-0"
                      style={{ backgroundColor: client.color || '#7c3bed' }}
                    />
                    <h3 className="font-bold text-slate-900 text-base truncate">{client.name}</h3>
                  </div>

                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                    <button
                      type="button"
                      onClick={() => openEdit(client)}
                      className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all cursor-pointer"
                      title="Edit client"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    {isAdmin && (
                      <button
                        type="button"
                        onClick={() => setToDelete(client)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all cursor-pointer"
                        title="Delete client"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-4 text-xs text-slate-500 font-medium pb-3 border-b border-slate-100">
                  <span className="flex items-center gap-1">
                    <Layers className="w-3.5 h-3.5" />
                    {clientTasks.length} total
                  </span>
                  <span className="flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                    {done.length} done
                  </span>
                  <span className={open > 0 ? 'text-amber-600' : ''}>{open} open</span>
                </div>

                <div className="pt-3 space-y-1.5 max-h-32 overflow-y-auto">
                  {clientTasks.length === 0 ? (
                    <p className="text-[11px] text-slate-400 italic">No tasks assigned yet.</p>
                  ) : (
                    clientTasks.slice(0, 6).map((t) => (
                      <button
                        key={t.id}
                        onClick={() => openTaskModal(t)}
                        className="w-full text-left text-[11px] text-slate-600 hover:text-indigo-600 truncate cursor-pointer"
                      >
                        {t.title}
                      </button>
                    ))
                  )}
                  {clientTasks.length > 6 && (
                    <p className="text-[11px] text-slate-400">
                      +{clientTasks.length - 6} more
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create / Edit modal */}
      {isModalOpen && (
        <ModalPortal>
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fade-in">
            <div className="w-full max-w-md bg-white rounded-xl shadow-floating border border-slate-200 overflow-hidden">
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
                <h3 className="font-bold text-slate-900">
                  {editing ? 'Edit Client' : 'Add Client'}
                </h3>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                {error && (
                  <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
                    {error}
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                    Client Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    autoFocus
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Red Soda"
                    className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                    Colour
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {PRESET_COLORS.map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setColor(c)}
                        style={{ backgroundColor: c }}
                        aria-label={'Use colour ' + c}
                        className={
                          'w-7 h-7 rounded-lg transition-transform ' +
                          (color === c
                            ? 'ring-2 ring-offset-2 ring-slate-400 scale-110'
                            : 'hover:scale-105')
                        }
                      />
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg text-xs font-medium transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-all"
                  >
                    {editing ? 'Save Changes' : 'Add Client'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </ModalPortal>
      )}

      {toDelete && (
        <ConfirmDialog
          isOpen={!!toDelete}
          title="Delete Client"
          message={
            'Remove "' +
            toDelete.name +
            '"? Their tasks are kept and simply become unassigned.'
          }
          confirmLabel="Delete Client"
          cancelLabel="Cancel"
          confirmVariant="danger"
          onConfirm={() => {
            deleteClient(toDelete.id);
            notifySuccess('Removed ' + toDelete.name + '.');
            setToDelete(null);
          }}
          onCancel={() => setToDelete(null)}
        />
      )}
    </div>
  );
};

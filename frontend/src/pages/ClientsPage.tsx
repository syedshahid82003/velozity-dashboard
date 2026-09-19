import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/axios';
import { useAuth } from '../context/AuthContext';
import type { Client } from '../types';

export default function ClientsPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', company: '' });
  const [error, setError] = useState('');

  const { data: clients = [], isLoading } = useQuery<Client[]>({
    queryKey: ['clients'],
    queryFn: async () => {
      const { data } = await api.get('/clients');
      return data.data ?? [];
    },
  });

  const createClient = useMutation({
    mutationFn: (payload: typeof form) => api.post('/clients', payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      setShowForm(false);
      setForm({ name: '', email: '', company: '' });
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Failed to create';
      setError(msg);
    },
  });

  const deleteClient = useMutation({
    mutationFn: (id: string) => api.delete(`/clients/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['clients'] }),
  });

  const isAdmin = user?.role === 'ADMIN';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Clients</h1>
          <p className="text-sm text-gray-500 mt-1">{clients.length} clients</p>
        </div>
        {isAdmin && (
          <button
            onClick={() => setShowForm(true)}
            className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium px-4 py-2 rounded-lg"
          >
            + New Client
          </button>
        )}
      </div>

      {showForm && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-base font-semibold text-gray-900 mb-4">New Client</h3>
          {error && <p className="text-sm text-red-600 mb-3">{error}</p>}
          <div className="space-y-3">
            <input
              type="text"
              placeholder="Contact name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <input
              type="email"
              placeholder="Email address"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <input
              type="text"
              placeholder="Company name"
              value={form.company}
              onChange={(e) => setForm({ ...form, company: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <div className="flex gap-3">
              <button
                onClick={() => createClient.mutate(form)}
                disabled={!form.name || !form.email || !form.company || createClient.isPending}
                className="bg-indigo-600 text-white text-sm font-medium px-4 py-2 rounded-lg disabled:opacity-50"
              >
                {createClient.isPending ? 'Creating...' : 'Create'}
              </button>
              <button onClick={() => { setShowForm(false); setError(''); }} className="text-sm text-gray-500 px-4 py-2">Cancel</button>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {isLoading
          ? [...Array(3)].map((_, i) => <div key={i} className="h-32 bg-gray-100 rounded-xl animate-pulse" />)
          : clients.map((c) => (
            <div key={c.id} className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-base font-semibold text-gray-900">{c.company}</p>
                  <p className="text-sm text-gray-500 mt-0.5">{c.name}</p>
                  <p className="text-xs text-gray-400 mt-1">{c.email}</p>
                </div>
                {isAdmin && (
                  <button
                    onClick={() => { if (confirm(`Delete ${c.company}?`)) deleteClient.mutate(c.id); }}
                    className="text-gray-300 hover:text-red-500 text-xs"
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>
          ))
        }
      </div>
    </div>
  );
}

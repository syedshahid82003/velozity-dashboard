import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import api from '../lib/axios';
import { useAuth } from '../context/AuthContext';
import type { Project, Client } from '../types';

export default function ProjectsPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', description: '', clientId: '' });
  const [error, setError] = useState('');

  const { data: projects = [], isLoading } = useQuery<Project[]>({
    queryKey: ['projects'],
    queryFn: async () => {
      const { data } = await api.get('/projects');
      return data.data ?? [];
    },
  });

  const { data: clients = [] } = useQuery<Client[]>({
    queryKey: ['clients'],
    queryFn: async () => {
      const { data } = await api.get('/clients');
      return data.data ?? [];
    },
    enabled: user?.role !== 'DEVELOPER',
  });

  const createProject = useMutation({
    mutationFn: (payload: typeof form) => api.post('/projects', payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      setShowForm(false);
      setForm({ name: '', description: '', clientId: '' });
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Failed to create project';
      setError(msg);
    },
  });

  const deleteProject = useMutation({
    mutationFn: (id: string) => api.delete(`/projects/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['projects'] }),
  });

  const canCreate = user?.role === 'ADMIN' || user?.role === 'PROJECT_MANAGER';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {user?.role === 'PROJECT_MANAGER' ? 'My Projects' : 'Projects'}
          </h1>
          <p className="text-sm text-gray-500 mt-1">{projects.length} project{projects.length !== 1 ? 's' : ''}</p>
        </div>
        {canCreate && (
          <button
            onClick={() => setShowForm(true)}
            className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium px-4 py-2 rounded-lg"
          >
            + New Project
          </button>
        )}
      </div>

      {/* Create form */}
      {showForm && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-base font-semibold text-gray-900 mb-4">New Project</h3>
          {error && <p className="text-sm text-red-600 mb-3">{error}</p>}
          <div className="space-y-4">
            <input
              type="text"
              placeholder="Project name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <textarea
              placeholder="Description (optional)"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={2}
              className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <select
              value={form.clientId}
              onChange={(e) => setForm({ ...form, clientId: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">Select a client</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>{c.name} — {c.company}</option>
              ))}
            </select>
            <div className="flex gap-3">
              <button
                onClick={() => createProject.mutate(form)}
                disabled={!form.name || !form.clientId || createProject.isPending}
                className="bg-indigo-600 text-white text-sm font-medium px-4 py-2 rounded-lg disabled:opacity-50 hover:bg-indigo-700"
              >
                {createProject.isPending ? 'Creating...' : 'Create'}
              </button>
              <button
                onClick={() => { setShowForm(false); setError(''); }}
                className="text-sm text-gray-500 hover:text-gray-700 px-4 py-2"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Project grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 animate-pulse">
          {[...Array(3)].map((_, i) => <div key={i} className="h-40 bg-gray-100 rounded-xl" />)}
        </div>
      ) : projects.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-lg font-medium">No projects yet</p>
          {canCreate && <p className="text-sm mt-1">Create your first project to get started</p>}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {projects.map((project) => (
            <div key={project.id} className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between gap-2">
                <Link
                  to={`/projects/${project.id}`}
                  className="text-base font-semibold text-gray-900 hover:text-indigo-600 truncate"
                >
                  {project.name}
                </Link>
                {canCreate && (
                  <button
                    onClick={() => {
                      if (confirm(`Delete "${project.name}"?`)) deleteProject.mutate(project.id);
                    }}
                    className="text-gray-300 hover:text-red-500 flex-shrink-0 text-xs"
                    aria-label="Delete project"
                  >
                    ✕
                  </button>
                )}
              </div>

              {project.description && (
                <p className="text-sm text-gray-500 mt-1 line-clamp-2">{project.description}</p>
              )}

              <div className="mt-4 flex items-center justify-between text-xs text-gray-400">
                <span>{project.client?.company}</span>
                <span>{project._count?.tasks ?? 0} tasks</span>
              </div>

              <div className="mt-2 text-xs text-gray-400">
                PM: {project.manager?.name}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

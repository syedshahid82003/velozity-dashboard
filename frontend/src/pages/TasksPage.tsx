import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import api from '../lib/axios';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import type { Task, TaskFilters as Filters, TaskStatus } from '../types';
import { StatusBadge, PriorityBadge } from '../components/StatusBadge';
import TaskFiltersComponent from '../components/TaskFilters';
import { formatDistanceToNow } from 'date-fns';

const STATUS_OPTIONS: TaskStatus[] = ['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE'];

export default function TasksPage() {
  const { user } = useAuth();
  const { socket } = useSocket();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();

  // ── Filters — read from URL params (shareable URLs per spec) ──────────────
  const [filters, setFilters] = useState<Filters>({
    status: (searchParams.get('status') as Filters['status']) ?? '',
    priority: (searchParams.get('priority') as Filters['priority']) ?? '',
    dueDateFrom: searchParams.get('dueDateFrom') ?? '',
    dueDateTo: searchParams.get('dueDateTo') ?? '',
    page: parseInt(searchParams.get('page') ?? '1'),
    limit: 20,
  });

  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [newStatus, setNewStatus] = useState<TaskStatus>('TODO');

  // Sync filter changes to URL
  useEffect(() => {
    const params: Record<string, string> = {};
    if (filters.status) params.status = filters.status;
    if (filters.priority) params.priority = filters.priority;
    if (filters.dueDateFrom) params.dueDateFrom = filters.dueDateFrom;
    if (filters.dueDateTo) params.dueDateTo = filters.dueDateTo;
    if (filters.page && filters.page > 1) params.page = String(filters.page);
    setSearchParams(params, { replace: true });
  }, [filters, setSearchParams]);

  // Real-time: invalidate when any task update arrives
  useEffect(() => {
    if (!socket) return;
    const handler = () => queryClient.invalidateQueries({ queryKey: ['tasks'] });
    socket.on('task:updated', handler);
    socket.on('task:overdue', handler);
    return () => { socket.off('task:updated', handler); socket.off('task:overdue', handler); };
  }, [socket, queryClient]);

  const { data, isLoading } = useQuery({
    queryKey: ['tasks', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters.status) params.set('status', filters.status);
      if (filters.priority) params.set('priority', filters.priority);
      if (filters.dueDateFrom) params.set('dueDateFrom', filters.dueDateFrom);
      if (filters.dueDateTo) params.set('dueDateTo', filters.dueDateTo);
      params.set('page', String(filters.page ?? 1));
      params.set('limit', String(filters.limit ?? 20));
      const { data } = await api.get(`/tasks?${params.toString()}`);
      return data.data;
    },
  });

  const updateTask = useMutation({
    mutationFn: ({ id, status }: { id: string; status: TaskStatus }) =>
      api.patch(`/tasks/${id}`, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      setEditingTaskId(null);
    },
  });

  const tasks: Task[] = data?.tasks ?? [];
  const total: number = data?.total ?? 0;
  const totalPages = Math.ceil(total / (filters.limit ?? 20));

  const title = user?.role === 'DEVELOPER' ? 'My Tasks' : 'All Tasks';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
          <p className="text-sm text-gray-500 mt-1">{total} task{total !== 1 ? 's' : ''}</p>
        </div>
      </div>

      {/* Filters — query params are updated in TaskFiltersComponent via URL */}
      <TaskFiltersComponent filters={filters} onChange={setFilters} />

      {/* Task table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {isLoading ? (
          <div className="p-6 space-y-3 animate-pulse">
            {[...Array(5)].map((_, i) => <div key={i} className="h-12 bg-gray-100 rounded-lg" />)}
          </div>
        ) : tasks.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <p>No tasks match your filters</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {tasks.map((task) => (
              <div key={task.id} className="flex items-start justify-between gap-4 px-5 py-4 hover:bg-gray-50">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-gray-900 truncate">{task.title}</p>
                  </div>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-xs text-gray-400">{task.project?.name}</span>
                    {task.assignedTo && (
                      <span className="text-xs text-gray-400">→ {task.assignedTo.name}</span>
                    )}
                    {task.dueDate && (
                      <span className="text-xs text-gray-400">
                        Due {formatDistanceToNow(new Date(task.dueDate), { addSuffix: true })}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  <PriorityBadge priority={task.priority} />

                  {editingTaskId === task.id ? (
                    <div className="flex items-center gap-2">
                      <select
                        value={newStatus}
                        onChange={(e) => setNewStatus(e.target.value as TaskStatus)}
                        className="text-xs border border-gray-300 rounded px-2 py-1 focus:outline-none"
                      >
                        {STATUS_OPTIONS.map((s) => (
                          <option key={s} value={s}>{s.replace('_', ' ')}</option>
                        ))}
                      </select>
                      <button
                        onClick={() => updateTask.mutate({ id: task.id, status: newStatus })}
                        disabled={updateTask.isPending}
                        className="text-xs bg-indigo-600 text-white px-2 py-1 rounded"
                      >
                        Save
                      </button>
                      <button
                        onClick={() => setEditingTaskId(null)}
                        className="text-xs text-gray-400"
                      >
                        ✕
                      </button>
                    </div>
                  ) : (
                    <>
                      <StatusBadge status={task.status} />
                      <button
                        onClick={() => {
                          setEditingTaskId(task.id);
                          setNewStatus(task.status);
                        }}
                        className="text-xs text-gray-400 hover:text-indigo-600 px-2 py-1 rounded border border-gray-200"
                      >
                        Change
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-gray-500">
          <span>Page {filters.page} of {totalPages}</span>
          <div className="flex gap-2">
            <button
              onClick={() => setFilters((f) => ({ ...f, page: Math.max(1, (f.page ?? 1) - 1) }))}
              disabled={(filters.page ?? 1) <= 1}
              className="px-3 py-1 border border-gray-300 rounded-lg disabled:opacity-40 hover:bg-gray-50"
            >
              Previous
            </button>
            <button
              onClick={() => setFilters((f) => ({ ...f, page: (f.page ?? 1) + 1 }))}
              disabled={(filters.page ?? 1) >= totalPages}
              className="px-3 py-1 border border-gray-300 rounded-lg disabled:opacity-40 hover:bg-gray-50"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/axios';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import type { Project, Task, User, TaskStatus, TaskPriority } from '../types';
import { StatusBadge, PriorityBadge } from '../components/StatusBadge';
import ActivityFeed from '../components/ActivityFeed';
import TaskFilters from '../components/TaskFilters';
import { formatDistanceToNow } from 'date-fns';

const STATUS_OPTIONS: TaskStatus[] = ['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE'];
const PRIORITY_OPTIONS: TaskPriority[] = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];

export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { joinProject, leaveProject, recentActivity, socket } = useSocket();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const [showTaskForm, setShowTaskForm] = useState(false);
  const [taskForm, setTaskForm] = useState({
    title: '',
    description: '',
    assignedToId: '',
    priority: 'MEDIUM' as TaskPriority,
    dueDate: '',
  });
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [filters, setFilters] = useState({});

  // Join/leave the project's Socket.io room
  useEffect(() => {
    if (id) {
      joinProject(id);
      return () => leaveProject(id);
    }
  }, [id, joinProject, leaveProject]);

  // Real-time task updates — refresh tasks when any update arrives for this project
  useEffect(() => {
    if (!socket || !id) return;
    const handler = () => {
      queryClient.invalidateQueries({ queryKey: ['project', id] });
      queryClient.invalidateQueries({ queryKey: ['tasks', id] });
    };
    socket.on('task:updated', handler);
    socket.on('task:created', handler);
    socket.on('task:overdue', handler);
    return () => {
      socket.off('task:updated', handler);
      socket.off('task:created', handler);
      socket.off('task:overdue', handler);
    };
  }, [socket, id, queryClient]);

  const { data: project, isLoading: projectLoading } = useQuery<Project>({
    queryKey: ['project', id],
    queryFn: async () => {
      const { data } = await api.get(`/projects/${id}`);
      return data.data;
    },
    enabled: !!id,
  });

  const { data: developers = [] } = useQuery<User[]>({
    queryKey: ['developers'],
    queryFn: async () => {
      const { data } = await api.get('/users/developers');
      return data.data ?? [];
    },
    enabled: user?.role !== 'DEVELOPER',
  });

  const { data: activityFromDB = [], isLoading: activityLoading } = useQuery({
    queryKey: ['activity', id],
    queryFn: async () => {
      const { data } = await api.get(`/activity?projectId=${id}`);
      return data.data ?? [];
    },
    enabled: !!id,
  });

  const createTask = useMutation({
    mutationFn: (payload: typeof taskForm & { projectId: string }) => api.post('/tasks', payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project', id] });
      setShowTaskForm(false);
      setTaskForm({ title: '', description: '', assignedToId: '', priority: 'MEDIUM', dueDate: '' });
    },
  });

  const updateTask = useMutation({
    mutationFn: ({ taskId, payload }: { taskId: string; payload: Partial<Task> }) =>
      api.patch(`/tasks/${taskId}`, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project', id] });
      setEditingTask(null);
    },
  });

  const deleteTask = useMutation({
    mutationFn: (taskId: string) => api.delete(`/tasks/${taskId}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['project', id] }),
  });

  const canManage = user?.role === 'ADMIN' || user?.role === 'PROJECT_MANAGER';

  if (projectLoading) {
    return <div className="animate-pulse h-64 bg-gray-100 rounded-xl" />;
  }

  if (!project) {
    return (
      <div className="text-center py-16">
        <p className="text-gray-500">Project not found</p>
        <button onClick={() => navigate('/projects')} className="mt-4 text-indigo-600 text-sm">
          ← Back to projects
        </button>
      </div>
    );
  }

  const tasks = (project as Project & { tasks: Task[] }).tasks ?? [];

  // Merge live activity with DB activity, deduplicated
  const allActivity = [
    ...recentActivity.filter((a) => a.projectId === id),
    ...activityFromDB.filter((a: { id: string }) => !recentActivity.some((r) => r.id === a.id)),
  ].slice(0, 30);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <button onClick={() => navigate('/projects')} className="text-sm text-gray-400 hover:text-gray-600 mb-2 flex items-center gap-1">
            ← Projects
          </button>
          <h1 className="text-2xl font-bold text-gray-900">{project.name}</h1>
          <p className="text-sm text-gray-500 mt-1">{project.client?.company} · PM: {project.manager?.name}</p>
          {project.description && <p className="text-sm text-gray-600 mt-2">{project.description}</p>}
        </div>
        {canManage && (
          <button
            onClick={() => setShowTaskForm(true)}
            className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium px-4 py-2 rounded-lg flex-shrink-0"
          >
            + Add Task
          </button>
        )}
      </div>

      {/* Task creation form */}
      {showTaskForm && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-base font-semibold text-gray-900 mb-4">New Task</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input
              type="text"
              placeholder="Task title"
              value={taskForm.title}
              onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })}
              className="border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 col-span-full"
            />
            <textarea
              placeholder="Description (optional)"
              value={taskForm.description}
              onChange={(e) => setTaskForm({ ...taskForm, description: e.target.value })}
              rows={2}
              className="border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 col-span-full"
            />
            <select
              value={taskForm.assignedToId}
              onChange={(e) => setTaskForm({ ...taskForm, assignedToId: e.target.value })}
              className="border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">Unassigned</option>
              {developers.map((d) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
            <select
              value={taskForm.priority}
              onChange={(e) => setTaskForm({ ...taskForm, priority: e.target.value as TaskPriority })}
              className="border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {PRIORITY_OPTIONS.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
            <input
              type="date"
              value={taskForm.dueDate}
              onChange={(e) => setTaskForm({ ...taskForm, dueDate: e.target.value })}
              className="border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div className="flex gap-3 mt-4">
            <button
              onClick={() => createTask.mutate({ ...taskForm, projectId: id! })}
              disabled={!taskForm.title || createTask.isPending}
              className="bg-indigo-600 text-white text-sm font-medium px-4 py-2 rounded-lg disabled:opacity-50"
            >
              {createTask.isPending ? 'Adding...' : 'Add Task'}
            </button>
            <button onClick={() => setShowTaskForm(false)} className="text-sm text-gray-500 px-4 py-2">Cancel</button>
          </div>
        </div>
      )}

      {/* Task edit form */}
      {editingTask && (
        <div className="bg-white rounded-xl border border-indigo-200 p-6">
          <h3 className="text-base font-semibold text-gray-900 mb-4">Edit: {editingTask.title}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <select
              value={editingTask.status}
              onChange={(e) => setEditingTask({ ...editingTask, status: e.target.value as TaskStatus })}
              className="border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
            </select>
            <select
              value={editingTask.priority}
              onChange={(e) => setEditingTask({ ...editingTask, priority: e.target.value as TaskPriority })}
              className="border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {PRIORITY_OPTIONS.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
            {canManage && (
              <select
                value={editingTask.assignedToId ?? ''}
                onChange={(e) => setEditingTask({ ...editingTask, assignedToId: e.target.value })}
                className="border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">Unassigned</option>
                {developers.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            )}
          </div>
          <div className="flex gap-3 mt-4">
            <button
              onClick={() =>
                updateTask.mutate({
                  taskId: editingTask.id,
                  payload: {
                    status: editingTask.status,
                    priority: editingTask.priority,
                    assignedToId: editingTask.assignedToId,
                  },
                })
              }
              disabled={updateTask.isPending}
              className="bg-indigo-600 text-white text-sm font-medium px-4 py-2 rounded-lg disabled:opacity-50"
            >
              {updateTask.isPending ? 'Saving...' : 'Save'}
            </button>
            <button onClick={() => setEditingTask(null)} className="text-sm text-gray-500 px-4 py-2">Cancel</button>
          </div>
        </div>
      )}

      {/* Tasks list */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold text-gray-900">Tasks ({tasks.length})</h3>
        </div>

        <TaskFilters filters={filters} onChange={setFilters} />

        <div className="mt-4 space-y-2">
          {tasks.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">No tasks yet</p>
          ) : (
            tasks.map((task) => (
              <div
                key={task.id}
                className="flex items-start justify-between gap-4 p-3 rounded-lg hover:bg-gray-50 border border-transparent hover:border-gray-100"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900">{task.title}</p>
                  {task.description && (
                    <p className="text-xs text-gray-400 mt-0.5 line-clamp-1">{task.description}</p>
                  )}
                  <div className="flex items-center gap-2 mt-1">
                    {task.assignedTo && (
                      <span className="text-xs text-gray-400">{task.assignedTo.name}</span>
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
                  <StatusBadge status={task.status} />
                  {(canManage || task.assignedToId === user?.id) && (
                    <button
                      onClick={() => setEditingTask(task)}
                      className="text-xs text-gray-400 hover:text-indigo-600 px-2 py-1 rounded border border-gray-200 hover:border-indigo-300"
                    >
                      Edit
                    </button>
                  )}
                  {canManage && (
                    <button
                      onClick={() => deleteTask.mutate(task.id)}
                      className="text-xs text-gray-300 hover:text-red-500"
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Activity feed — merges live + DB events */}
      <ActivityFeed
        activities={allActivity}
        isLoading={activityLoading}
        title="Project Activity"
      />
    </div>
  );
}

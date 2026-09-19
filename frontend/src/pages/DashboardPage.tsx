import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import api from '../lib/axios';
import ActivityFeed from '../components/ActivityFeed';
import { StatusBadge, PriorityBadge } from '../components/StatusBadge';
import type { Task } from '../types';
import { formatDistanceToNow, isAfter, addDays } from 'date-fns';

// ─── Admin Dashboard ───────────────────────────────────────────────────────
function AdminDashboard() {
  const { onlineCount, recentActivity } = useSocket();

  const { data: stats, isLoading } = useQuery({
    queryKey: ['dashboard', 'admin'],
    queryFn: async () => {
      const { data } = await api.get('/dashboard');
      return data.data;
    },
    refetchInterval: 30000,
  });

  if (isLoading || !stats) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 animate-pulse">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-white rounded-xl border border-gray-200 p-5 h-24" />
        ))}
      </div>
    );
  }

  const totalTasks = stats.tasksByStatus?.reduce((sum: number, s: { count: number }) => sum + s.count, 0) ?? 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
        <p className="text-sm text-gray-500 mt-1">Global overview of all projects and team activity</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Projects" value={stats.totalProjects} color="indigo" />
        <StatCard label="Total Clients" value={stats.totalClients} color="blue" />
        <StatCard label="Total Tasks" value={totalTasks} color="green" />
        <StatCard label="Overdue Tasks" value={stats.overdueCount} color="red" alert={stats.overdueCount > 0} />
      </div>

      {/* Online users — live via WebSocket presence */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 flex items-center gap-4">
        <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse" />
        <div>
          <p className="text-sm font-medium text-gray-900">{onlineCount > 0 ? onlineCount : stats.onlineUsers} users online right now</p>
          <p className="text-xs text-gray-400">Live WebSocket presence</p>
        </div>
      </div>

      {/* Tasks by status */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-base font-semibold text-gray-900 mb-4">Tasks by Status</h3>
        <div className="flex flex-wrap gap-3">
          {stats.tasksByStatus?.map((s: { status: string; count: number }) => (
            <div key={s.status} className="flex items-center gap-2 bg-gray-50 rounded-lg px-4 py-2">
              <StatusBadge status={s.status as any} />
              <span className="text-sm font-semibold text-gray-900">{s.count}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Global activity feed */}
      <ActivityFeed
        activities={recentActivity.length > 0 ? recentActivity : []}
        title="Live Activity Feed (All Projects)"
      />
    </div>
  );
}

// ─── PM Dashboard ─────────────────────────────────────────────────────────
function PMDashboard() {
  const { recentActivity } = useSocket();

  const { data: stats, isLoading } = useQuery({
    queryKey: ['dashboard', 'pm'],
    queryFn: async () => {
      const { data } = await api.get('/dashboard');
      return data.data;
    },
  });

  if (isLoading || !stats) {
    return <div className="animate-pulse space-y-4"><div className="h-32 bg-gray-100 rounded-xl"/></div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Project Manager Dashboard</h1>
        <p className="text-sm text-gray-500 mt-1">Your projects and team overview</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard label="My Projects" value={stats.totalProjects} color="indigo" />
        <StatCard label="Upcoming Deadlines" value={stats.upcomingTasks?.length ?? 0} color="yellow" />
        <StatCard
          label="Overdue Tasks"
          value={stats.projects?.reduce((sum: number, p: { statusBreakdown: Record<string, number> }) =>
            sum + (p.statusBreakdown['OVERDUE'] ?? 0), 0) ?? 0}
          color="red"
        />
      </div>

      {/* Tasks by priority */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-base font-semibold text-gray-900 mb-4">Tasks by Priority</h3>
        <div className="flex flex-wrap gap-3">
          {stats.tasksByPriority?.map((p: { priority: string; count: number }) => (
            <div key={p.priority} className="flex items-center gap-2 bg-gray-50 rounded-lg px-4 py-2">
              <PriorityBadge priority={p.priority as any} />
              <span className="text-sm font-semibold text-gray-900">{p.count}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Upcoming this week */}
      {stats.upcomingTasks?.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-base font-semibold text-gray-900 mb-4">Due This Week</h3>
          <div className="space-y-3">
            {stats.upcomingTasks.map((task: Task) => (
              <div key={task.id} className="flex items-center justify-between gap-4 py-2 border-b border-gray-50 last:border-0">
                <div>
                  <p className="text-sm font-medium text-gray-900">{task.title}</p>
                  <p className="text-xs text-gray-400">{task.project?.name}</p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <PriorityBadge priority={task.priority} />
                  {task.dueDate && (
                    <span className="text-xs text-gray-500">
                      {formatDistanceToNow(new Date(task.dueDate), { addSuffix: true })}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <ActivityFeed activities={recentActivity} title="Team Activity" />
    </div>
  );
}

// ─── Developer Dashboard ──────────────────────────────────────────────────
function DeveloperDashboard() {
  const { recentActivity } = useSocket();

  const { data: stats, isLoading } = useQuery({
    queryKey: ['dashboard', 'developer'],
    queryFn: async () => {
      const { data } = await api.get('/dashboard');
      return data.data;
    },
  });

  if (isLoading || !stats) {
    return <div className="animate-pulse h-48 bg-gray-100 rounded-xl" />;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">My Dashboard</h1>
        <p className="text-sm text-gray-500 mt-1">Your assigned tasks sorted by priority and due date</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard label="Active Tasks" value={stats.activeTasks?.length ?? 0} color="indigo" />
        <StatCard label="Completed" value={stats.completedCount ?? 0} color="green" />
        <StatCard label="Overdue" value={stats.overdueCount ?? 0} color="red" alert={stats.overdueCount > 0} />
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-base font-semibold text-gray-900 mb-4">Active Tasks</h3>
        {stats.activeTasks?.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-6">No active tasks — nice work! 🎉</p>
        ) : (
          <div className="space-y-3">
            {stats.activeTasks?.map((task: Task) => (
              <div key={task.id} className="flex items-start justify-between gap-4 p-3 rounded-lg hover:bg-gray-50">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900">{task.title}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{task.project?.name}</p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <PriorityBadge priority={task.priority} />
                  <StatusBadge status={task.status} />
                  {task.dueDate && (
                    <span className={`text-xs ${isAfter(new Date(), addDays(new Date(task.dueDate), 0)) ? 'text-red-500 font-medium' : 'text-gray-400'}`}>
                      {formatDistanceToNow(new Date(task.dueDate), { addSuffix: true })}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <ActivityFeed activities={recentActivity} title="My Activity" />
    </div>
  );
}

// ─── Shared Stat Card ─────────────────────────────────────────────────────
function StatCard({
  label,
  value,
  color,
  alert,
}: {
  label: string;
  value: number;
  color: 'indigo' | 'blue' | 'green' | 'red' | 'yellow';
  alert?: boolean;
}) {
  const colorMap = {
    indigo: 'bg-indigo-50 text-indigo-700',
    blue: 'bg-blue-50 text-blue-700',
    green: 'bg-green-50 text-green-700',
    red: 'bg-red-50 text-red-700',
    yellow: 'bg-yellow-50 text-yellow-700',
  };

  return (
    <div className={`rounded-xl border p-5 ${alert ? 'border-red-200 bg-red-50' : 'border-gray-200 bg-white'}`}>
      <p className="text-sm text-gray-500">{label}</p>
      <p className={`text-3xl font-bold mt-1 ${colorMap[color]}`}>{value}</p>
    </div>
  );
}

// ─── Router ───────────────────────────────────────────────────────────────
export default function DashboardPage() {
  const { user } = useAuth();
  if (!user) return null;
  if (user.role === 'ADMIN') return <AdminDashboard />;
  if (user.role === 'PROJECT_MANAGER') return <PMDashboard />;
  return <DeveloperDashboard />;
}

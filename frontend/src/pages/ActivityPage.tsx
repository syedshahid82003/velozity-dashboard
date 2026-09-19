import { useQuery } from '@tanstack/react-query';
import api from '../lib/axios';
import { useSocket } from '../context/SocketContext';
import { useAuth } from '../context/AuthContext';
import ActivityFeed from '../components/ActivityFeed';
import type { ActivityLog } from '../types';

export default function ActivityPage() {
  const { user } = useAuth();
  const { recentActivity } = useSocket();

  const { data: dbActivity = [], isLoading } = useQuery<ActivityLog[]>({
    queryKey: ['activity', 'global'],
    queryFn: async () => {
      const { data } = await api.get('/activity?limit=50');
      return data.data ?? [];
    },
  });

  // Merge live socket events with DB fetch, deduplicated by id
  const merged = [
    ...recentActivity,
    ...dbActivity.filter((a) => !recentActivity.some((r) => r.id === a.id)),
  ].slice(0, 50);

  const title =
    user?.role === 'ADMIN'
      ? 'Global Activity Feed'
      : user?.role === 'PROJECT_MANAGER'
      ? 'My Projects Activity'
      : 'My Activity';

  return (
    <div className="max-w-2xl space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
        <p className="text-sm text-gray-500 mt-1">
          {user?.role === 'ADMIN' && 'All activity across every project, in real time.'}
          {user?.role === 'PROJECT_MANAGER' && 'Activity across your projects only.'}
          {user?.role === 'DEVELOPER' && 'Activity on tasks assigned to you.'}
        </p>
      </div>

      <ActivityFeed activities={merged} isLoading={isLoading} title={title} />
    </div>
  );
}

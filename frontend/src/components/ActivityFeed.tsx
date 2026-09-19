import { formatDistanceToNow } from 'date-fns';
import type { ActivityLog } from '../types';

interface Props {
  activities: ActivityLog[];
  isLoading?: boolean;
  title?: string;
}

const statusColors: Record<string, string> = {
  DONE: 'text-green-600',
  IN_REVIEW: 'text-blue-600',
  IN_PROGRESS: 'text-yellow-600',
  OVERDUE: 'text-red-600',
  TODO: 'text-gray-500',
};

export default function ActivityFeed({ activities, isLoading, title = 'Activity Feed' }: Props) {
  if (isLoading) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-base font-semibold text-gray-900 mb-4">{title}</h3>
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="flex gap-3 animate-pulse">
              <div className="w-8 h-8 bg-gray-200 rounded-full flex-shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-3 bg-gray-200 rounded w-3/4" />
                <div className="h-2 bg-gray-100 rounded w-1/4" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <h3 className="text-base font-semibold text-gray-900 mb-4">{title}</h3>

      {activities.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-8">No activity yet</p>
      ) : (
        <div className="space-y-4 max-h-96 overflow-y-auto pr-1">
          {activities.map((log) => (
            <div key={log.id} className="flex gap-3">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 text-xs font-bold uppercase">
                {log.user?.name?.[0] ?? '?'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-800">
                  <span className="font-medium">{log.user?.name ?? 'System'}</span>{' '}
                  <span className={log.toStatus ? statusColors[log.toStatus] ?? '' : ''}>
                    {log.action}
                  </span>
                </p>
                {log.project && (
                  <p className="text-xs text-gray-400 mt-0.5">{log.project.name}</p>
                )}
                <p className="text-xs text-gray-400">
                  {formatDistanceToNow(new Date(log.createdAt), { addSuffix: true })}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

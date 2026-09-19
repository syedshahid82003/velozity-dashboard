import type { TaskStatus, TaskPriority } from '../types';

const statusConfig: Record<TaskStatus, { label: string; className: string }> = {
  TODO: { label: 'To Do', className: 'bg-gray-100 text-gray-700' },
  IN_PROGRESS: { label: 'In Progress', className: 'bg-yellow-100 text-yellow-800' },
  IN_REVIEW: { label: 'In Review', className: 'bg-blue-100 text-blue-800' },
  DONE: { label: 'Done', className: 'bg-green-100 text-green-800' },
  OVERDUE: { label: 'Overdue', className: 'bg-red-100 text-red-800' },
};

const priorityConfig: Record<TaskPriority, { label: string; className: string }> = {
  LOW: { label: 'Low', className: 'bg-slate-100 text-slate-600' },
  MEDIUM: { label: 'Medium', className: 'bg-blue-50 text-blue-700' },
  HIGH: { label: 'High', className: 'bg-orange-100 text-orange-700' },
  CRITICAL: { label: 'Critical', className: 'bg-red-100 text-red-700 font-semibold' },
};

export function StatusBadge({ status }: { status: TaskStatus }) {
  const config = statusConfig[status];
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${config.className}`}>
      {config.label}
    </span>
  );
}

export function PriorityBadge({ priority }: { priority: TaskPriority }) {
  const config = priorityConfig[priority];
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs ${config.className}`}>
      {config.label}
    </span>
  );
}

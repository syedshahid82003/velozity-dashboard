import type { TaskFilters as TaskFiltersType } from '../types';

interface Props {
  filters: TaskFiltersType;
  onChange: (filters: TaskFiltersType) => void;
  showProjectFilter?: boolean;
}

const STATUS_OPTIONS = [
  { value: '', label: 'All Statuses' },
  { value: 'TODO', label: 'To Do' },
  { value: 'IN_PROGRESS', label: 'In Progress' },
  { value: 'IN_REVIEW', label: 'In Review' },
  { value: 'DONE', label: 'Done' },
  { value: 'OVERDUE', label: 'Overdue' },
];

const PRIORITY_OPTIONS = [
  { value: '', label: 'All Priorities' },
  { value: 'CRITICAL', label: 'Critical' },
  { value: 'HIGH', label: 'High' },
  { value: 'MEDIUM', label: 'Medium' },
  { value: 'LOW', label: 'Low' },
];

export default function TaskFilters({ filters, onChange }: Props) {
  const update = (key: keyof TaskFiltersType, value: string) => {
    const updated = { ...filters, [key]: value, page: 1 };
    onChange(updated);

    // Sync to URL query params so filters are shareable
    const params = new URLSearchParams(window.location.search);
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    window.history.replaceState(null, '', `?${params.toString()}`);
  };

  return (
    <div className="flex flex-wrap gap-3 items-end">
      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Status</label>
        <select
          value={filters.status ?? ''}
          onChange={(e) => update('status', e.target.value)}
          className="text-sm border border-gray-300 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          {STATUS_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Priority</label>
        <select
          value={filters.priority ?? ''}
          onChange={(e) => update('priority', e.target.value)}
          className="text-sm border border-gray-300 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          {PRIORITY_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Due From</label>
        <input
          type="date"
          value={filters.dueDateFrom ?? ''}
          onChange={(e) => update('dueDateFrom', e.target.value)}
          className="text-sm border border-gray-300 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Due To</label>
        <input
          type="date"
          value={filters.dueDateTo ?? ''}
          onChange={(e) => update('dueDateTo', e.target.value)}
          className="text-sm border border-gray-300 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>

      {(filters.status || filters.priority || filters.dueDateFrom || filters.dueDateTo) && (
        <button
          onClick={() => {
            onChange({ page: 1 });
            window.history.replaceState(null, '', window.location.pathname);
          }}
          className="text-sm text-gray-500 hover:text-gray-700 underline self-end pb-2"
        >
          Clear filters
        </button>
      )}
    </div>
  );
}

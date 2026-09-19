export type Role = 'ADMIN' | 'PROJECT_MANAGER' | 'DEVELOPER';

export type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'IN_REVIEW' | 'DONE' | 'OVERDUE';
export type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type NotificationType = 'TASK_ASSIGNED' | 'TASK_IN_REVIEW' | 'TASK_STATUS_CHANGED';

export interface User {
  id: string;
  email: string;
  name: string;
  role: Role;
  createdAt?: string;
}

export interface Client {
  id: string;
  name: string;
  email: string;
  company: string;
  createdAt?: string;
}

export interface Project {
  id: string;
  name: string;
  description?: string;
  clientId: string;
  managerId: string;
  client: { id: string; name: string; company: string };
  manager: { id: string; name: string; email: string };
  _count?: { tasks: number };
  createdAt: string;
  updatedAt: string;
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  projectId: string;
  assignedToId?: string;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate?: string;
  createdAt: string;
  updatedAt: string;
  assignedTo?: { id: string; name: string; email: string };
  project?: { id: string; name: string; managerId?: string };
  activityLogs?: ActivityLog[];
}

export interface ActivityLog {
  id: string;
  projectId: string;
  taskId?: string;
  userId: string;
  action: string;
  fromStatus?: string;
  toStatus?: string;
  createdAt: string;
  user: { id: string; name: string };
  task?: { id: string; title: string };
  project?: { id: string; name: string };
}

export interface Notification {
  id: string;
  recipientId: string;
  taskId?: string;
  type: NotificationType;
  message: string;
  read: boolean;
  createdAt: string;
  task?: {
    id: string;
    title: string;
    project?: { id: string; name: string };
  };
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  errors?: { field: string; message: string }[];
}

export interface PaginatedResult<T> {
  tasks: T[];
  total: number;
  page: number;
  limit: number;
}

export interface TaskFilters {
  status?: TaskStatus | '';
  priority?: TaskPriority | '';
  dueDateFrom?: string;
  dueDateTo?: string;
  projectId?: string;
  page?: number;
  limit?: number;
}

import { Role } from '@prisma/client';
import { Request } from 'express';

// Extends Express Request to carry authenticated user info
export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    name: string;
    role: Role;
  };
}

export interface JwtAccessPayload {
  userId: string;
  email: string;
  name: string;
  role: Role;
}

export interface JwtRefreshPayload {
  userId: string;
  tokenId: string;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  errors?: { field: string; message: string }[];
}

export interface PaginationQuery {
  page?: string;
  limit?: string;
}

export interface TaskFilterQuery extends PaginationQuery {
  status?: string;
  priority?: string;
  dueDateFrom?: string;
  dueDateTo?: string;
}

// Shared TypeScript types and interfaces

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
}

export enum UserRole {
  ADMIN = 'admin',
  MANAGER = 'manager',
  ENGINEER = 'engineer',
  VIEWER = 'viewer',
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  results: T[];
  count: number;
  next: string | null;
  previous: string | null;
}

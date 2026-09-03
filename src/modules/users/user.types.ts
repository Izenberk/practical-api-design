export const USER_ROLES = ['admin', 'user'] as const;

export type UserRole = 'admin' | 'user';

export interface User {
  readonly id: string;
  readonly email: string;
  readonly role: UserRole;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export interface UserWithSecret extends User {
  readonly passwordHash: string;
}

export interface CreateUserInput {
  readonly email: string;
  readonly passwordHash: string;
  readonly role: UserRole;
}

export interface UpdateUserInput {
  readonly email?: string;
  readonly role?: UserRole;
}

export interface Requester {
  readonly id: string;
  readonly role: UserRole;
}
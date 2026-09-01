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
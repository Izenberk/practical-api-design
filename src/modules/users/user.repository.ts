import type { User, UserWithSecret, CreateUserInput } from './user.types.js';

export interface UserRepository {
  findByEmail(email: string): Promise<UserWithSecret | null>;
  findById(id: string): Promise<User | null>;
  create(input: CreateUserInput): Promise<User>;
}
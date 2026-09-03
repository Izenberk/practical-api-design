import type {
  User,
  UserWithSecret,
  CreateUserInput,
  UpdateUserInput
} from './user.types.js';

export interface ListUsersOptions {
  readonly limit: number;
  readonly offset: number;
}

export interface UserRepository {
  findByEmail(email: string): Promise<UserWithSecret | null>;
  findById(id: string): Promise<User | null>;
  findAll(options: ListUsersOptions): Promise<User[]>;
  create(input: CreateUserInput): Promise<User>;
  update(id: string, input: UpdateUserInput): Promise<User | null>;
  delete(id: string): Promise<boolean>;
}
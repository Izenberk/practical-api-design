import jwt from 'jsonwebtoken';
import { env } from '../../config/env.js';
import { UnauthorizedError } from '../../core/errors/app-error.js';
import type { UserRole } from '../users/user.types.js'


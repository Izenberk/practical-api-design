import type { UserRole } from "../users/user.types.js";
import type { OrderStatus } from "./order.types.js";

export interface Transition {
  readonly from: OrderStatus;
  readonly to: OrderStatus;
  readonly allowedRoles: readonly UserRole[];
  readonly ownerMayTrigger: boolean;
}

// paid -> cancelled is deliberately absent: cancelling after payment
// requires a refund, which is out of scope.
const TRANSITIONS: readonly Transition[] = [
  { from: 'pending', to: 'paid', allowedRoles: ['admin'], ownerMayTrigger: false },
  { from: 'pending', to: 'cancelled', allowedRoles: ['admin'], ownerMayTrigger: true},
  { from: 'paid', to: 'shipped', allowedRoles: ['admin'], ownerMayTrigger: false},
  { from: 'shipped', to: 'delivered', allowedRoles: ['admin'], ownerMayTrigger: false},
];

export const findTransition = (
  from: OrderStatus,
  to: OrderStatus,
): Transition | undefined =>
  TRANSITIONS.find((t) => t.from === from && t.to === to);
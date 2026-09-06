import { describe, it, expect } from "@jest/globals";
import { findTransition } from "./order.state.js";
import { ORDER_STATUSES } from "./order.types.js";

describe('order state machine', () => {
  it('lets only an admin mark a pending order paid', () => {
    const transition = findTransition('pending', 'paid');

    expect(transition).toBeDefined();
    expect(transition?.allowedRoles).toEqual(['admin']);
    expect(transition?.ownerMayTrigger).toBe(false);
  });

  it('lets the owner cancel a pending order', () => {
    expect(findTransition('pending', 'cancelled')?.ownerMayTrigger).toBe(true);
  });

  it('never lets an owner trigger shipping or delivery', () => {
    expect(findTransition('paid', 'shipped')?.ownerMayTrigger).toBe(false);
    expect(findTransition('shipped', 'delivered')?.ownerMayTrigger).toBe(false);
  });

  it('has no transition out of a terminal state', () => {
    for (const to of ORDER_STATUSES) {
      expect(findTransition('delivered', to)).toBeUndefined();
      expect(findTransition('cancelled', to)).toBeUndefined();
    }
  });

  it('does not allow cancelling a paid order, because refunds are out of scope', () => {
    expect(findTransition('paid', 'cancelled')).toBeUndefined();
  });

  it('does not allow skipping a step', () => {
    expect(findTransition('pending', 'shipped')).toBeUndefined();
    expect(findTransition('pending', 'delivered')).toBeUndefined();
    expect(findTransition('paid', 'delivered')).toBeUndefined();
  });
});
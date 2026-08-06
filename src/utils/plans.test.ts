import { describe, it, expect } from 'vitest';
import { getPlanPrice, isPaymentActive, hasActivePlan, hasActivePlanFor } from './plans';
import type { Payment } from '../types';

function payment(over: Partial<Payment>): Payment {
  return {
    id: 'p1',
    userId: 'u1',
    plan: 'Professional',
    amount: 15000,
    status: 'completed',
    reference: 'ref-1',
    transactionId: 'tx-1',
    paymentMethod: 'card',
    createdAt: new Date().toISOString(),
    ...over,
  };
}

describe('getPlanPrice', () => {
  it('returns prices for known plans and null for unknown', () => {
    expect(getPlanPrice('Basic')).toBe(5000);
    expect(getPlanPrice('Business')).toBe(50000);
    expect(getPlanPrice('Enterprise')).toBeNull();
  });
});

describe('isPaymentActive', () => {
  it('rejects non-completed payments', () => {
    expect(isPaymentActive(payment({ status: 'pending' }))).toBe(false);
  });

  it('treats missing renewal date as active', () => {
    expect(isPaymentActive(payment({ renewalDate: undefined }))).toBe(true);
  });

  it('rejects expired payments', () => {
    expect(isPaymentActive(payment({ renewalDate: new Date(Date.now() - 1000).toISOString() }))).toBe(false);
  });
});

describe('hasActivePlan / hasActivePlanFor', () => {
  it('finds an active plan for the user', () => {
    expect(hasActivePlan([payment({})], 'u1')).toBe(true);
    expect(hasActivePlan([payment({})], 'other')).toBe(false);
  });

  it('filters by plan names', () => {
    expect(hasActivePlanFor([payment({ plan: 'Professional' })], 'u1', ['Business', 'Enterprise'])).toBe(false);
    expect(hasActivePlanFor([payment({ plan: 'Business' })], 'u1', ['Business', 'Enterprise'])).toBe(true);
  });
});

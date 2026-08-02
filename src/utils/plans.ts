import type { Payment } from '../types';

export const PLAN_ORDER = ['Basic', 'Professional', 'Business', 'Enterprise'] as const;

export const PLAN_PRICES: Record<string, number> = {
  Basic: 5000,
  Professional: 15000,
  Business: 50000,
};

export function getPlanPrice(plan: string): number | null {
  return PLAN_PRICES[plan] ?? null;
}

export function isPaymentActive(p: Payment): boolean {
  if (p.status !== 'completed') return false;
  if (!p.renewalDate) return true;
  return new Date(p.renewalDate).getTime() >= Date.now();
}

export function hasActivePlan(payments: Payment[], userId: string): boolean {
  return payments.some(p => p.userId === userId && isPaymentActive(p));
}

export function hasActivePlanFor(payments: Payment[], userId: string, planNames: string[]): boolean {
  return payments.some(p => p.userId === userId && planNames.includes(p.plan) && isPaymentActive(p));
}

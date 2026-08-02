import type { Payment } from '../types';
import { getSupabase } from './supabase';

export interface PaystackInitResult {
  ok: boolean;
  authorization_url?: string;
  reference?: string;
  amount?: number;
  plan?: string;
  error?: string;
  message?: string;
}

export interface PaystackVerifyResult {
  ok: boolean;
  payment?: Payment;
  error?: string;
  message?: string;
  status?: string;
}

async function supabaseAccessToken(): Promise<string | null> {
  try {
    const { data } = await getSupabase().auth.getSession();
    return data.session?.access_token ?? null;
  } catch {
    return null;
  }
}

export async function initPaystackCheckout(plan: string, email: string, userId: string, callback: string): Promise<PaystackInitResult | null> {
  try {
    const res = await fetch('/api/paystack/init', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ plan, email, userId, callback }),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as PaystackInitResult;
    return data && typeof data === 'object' ? data : null;
  } catch {
    return null;
  }
}

export async function verifyPaystackPayment(reference: string): Promise<PaystackVerifyResult | null> {
  try {
    const token = await supabaseAccessToken();
    const res = await fetch('/api/paystack/verify', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        ...(token ? { authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ reference }),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as PaystackVerifyResult;
    return data && typeof data === 'object' ? data : null;
  } catch {
    return null;
  }
}

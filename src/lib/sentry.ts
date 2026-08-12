// Sentry browser error tracking (roadmap #14). Initialized ONLY when
// VITE_SENTRY_DSN is set, so local/demo builds stay dependency-free of any
// external service and no events leak without an explicit opt-in.
import * as Sentry from '@sentry/react';

const dsn = (import.meta.env.VITE_SENTRY_DSN ?? '').trim();

export const sentryEnabled = dsn.length > 0;

export function initSentry(): void {
  if (!sentryEnabled) return;
  Sentry.init({
    dsn,
    environment: import.meta.env.PROD ? 'production' : 'development',
    tracesSampleRate: import.meta.env.PROD ? 0.1 : 0,
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 1,
    beforeSend(event) {
      // Never forward PII from the event envelope beyond what Sentry already
      // receives; scrub emails and phone numbers defensively.
      const text = JSON.stringify(event);
      const scrubbed = text
        .replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '[email]')
        .replace(/\b(?:\+?\d{1,3}[\s.-]?)?(?:\(\d{2,4}\)[\s.-]?)?\d{3}[\s.-]?\d{3}[\s.-]?\d{3,4}\b/g, '[phone]');
      return JSON.parse(scrubbed) as Sentry.ErrorEvent;
    },
  });
}

export function captureError(err: unknown, context?: Record<string, unknown>): void {
  if (!sentryEnabled) return;
  Sentry.captureException(err, context ? { extra: context } : undefined);
}

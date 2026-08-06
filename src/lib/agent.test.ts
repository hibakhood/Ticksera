import { describe, it, expect } from 'vitest';
import { deterministicAutoRoute, getTechnicianLoad, type AutoRoutePayload } from './agent';
import type { Ticket } from '../types';

const payload: AutoRoutePayload = {
  mode: 'auto-route',
  ticket: {
    id: 't1',
    title: 'Laptop will not boot after update',
    description: 'Screen stays black',
    category: 'computer_repair',
    priority: 'medium',
  },
  technicians: [
    { id: 't-1', name: 'Mike Obi', role: 'field_technician', skills: ['computer_repair', 'microsoft365', 'server'], load: 2 },
    { id: 't-2', name: 'Emeka Nwosu', role: 'technician', skills: ['networking', 'internet'], load: 0 },
  ],
};

describe('deterministicAutoRoute', () => {
  it('prefers the field technician for an onsite category like computer_repair', () => {
    const result = deterministicAutoRoute(payload);
    expect(result.technicianId).toBe('t-1');
    expect(result.action).toBe('assign');
  });

  it('suggests high priority for urgent tickets', () => {
    const result = deterministicAutoRoute({
      ...payload,
      ticket: { ...payload.ticket, title: 'URGENT outage in the office', priority: 'low' },
    });
    expect(result.priority).toBe('high');
  });

  it('escalates critical or already-escalated tickets', () => {
    const critical = deterministicAutoRoute({
      ...payload,
      ticket: { ...payload.ticket, priority: 'critical' },
    });
    expect(critical.action).toBe('escalate');

    const preEscalated = deterministicAutoRoute({
      ...payload,
      ticket: { ...payload.ticket, escalated: true },
    });
    expect(preEscalated.action).toBe('escalate');
  });

  it('returns no technician when the roster is empty', () => {
    const result = deterministicAutoRoute({ ...payload, technicians: [] });
    expect(result.technicianId).toBeNull();
  });
});

describe('getTechnicianLoad', () => {
  const tickets: Ticket[] = [
    { id: 'x1', assignedTo: 'a', status: 'in_progress' } as Ticket,
    { id: 'x2', assignedTo: 'a', status: 'resolved' } as Ticket,
  ];
  it('counts only active statuses', () => {
    expect(getTechnicianLoad(tickets, 'a')).toBe(1);
  });
});

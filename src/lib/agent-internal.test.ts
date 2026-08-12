import { describe, it, expect, vi, afterEach } from 'vitest';
import { maskPii, containsBlockedContent, resolveAutoRouteRoster } from '../../api/agent';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('maskPii', () => {
  it('redacts emails and phone numbers to placeholders', () => {
    const out = maskPii('Reach me at jane@company.com or +234 800 000 0001, or 08123456789.');
    expect(out).not.toContain('jane@company.com');
    expect(out).not.toContain('234');
    expect(out).toContain('<EMAIL>');
    expect(out).toContain('<PHONE>');
  });

  it('keeps plain prose intact', () => {
    const out = maskPii('My laptop shows a blue screen after the update. Error 0x7B.');
    expect(out).toContain('blue screen');
    expect(out).toContain('0x7B');
    expect(out).not.toContain('<EMAIL>');
  });

  it('handles nullish input', () => {
    expect(maskPii('')).toBe('');
    expect(maskPii(undefined as unknown as string)).toBe('');
  });
});

describe('containsBlockedContent', () => {
  it('flags abusive words', () => {
    expect(containsBlockedContent('this is bullshit')).toBe(false);
    expect(containsBlockedContent('shut the fuck up')).toBe(true);
    expect(containsBlockedContent('you are a bitch')).toBe(true);
  });

  it('does not trip on benign words containing blocklist substrings', () => {
    expect(containsBlockedContent('the shipment is on track')).toBe(false);
    expect(containsBlockedContent('please fix the docking station')).toBe(false);
  });

  it('is case-insensitive and null-safe', () => {
    expect(containsBlockedContent('FUCK')).toBe(true);
    expect(containsBlockedContent('')).toBe(false);
    expect(containsBlockedContent(undefined as unknown as string)).toBe(false);
  });
});

describe('resolveAutoRouteRoster', () => {
  it('trusts the database roster and only enriches verified ids', async () => {
    const fakeProfiles = [
      { id: 'u-tech-1', name: 'Mike Obi', role: 'technician', location: 'Abuja, NG', bio: 'Senior technician' },
      { id: 'u-tech-2', name: 'Grace Adeyemi', role: 'field_technician', location: 'PH, NG', bio: null },
      { id: 'u-unknown', name: 'Ghost', role: 'technician' },
    ];
    vi.stubGlobal('fetch', vi.fn(async () => ({
      ok: true,
      json: async () => fakeProfiles,
    })));

    const roster = await resolveAutoRouteRoster('https://x.supabase.co', 'service-key', [
      { id: 'u-tech-1', name: 'Spoofed Name', role: 'technician', load: 2 },
      { id: 'u-fake', name: 'Invented', role: 'technician', load: 0 },
    ]);

    // DB identity wins; spoofed name is discarded.
    expect(roster).toHaveLength(3);
    expect(roster.map(t => t.id).sort()).toEqual(['u-tech-1', 'u-tech-2', 'u-unknown']);
    const tech1 = roster.find(t => t.id === 'u-tech-1')!;
    expect(tech1?.name).toBe('Mike Obi');
    // Client-supplied load is kept as enrichment for a verified id.
    expect(tech1?.load).toBe(2);
    // The invented id never appears.
    expect(roster.some(t => t.id === 'u-fake')).toBe(false);
  });

  it('falls back to the request roster when the database is unreachable', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('down'); }));
    const roster = await resolveAutoRouteRoster('https://x.supabase.co', 'service-key', [
      { id: 'a', name: 'A', role: 'technician', load: 1 },
    ]);
    expect(roster).toHaveLength(1);
    expect(roster[0].id).toBe('a');
  });

  it('returns the client roster when Supabase is not configured', async () => {
    const roster = await resolveAutoRouteRoster('', '', [
      { id: 'a', name: 'A', role: 'technician', load: 0 },
    ]);
    expect(roster).toHaveLength(1);
  });
});

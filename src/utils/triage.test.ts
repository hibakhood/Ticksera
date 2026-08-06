import { describe, it, expect } from 'vitest';
import { findKbArticles, getTriageFlow } from './triage';
import type { KBArticle } from '../types';

function article(over: Partial<KBArticle>): KBArticle {
  return {
    id: over.id ?? 'k1',
    title: over.title ?? 'Article',
    category: over.category ?? 'General',
    content: over.content ?? 'Body',
    tags: over.tags ?? [],
    isPublished: over.isPublished ?? true,
    helpfulCount: over.helpfulCount ?? 0,
    createdBy: over.createdBy ?? 'u1',
    createdAt: over.createdAt ?? new Date().toISOString(),
  };
}

describe('getTriageFlow', () => {
  it('returns a flow for a known category', () => {
    const flow = getTriageFlow('computer_repair');
    expect(flow.questions.length).toBeGreaterThan(0);
  });

  it('falls back to computer_repair for unknown categories', () => {
    const flow = getTriageFlow('unknown' as never);
    expect(flow.questions[0].id).toBe('cr_1');
  });
});

describe('findKbArticles', () => {
  it('filters to published articles only', () => {
    const kb: KBArticle[] = [
      article({ id: 'a', title: 'Computer Repair Hardware', category: 'computer_repair', isPublished: true }),
      article({ id: 'b', title: 'Draft guide', category: 'computer_repair', isPublished: false }),
    ];
    const results = findKbArticles(kb, 'computer_repair');
    expect(results.map(a => a.id)).toEqual(['a']);
  });

  it('respects the limit', () => {
    const kb: KBArticle[] = [1, 2, 3].map(i =>
      article({ id: `a${i}`, title: 'Computer Repair Hardware', category: 'computer_repair' })
    );
    expect(findKbArticles(kb, 'computer_repair', 2)).toHaveLength(2);
  });

  it('returns nothing for empty input', () => {
    expect(findKbArticles([], 'computer_repair')).toEqual([]);
  });
});

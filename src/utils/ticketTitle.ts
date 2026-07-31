export function cleanTicketTitle(title: string): string {
  return title.replace(/^\s*\[[^\]]+\]\s*/, '').trim();
}

export function buildTicketTitle(productItem: string, issueTrigger: string): string {
  const product = productItem.replace(/\s*—\s*/g, ' · ').trim();
  const issue = issueTrigger.trim();
  if (product && issue) return `${product} — ${issue}`;
  return `${product}${issue}`;
}

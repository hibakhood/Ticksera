import type { TicketCategory, KBArticle } from '../types';

export interface TriageQuestion {
  id: string;
  question: string;
  options?: string[];
}

const triageFlows: Record<TicketCategory, { greeting: string; questions: TriageQuestion[] }> = {
  computer_repair: {
    greeting: "I'll help diagnose your computer issue. Let me ask a few questions.",
    questions: [
      { id: 'cr_1', question: 'Does the computer turn on at all? Do you see any lights or hear fans?', options: ['Yes, it powers on', 'No, no power at all', 'Intermittent power'] },
      { id: 'cr_2', question: 'Do you see any error messages on screen?', options: ['Blue screen with error code', 'Black screen, no display', 'Windows loading but crashing', 'No error messages'] },
      { id: 'cr_3', question: 'When did this issue start? Was it after a specific event?', options: ['After Windows update', 'After software install', 'After power outage', 'Randomly started'] },
    ],
  },
  networking: {
    greeting: "Let's troubleshoot your network issue. I'll walk you through it.",
    questions: [
      { id: 'net_1', question: 'Is the issue affecting one device or all devices on the network?', options: ['All devices', 'Only one device', 'Multiple but not all'] },
      { id: 'net_2', question: 'Have you tried restarting the router/modem?', options: ['Yes, no change', 'Yes, temporarily fixed', 'Not yet'] },
      { id: 'net_3', question: 'Is the connection dropping intermittently or completely down?', options: ['Intermittent drops', 'Completely down', 'Slow but stable'] },
    ],
  },
  printer: {
    greeting: "Let's sort out your printer issue. I'll help diagnose the problem.",
    questions: [
      { id: 'pr_1', question: 'Is the printer powered on and showing any status lights?', options: ['On with green light', 'On with error light', 'No lights / off'] },
      { id: 'pr_2', question: 'Have you checked the paper tray and ink/toner levels?', options: ['Paper loaded, ink OK', 'Paper jam', 'Low ink/toner', 'Not checked'] },
      { id: 'pr_3', question: 'Does the printer appear in your device list?', options: ['Yes, shows online', 'Yes, shows offline', 'Not detected'] },
    ],
  },
  cctv: {
    greeting: "I'll help troubleshoot your CCTV system. Let's start with some basics.",
    questions: [
      { id: 'cctv_1', question: 'Is the DVR/NVR unit powered on?', options: ['Yes, lights are on', 'No power', 'Not sure'] },
      { id: 'cctv_2', question: 'Are all cameras offline or just specific ones?', options: ['All cameras', 'Specific cameras', 'Intermittent signal'] },
      { id: 'cctv_3', question: 'Has there been a recent power outage or storm?', options: ['Yes, power outage', 'Yes, storm/lightning', 'No recent events'] },
    ],
  },
  internet: {
    greeting: "Let's diagnose your internet issue. I'll ask a few quick questions.",
    questions: [
      { id: 'int_1', question: 'Is the internet completely down or just slow?', options: ['Completely down', 'Very slow', 'Intermittent'] },
      { id: 'int_2', question: 'Have you tried connecting directly via ethernet cable?', options: ['Ethernet works', 'Ethernet also down', 'Havent tried'] },
      { id: 'int_3', question: 'Have you checked with other devices (phone, tablet)?', options: ['All devices affected', 'Only computer affected', 'Only WiFi devices'] },
    ],
  },
  microsoft365: {
    greeting: "I can help with your Microsoft 365 issue. Let me ask a few questions.",
    questions: [
      { id: 'm365_1', question: 'Which Microsoft 365 service is affected?', options: ['Outlook/Email', 'Teams', 'Word/Excel', 'OneDrive', 'Admin portal'] },
      { id: 'm365_2', question: 'Are you seeing a specific error message?', options: ['License error', 'Authentication error', 'Sync error', 'No error, just not working'] },
      { id: 'm365_3', question: 'Has your subscription recently expired or changed?', options: ['Yes, recent change', 'No changes', 'Not sure'] },
    ],
  },
  server: {
    greeting: "Let's diagnose your server issue. I'll ask some diagnostic questions.",
    questions: [
      { id: 'srv_1', question: 'Is the server responding to ping/network requests?', options: ['Yes, responds', 'No response', 'Intermittent'] },
      { id: 'srv_2', question: 'Can you access the server management console?', options: ['Yes, can access', 'Remote access failed', 'Local access only'] },
      { id: 'srv_3', question: 'Are there any recent changes or updates made to the server?', options: ['Recent updates', 'New software installed', 'Hardware change', 'No changes'] },
    ],
  },
  website: {
    greeting: "Let's diagnose your website issue. I'll help identify the problem.",
    questions: [
      { id: 'web_1', question: 'Is the site completely down or just loading slowly?', options: ['Completely down', 'Very slow', 'Specific pages broken'] },
      { id: 'web_2', question: 'Can you access other websites normally?', options: ['Yes, other sites work', 'No, all sites slow', 'Intermittent'] },
      { id: 'web_3', question: 'Have you made any recent changes to the site?', options: ['Recent update/change', 'New plugin/extension', 'Hosting change', 'No changes'] },
    ],
  },
  software: {
    greeting: "Let's look into your software issue. I'll ask about the specifics.",
    questions: [
      { id: 'sw_1', question: 'Which software is having the issue?', options: ['Microsoft Office', 'AutoCAD', 'Adobe', 'Antivirus', 'Other'] },
      { id: 'sw_2', question: 'Is the software failing to install, launch, or crashing?', options: ['Wont install', 'Wont launch', 'Keeps crashing', 'Missing features'] },
      { id: 'sw_3', question: 'What error message (if any) do you see?', options: ['Compatibility error', 'License error', 'Missing DLL', 'No error', 'Other error'] },
    ],
  },
  remote: {
    greeting: "Let's diagnose your remote assistance needs. Tell me more.",
    questions: [
      { id: 'rm_1', question: 'What type of remote assistance do you need?', options: ['Screen sharing/remote desktop', 'VPN setup', 'Remote software install', 'Configuration help'] },
      { id: 'rm_2', question: 'Do you have remote access software installed?', options: ['TeamViewer/AnyDesk', 'Windows Remote Desktop', 'None installed'] },
      { id: 'rm_3', question: 'Is this for a one-time fix or ongoing support?', options: ['One-time fix', 'Ongoing support', 'Urgent issue'] },
    ],
  },
};

export function getTriageFlow(category: TicketCategory) {
  return triageFlows[category] || triageFlows.computer_repair;
}

const categoryKBKeywords: Record<TicketCategory, string[]> = {
  computer_repair: ['Computer Repair Hardware'],
  networking: ['Networking & WiFi'],
  printer: ['Printer Support'],
  cctv: ['CCTV & Surveillance'],
  internet: ['Internet & ISP'],
  microsoft365: ['Microsoft 365'],
  server: ['Server Support'],
  website: ['Website Support'],
  software: ['Software Support'],
  remote: ['VPN & Remote Access', 'Remote Assistance'],
};

export function findKbArticles(articles: KBArticle[], category: TicketCategory, limit = 3): KBArticle[] {
  const keywords = categoryKBKeywords[category] || [];
  if (!Array.isArray(articles) || keywords.length === 0) return [];
  const matched = articles.filter(a =>
    a.isPublished &&
    keywords.some(k =>
      a.category.toLowerCase().includes(k.toLowerCase()) ||
      a.title.toLowerCase().includes(k.toLowerCase())
    )
  );
  return matched.slice(0, limit);
}

export function buildTriageGreeting(category: TicketCategory, customerName: string): string {
  const flow = getTriageFlow(category);
  return [
    `Hello ${customerName}, welcome to Fixora. I'm **FIXORA**, your AI support assistant.`,
    '',
    flow.greeting,
    '',
    "Here's how I'll help you:",
    '',
    '1. I\'ll ask a few short questions about the issue.',
    '2. I\'ll share step-by-step fixes from our knowledge base.',
    "3. If the issue isn't resolved, I'll connect you with a Level 1 technician.",
    '',
    "Let's get started.",
    '',
    `**${flow.questions[0].question}**`,
  ].join('\n');
}

export function buildHandoffGreeting(customerName: string, priority: string, title: string): string {
  const criticalNote = priority === 'critical'
    ? '\nBecause this is marked **critical**, a Level 1 technician has also been alerted and will jump in alongside me if needed.'
    : '';
  return [
    `Hello ${customerName}, welcome to Fixora. I'm **FIXORA**, your AI support assistant, and I'll be handling this ticket for you.`,
    '',
    `Your request ("${title}") has been received as **${priority} priority**, and I'm already on it.`,
    '',
    "Here's how I'll work with you:",
    '',
    "1. I'll help you work through the issue and share step-by-step fixes from our knowledge base.",
    "2. If the issue needs hands-on attention or can't be resolved through self-service, I'll escalate it to a Level 1 technician.",
    "3. The technician takes over with the full context of everything we've tried.",
    criticalNote,
    '',
    "Let's get you sorted out.",
  ].join('\n');
}

export function getDiagnosticResponse(category: TicketCategory, questionIndex: number, _answer: string, kbArticles: KBArticle[] = []): string {
  const flow = getTriageFlow(category);
  const nextIndex = questionIndex + 1;

  const tipLists: Record<string, string[]> = {
    computer_repair: [
      'Try holding the power button for 15 seconds, then press it again.',
      'Boot into Safe Mode and check for any recent changes.',
      'Run System Restore to a point before the issue started.',
    ],
    networking: [
      'Power cycle the router: unplug it for 30 seconds, then plug it back in.',
      'Check if other devices can connect, to isolate the problem.',
      'Move the device closer to the router to rule out signal interference.',
    ],
  };

  const tips = tipLists[category] || [];
  const tip = tips[questionIndex];
  const acknowledgments = [
    'Got it, thanks.',
    'Thanks, that helps.',
    'Understood. Let me check our knowledge base.',
  ];

  if (nextIndex < flow.questions.length) {
    const lines: string[] = [acknowledgments[questionIndex % acknowledgments.length]];
    if (tip) {
      lines.push('', '**You can try this now:**', `• ${tip}`);
    }
    lines.push('', '**Next question:**', `**${flow.questions[nextIndex].question}**`);
    return lines.join('\n');
  }

  const primary = findKbArticles(kbArticles, category, 1)[0];
  const related = findKbArticles(kbArticles, category, 4).filter(a => a.id !== primary?.id);

  const lines: string[] = ["That's all I need. Here's what I found."];

  if (primary) {
    const steps = primary.content
      .split('\n')
      .map(s => s.trim())
      .filter(s => s.length > 0)
      .slice(0, 6);
    if (steps.length > 0) {
      lines.push('', '**Step-by-step fix:**', ...steps);
    }
    if (related.length > 1) {
      lines.push('', '**Related guides:**');
      related.forEach(a => lines.push(`• ${a.title}`));
    }
  } else {
    lines.push('', "I couldn't find a perfect match in our knowledge base for this one. Your diagnostic summary has been saved for our team.");
  }

  lines.push(
    '',
    'Try the steps above and let me know if your issue is resolved.',
    '',
    "If you're still having trouble, you can request a technician below. I've prepared your case for them.",
  );

  return lines.join('\n');
}

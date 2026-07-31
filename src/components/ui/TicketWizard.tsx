import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, ChevronLeft, ChevronRight, Check, Sparkles, LifeBuoy, User, Building2, Hotel, GraduationCap, HeartPulse, Truck, Factory, Home, Landmark, Store, Monitor, Code2, Wifi, ShieldCheck, KeyRound, AlertCircle, Zap, Clock, TrendingUp } from 'lucide-react';
import type { TicketCategory, TicketPriority } from '../../types';

export interface WizardData {
  clientSegment: 'personal' | 'business';
  industryType: string;
  coreCategory: string;
  productItem: string;
  issueTrigger: string;
  priority: TicketPriority;
  suggestedCategory: TicketCategory;
}

interface Props {
  open: boolean;
  onClose: () => void;
}

const INDUSTRIES = [
  { value: 'hotel', label: 'Hotel & Hospitality', icon: Hotel, color: 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300' },
  { value: 'school', label: 'School & University', icon: GraduationCap, color: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300' },
  { value: 'hospital', label: 'Hospital & Clinic', icon: HeartPulse, color: 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-700 dark:text-red-300' },
  { value: 'logistics', label: 'Logistics', icon: Truck, color: 'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800 text-orange-700 dark:text-orange-300' },
  { value: 'manufacturing', label: 'Manufacturing', icon: Factory, color: 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300' },
  { value: 'real_estate', label: 'Real Estate', icon: Home, color: 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-700 dark:text-green-300' },
  { value: 'finance', label: 'Finance & Banking', icon: Landmark, color: 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300' },
  { value: 'sme', label: 'SME / Retail', icon: Store, color: 'bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800 text-purple-700 dark:text-purple-300' },
];

const CORE_CATEGORIES = [
  { value: 'hardware', label: 'Hardware', icon: Monitor, desc: 'Physical devices & equipment', color: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-700 text-blue-700 dark:text-blue-300' },
  { value: 'software', label: 'Software', icon: Code2, desc: 'Applications & operating systems', color: 'bg-violet-50 dark:bg-violet-900/20 border-violet-200 dark:border-violet-700 text-violet-700 dark:text-violet-300' },
  { value: 'network', label: 'Network', icon: Wifi, desc: 'Connectivity & infrastructure', color: 'bg-cyan-50 dark:bg-cyan-900/20 border-cyan-200 dark:border-cyan-700 text-cyan-700 dark:text-cyan-300' },
  { value: 'security', label: 'Security', icon: ShieldCheck, desc: 'CCTV, access control & alarms', color: 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-700 text-red-700 dark:text-red-300' },
  { value: 'user_access', label: 'User Access', icon: KeyRound, desc: 'Accounts, passwords & permissions', color: 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-700 text-amber-700 dark:text-amber-300' },
];

const PRODUCTS: Record<string, string[]> = {
  hardware: ['Desktop PC', 'Laptop', 'MacBook', 'Server / Rack', 'Printer', 'POS Machine', 'Projector', 'UPS / Battery Backup', 'Barcode / QR Scanner', 'Monitor / Display', 'Tablet / iPad', 'Webcam / Camera', 'Other Hardware'],
  software: ['Microsoft 365 — Outlook', 'Microsoft 365 — Teams', 'Microsoft 365 — Word / Excel', 'Google Workspace', 'Windows OS', 'macOS', 'Antivirus / Security Software', 'Accounting Software', 'ERP / CRM System', 'Custom In-House Software', 'Other Software'],
  network: ['WiFi Router', 'Network Switch', 'Wireless Access Point', 'VPN Connection', 'Ethernet / Cabling', 'Firewall / UTM', 'ISP / Internet Line', 'Network Printer', 'Other Network Device'],
  security: ['CCTV Camera', 'DVR / NVR System', 'Access Control System', 'Biometric Scanner', 'Alarm System', 'Network Firewall', 'Other Security Device'],
  user_access: ['Email Account', 'VPN Access', 'Active Directory / Domain', 'Software License', 'Password Reset', 'User Permissions', 'Shared Drive Access', 'Other Access Issue'],
};

const TRIGGERS: Record<string, string[]> = {
  hardware: ["Won't turn on", 'Running very slowly', 'Screen / display issues', 'Making unusual noise', 'Overheating', 'Physical damage', 'Not detected by system', 'Other'],
  software: ['Application crashes', 'Error message / error code', "Won't install or update", 'Freezes or hangs', 'Missing features or data', 'Login / authentication issue', 'Other'],
  network: ['No internet connection', 'Very slow connection', 'Device offline / unreachable', 'WiFi drops frequently', 'Cannot access shared resources', 'VPN not connecting', 'Other'],
  security: ['No camera feed', 'Device offline', 'Access denied', 'System error / alarm', 'False alarm triggered', 'Recording not working', 'Other'],
  user_access: ['Cannot log in', 'Password forgotten or expired', 'Account locked', 'Missing permissions', 'Account not found', 'MFA / 2FA issue', 'Other'],
};

const PRIORITIES = [
  { value: 'critical' as TicketPriority, label: 'Critical', sla: '15-min SLA', icon: Zap, dot: 'bg-red-500', chip: 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400', desc: 'System down — full business impact' },
  { value: 'high' as TicketPriority, label: 'High', sla: '60-min SLA', icon: AlertCircle, dot: 'bg-orange-500', chip: 'bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400', desc: 'Major issue affecting productivity' },
  { value: 'medium' as TicketPriority, label: 'Medium', sla: '3-hour SLA', icon: TrendingUp, dot: 'bg-amber-400', chip: 'bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400', desc: 'Partial disruption, workaround exists' },
  { value: 'low' as TicketPriority, label: 'Low', sla: '5-hour SLA', icon: Clock, dot: 'bg-green-500', chip: 'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400', desc: 'Minor inconvenience, not urgent' },
];

const SELECTED_CARD = 'border-emerald-400 dark:border-emerald-600 bg-emerald-50/60 dark:bg-emerald-900/10 ring-2 ring-emerald-400/25 shadow-md shadow-emerald-500/10';
const UNSELECTED_CARD = 'border-slate-200 dark:border-dark-border bg-white dark:bg-dark-card hover:border-emerald-300 dark:hover:border-emerald-700 hover:shadow-sm';
const SELECTED_CHIP = 'border-emerald-400 dark:border-emerald-600 bg-emerald-50 dark:bg-emerald-900/10 text-emerald-700 dark:text-emerald-300 font-semibold shadow-sm shadow-emerald-500/10';
const UNSELECTED_CHIP = 'border-slate-200 dark:border-dark-border text-slate-600 dark:text-slate-300 bg-white dark:bg-dark-card hover:border-emerald-300 dark:hover:border-emerald-700 hover:shadow-sm';

function deriveCategory(coreCategory: string, productItem: string): TicketCategory {
  const p = productItem.toLowerCase();
  if (coreCategory === 'hardware') {
    if (p.includes('printer')) return 'printer';
    if (p.includes('server')) return 'server';
    if (p.includes('cctv') || p.includes('dvr') || p.includes('nvr') || p.includes('camera')) return 'cctv';
    return 'computer_repair';
  }
  if (coreCategory === 'software') {
    if (p.includes('microsoft') || p.includes('365')) return 'microsoft365';
    if (p.includes('website')) return 'website';
    return 'software';
  }
  if (coreCategory === 'network') {
    if (p.includes('vpn')) return 'remote';
    if (p.includes('isp') || p.includes('internet')) return 'internet';
    return 'networking';
  }
  if (coreCategory === 'security') return 'cctv';
  if (coreCategory === 'user_access') return 'remote';
  return 'software';
}

function CheckDot({ on }: { on: boolean }) {
  return (
    <span className={`w-5 h-5 rounded-full flex items-center justify-center transition-all duration-200 ml-auto flex-shrink-0 ${on ? 'bg-emerald-500 shadow-sm shadow-emerald-500/30 scale-100' : 'bg-slate-100 dark:bg-slate-800 scale-90'}`}>
      <Check className={`w-3 h-3 text-white transition-opacity ${on ? 'opacity-100' : 'opacity-0'}`} />
    </span>
  );
}

function StepHeader({ step, total, title, sub }: { step: number; total: number; title: string; sub: string }) {
  return (
    <div className="mb-5">
      <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-600 dark:text-emerald-400">Step {step} of {total}</span>
      <h3 className="font-heading font-bold text-slate-900 dark:text-white text-base mt-1">{title}</h3>
      <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">{sub}</p>
    </div>
  );
}

export default function TicketWizard({ open, onClose }: Props) {
  const navigate = useNavigate();

  const [segment, setSegment] = useState<'personal' | 'business' | ''>('');
  const [industry, setIndustry] = useState('');
  const [coreCategory, setCoreCategory] = useState('');
  const [product, setProduct] = useState('');
  const [customProduct, setCustomProduct] = useState('');
  const [trigger, setTrigger] = useState('');
  const [customTrigger, setCustomTrigger] = useState('');
  const [priority, setPriority] = useState<TicketPriority | ''>('');
  const [step, setStep] = useState(1);

  const totalSteps = segment === 'personal' ? 5 : 6;

  const stepLabels = segment === 'personal'
    ? ['Client Type', 'Category', 'Product', 'Issue', 'Priority']
    : ['Client Type', 'Industry', 'Category', 'Product', 'Issue', 'Priority'];

  function reset() {
    setSegment('');
    setIndustry('');
    setCoreCategory('');
    setProduct('');
    setCustomProduct('');
    setTrigger('');
    setCustomTrigger('');
    setPriority('');
    setStep(1);
  }

  function handleClose() {
    reset();
    onClose();
  }

  function getActualStep() {
    if (segment === 'personal' && step >= 2) return step + 1;
    return step;
  }

  function canProceed() {
    const s = getActualStep();
    if (s === 1) return segment !== '';
    if (s === 2) return industry !== '';
    if (s === 3) return coreCategory !== '';
    if (s === 4) return product !== '' || customProduct.trim() !== '';
    if (s === 5) return trigger !== '' || customTrigger.trim() !== '';
    if (s === 6) return priority !== '';
    return false;
  }

  function next() {
    if (!canProceed()) return;
    if (step === 1 && segment === 'personal') {
      setStep(2);
      return;
    }
    if (step < totalSteps) setStep(s => s + 1);
  }

  function back() {
    if (step === 1) { handleClose(); return; }
    setStep(s => s - 1);
  }

  function handleSubmit() {
    if (!priority || !coreCategory) return;
    const finalProduct = product === 'Other Hardware' || product === 'Other Software' || product === 'Other Network Device' || product === 'Other Security Device' || product === 'Other Access Issue' || product === 'Other'
      ? customProduct.trim() || product
      : product;
    const finalTrigger = trigger === 'Other' ? customTrigger.trim() || trigger : trigger;

    const wizardData: WizardData = {
      clientSegment: segment as 'personal' | 'business',
      industryType: segment === 'personal' ? 'N/A' : industry,
      coreCategory,
      productItem: finalProduct,
      issueTrigger: finalTrigger,
      priority: priority as TicketPriority,
      suggestedCategory: deriveCategory(coreCategory, finalProduct),
    };

    reset();
    onClose();
    navigate('/tickets/new', { state: { wizard: wizardData } });
  }

  if (!open) return null;

  const actualStep = getActualStep();
  const displayStep = step;
  const isLastStep = step === totalSteps;
  const otherProduct = product.toLowerCase().includes('other');
  const otherTrigger = trigger === 'Other';

  return (
    <>
      <style>{`
        @keyframes wizardModalIn { from { opacity: 0; transform: translateY(12px) scale(0.98); } to { opacity: 1; transform: translateY(0) scale(1); } }
        @keyframes wizardStepIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>

      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-slate-900/70 backdrop-blur-sm" onClick={handleClose} />

        <div className="relative w-full max-w-2xl bg-white dark:bg-dark-card rounded-2xl shadow-2xl border border-slate-200 dark:border-dark-border flex flex-col max-h-[90vh] overflow-hidden" style={{ animation: 'wizardModalIn 0.25s ease' }}>

          {/* Header */}
          <div className="relative flex items-center justify-between px-6 py-4 sm:px-7 sm:py-5 border-b border-slate-100 dark:border-dark-border flex-shrink-0 overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-emerald-400 via-teal-400 to-cyan-400" aria-hidden />
            <div className="flex items-center gap-3.5">
              <div className="chip-icon bg-gradient-to-br from-emerald-500 to-teal-600 shadow-lg">
                <LifeBuoy className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="font-heading text-lg font-bold text-slate-900 dark:text-white">Get IT Help</h2>
                  <span className="inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400">
                    <Sparkles className="w-2.5 h-2.5" /> AI-guided
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Answer a few quick questions to route your request</p>
              </div>
            </div>
            <button onClick={handleClose} className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors flex-shrink-0">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Progress */}
          <div className="px-6 sm:px-7 pt-5 pb-1 flex-shrink-0">
            <div className="flex items-center gap-2">
              {stepLabels.map((label, i) => {
                const idx = i + 1;
                const done = idx < displayStep;
                const active = idx === displayStep;
                return (
                  <div key={idx} className="flex items-center gap-2 flex-1 min-w-0">
                    <div className="flex flex-col items-center gap-1.5 flex-shrink-0">
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-200
                        ${done ? 'bg-emerald-500 text-white' : active ? 'bg-white dark:bg-dark-card border-2 border-emerald-500 text-emerald-600 dark:text-emerald-400 ring-2 ring-emerald-400/20' : 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500'}`}>
                        {done ? <Check className="w-3.5 h-3.5" /> : idx}
                      </div>
                      <span className={`text-[10px] font-semibold whitespace-nowrap transition-colors ${active ? 'text-emerald-600 dark:text-emerald-400' : done ? 'text-emerald-500' : 'text-slate-400 dark:text-slate-500'}`}>
                        {label}
                      </span>
                    </div>
                    {i < stepLabels.length - 1 && (
                      <div className={`self-start mt-3.5 h-0.5 flex-1 rounded-full transition-all duration-300 ${done ? 'bg-emerald-400' : 'bg-slate-100 dark:bg-slate-800'}`} />
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Body */}
          <div key={actualStep} className="flex-1 overflow-y-auto px-6 sm:px-7 py-5" style={{ animation: 'wizardStepIn 0.25s ease' }}>

            {/* Step 1 — Client Segment */}
            {actualStep === 1 && (
              <div className="space-y-4">
                <StepHeader step={1} total={totalSteps} title="Who is this ticket for?" sub="This helps us route to the right support team." />
                <div className="grid grid-cols-2 gap-4">
                  {[
                    { value: 'personal', label: 'Personal', sub: 'Individual · Home devices', icon: User, grad: 'from-blue-500 to-sky-600' },
                    { value: 'business', label: 'Business', sub: 'Company · Organisation', icon: Building2, grad: 'from-violet-500 to-purple-600' },
                  ].map(opt => {
                    const Icon = opt.icon;
                    const sel = segment === opt.value;
                    return (
                      <button key={opt.value} onClick={() => setSegment(opt.value as 'personal' | 'business')}
                        className={`relative flex flex-col items-center gap-3 p-6 rounded-2xl border-2 transition-all text-center card-premium group ${sel ? SELECTED_CARD : UNSELECTED_CARD}`}>
                        <div className={`chip-icon bg-gradient-to-br ${opt.grad} shadow-lg group-hover:scale-105 transition-transform duration-300`}>
                          <Icon className="w-6 h-6" />
                        </div>
                        <div>
                          <p className="font-bold text-slate-900 dark:text-white">{opt.label}</p>
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{opt.sub}</p>
                        </div>
                        <span className={`absolute top-3 right-3 w-5 h-5 rounded-full flex items-center justify-center transition-all duration-200 ${sel ? 'bg-emerald-500 scale-100' : 'bg-slate-100 dark:bg-slate-800 scale-90'}`}>
                          <Check className={`w-3 h-3 text-white transition-opacity ${sel ? 'opacity-100' : 'opacity-0'}`} />
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Step 2 — Industry (Business only) */}
            {actualStep === 2 && (
              <div className="space-y-4">
                <StepHeader step={2} total={totalSteps} title="What is your industry?" sub="We'll assign the right specialist for your sector." />
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {INDUSTRIES.map(ind => {
                    const Icon = ind.icon;
                    const sel = industry === ind.value;
                    return (
                      <button key={ind.value} onClick={() => setIndustry(ind.value)}
                        className={`relative flex flex-col items-center gap-2.5 p-4 rounded-2xl border-2 transition-all group ${sel ? SELECTED_CARD : UNSELECTED_CARD}`}>
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${ind.color} group-hover:scale-105 transition-transform duration-300`}>
                          <Icon className="w-5 h-5" />
                        </div>
                        <span className={`text-xs font-semibold leading-tight text-center ${sel ? 'text-emerald-700 dark:text-emerald-300' : 'text-slate-600 dark:text-slate-300'}`}>{ind.label}</span>
                        <span className={`absolute top-2.5 right-2.5 w-4 h-4 rounded-full flex items-center justify-center transition-all duration-200 ${sel ? 'bg-emerald-500 scale-100' : 'bg-slate-100 dark:bg-slate-800 scale-90'}`}>
                          <Check className={`w-2.5 h-2.5 text-white transition-opacity ${sel ? 'opacity-100' : 'opacity-0'}`} />
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Step 3 — Core Category */}
            {actualStep === 3 && (
              <div className="space-y-4">
                <StepHeader step={3} total={totalSteps} title="What type of issue is this?" sub="Select the area that best matches your problem." />
                <div className="grid grid-cols-1 gap-3">
                  {CORE_CATEGORIES.map(cat => {
                    const Icon = cat.icon;
                    const sel = coreCategory === cat.value;
                    return (
                      <button key={cat.value} onClick={() => { setCoreCategory(cat.value); setProduct(''); setTrigger(''); }}
                        className={`group flex items-center gap-4 p-4 rounded-2xl border-2 transition-all text-left card-premium ${sel ? SELECTED_CARD : UNSELECTED_CARD}`}>
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${cat.color} group-hover:scale-105 transition-transform duration-300`}>
                          <Icon className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="font-bold text-slate-900 dark:text-white text-sm">{cat.label}</p>
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{cat.desc}</p>
                        </div>
                        <CheckDot on={sel} />
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Step 4 — Product / Item */}
            {actualStep === 4 && coreCategory && (
              <div className="space-y-4">
                <StepHeader step={4} total={totalSteps} title="Which product or item is affected?" sub="Select the specific device or software involved." />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {PRODUCTS[coreCategory]?.map(p => {
                    const sel = product === p;
                    return (
                      <button key={p} onClick={() => setProduct(p)}
                        className={`group flex items-center gap-3 px-4 py-3 rounded-xl border-2 text-left text-sm transition-all ${sel ? SELECTED_CHIP : UNSELECTED_CHIP}`}>
                        <span className={`w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 transition-all ${sel ? 'bg-emerald-500' : 'bg-slate-100 dark:bg-slate-800 group-hover:border group-hover:border-emerald-300'}`}>
                          <Check className={`w-2.5 h-2.5 text-white transition-opacity ${sel ? 'opacity-100' : 'opacity-0'}`} />
                        </span>
                        {p}
                      </button>
                    );
                  })}
                </div>
                {otherProduct && (
                  <input
                    type="text"
                    placeholder="Please describe the product or device…"
                    value={customProduct}
                    onChange={e => setCustomProduct(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border-2 border-emerald-300 dark:border-emerald-700 bg-white dark:bg-dark-card text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-400 text-sm"
                  />
                )}
              </div>
            )}

            {/* Step 5 — Issue Trigger */}
            {actualStep === 5 && coreCategory && (
              <div className="space-y-4">
                <StepHeader step={5} total={totalSteps} title="What is the symptom or error?" sub="Select what's happening or describe it briefly." />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {TRIGGERS[coreCategory]?.map(t => {
                    const sel = trigger === t;
                    return (
                      <button key={t} onClick={() => setTrigger(t)}
                        className={`group flex items-center gap-3 px-4 py-3 rounded-xl border-2 text-left text-sm transition-all ${sel ? SELECTED_CHIP : UNSELECTED_CHIP}`}>
                        <span className={`w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 transition-all ${sel ? 'bg-emerald-500' : 'bg-slate-100 dark:bg-slate-800 group-hover:border group-hover:border-emerald-300'}`}>
                          <Check className={`w-2.5 h-2.5 text-white transition-opacity ${sel ? 'opacity-100' : 'opacity-0'}`} />
                        </span>
                        {t}
                      </button>
                    );
                  })}
                </div>
                {otherTrigger && (
                  <textarea
                    rows={2}
                    placeholder="Describe the symptom or error message…"
                    value={customTrigger}
                    onChange={e => setCustomTrigger(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border-2 border-emerald-300 dark:border-emerald-700 bg-white dark:bg-dark-card text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-400 text-sm resize-none"
                  />
                )}
              </div>
            )}

            {/* Step 6 — Priority */}
            {actualStep === 6 && (
              <div className="space-y-4">
                <StepHeader step={6} total={totalSteps} title="How urgent is this issue?" sub="This sets the SLA response time for your ticket." />
                <div className="grid grid-cols-1 gap-3">
                  {PRIORITIES.map(p => {
                    const Icon = p.icon;
                    const sel = priority === p.value;
                    return (
                      <button key={p.value} onClick={() => setPriority(p.value)}
                        className={`group flex items-center gap-4 p-4 rounded-2xl border-2 transition-all text-left card-premium ${sel ? SELECTED_CARD : UNSELECTED_CARD}`}>
                        <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${p.dot} ${sel ? 'ring-4 ring-opacity-20 ' + p.dot.replace('bg-', 'ring-') : ''}`} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Icon className="w-4 h-4 text-slate-400 dark:text-slate-500" />
                            <span className="font-bold text-sm text-slate-900 dark:text-white">{p.label}</span>
                            <span className={`ml-auto text-xs font-semibold px-2 py-0.5 rounded-full ${p.chip}`}>{p.sla}</span>
                          </div>
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{p.desc}</p>
                        </div>
                        <CheckDot on={sel} />
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 dark:border-dark-border bg-slate-50/50 dark:bg-slate-900/30 flex-shrink-0">
            <button onClick={back}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-dark-border text-sm font-semibold text-slate-600 dark:text-slate-400 hover:bg-white dark:hover:bg-dark-card hover:text-slate-900 dark:hover:text-white transition-colors">
              <ChevronLeft className="w-4 h-4" />
              {step === 1 ? 'Cancel' : 'Back'}
            </button>

            <span className="text-xs font-medium text-slate-400 hidden sm:block">Step {displayStep} of {totalSteps}</span>

            {isLastStep ? (
              <button onClick={handleSubmit} disabled={!canProceed()}
                className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold transition-colors shadow-sm shadow-emerald-500/25">
                Open Ticket Form
                <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button onClick={next} disabled={!canProceed()}
                className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold transition-colors shadow-sm shadow-emerald-500/25">
                Continue
                <ChevronRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

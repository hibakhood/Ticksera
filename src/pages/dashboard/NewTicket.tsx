import { useState, useRef } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useStore } from '../../store';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import { TextArea, Select } from '../../components/ui/Input';
import { Send, Lightbulb, ArrowLeft, Info, ImagePlus, X, Building2, User, Tag, Cpu, AlertTriangle, CheckCircle2 } from 'lucide-react';
import type { TicketCategory, TicketPriority } from '../../types';
import type { WizardData } from '../../components/ui/TicketWizard';
import { buildTicketTitle } from '../../utils/ticketTitle';

const categories: { value: TicketCategory; label: string }[] = [
  { value: 'computer_repair', label: 'Computer Repair' },
  { value: 'networking', label: 'Networking' },
  { value: 'printer', label: 'Printer Support' },
  { value: 'cctv', label: 'CCTV' },
  { value: 'internet', label: 'Internet Troubleshooting' },
  { value: 'microsoft365', label: 'Microsoft 365' },
  { value: 'server', label: 'Server Support' },
  { value: 'website', label: 'Website Support' },
  { value: 'software', label: 'Software Installation' },
  { value: 'remote', label: 'Remote Assistance' },
];

const priorityInfo: Record<TicketPriority, { label: string; slaHours: number; color: string; desc: string }> = {
  low: { label: '🟢 Low', slaHours: 5, color: 'text-gray-500', desc: '5-hour SLA' },
  medium: { label: '🟡 Medium', slaHours: 3, color: 'text-amber-500', desc: '3-hour SLA' },
  high: { label: '🟠 High', slaHours: 1, color: 'text-orange-500', desc: '60-minute SLA' },
  critical: { label: '🔴 Critical', slaHours: 0.25, color: 'text-red-500', desc: '15-minute SLA' },
};

const industryLabels: Record<string, string> = {
  hotel: 'Hotel & Hospitality',
  school: 'School & University',
  hospital: 'Hospital & Clinic',
  logistics: 'Logistics',
  manufacturing: 'Manufacturing',
  real_estate: 'Real Estate',
  finance: 'Finance & Banking',
  sme: 'SME / Retail',
  'N/A': 'N/A',
};

const coreCategoryLabels: Record<string, string> = {
  hardware: 'Hardware',
  software: 'Software',
  network: 'Network',
  security: 'Security',
  user_access: 'User Access',
};

export default function NewTicket() {
  const { currentUser, addTicket, kbArticles, addNotification } = useStore();
  const navigate = useNavigate();
  const location = useLocation();
  const wizard = (location.state as { wizard?: WizardData })?.wizard;

  const [form, setForm] = useState({
    title: wizard ? buildTicketTitle(wizard.productItem, wizard.issueTrigger) : '',
    description: '',
    category: (wizard?.suggestedCategory ?? 'computer_repair') as TicketCategory,
    priority: (wizard?.priority ?? 'medium') as TicketPriority,
  });
  const [images, setImages] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    files.forEach(file => {
      if (!file.type.startsWith('image/')) return;
      const reader = new FileReader();
      reader.onload = ev => {
        if (ev.target?.result) {
          setImages(prev => [...prev, ev.target!.result as string]);
        }
      };
      reader.readAsDataURL(file);
    });
    e.target.value = '';
  };

  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  const suggestions = form.title.length > 3
    ? kbArticles.filter(a =>
      a.isPublished &&
      (a.title.toLowerCase().includes(form.title.toLowerCase()) ||
        a.tags.some(t => form.title.toLowerCase().includes(t)))
    )
    : [];

  const selectedPriority = priorityInfo[form.priority];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title || !form.description || !currentUser) return;

    const slaDeadline = new Date(
      Date.now() + selectedPriority.slaHours * 3600000
    ).toISOString();

    const id = addTicket({
      ...form,
      status: 'open',
      screenshotUrls: images,
      createdBy: currentUser.id,
      createdByName: currentUser.name,
      slaDeadline,
      ...(wizard ? {
        clientSegment: wizard.clientSegment,
        industryType: wizard.industryType,
        coreCategory: wizard.coreCategory,
        productItem: wizard.productItem,
        issueTrigger: wizard.issueTrigger,
      } : {}),
    });

    addNotification({
      userEmail: 'admin@fixora.com',
      title: 'New ticket submitted',
      message: `${currentUser.name} submitted: ${form.title}`,
      type: 'ticket',
      link: `/tickets/${id}`,
    });

    navigate(`/tickets/${id}`);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate(-1)}
          className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="font-heading text-2xl font-bold text-gray-900 dark:text-white">Get IT Help</h1>
          <p className="text-sm text-gray-500 mt-0.5">Describe your issue and our AI assistant will help diagnose it</p>
        </div>
      </div>

      {/* Wizard Context Summary */}
      {wizard && (
        <Card className="p-4 border border-primary-200 dark:border-primary-800 bg-primary-50/40 dark:bg-primary-900/10">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary-100 dark:bg-primary-900/40 flex items-center justify-center flex-shrink-0">
              <CheckCircle2 className="w-4 h-4 text-primary-600 dark:text-primary-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-900 dark:text-white mb-2">Ticket Context (from Routing Wizard)</p>
              <div className="flex flex-wrap gap-2">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white dark:bg-dark-card border border-gray-200 dark:border-dark-border text-xs font-medium text-gray-700 dark:text-gray-300">
                  {wizard.clientSegment === 'business' ? <Building2 className="w-3 h-3 text-violet-500" /> : <User className="w-3 h-3 text-blue-500" />}
                  {wizard.clientSegment === 'business' ? 'Business' : 'Personal'}
                </span>
                {wizard.industryType && wizard.industryType !== 'N/A' && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white dark:bg-dark-card border border-gray-200 dark:border-dark-border text-xs font-medium text-gray-700 dark:text-gray-300">
                    <Building2 className="w-3 h-3 text-amber-500" />
                    {industryLabels[wizard.industryType] ?? wizard.industryType}
                  </span>
                )}
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white dark:bg-dark-card border border-gray-200 dark:border-dark-border text-xs font-medium text-gray-700 dark:text-gray-300">
                  <Tag className="w-3 h-3 text-cyan-500" />
                  {coreCategoryLabels[wizard.coreCategory] ?? wizard.coreCategory}
                </span>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white dark:bg-dark-card border border-gray-200 dark:border-dark-border text-xs font-medium text-gray-700 dark:text-gray-300">
                  <Cpu className="w-3 h-3 text-indigo-500" />
                  {wizard.productItem}
                </span>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white dark:bg-dark-card border border-gray-200 dark:border-dark-border text-xs font-medium text-gray-700 dark:text-gray-300">
                  <AlertTriangle className="w-3 h-3 text-orange-500" />
                  {wizard.issueTrigger}
                </span>
              </div>
            </div>
          </div>
        </Card>
      )}

      {suggestions.length > 0 && (
        <Card className="p-4 border-l-4 border-l-accent-400 bg-accent-50/30 dark:bg-accent-900/10">
          <div className="flex items-start gap-3">
            <Lightbulb className="w-5 h-5 text-accent-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-gray-900 dark:text-white mb-2">
                Found related articles — you might not need to submit a ticket:
              </p>
              <ul className="space-y-1">
                {suggestions.slice(0, 3).map(a => (
                  <li key={a.id}>
                    <Link
                      to="/knowledge-base"
                      className="text-sm text-accent-600 dark:text-accent-400 hover:underline"
                    >
                      → {a.title}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </Card>
      )}

      <Card className="p-6 sm:p-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          <Input
            label="Issue Title"
            placeholder="Brief description of the problem"
            value={form.title}
            onChange={e => setForm({ ...form, title: e.target.value })}
            required
          />

          <TextArea
            label="Description"
            placeholder="Provide details about the issue: what happened, steps to reproduce, any error messages, etc."
            rows={5}
            value={form.description}
            onChange={e => setForm({ ...form, description: e.target.value })}
            required
          />

          <div className="grid sm:grid-cols-2 gap-5">
            <Select
              label="Category"
              value={form.category}
              onChange={e => setForm({ ...form, category: e.target.value as TicketCategory })}
              options={categories}
            />
            <div className="space-y-1">
              <Select
                label="Priority"
                value={form.priority}
                onChange={e => setForm({ ...form, priority: e.target.value as TicketPriority })}
                options={Object.entries(priorityInfo).map(([value, info]) => ({
                  value,
                  label: info.label,
                }))}
              />
              <p className={`text-xs flex items-center gap-1 ${selectedPriority.color}`}>
                <Info className="w-3 h-3" /> {selectedPriority.desc}
              </p>
            </div>
          </div>

          <div className="space-y-3">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Attachments <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={handleImageUpload}
            />
            {images.length > 0 && (
              <div className="flex flex-wrap gap-3">
                {images.map((src, i) => (
                  <div key={i} className="relative group w-24 h-24 rounded-xl overflow-hidden border border-gray-200 dark:border-dark-border shadow-sm">
                    <img src={src} alt={`attachment-${i}`} className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => removeImage(i)}
                      className="absolute top-1 right-1 w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-24 h-24 rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-600 flex flex-col items-center justify-center gap-1 text-gray-400 hover:border-primary-400 hover:text-primary-500 dark:hover:border-primary-500 transition-colors"
                >
                  <ImagePlus className="w-5 h-5" />
                  <span className="text-xs">Add more</span>
                </button>
              </div>
            )}
            {images.length === 0 && (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border-2 border-dashed border-gray-200 dark:border-gray-700 hover:border-primary-400 dark:hover:border-primary-500 hover:bg-primary-50/30 dark:hover:bg-primary-900/10 text-gray-400 hover:text-primary-500 transition-all"
              >
                <ImagePlus className="w-5 h-5 flex-shrink-0" />
                <div className="text-left">
                  <p className="text-sm font-medium">Upload screenshots</p>
                  <p className="text-xs">Attach images to help describe the issue (PNG, JPG, GIF)</p>
                </div>
              </button>
            )}
          </div>

          <div className="flex flex-col sm:flex-row gap-3 pt-2 border-t border-gray-100 dark:border-gray-800">
            <Button type="submit" size="lg" disabled={!form.title.trim() || !form.description.trim()}>
              <Send className="w-4 h-4" /> Submit Ticket
            </Button>
            <Button type="button" variant="ghost" size="lg" onClick={() => navigate(-1)}>
              Cancel
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}

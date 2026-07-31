import { useState } from 'react';
import ShaderBackground from '../components/ui/ShaderBackground';
import { Monitor, Wifi, Printer, Camera, Globe, Server, Code, Headphones, Shield, KeyRound, Hotel, GraduationCap, HeartPulse, Truck, Factory, Home, Landmark, Store, CheckCircle, ChevronRight, User, Building2, Smartphone, Mail, Cloud, Rocket, ShieldCheck, Network, LayoutGrid } from 'lucide-react';
import { Link } from 'react-router-dom';
import Button from '../components/ui/Button';

type Segment = 'all' | 'personal' | 'business';
type CoreCat = 'all' | 'hardware' | 'software' | 'network' | 'security' | 'user_access';

interface ServiceDef {
  icon: React.ElementType;
  title: string;
  coreCategory: Exclude<CoreCat, 'all'>;
  segment: 'personal' | 'business' | 'both';
  industries: string[];
  desc: string;
  products: string[];
  triggers: string[];
  color: string;
}

const ALL_SERVICES: ServiceDef[] = [
  {
    icon: Monitor,
    title: 'Computer Repair',
    coreCategory: 'hardware',
    segment: 'both',
    industries: ['hotel','school','hospital','logistics','manufacturing','real_estate','finance','sme'],
    desc: 'Full hardware diagnostics, OS recovery, data backup, and performance optimization for all desktop and laptop brands.',
    products: ['Desktop PC', 'Laptop', 'MacBook', 'Workstation', 'iMac / Mac Mini'],
    triggers: ["Won't turn on", 'Running very slowly', 'Screen / display issues', 'Overheating', 'Physical damage'],
    color: 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border-blue-100 dark:border-blue-800',
  },
  {
    icon: Printer,
    title: 'Printer Support',
    coreCategory: 'hardware',
    segment: 'both',
    industries: ['hotel','school','hospital','logistics','manufacturing','real_estate','finance','sme'],
    desc: 'Installation, driver configuration, network printing setup, and full maintenance for all printer brands.',
    products: ['HP LaserJet', 'Canon IR Series', 'Epson', 'Brother', 'Xerox'],
    triggers: ['Paper jam', 'Driver / install issues', 'Network printing error', 'Print quality poor', 'Offline / not detected'],
    color: 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border-blue-100 dark:border-blue-800',
  },
  {
    icon: Server,
    title: 'Server Support',
    coreCategory: 'hardware',
    segment: 'business',
    industries: ['hotel','school','hospital','logistics','manufacturing','real_estate','finance','sme'],
    desc: 'Server setup, maintenance, monitoring, backup solutions, and disaster recovery for all server environments.',
    products: ['Windows Server', 'Linux Server', 'NAS / SAN', 'Rack / Blade Server', 'Hyper-V / VMware'],
    triggers: ['Server crash / down', 'Slow performance', 'Storage full', 'RAID failure', 'Boot failure'],
    color: 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border-blue-100 dark:border-blue-800',
  },
  {
    icon: Code,
    title: 'Microsoft 365',
    coreCategory: 'software',
    segment: 'both',
    industries: ['hotel','school','hospital','logistics','manufacturing','real_estate','finance','sme'],
    desc: 'Deployment, migration, admin management, Teams setup, and license management for the full Microsoft 365 suite.',
    products: ['Outlook', 'Microsoft Teams', 'Word / Excel / PowerPoint', 'SharePoint', 'OneDrive'],
    triggers: ['Email not working', 'Teams call dropping', 'License activation error', 'Login / MFA issue', 'Missing emails'],
    color: 'bg-violet-50 dark:bg-violet-900/20 text-violet-600 dark:text-violet-400 border-violet-100 dark:border-violet-800',
  },
  {
    icon: Code,
    title: 'Software Support',
    coreCategory: 'software',
    segment: 'both',
    industries: ['hotel','school','hospital','logistics','manufacturing','real_estate','finance','sme'],
    desc: 'Installation, configuration, licensing, and troubleshooting for all business and personal software applications.',
    products: ['Accounting Software', 'ERP / CRM Systems', 'AutoCAD / Adobe', 'Antivirus / EDR', 'Custom In-House Apps'],
    triggers: ['Application crashes', 'Installation fails', 'License activation', 'Missing features / data', 'Slow performance'],
    color: 'bg-violet-50 dark:bg-violet-900/20 text-violet-600 dark:text-violet-400 border-violet-100 dark:border-violet-800',
  },
  {
    icon: Globe,
    title: 'Website Support',
    coreCategory: 'software',
    segment: 'business',
    industries: ['hotel','school','hospital','logistics','manufacturing','real_estate','finance','sme'],
    desc: 'Website performance, security patches, SSL certificate setup, and hosting management for all platforms.',
    products: ['WordPress', 'Shopify', 'Wix / Squarespace', 'Custom Web Apps', 'cPanel / Plesk'],
    triggers: ['Site down / unreachable', 'Slow loading', 'SSL expired / error', 'Hosting issues', 'Malware / hack'],
    color: 'bg-violet-50 dark:bg-violet-900/20 text-violet-600 dark:text-violet-400 border-violet-100 dark:border-violet-800',
  },
  {
    icon: Wifi,
    title: 'Networking & WiFi',
    coreCategory: 'network',
    segment: 'both',
    industries: ['hotel','school','hospital','logistics','manufacturing','real_estate','finance','sme'],
    desc: 'WiFi setup, LAN/WAN configuration, network security, bandwidth optimization, and full infrastructure troubleshooting.',
    products: ['Cisco Router / Switch', 'TP-Link / Ubiquiti', 'MikroTik', 'Netgear', 'D-Link Access Point'],
    triggers: ['No internet connection', 'WiFi drops frequently', 'Slow network speed', 'Device cannot connect', 'Cannot access shared drives'],
    color: 'bg-cyan-50 dark:bg-cyan-900/20 text-cyan-600 dark:text-cyan-400 border-cyan-100 dark:border-cyan-800',
  },
  {
    icon: Globe,
    title: 'Internet & ISP',
    coreCategory: 'network',
    segment: 'both',
    industries: ['hotel','school','hospital','logistics','manufacturing','real_estate','finance','sme'],
    desc: 'Connectivity diagnostics, ISP coordination, DNS/firewall configuration, and link speed optimization.',
    products: ['VDSL / ADSL Modem', 'Fiber Router', '4G / LTE Router', 'Satellite Internet', 'Leased Line'],
    triggers: ['No internet', 'Speed below plan', 'Intermittent connection', 'DNS resolution fails', 'High latency / packet loss'],
    color: 'bg-cyan-50 dark:bg-cyan-900/20 text-cyan-600 dark:text-cyan-400 border-cyan-100 dark:border-cyan-800',
  },
  {
    icon: Shield,
    title: 'VPN & Remote Access',
    coreCategory: 'network',
    segment: 'business',
    industries: ['finance','hospital','logistics','manufacturing','real_estate'],
    desc: 'Secure VPN deployment, configuration, and troubleshooting for remote teams and branch offices.',
    products: ['Cisco AnyConnect', 'FortiGate VPN', 'OpenVPN', 'WireGuard', 'Palo Alto GlobalProtect'],
    triggers: ['VPN not connecting', 'Slow VPN tunnel', 'Authentication failure', 'Split tunnelling issue', 'Certificate expired'],
    color: 'bg-cyan-50 dark:bg-cyan-900/20 text-cyan-600 dark:text-cyan-400 border-cyan-100 dark:border-cyan-800',
  },
  {
    icon: Camera,
    title: 'CCTV & Surveillance',
    coreCategory: 'security',
    segment: 'business',
    industries: ['hotel','school','hospital','logistics','manufacturing','real_estate','finance','sme'],
    desc: 'Camera installation, DVR/NVR setup, remote monitoring configuration, and full system maintenance.',
    products: ['Hikvision IP Camera', 'Dahua DVR / NVR', 'Axis Camera', 'CP Plus', 'Hanwha'],
    triggers: ['No camera feed', 'Device offline', 'Recording not working', 'Night vision issue', 'Remote access not connecting'],
    color: 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border-red-100 dark:border-red-800',
  },
  {
    icon: Shield,
    title: 'Access Control',
    coreCategory: 'security',
    segment: 'business',
    industries: ['hotel','hospital','finance','manufacturing','real_estate'],
    desc: 'Biometric scanners, RFID badge readers, smart locks, and access control system installation and management.',
    products: ['HID Card Reader', 'Suprema Biometric', 'ZKTeco', 'Paxton Access', 'Smart Lock Systems'],
    triggers: ['Door / gate won\'t open', 'Access denied', 'Card not reading', 'System error / alarm', 'New employee access'],
    color: 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border-red-100 dark:border-red-800',
  },
  {
    icon: Headphones,
    title: 'Remote Assistance',
    coreCategory: 'user_access',
    segment: 'both',
    industries: ['hotel','school','hospital','logistics','manufacturing','real_estate','finance','sme'],
    desc: 'Real-time remote desktop support, guided troubleshooting, and screen sharing for quick problem resolution.',
    products: ['TeamViewer', 'AnyDesk', 'Microsoft Remote Desktop', 'Chrome Remote Desktop', 'Zoho Assist'],
    triggers: ['Need live guidance', 'Software issue remotely', 'Configuration help', 'Training / onboarding', 'Quick fix needed'],
    color: 'bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 border-amber-100 dark:border-amber-800',
  },
  {
    icon: KeyRound,
    title: 'User Account Management',
    coreCategory: 'user_access',
    segment: 'business',
    industries: ['hotel','school','hospital','logistics','manufacturing','real_estate','finance','sme'],
    desc: 'Active Directory, Azure AD, and Google Workspace user provisioning, password resets, and permission management.',
    products: ['Microsoft Active Directory', 'Azure AD / Entra', 'Google Workspace Admin', 'Okta / SSO', 'Office 365 Admin'],
    triggers: ['Cannot log in', 'Password forgotten / expired', 'Account locked', 'MFA / 2FA issue', 'Missing permissions'],
    color: 'bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 border-amber-100 dark:border-amber-800',
  },
  {
    icon: Smartphone,
    title: 'Phone & Mobile Device Support',
    coreCategory: 'hardware',
    segment: 'both',
    industries: ['hotel','school','hospital','logistics','manufacturing','real_estate','finance','sme'],
    desc: 'Repair, setup, and troubleshooting for smartphones, tablets, and wearables — including screen fixes, battery service, and data transfer.',
    products: ['iPhone', 'Samsung Galaxy', 'iPad / Tablet', 'Android Phone', 'Wearables / Other Devices'],
    triggers: ["Won't turn on", 'Battery draining fast', 'Cracked / broken screen', 'App keeps crashing', "Can't make calls or texts"],
    color: 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border-blue-100 dark:border-blue-800',
  },
  {
    icon: Mail,
    title: 'Google Workspace',
    coreCategory: 'software',
    segment: 'both',
    industries: ['hotel','school','hospital','logistics','manufacturing','real_estate','finance','sme'],
    desc: 'Gmail, Drive, Meet, and admin setup — plus migration, sharing configuration, and troubleshooting for the full Google Workspace suite.',
    products: ['Gmail', 'Google Drive', 'Google Meet', 'Google Calendar', 'Google Workspace Admin'],
    triggers: ['Email not working', "Can't access Drive files", 'Meeting / Meet issues', 'Calendar sync fails', 'Account recovery needed'],
    color: 'bg-violet-50 dark:bg-violet-900/20 text-violet-600 dark:text-violet-400 border-violet-100 dark:border-violet-800',
  },
  {
    icon: ShieldCheck,
    title: 'Virus & Malware Removal',
    coreCategory: 'security',
    segment: 'both',
    industries: ['hotel','school','hospital','logistics','manufacturing','real_estate','finance','sme'],
    desc: 'Detection and removal of viruses, ransomware, spyware, and adware — plus hardening your device so it stays clean.',
    products: ['Windows Defender', 'Bitdefender', 'Kaspersky', 'Malwarebytes', 'EDR / Endpoint Protection'],
    triggers: ['Pop-ups / adware', 'Files encrypted (ransomware)', 'PC running very slow', 'Suspicious programs', 'Phishing / spam emails'],
    color: 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border-red-100 dark:border-red-800',
  },
  {
    icon: Cloud,
    title: 'Data Backup & Recovery',
    coreCategory: 'security',
    segment: 'both',
    industries: ['hotel','school','hospital','logistics','manufacturing','real_estate','finance','sme'],
    desc: 'Automated backup setup, accidental file recovery, and disaster recovery planning — cloud, local, and NAS-based.',
    products: ['OneDrive', 'Google Drive', 'Synology / NAS', 'External Hard Drive', 'Veeam / Backup Software'],
    triggers: ['Files deleted by accident', 'Hard drive failed', 'Ransomware recovery', 'Need to restore a previous version', "Can't access my backups"],
    color: 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border-red-100 dark:border-red-800',
  },
  {
    icon: Rocket,
    title: 'Device Setup & Onboarding',
    coreCategory: 'user_access',
    segment: 'both',
    industries: ['hotel','school','hospital','logistics','manufacturing','real_estate','finance','sme'],
    desc: 'New device setup, data migration, app installation, and email configuration — including full onboarding for new hires.',
    products: ['New laptop setup', 'New phone / tablet setup', 'Email configuration', 'Software installation', 'Employee onboarding'],
    triggers: ['Set up a new device', 'Migrating from an old device', 'Install a new app / program', 'Configure email on a device', 'Onboard a new employee'],
    color: 'bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 border-amber-100 dark:border-amber-800',
  },
];

const INDUSTRIES = [
  { value: 'hotel',          label: 'Hotel & Hospitality', icon: Hotel,          color: 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300', focus: 'PMS, Guest WiFi, POS, CCTV, IPTV' },
  { value: 'school',         label: 'School & University', icon: GraduationCap,  color: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300',   focus: 'LMS, Smart Boards, Student Portals, Networking' },
  { value: 'hospital',       label: 'Hospital & Clinic',   icon: HeartPulse,     color: 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-700 dark:text-red-300',         focus: 'EMR/EHR, Medical Workstations, Lab Systems, Access Control' },
  { value: 'logistics',      label: 'Logistics',           icon: Truck,          color: 'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800 text-orange-700 dark:text-orange-300', focus: 'Fleet Management, Tracking Software, Barcode / QR' },
  { value: 'manufacturing',  label: 'Manufacturing',       icon: Factory,        color: 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300',   focus: 'PLC Systems, SCADA, Barcode Scanners, Industrial PCs' },
  { value: 'real_estate',    label: 'Real Estate',         icon: Home,           color: 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-700 dark:text-green-300',   focus: 'Property Portals, CCTV, Access Control, Smart Office' },
  { value: 'finance',        label: 'Finance & Banking',   icon: Landmark,       color: 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300', focus: 'Core Banking, POS Terminals, ATM Support, VPN' },
  { value: 'sme',            label: 'SME / Retail',        icon: Store,          color: 'bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800 text-purple-700 dark:text-purple-300', focus: 'POS Systems, Inventory Software, WiFi, Printer Support' },
];

const CORE_CATS: { value: CoreCat; label: string; icon: React.ElementType }[] = [
  { value: 'all', label: 'All Services', icon: LayoutGrid },
  { value: 'hardware', label: 'Hardware', icon: Monitor },
  { value: 'software', label: 'Software', icon: Code },
  { value: 'network', label: 'Network', icon: Network },
  { value: 'security', label: 'Security', icon: ShieldCheck },
  { value: 'user_access', label: 'User Access', icon: KeyRound },
];

const CAT_LABELS: Record<Exclude<CoreCat, 'all'>, string> = {
  hardware: 'Hardware',
  software: 'Software',
  network: 'Network',
  security: 'Security',
  user_access: 'User Access',
};

const CAT_COLORS: Record<Exclude<CoreCat, 'all'>, string> = {
  hardware:    'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border-blue-100 dark:border-blue-800',
  software:    'bg-violet-50 dark:bg-violet-900/20 text-violet-600 dark:text-violet-400 border-violet-100 dark:border-violet-800',
  network:     'bg-cyan-50 dark:bg-cyan-900/20 text-cyan-600 dark:text-cyan-400 border-cyan-100 dark:border-cyan-800',
  security:    'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border-red-100 dark:border-red-800',
  user_access: 'bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 border-amber-100 dark:border-amber-800',
};

const PILLARS = [
  { icon: Monitor, label: 'Devices & Hardware', phrase: "My computer, phone, or device isn't working", color: 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400', delivery: ['Remote', 'On-site', 'AI'] },
  { icon: Wifi, label: 'WiFi & Connectivity', phrase: "I can't get online", color: 'bg-cyan-50 dark:bg-cyan-900/20 text-cyan-600 dark:text-cyan-400', delivery: ['Remote', 'On-site', 'AI'] },
  { icon: Code, label: 'Software & OS', phrase: "An app or my computer isn't working right", color: 'bg-violet-50 dark:bg-violet-900/20 text-violet-600 dark:text-violet-400', delivery: ['Remote', 'AI'] },
  { icon: Mail, label: 'Email & Productivity', phrase: "My email or work apps aren't working", color: 'bg-violet-50 dark:bg-violet-900/20 text-violet-600 dark:text-violet-400', delivery: ['Remote', 'AI'] },
  { icon: ShieldCheck, label: 'Security & Data Protection', phrase: "I think something's wrong with my security or my files", color: 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400', delivery: ['Remote', 'On-site (urgent)', 'AI'] },
  { icon: Rocket, label: 'Setup & Onboarding', phrase: 'I need help setting something up', color: 'bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400', delivery: ['Remote', 'On-site', 'AI'] },
];

const DELIVERY_STYLES: Record<string, string> = {
  'Remote': 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border-blue-100 dark:border-blue-800',
  'On-site': 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 border-emerald-100 dark:border-emerald-800',
  'On-site (urgent)': 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border-red-100 dark:border-red-800',
  'AI': 'bg-violet-50 dark:bg-violet-900/20 text-violet-600 dark:text-violet-400 border-violet-100 dark:border-violet-800',
};

const BUSINESS_ONLY = ['Employee onboarding & offboarding', 'M365 & Workspace admin', 'VPN & remote-access provisioning', 'Org-wide network & hardware'];

export default function Services() {
  const [segment, setSegment] = useState<Segment>('all');
  const [coreCat, setCoreCat] = useState<CoreCat>('all');

  const filtered = ALL_SERVICES.filter(s => {
    if (segment === 'personal' && s.segment === 'business') return false;
    if (segment === 'business' && s.segment === 'personal') return false;
    if (coreCat !== 'all' && s.coreCategory !== coreCat) return false;
    return true;
  });

  return (
    <div className="bg-white dark:bg-dark-bg">

      {/* Hero */}
      <section className="s-section bg-slate-900 relative overflow-hidden">
        <ShaderBackground />
        <div className="s-inner max-w-6xl mx-auto text-center relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-medium border border-emerald-500/20" style={{ marginBottom: '1.5rem' }}>
            What We Offer
          </div>
          <h1 className="font-heading text-white" style={{ fontSize: '2.5rem', fontWeight: 700, marginBottom: '0.75rem' }}>Our Services</h1>
          <p className="text-slate-300 max-w-2xl mx-auto" style={{ marginBottom: '2rem' }}>
            End-to-end IT support across devices, connectivity, software, email &amp; productivity, security, and setup — for personal and business clients in every industry.
          </p>

          {/* Segment toggle */}
          <div className="inline-flex items-center gap-1 p-1 rounded-xl bg-white/10 dark:bg-dark-card border border-white/20 dark:border-dark-border shadow-sm">
            {([['all', 'All Clients'], ['personal', 'Personal'], ['business', 'Business']] as [Segment, string][]).map(([v, label]) => (
              <button key={v} onClick={() => setSegment(v)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all
                  ${segment === v ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-300 hover:text-white'}`}>
                {v === 'personal' && <User className="w-3.5 h-3.5" />}
                {v === 'business' && <Building2 className="w-3.5 h-3.5" />}
                {label}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Core Category Filter */}
      <section className="bg-white dark:bg-dark-bg border-b border-slate-100 dark:border-dark-border sticky top-0 z-10 backdrop-blur-sm bg-white/95 dark:bg-dark-bg/95">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 overflow-x-auto">
          <div className="flex items-center gap-2 min-w-max">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide mr-1">Category:</span>
            {CORE_CATS.map(c => (
              <button key={c.value} onClick={() => setCoreCat(c.value)}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all border whitespace-nowrap
                  ${coreCat === c.value
                    ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 border-transparent shadow-sm'
                    : 'bg-white dark:bg-dark-card border-slate-200 dark:border-dark-border text-slate-500 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-600'}`}>
                <c.icon className="w-3.5 h-3.5" />
                {c.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Services Grid */}
      <section className="s-section bg-white dark:bg-dark-bg">
        <div className="s-inner max-w-6xl mx-auto">
          <div className="flex items-center justify-between" style={{ marginBottom: '1.5rem' }}>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Showing <span className="font-semibold text-slate-900 dark:text-white">{filtered.length}</span> service{filtered.length !== 1 ? 's' : ''}
              {segment !== 'all' && <> for <span className="font-semibold text-slate-900 dark:text-white capitalize">{segment}</span> clients</>}
            </p>
          </div>

          {filtered.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-slate-400 text-sm">No services match your current filter.</p>
              <button onClick={() => { setSegment('all'); setCoreCat('all'); }} className="mt-3 text-sm text-emerald-500 hover:underline">Clear filters</button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
              {filtered.map((s, i) => {
                const Icon = s.icon;
                return (
                  <div key={i} className="bg-white dark:bg-dark-card border border-slate-200 dark:border-dark-border rounded-2xl hover:border-emerald-300 dark:hover:border-emerald-700 hover:shadow-md transition-all group flex flex-col relative overflow-hidden" style={{ padding: '1.5rem' }}>
                    <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-emerald-400 via-teal-400 to-cyan-400 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    {/* Header */}
                    <div className="flex items-start gap-3" style={{ marginBottom: '1rem' }}>
                      <div className={`w-10 h-10 rounded-xl border flex items-center justify-center flex-shrink-0 group-hover:bg-emerald-500 group-hover:border-emerald-500 transition-all ${s.color}`}>
                        <Icon className="w-5 h-5 group-hover:text-white transition-colors" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap" style={{ marginBottom: '0.25rem' }}>
                          <h3 className="font-heading font-bold text-slate-900 dark:text-white text-sm">{s.title}</h3>
                          <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-md border ${CAT_COLORS[s.coreCategory]}`}>
                            {CAT_LABELS[s.coreCategory]}
                          </span>
                        </div>
                        <span className={`inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-md ${s.segment === 'both' ? 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400' : s.segment === 'personal' ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400' : 'bg-violet-50 dark:bg-violet-900/20 text-violet-600 dark:text-violet-400'}`}>
                          {s.segment !== 'personal' && <Building2 className="w-2.5 h-2.5" />}
                          {s.segment !== 'business' && <User className="w-2.5 h-2.5" />}
                          {s.segment === 'both' ? 'Personal & Business' : s.segment === 'personal' ? 'Personal' : 'Business'}
                        </span>
                      </div>
                    </div>

                    <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed" style={{ marginBottom: '1rem' }}>{s.desc}</p>

                    {/* Products */}
                    <div style={{ marginBottom: '0.875rem' }}>
                      <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400 dark:text-slate-500" style={{ marginBottom: '0.375rem' }}>Products / Items</p>
                      <div className="flex flex-wrap gap-1">
                        {s.products.map((p, j) => (
                          <span key={j} className="text-[10px] px-2 py-0.5 rounded-md bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 font-medium">
                            {p}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Issue Triggers */}
                    <div className="mt-auto">
                      <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400 dark:text-slate-500" style={{ marginBottom: '0.375rem' }}>Common Issues</p>
                      <ul style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                        {s.triggers.map((t, j) => (
                          <li key={j} className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                            <CheckCircle className="w-3 h-3 text-emerald-500 flex-shrink-0" /> {t}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* Six Ways We Help */}
      <section className="s-section bg-slate-50 dark:bg-dark-bg/50">
        <div className="s-inner max-w-6xl mx-auto">
          <div className="text-center" style={{ marginBottom: '2.5rem' }}>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 text-xs font-medium border border-emerald-100 dark:border-emerald-800" style={{ marginBottom: '0.75rem' }}>
              Six Ways We Help
            </div>
            <h2 className="font-heading text-slate-900 dark:text-white" style={{ fontSize: '1.75rem', fontWeight: 700, marginBottom: '0.5rem' }}>Every Problem, One Clear Path</h2>
            <p className="text-slate-500 dark:text-slate-400 text-sm max-w-xl mx-auto">
              All our services fall into six support areas. Start with what you're experiencing — we handle the rest remotely, on-site, or with AI-guided self-help.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {PILLARS.map((p, i) => {
              const Icon = p.icon;
              return (
                <div key={i} className="bg-white dark:bg-dark-card border border-slate-200 dark:border-dark-border rounded-2xl p-6 flex flex-col transition-all hover:shadow-sm hover:border-emerald-300 dark:hover:border-emerald-700">
                  <div className="flex items-center gap-3" style={{ marginBottom: '1rem' }}>
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${p.color}`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <h3 className="font-heading font-bold text-slate-900 dark:text-white text-sm leading-tight">{p.label}</h3>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 italic leading-relaxed" style={{ marginBottom: '1rem' }}>"{p.phrase}"</p>
                  <div className="mt-auto flex flex-wrap gap-1.5">
                    {p.delivery.map((d, j) => (
                      <span key={j} className={`text-[10px] font-semibold px-2 py-0.5 rounded-md border ${DELIVERY_STYLES[d]}`}>{d}</span>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Business-only overlay */}
          <div className="mt-8 rounded-2xl bg-slate-900 dark:bg-slate-950 p-6 flex flex-col lg:flex-row items-start lg:items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center flex-shrink-0">
              <Building2 className="w-5 h-5 text-emerald-400" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-bold text-white">Business-only support</p>
              <p className="text-xs text-slate-400 mt-0.5">Team-focused services available exclusively to business clients.</p>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {BUSINESS_ONLY.map((b, j) => (
                <span key={j} className="text-[10px] font-semibold px-2 py-1 rounded-md bg-white/10 text-slate-200 border border-white/10">{b}</span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Industry Solutions (shown when segment is business or all) */}
      {segment !== 'personal' && (
        <section className="s-section bg-slate-50 dark:bg-dark-bg/50">
          <div className="s-inner max-w-6xl mx-auto">
            <div className="text-center" style={{ marginBottom: '2.5rem' }}>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-violet-50 dark:bg-violet-900/20 text-violet-600 dark:text-violet-400 text-xs font-medium border border-violet-100 dark:border-violet-800" style={{ marginBottom: '0.75rem' }}>
                Industry Solutions
              </div>
              <h2 className="font-heading text-slate-900 dark:text-white" style={{ fontSize: '1.75rem', fontWeight: 700, marginBottom: '0.5rem' }}>Built for Your Industry</h2>
              <p className="text-slate-500 dark:text-slate-400 text-sm max-w-xl mx-auto">
                Every industry has unique IT challenges. Our technicians are trained to support the specific systems and workflows your sector depends on.
              </p>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {INDUSTRIES.map((ind, i) => {
                const Icon = ind.icon;
                return (
                  <div key={i} className="flex flex-col gap-3 p-4 rounded-2xl bg-white dark:bg-dark-card border border-slate-200 dark:border-dark-border transition-all hover:shadow-sm">
                    <div className={`w-10 h-10 rounded-xl border flex items-center justify-center ${ind.color}`}>
                      <Icon className="w-5 h-5 flex-shrink-0" />
                    </div>
                    <div>
                      <span className="text-sm font-bold leading-tight text-slate-900 dark:text-white">{ind.label}</span>
                      <p className="text-[11px] leading-relaxed text-slate-500 dark:text-slate-400 mt-1">{ind.focus}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* How We Route Section */}
      <section className="s-section bg-white dark:bg-dark-bg">
        <div className="s-inner max-w-5xl mx-auto">
          <div className="text-center" style={{ marginBottom: '2.5rem' }}>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 text-xs font-medium border border-emerald-100 dark:border-emerald-800" style={{ marginBottom: '0.75rem' }}>
              Smart Ticket Routing
            </div>
            <h2 className="font-heading text-slate-900 dark:text-white" style={{ fontSize: '1.75rem', fontWeight: 700, marginBottom: '0.5rem' }}>How Your Ticket Gets to the Right Technician</h2>
            <p className="text-slate-500 dark:text-slate-400 text-sm max-w-xl mx-auto">Our routing wizard guides you through 6 steps before opening a ticket — ensuring it lands with the right expert instantly.</p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {[
              { n: '01', label: 'Client Segment', sub: 'Personal or Business' },
              { n: '02', label: 'Industry Type', sub: 'Hotel, School, Hospital…' },
              { n: '03', label: 'Core Category', sub: 'Hardware, Software, Network…' },
              { n: '04', label: 'Product / Item', sub: 'Specific device or app' },
              { n: '05', label: 'Issue Trigger', sub: 'Describe the symptom' },
              { n: '06', label: 'Priority Level', sub: 'Critical to Low' },
            ].map((step, i) => (
              <div key={i} className="flex flex-col items-center text-center gap-2 p-4 rounded-2xl bg-slate-50 dark:bg-dark-card border border-slate-200 dark:border-dark-border">
                <div className="w-8 h-8 rounded-full bg-emerald-500 text-white text-xs font-bold flex items-center justify-center">{step.n}</div>
                <p className="text-xs font-bold text-slate-900 dark:text-white leading-tight">{step.label}</p>
                <p className="text-[10px] text-slate-400 leading-tight">{step.sub}</p>
                {i < 5 && <ChevronRight className="w-3 h-3 text-emerald-400 hidden lg:block absolute" />}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="s-section bg-slate-900 dark:bg-slate-950">
        <div className="s-inner max-w-3xl mx-auto text-center">
          <h2 className="font-heading text-white" style={{ fontSize: '2rem', fontWeight: 700, marginBottom: '0.75rem' }}>Need a Custom Solution?</h2>
          <p className="text-slate-400" style={{ marginBottom: '2rem' }}>Contact us to discuss a tailored IT support plan for your business — with SLA guarantees, dedicated technicians, and 24/7 monitoring.</p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link to="/login"><Button size="lg">Get Started Free</Button></Link>
            <Link to="/contact">
              <Button variant="ghost" size="lg" className="text-slate-300 hover:text-white hover:bg-slate-800">Contact Sales</Button>
            </Link>
          </div>
        </div>
      </section>

    </div>
  );
}

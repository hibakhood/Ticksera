import React from 'react';
import { ChevronDown } from 'lucide-react';

const selectStyle: React.CSSProperties = {
  WebkitAppearance: 'none',
  MozAppearance: 'none',
  appearance: 'none',
};

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export default function Input({ label, error, className = '', ...props }: InputProps) {
  return (
    <div className="space-y-1.5">
      {label && <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">{label}</label>}
      <input
        className={`w-full px-3.5 py-2.5 rounded-xl border bg-white dark:bg-dark-card text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent hover:border-slate-300 dark:hover:border-slate-500 transition-all text-sm ${error ? 'border-red-400 dark:border-red-500' : 'border-slate-200 dark:border-dark-border'} ${className}`}
        {...props}
      />
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}

interface TextAreaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

export function TextArea({ label, error, className = '', ...props }: TextAreaProps) {
  return (
    <div className="space-y-1.5">
      {label && <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">{label}</label>}
      <textarea
        className={`w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-dark-border bg-white dark:bg-dark-card text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent hover:border-slate-300 dark:hover:border-slate-500 transition-all text-sm resize-none ${className}`}
        {...props}
      />
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  options: { value: string; label: string }[];
  error?: string;
}

export function Select({ label, options, error, className = '', style, ...props }: SelectProps) {
  return (
    <div className="space-y-1.5">
      {label && (
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">{label}</label>
      )}
      <div className="relative">
        <select
          style={{ ...selectStyle, ...style }}
          className={`w-full px-3.5 py-2.5 pr-10 rounded-xl border bg-white dark:bg-dark-card text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent hover:border-emerald-400 dark:hover:border-emerald-500 cursor-pointer transition-all text-sm ${error ? 'border-red-400 dark:border-red-500' : 'border-slate-200 dark:border-dark-border'} ${className}`}
          {...props}
        >
          {options.map(o => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500" />
      </div>
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}

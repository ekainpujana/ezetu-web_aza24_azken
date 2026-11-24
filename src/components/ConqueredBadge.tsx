import React from 'react';

interface ConqueredIconProps {
  className?: string;
  checked?: boolean;
}

export function ConqueredIcon({ className = 'w-4 h-4', checked = true }: ConqueredIconProps) {
  if (!checked) {
    return (
      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={`${className} shrink-0 text-slate-400 dark:text-slate-500`}>
        <circle cx="12" cy="12" r="9.2" stroke="currentColor" strokeWidth="1.8" />
        <path d="M12 1.8v2M12 20.2v2M1.8 12h2M20.2 12h2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        <circle cx="12" cy="12" r="6" stroke="currentColor" strokeWidth="1.5" strokeDasharray="2.5 2" fill="none" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={`${className} shrink-0 text-[#0284C7] dark:text-sky-400`}>
      <circle cx="12" cy="12" r="9.2" stroke="currentColor" strokeWidth="1.8" />
      <path d="M12 1.8v2M12 20.2v2M1.8 12h2M20.2 12h2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <circle cx="12" cy="12" r="6" fill="#0284C7" />
      <path d="m9.2 12 2 2 3.8-4" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function getConqueredIconHtml(sizePx = 14): string {
  return `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style="width:${sizePx}px;height:${sizePx}px;display:block;"><circle cx="12" cy="12" r="9.2" stroke="#0284C7" stroke-width="1.8"/><path d="M12 1.8v2M12 20.2v2M1.8 12h2M20.2 12h2" stroke="#0284C7" stroke-width="1.8" stroke-linecap="round"/><circle cx="12" cy="12" r="6" fill="#0284C7"/><path d="m9.2 12 2 2 3.8-4" stroke="white" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
}

interface ConqueredBadgeProps {
  lang?: string;
  className?: string;
  checked?: boolean;
}

const CONQUERED_LABELS: Record<string, string> = {
  eu: 'Esploratua',
  es: 'Conquistado',
  en: 'Explored',
  fr: 'Exploré',
  pt: 'Explorado',
  it: 'Esplorato',
  de: 'Erkundet',
};

export function ConqueredBadge({ lang = 'ES', className = '', checked = true }: ConqueredBadgeProps) {
  const norm = (lang || '').toLowerCase();
  const langKey = norm === 'eus' || norm === 'eu' ? 'eu' : norm.slice(0, 2);
  const text = CONQUERED_LABELS[langKey] ?? CONQUERED_LABELS.es;

  return (
    <span
      role="status"
      aria-label={text}
      title={text}
      className={`inline-flex items-center justify-center p-1 rounded-full bg-sky-500/10 dark:bg-sky-500/15 border border-[#0284C7]/30 dark:border-sky-400/30 hover:scale-110 hover:bg-sky-500/25 transition-all cursor-pointer shadow-sm ${className}`}
    >
      <ConqueredIcon className="w-3.5 h-3.5" checked={checked} />
    </span>
  );
}
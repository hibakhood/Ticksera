import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'dark';
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  loading?: boolean;
  pill?: boolean;
  children: React.ReactNode;
}

function Spinner({ size }: { size: 'xs' | 'sm' | 'md' | 'lg' | 'xl' }) {
  const s = size === 'xs' ? 12 : size === 'sm' ? 14 : size === 'lg' || size === 'xl' ? 18 : 15;
  return (
    <svg
      width={s}
      height={s}
      viewBox="0 0 24 24"
      fill="none"
      style={{ animation: 'btn-spin 0.7s linear infinite', flexShrink: 0 }}
    >
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeOpacity="0.25" />
      <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

export default function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  pill = false,
  children,
  className = '',
  disabled,
  style,
  ...props
}: ButtonProps) {
  const isDisabled = disabled || loading;
  const radius = pill ? '9999px' : '10px';

  const base: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 600,
    letterSpacing: '-0.01em',
    borderRadius: radius,
    border: 'none',
    cursor: isDisabled ? 'not-allowed' : 'pointer',
    opacity: isDisabled ? 0.55 : 1,
    transition: 'transform 120ms ease, box-shadow 120ms ease, opacity 120ms ease, background 200ms ease',
    userSelect: 'none',
    position: 'relative',
    overflow: 'hidden',
    textDecoration: 'none',
    whiteSpace: 'nowrap',
    outline: 'none',
    ...style,
  };

  const sizes: Record<string, React.CSSProperties> = {
    xs: { padding: '0.3rem 0.75rem', fontSize: '0.75rem', gap: '0.375rem', lineHeight: 1.5 },
    sm: { padding: '0.45rem 1rem',   fontSize: '0.8125rem', gap: '0.375rem', lineHeight: 1.5 },
    md: { padding: '0.6rem 1.25rem', fontSize: '0.875rem', gap: '0.5rem', lineHeight: 1.5 },
    lg: { padding: '0.75rem 1.625rem', fontSize: '0.9375rem', gap: '0.5rem', lineHeight: 1.5 },
    xl: { padding: '0.9rem 2rem',    fontSize: '1rem', gap: '0.625rem', lineHeight: 1.5 },
  };

  const variantStyles: Record<string, React.CSSProperties> = {
    primary: {
      background: 'linear-gradient(135deg, hsl(158 64% 52%) 0%, hsl(160 84% 39%) 60%, hsl(163 94% 30%) 100%)',
      color: '#ffffff',
      boxShadow: '0 1px 2px hsl(160 84% 39% / 0.25), 0 4px 12px hsl(160 84% 39% / 0.25), inset 0 1px 0 hsl(158 64% 62% / 0.4)',
    },
    secondary: {
      background: 'linear-gradient(135deg, hsl(215 25% 32%) 0%, hsl(217 33% 22%) 100%)',
      color: '#ffffff',
      boxShadow: '0 1px 2px hsl(220 30% 10% / 0.3), 0 4px 12px hsl(220 30% 10% / 0.2), inset 0 1px 0 hsl(215 25% 42% / 0.4)',
    },
    outline: {
      background: 'transparent',
      color: 'hsl(161 94% 30%)',
      border: '1.5px solid hsl(160 84% 39% / 0.6)',
      boxShadow: '0 1px 2px hsl(160 84% 39% / 0.06)',
    },
    ghost: {
      background: 'transparent',
      color: 'hsl(215 16% 47%)',
      boxShadow: 'none',
    },
    danger: {
      background: 'linear-gradient(135deg, hsl(0 85% 65%) 0%, hsl(0 84% 55%) 100%)',
      color: '#ffffff',
      boxShadow: '0 1px 2px hsl(0 84% 55% / 0.25), 0 4px 12px hsl(0 84% 55% / 0.2), inset 0 1px 0 hsl(0 85% 72% / 0.4)',
    },
    dark: {
      background: 'linear-gradient(135deg, hsl(222 47% 14%) 0%, hsl(222 47% 10%) 100%)',
      color: '#ffffff',
      boxShadow: '0 1px 2px hsl(222 47% 4% / 0.4), 0 4px 12px hsl(222 47% 4% / 0.25), inset 0 1px 0 hsl(215 25% 30% / 0.5)',
    },
  };

  function handleMouseEnter(e: React.MouseEvent<HTMLButtonElement>) {
    if (isDisabled) return;
    const el = e.currentTarget;
    if (variant === 'primary') {
      el.style.background = 'linear-gradient(135deg, hsl(158 64% 55%) 0%, hsl(160 84% 43%) 60%, hsl(163 94% 33%) 100%)';
      el.style.boxShadow = '0 2px 4px hsl(160 84% 39% / 0.2), 0 8px 24px hsl(160 84% 39% / 0.35), inset 0 1px 0 hsl(158 64% 65% / 0.4)';
      el.style.transform = 'translateY(-1px)';
    } else if (variant === 'secondary') {
      el.style.background = 'linear-gradient(135deg, hsl(215 25% 36%) 0%, hsl(217 33% 26%) 100%)';
      el.style.boxShadow = '0 2px 4px hsl(220 30% 10% / 0.3), 0 8px 20px hsl(220 30% 10% / 0.3), inset 0 1px 0 hsl(215 25% 46% / 0.4)';
      el.style.transform = 'translateY(-1px)';
    } else if (variant === 'outline') {
      el.style.background = 'hsl(160 84% 39% / 0.06)';
      el.style.borderColor = 'hsl(160 84% 39%)';
      el.style.color = 'hsl(163 94% 24%)';
      el.style.boxShadow = '0 2px 8px hsl(160 84% 39% / 0.12)';
      el.style.transform = 'translateY(-1px)';
    } else if (variant === 'ghost') {
      el.style.background = 'hsl(214 32% 91% / 0.7)';
      el.style.color = 'hsl(217 33% 17%)';
    } else if (variant === 'danger') {
      el.style.background = 'linear-gradient(135deg, hsl(0 85% 68%) 0%, hsl(0 84% 58%) 100%)';
      el.style.boxShadow = '0 2px 4px hsl(0 84% 55% / 0.2), 0 8px 24px hsl(0 84% 55% / 0.3), inset 0 1px 0 hsl(0 85% 75% / 0.4)';
      el.style.transform = 'translateY(-1px)';
    } else if (variant === 'dark') {
      el.style.background = 'linear-gradient(135deg, hsl(222 47% 18%) 0%, hsl(222 47% 13%) 100%)';
      el.style.boxShadow = '0 2px 4px hsl(222 47% 4% / 0.4), 0 8px 24px hsl(222 47% 4% / 0.35), inset 0 1px 0 hsl(215 25% 34% / 0.5)';
      el.style.transform = 'translateY(-1px)';
    }
  }

  function handleMouseLeave(e: React.MouseEvent<HTMLButtonElement>) {
    if (isDisabled) return;
    const el = e.currentTarget;
    Object.assign(el.style, variantStyles[variant]);
    el.style.transform = 'translateY(0)';
  }

  function handleMouseDown(e: React.MouseEvent<HTMLButtonElement>) {
    if (isDisabled) return;
    e.currentTarget.style.transform = 'translateY(0) scale(0.975)';
    e.currentTarget.style.boxShadow = 'none';
  }

  function handleMouseUp(e: React.MouseEvent<HTMLButtonElement>) {
    if (isDisabled) return;
    handleMouseEnter(e);
  }

  const combinedStyle: React.CSSProperties = {
    ...base,
    ...sizes[size],
    ...variantStyles[variant],
    ...style,
  };

  return (
    <>
      <style>{`@keyframes btn-spin { to { transform: rotate(360deg); } }`}</style>
      <button
        disabled={isDisabled}
        style={combinedStyle}
        className={className}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        {...props}
      >
        {loading && <Spinner size={size} />}
        {children}
      </button>
    </>
  );
}

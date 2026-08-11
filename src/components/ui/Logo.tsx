interface LogoProps {
  size?: number;
  className?: string;
}

export default function Logo({ size = 32, className = '' }: LogoProps) {
  return (
    <img
      src="/ticksera-logo.svg"
      alt="TICKSERA"
      width={size}
      height={size}
      className={className}
      style={{ objectFit: 'contain' }}
    />
  );
}

import TEAM_LOGOS from '../data/logos';

export default function TeamLogo({ teamId, size = 24, className = '' }) {
  const src = TEAM_LOGOS[teamId];
  if (!src) return <span className={className} style={{ fontSize: '0.75em', opacity: 0.7 }}>{teamId}</span>;
  return (
    <img
      src={src}
      alt={teamId}
      width={size}
      height={size}
      className={`team-logo ${className}`}
      style={{ objectFit: 'contain' }}
    />
  );
}

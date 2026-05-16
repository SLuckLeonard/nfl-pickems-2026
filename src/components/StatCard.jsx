/**
 * Metric summary card for the dashboard.
 * Displays a large monospaced number with a small label beneath.
 *
 * @param {{ label: string, value: string|number|null, accent?: boolean,
 *            sub?: string }} props
 */
export default function StatCard({ label, value, accent = false, sub }) {
  return (
    <div className="stat-card">
      <span className={`stat-card__value${accent ? ' stat-card__value--accent' : ''}`}>
        {value ?? '—'}
      </span>
      <span className="stat-card__label">{label}</span>
      {sub && <span className="stat-card__sub">{sub}</span>}
    </div>
  );
}

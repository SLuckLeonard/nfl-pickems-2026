/**
 * Displayed when a pick sheet is locked (pre-season or weekly).
 *
 * @param {{ message?: string, type?: 'preseason'|'week' }} props
 */
export default function LockBanner({ message, type }) {
  const defaultMessage =
    type === 'preseason'
      ? 'Pre-season picks are locked. Season has begun.'
      : 'Picks for this week are locked.';

  return (
    <div className="lock-banner" role="status">
      <span className="lock-banner__icon">[LOCKED]</span>
      {message ?? defaultMessage}
    </div>
  );
}

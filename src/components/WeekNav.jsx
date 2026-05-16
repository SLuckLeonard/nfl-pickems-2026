/**
 * Week selector navigation. Renders prev/next arrows and a centered week label.
 *
 * @param {{ week: number, onChange: (week: number) => void,
 *            minWeek?: number, maxWeek?: number }} props
 */
export default function WeekNav({ week, onChange, minWeek = 1, maxWeek = 18 }) {
  return (
    <div className="week-nav">
      <button
        className="week-nav__btn"
        onClick={() => onChange(week - 1)}
        disabled={week <= minWeek}
        aria-label="Previous week"
      >
        &lsaquo; Prev
      </button>

      <span className="week-nav__label">Week {week}</span>

      <button
        className="week-nav__btn"
        onClick={() => onChange(week + 1)}
        disabled={week >= maxWeek}
        aria-label="Next week"
      >
        Next &rsaquo;
      </button>
    </div>
  );
}

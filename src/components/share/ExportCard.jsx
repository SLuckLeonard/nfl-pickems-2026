import { forwardRef } from 'react';

/**
 * Broadcast-style card chrome for shareable PNGs: navy header bar with the app
 * name + a title/subtitle, a white body for the content, and a footer URL.
 * The forwarded ref points at the outer card node — pass it to the exporter.
 */
const ExportCard = forwardRef(function ExportCard(
  { title, subtitle, children, footer = 'sluckleonard.github.io/nfl-pickems-2026', width = 640 },
  ref
) {
  return (
    <div className="export-card" ref={ref} style={{ width }}>
      <header className="export-card__header">
        <div className="export-card__brand">
          <span className="export-card__brand-mark">NFL</span>
          <span className="export-card__brand-text">Pick&apos;em 2026</span>
        </div>
        <div className="export-card__titles">
          <div className="export-card__title">{title}</div>
          {subtitle && <div className="export-card__subtitle">{subtitle}</div>}
        </div>
      </header>

      <div className="export-card__body">{children}</div>

      <footer className="export-card__footer">{footer}</footer>
    </div>
  );
});

export default ExportCard;

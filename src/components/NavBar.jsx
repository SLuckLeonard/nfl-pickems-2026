import { NavLink } from 'react-router-dom';
import PlayerBanner from './PlayerBanner.jsx';

const NAV_LINKS = [
  { to: '/preseason', label: 'Picks & Standings' },
  { to: '/week/1',    label: 'Weekly Picks' },
  { to: '/results',   label: 'Results' },
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/charts',    label: 'Charts' },
];

export default function NavBar() {
  return (
    <nav className="navbar">
      <NavLink to="/preseason" className="navbar-brand">
        NFL Pick&apos;em 2026
      </NavLink>

      <div className="navbar-links">
        {NAV_LINKS.map(({ to, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
          >
            {label}
          </NavLink>
        ))}
      </div>

      <div className="navbar-end">
        <PlayerBanner />
      </div>
    </nav>
  );
}

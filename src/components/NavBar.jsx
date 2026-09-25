import { NavLink, useLocation } from 'react-router-dom';
import { useResults } from '../hooks/useFirestore.js';
import { useActiveWeek } from '../hooks/useActiveWeek.js';
import PlayerBanner from './PlayerBanner.jsx';

export default function NavBar() {
  const { results } = useResults();
  const activeWeek = useActiveWeek(results);
  const { pathname } = useLocation();

  // "Weekly Picks" links to whichever week isn't fully decided yet, so it
  // needs its own active-path check — the target week changes as results
  // come in, so a plain NavLink isActive (matched against a fixed `to`)
  // would stop highlighting as soon as you navigate away from that week.
  const navLinks = [
    { to: '/preseason',          label: 'Picks & Standings', isActive: pathname.startsWith('/preseason') },
    { to: `/week/${activeWeek}`, label: 'Weekly Picks',       isActive: pathname.startsWith('/week/') },
    { to: '/results',            label: 'Results',            isActive: pathname.startsWith('/results') },
    { to: '/dashboard',          label: 'Dashboard',          isActive: pathname.startsWith('/dashboard') },
    { to: '/charts',             label: 'Charts',             isActive: pathname.startsWith('/charts') },
    { to: '/share',              label: 'Share',              isActive: pathname.startsWith('/share') },
  ];

  return (
    <nav className="navbar">
      <NavLink to="/preseason" className="navbar-brand">
        NFL Pick&apos;em 2026
      </NavLink>

      <div className="navbar-links">
        {navLinks.map(({ to, label, isActive }) => (
          <NavLink
            key={label}
            to={to}
            className={`nav-link${isActive ? ' active' : ''}`}
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

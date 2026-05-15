// Phase 4: Persistent top navigation bar.
// Links: Pick Sheet | Weekly Picks | Results | Dashboard | Charts
// Gear icon for admin settings.

import { NavLink, useNavigate } from 'react-router-dom';

export default function NavBar() {
  const navigate = useNavigate();

  return (
    <nav className="navbar">
      <div className="navbar-brand" onClick={() => navigate('/preseason')}>
        NFL Pick&apos;em 2026
      </div>
      <div className="navbar-links">
        <NavLink to="/preseason" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
          Pick Sheet
        </NavLink>
        <NavLink to="/week/1" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
          Weekly Picks
        </NavLink>
        <NavLink to="/results" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
          Results
        </NavLink>
        <NavLink to="/dashboard" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
          Dashboard
        </NavLink>
        <NavLink to="/charts" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
          Charts
        </NavLink>
      </div>
    </nav>
  );
}

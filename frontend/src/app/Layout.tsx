import { NavLink, Outlet, type NavLinkRenderProps } from 'react-router';

// NavLink also sets aria-current="page" on the active link for screen readers.
const navClass = ({ isActive }: NavLinkRenderProps): string =>
  isActive ? 'nav-link nav-link--active' : 'nav-link';

export function Layout() {
  return (
    <>
      <a className="skip-link" href="#main">
        Skip to main content
      </a>
      <header className="site-header">
        <div className="container site-header__inner">
          <span className="brand">Trip Splitter</span>
          <nav aria-label="Main">
            <ul className="nav-list">
              <li>
                <NavLink to="/" end className={navClass}>
                  Expenses
                </NavLink>
              </li>
              <li>
                <NavLink to="/expenses/new" className={navClass}>
                  Add expense
                </NavLink>
              </li>
            </ul>
          </nav>
        </div>
      </header>
      <main id="main" className="container" tabIndex={-1}>
        <Outlet />
      </main>
    </>
  );
}

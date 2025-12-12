import { NavLink, Link, Outlet } from "react-router-dom";
import logo from "../assets/petflow-logo.svg";
import { useAuth } from "./AuthProvider";

const links = [
  { to: "/", label: "Tableau de bord" },
  { to: "/products", label: "Produits" },
  { to: "/locations", label: "Emplacements" },
  { to: "/movements", label: "Mouvements" },
  { to: "/documents", label: "Documents" },
  { to: "/settings", label: "Réglages" },
];

function Layout() {
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen text-ink-900">
      <div className="relative min-h-screen">
        <div className="absolute inset-0 bg-gradient-to-br from-brand-100 via-white to-ink-50" />
        <header className="relative border-b border-white/60 bg-white/80 backdrop-blur-xl">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4 gap-4">
            <Link to="/" className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-2xl bg-white shadow-card ring-1 ring-brand-100">
                <img src={logo} alt="PetFlow" className="h-full w-full object-contain" />
              </div>
              <div>
                <p className="text-lg font-semibold leading-tight">PetFlow</p>
                <p className="text-sm text-ink-500">Pilotage des stocks</p>
              </div>
            </Link>
            <nav className="flex items-center gap-2 text-sm font-medium">
              {links.map((link) => (
                <NavLink
                  key={link.to}
                  to={link.to}
                  className={({ isActive }) =>
                    [
                      "rounded-xl px-3 py-2 transition hover:bg-white",
                      isActive ? "bg-white text-brand-700 shadow-card" : "text-ink-600",
                    ].join(" ")
                  }
                >
                  {link.label}
                </NavLink>
              ))}
            </nav>
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-ink-50 px-3 py-1.5 text-xs font-medium text-ink-700">
                {user ? `${user.email} · ${user.tenant}` : "Session"}
              </div>
              <button
                type="button"
                onClick={() => void logout()}
                className="flex h-10 w-10 items-center justify-center rounded-full border border-ink-100 bg-white text-ink-700 shadow-sm transition hover:-translate-y-0.5 hover:bg-ink-900 hover:text-white hover:shadow-card"
                title="Déconnexion"
              >
                <span className="sr-only">Déconnexion</span>
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
                  <path d="M12 2.25a.75.75 0 0 1 .75.75v8a.75.75 0 0 1-1.5 0v-8A.75.75 0 0 1 12 2.25Z" />
                  <path
                    fillRule="evenodd"
                    d="M6.322 5.428a.75.75 0 0 1 1.06.106 6.75 6.75 0 1 0 9.236 0 .75.75 0 1 1 1.166-.966 8.25 8.25 0 1 1-11.568 0 .75.75 0 0 1 .106-.106Z"
                    clipRule="evenodd"
                  />
                </svg>
              </button>
            </div>
          </div>
        </header>

        <main className="relative mx-auto max-w-6xl px-6 py-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export default Layout;

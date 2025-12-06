import { NavLink, useLocation, Link, Outlet } from "react-router-dom";
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
  const location = useLocation();
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
                {user?.username ?? "Session"}
              </div>
              <button
                type="button"
                onClick={() => void logout()}
                className="rounded-lg bg-ink-900 px-3 py-2 text-xs font-semibold text-white transition hover:-translate-y-0.5 hover:shadow-card"
              >
                Déconnexion
              </button>
            </div>
          </div>
        </header>

        <main className="relative mx-auto max-w-6xl px-6 py-8">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h1 className="mt-1 text-2xl font-semibold text-ink-900">
                {pageTitle(location.pathname)}
              </h1>
            </div>
          </div>
          <Outlet />
        </main>
      </div>
    </div>
  );
}

function pageTitle(pathname: string) {
  if (pathname.startsWith("/products/")) return "Détail produit";
  if (pathname.startsWith("/products")) return "Catalogue produits";
  if (pathname.startsWith("/locations")) return "Emplacements de stock";
  if (pathname.startsWith("/movements")) return "Mouvements";
  if (pathname.startsWith("/documents")) return "Documents";
  if (pathname.startsWith("/settings")) return "Réglages";
  return "Tableau de bord";
}

export default Layout;

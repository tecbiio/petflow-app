import { NavLink, useLocation } from "react-router-dom";
import { ReactNode } from "react";
import logo from "../assets/petflow-logo.svg";

const links = [
  { to: "/", label: "Tableau de bord" },
  { to: "/products", label: "Produits" },
  { to: "/locations", label: "Emplacements" },
  { to: "/adjustments", label: "Mouvements & inventaires" },
  { to: "/settings", label: "Réglages" },
];

type Props = {
  children: ReactNode;
};

function Layout({ children }: Props) {
  const location = useLocation();

  return (
    <div className="min-h-screen text-ink-900">
      <div className="relative">
        <div className="absolute inset-0 bg-gradient-to-br from-brand-100 via-white to-ink-50" />
        <header className="relative border-b border-white/60 bg-white/80 backdrop-blur-xl">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-2xl bg-white shadow-card ring-1 ring-brand-100">
                <img src={logo} alt="PetFlow" className="h-full w-full object-contain" />
              </div>
              <div>
                <p className="text-lg font-semibold leading-tight">PetFlow</p>
                <p className="text-sm text-ink-500">Pilotage des stocks</p>
              </div>
              <span className="ml-2 rounded-full bg-ink-100 px-3 py-1 text-xs font-semibold text-ink-600">
                Front client
              </span>
            </div>
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
          </div>
        </header>

        <main className="relative mx-auto max-w-6xl px-6 py-8">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-wide text-ink-500">
                {location.pathname === "/" ? "Vue d'ensemble" : "Module"}
              </p>
              <h1 className="mt-1 text-2xl font-semibold text-ink-900">
                {pageTitle(location.pathname)}
              </h1>
            </div>
            <div className="hidden items-center gap-3 md:flex">
              <div className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-ink-600 shadow-card">
                API: {import.meta.env.VITE_API_URL || "http://localhost:3000"}
              </div>
            </div>
          </div>
          {children}
        </main>
      </div>
    </div>
  );
}

function pageTitle(pathname: string) {
  if (pathname.startsWith("/products/")) return "Détail produit";
  if (pathname.startsWith("/products")) return "Catalogue produits";
  if (pathname.startsWith("/locations")) return "Emplacements de stock";
  if (pathname.startsWith("/adjustments")) return "Mouvements & inventaires";
  return "Tableau de bord";
}

export default Layout;

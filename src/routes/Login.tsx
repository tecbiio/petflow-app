import { FormEvent, useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../components/AuthProvider";
import { useToast } from "../components/ToastProvider";
import logo from "../assets/petflow-logo.svg";

function Login() {
  const { login, status } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const redirect = (location.state as { from?: { pathname?: string } })?.from?.pathname || "/";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login(email.trim(), password);
      navigate(redirect, { replace: true });
    } catch (err) {
      const message = (err as Error).message || "Connexion impossible";
      setError(message);
      toast(message, "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (status === "authenticated") {
      navigate(redirect, { replace: true });
    }
  }, [navigate, redirect, status]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-brand-100 via-white to-ink-50 px-4">
      <div className="glass-panel w-full max-w-md p-6">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-2xl bg-white shadow-card ring-1 ring-brand-100">
            <img src={logo} alt="PetFlow" className="h-full w-full object-contain" />
          </div>
          <div>
            <p className="text-lg font-semibold text-ink-900">PetFlow</p>
            <p className="text-sm text-ink-600">Connexion sécurisée</p>
          </div>
        </div>

        <form className="space-y-3" onSubmit={handleSubmit}>
          <label className="text-sm text-ink-700">
            Email
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded-lg border border-ink-100 bg-white px-3 py-2"
              type="email"
              autoComplete="username"
              required
            />
          </label>
          <label className="text-sm text-ink-700">
            Mot de passe
            <input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full rounded-lg border border-ink-100 bg-white px-3 py-2"
              type="password"
              autoComplete="current-password"
              required
            />
          </label>
          {error ? <p className="text-xs text-amber-700">{error}</p> : null}
          <button
            type="submit"
            className="w-full rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:shadow-card disabled:opacity-60"
            disabled={loading}
          >
            {loading ? "Connexion…" : "Se connecter"}
          </button>
        </form>
        <p className="mt-3 text-xs text-ink-500">
          Accès réservé aux utilisateurs autorisés. Besoin d’aide ? Contacte ton administrateur.
        </p>
      </div>
    </div>
  );
}

export default Login;

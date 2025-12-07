# Petflow App (Front)

Interface React 18 + Vite + Tailwind pour piloter les produits, stocks, mouvements et réglages.

## Prérequis
- Node 20+, npm.
- Copier `petflow-app/.env.example` vers `.env.local` puis définir `VITE_API_URL` (ex. `http://localhost:3000`).  
  Option : `VITE_USE_MOCKS=true` pour afficher l’UI sans backend.

## Démarrage
- Installer : `npm install`
- Dev : `npm run dev -- --host` (ouvre sur `http://localhost:5173`)
- Build/preview : `npm run build && npm run preview -- --host`

## Connexion et données
- L’API ciblée doit être le core (`petflow-core`) avec les bases initialisées (master + base du tenant).
- Authentification via les comptes créés dans la base master (`npm run tenants:bootstrap` côté core).
- Familles/sous-familles/conditionnements et produits proviennent de la base applicative du tenant.

## Docker
- Via la racine du repo : `docker-compose up --build petflow-app` (dépend de `petflow-core` et `pdf2json` déjà lancés ou dans le même `up`).

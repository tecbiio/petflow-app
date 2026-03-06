# Petflow App (Front)

Interface React 18 + Vite + Tailwind pour piloter les produits, stocks, mouvements et réglages.

## Prérequis
- Node 20+, npm.
- Copier `petflow-app/.env.example` vers `.env.local` puis définir `VITE_API_URL` pour le dev local (ex. `http://localhost:3000`).  
- En Docker, la valeur effective provient du `build.args.VITE_API_URL` de `docker-compose.yml`, pas de `.env.local`.
- Option : `VITE_USE_MOCKS=true` pour afficher l’UI sans backend.

## Démarrage
- Installer : `npm install`
- Dev : `npm run dev -- --host` (ouvre sur `http://localhost:5173`)
- Build/preview : `npm run build && npm run preview -- --host`
- `VITE_API_URL` est injecté au build. Si l’URL change, il faut reconstruire le front.

## Connexion et données
- L’API ciblée doit être le core (`petflow-core`) avec les bases initialisées (master + base du tenant).
- Authentification via les comptes créés dans la base master (`npm run tenants:bootstrap` côté core).
- Familles/sous-familles/conditionnements et produits proviennent de la base applicative du tenant.

## Axonaut
- Renseigner la clé API dans `Réglages` (poussée au core).
- Importer le catalogue produits via `Réglages` → "Importer les produits depuis Axonaut".
- Synchroniser le stock vers Axonaut :
  - depuis une fiche produit (bouton "Mettre à jour le stock Axonaut")
  - ou en masse via `Réglages` → "Synchroniser le stock vers Axonaut" (ids produits ou “Tout synchroniser” pour tous les produits liés).
- Importer des factures Axonaut :
  - synchro automatique à chaque connexion (factures ajoutées dans la liste “à importer”)
  - page `Documents` → "Importer des factures Axonaut" (sélection, prévisualisation, import unitaire ou import complet).

## Docker
- Via la racine du repo : `docker compose up --build petflow-app` (dépend de `petflow-core` et `pdf2json` déjà lancés ou dans le même `up`).
- Si `VITE_API_URL` change, forcer un rebuild :
  - `docker compose build --no-cache petflow-app`
  - `docker compose up -d --force-recreate petflow-app`
- Pour vérifier la valeur effective injectée en Docker : `docker compose config`

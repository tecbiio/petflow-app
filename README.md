# Petflow App (Front)

Interface React 18 + Vite + Tailwind pour piloter les produits, stocks, mouvements et réglages.

## Prérequis
- Node 20+, npm.
- Copier `petflow-app/.env.example` vers `.env.local` puis définir `VITE_API_URL` (ex. `http://localhost:3000`).  
  Option : `VITE_USE_MOCKS=true` pour afficher l’UI sans backend.

## Desktop (Tauri / macOS & Windows)
Objectif : une app desktop “local-first” qui lance automatiquement le `petflow-core` en service local.

Prérequis :
- Rust (toolchain stable) + outils de build.
- Windows : Microsoft Edge WebView2 Runtime.
- macOS : Xcode Command Line Tools (`xcode-select --install`).

Commandes :
- Préparer les resources (bundle du core) : `npm run desktop:prepare`
- Dev desktop : `npm run desktop:dev`
- Build desktop : `npm run desktop:build`

Notes :
- En desktop, le routeur passe en `HashRouter` pour éviter les 404 sur rechargement.
- Le core tourne sur `http://127.0.0.1:3000` et stocke ses DB SQLite dans le dossier “app data” de l’application.
- Pour l’instant, il faut Node installé sur la machine (le core est lancé via `node`). Si Node n’est pas trouvé, définir `PETFLOW_NODE_BINARY=/chemin/vers/node`.
- Identifiants par défaut (modifiable via env) : `PETFLOW_ADMIN_EMAIL=admin@local`, `PETFLOW_ADMIN_PASSWORD=admin`.

## Démarrage
- Installer : `npm install`
- Dev : `npm run dev -- --host` (ouvre sur `http://localhost:5173`)
- Build/preview : `npm run build && npm run preview -- --host`

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
- Via la racine du repo : `docker-compose up --build petflow-app` (dépend de `petflow-core` et `pdf2json` déjà lancés ou dans le même `up`).

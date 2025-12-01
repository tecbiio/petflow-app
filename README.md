# PetFlow (front)

Interface React + Vite + Tailwind pour piloter les stocks en s'appuyant sur l'API NestJS/Prisma décrite dans la capture (produits, emplacements, inventaires, mouvements).

## Démarrage

```bash
cp .env.example .env.local   # ajuster VITE_API_URL
npm install
npm run dev
```

- `npm run build` pour le build statique, `npm run preview` pour le servir.
- `VITE_USE_MOCKS=true` permet de tester l'UI sans backend (jeu de données embarqué).

## Écrans clés

- Tableau de bord : produits sous seuil, mouvements récents, KPI.
- Produits : liste, aperçu rapide, fiche complète avec stock courant, variations, mouvements et inventaires (/products, /stock/:id, /stock/:id/variations, /stock-movements/product/:id, /inventories/product/:id).
- Emplacements : liste, mise en avant du défaut, création simple (/stock-locations, /stock-locations/default).
- Mouvements & inventaires : import drag & drop d'un document (POST /stock-movements en multipart), ajustement manuel, inventaire partiel/complet (POST /inventories).

## Stack

- React 18 + Vite 5 + TypeScript.
- TailwindCSS pour le design.
- TanStack Query pour la data/les appels API.
- React Router pour le routage.

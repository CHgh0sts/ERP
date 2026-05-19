# ERP CMS - Next.js + PostgreSQL

ERP complet pour la gestion de production de cartes electroniques (CMS), construit avec **Next.js 15** (App Router + Server Actions) et **PostgreSQL** via **Prisma**. Il couvre tout le cycle : composants, stock avec tracabilite, nomenclatures, ordres de fabrication, achats, ventes, facturation et comptabilite francaise (PCG FR + export FEC DGFiP).

## Fonctionnalites

- **Configuration initiale** au premier lancement (wizard `/setup` en 3 etapes : admin, societe, parametres).
- **Authentification JWT** custom (cookie httpOnly, rate-limiting login), **RBAC** avec roles (ADMIN/USER) et permissions granulaires par module.
- **Mot de passe oublie** (`/forgot-password`) : token a usage unique, expiration 1h, lien copiable depuis `/admin/password-resets`. Changement de mot de passe en self-service depuis `/account`.
- **Theme clair / sombre** : suit le systeme par defaut, modifiable dans le compte utilisateur, toggle rapide dans la topbar.
- **Composants & stock** : articles (code auto `C000001`), multi-fournisseurs (prix, MOQ, preferred), equivalences, datasheets PDF, unites de stock (code unique + QR), mouvements (IN/OUT/RESERVE/RELEASE/TRANSFER/ADJUST), emplacements hierarchiques, gestion "restes de bobines".
- **Imports en masse** : import CSV/JSON manuel des composants depuis `/components`, plus **dossiers d'ecoute** (`/admin/watch`) qui scannent automatiquement des dossiers locaux et importent les fichiers deposes.
- **Achats** : commandes fournisseur, bon de commande imprimable (PDF via print), reception partielle/totale (cree les StockUnit + mouvements + ecriture comptable AC).
- **Ventes** : devis -> commande client, generation automatique des OF, suivi statut.
- **Production** : BOM versionnees + activation, OF avec calcul des besoins, reservation FIFO du stock, consommations par StockUnit, **declenchement automatique de commandes fournisseur sur rupture**.
- **Tracabilite** : recherche par codeUnique, code commande client ou OF, timeline reception -> stock -> OF -> produit -> livraison.
- **Facturation** : factures vente (SALE) et achat (PURCHASE), lignes multi-TVA, paiements multiples, PDF imprimable, ecritures comptables automatiques.
- **Comptabilite PCG FR** : plan comptable pre-charge, journaux (AC/VE/BQ/CA/OD), grand livre, balance, bilan, compte de resultat, declaration TVA CA3, **export FEC DGFiP** (texte tabule, norme DGFiP).
- **Administration** : utilisateurs, roles & permissions, parametres ERP/societe, journal d'audit complet, sauvegardes ZIP (DB + storage), gestion des liens de reset de mot de passe, dossiers d'ecoute.
- **Dashboard** : KPIs (articles, stock, OFs actifs, commandes, CA et achats du mois), alertes stock, factures a encaisser, dernieres commandes & OFs.

## Stack technique

- Next.js 15 (App Router, Server Components, Server Actions)
- TypeScript strict
- Prisma 5 + PostgreSQL
- Tailwind CSS + composants shadcn-style (mode sombre integre)
- JWT (`jsonwebtoken`) + bcryptjs
- Zod (validation, messages d'erreur en francais)
- `@tanstack/react-table`, `react-hook-form`
- `qrcode` (QR codes serveur), `archiver` (ZIP backup), `date-fns`

## Installation

```bash
npm install
```

L'installation execute automatiquement `prisma generate`.

### Configuration de l'environnement

Copiez `.env.example` vers `.env` et adaptez la connexion PostgreSQL :

```env
DATABASE_URL="postgresql://user:password@host:5432/erp"
JWT_SECRET="change-me-at-first-run-this-will-be-replaced-by-a-random-secret"
JWT_EXPIRES_IN="12h"
STORAGE_DIR="./storage"
```

> `JWT_SECRET` est regenere aleatoirement au premier setup s'il vaut la valeur par defaut. Le repertoire `storage/` contient les datasheets, logos et fichiers uploades.

### Initialisation de la base

```bash
npm run prisma:migrate:deploy
```

(en developpement local, vous pouvez aussi utiliser `npm run prisma:migrate` pour creer une nouvelle migration).

Puis lancez le serveur :

```bash
npm run dev
```

Ouvrez [http://localhost:3000](http://localhost:3000). La premiere requete redirige vers `/setup` pour configurer la societe, creer le compte administrateur et definir les parametres ERP (prefixes de codes, seuils, timezone, etc.).

## Scripts disponibles

| Commande | Description |
| --- | --- |
| `npm run dev` | Lance le serveur Next.js en mode developpement |
| `npm run build` | Genere le client Prisma puis build Next.js |
| `npm run start` | Demarre Next.js en production |
| `npm run lint` | Lint |
| `npm run prisma:migrate` | Cree et applique une nouvelle migration (dev) |
| `npm run prisma:migrate:deploy` | Applique les migrations existantes (prod) |
| `npm run prisma:push` | Push direct du schema (sans migration) |
| `npm run prisma:studio` | Ouvre Prisma Studio (explorateur DB) |
| `npm run prisma:generate` | Regenere le client Prisma |
| `npm run test:e2e:install` | Installe les navigateurs Playwright (1ere fois) |
| `npm run test:e2e` | Lance les tests smoke (Playwright) |

## Structure

```
app/
  (app)/             -> pages protegees (authentification requise)
    dashboard/       -> KPIs
    components/      -> composants (articles) + import CSV
    stock/           -> unites de stock + mouvements
    locations/       -> emplacements hierarchiques
    suppliers/       -> fournisseurs + contacts
    customers/       -> clients + contacts
    products/        -> produits + BOM versionnees
    manufacturing/   -> ordres de fabrication
    orders/
      supplier/      -> commandes fournisseur + reception
      customer/      -> devis / commandes client
    invoices/        -> facturation
    traceability/    -> timeline tracabilite
    accounting/      -> comptabilite PCG FR
    account/         -> profil + theme + mot de passe
    admin/           -> users, roles, settings, audit, backup,
                        password-resets, watch
  api/               -> routes serveur (auth, files, QR, FEC, PDF)
  setup/             -> wizard first-run
  login/             -> page de connexion
  forgot-password/   -> demande de reinitialisation
  reset-password/    -> formulaire de reset (token URL)
lib/
  auth/              -> JWT + session + password + reset-token
  accounting/        -> PCG, journaux, FEC
  permissions/       -> catalogue des permissions
  watch/             -> scheduler + runner des dossiers d'ecoute
  csv.ts, import-articles.ts, codes.ts, stock.ts, audit.ts, ...
components/
  ui/                -> primitives (button, input, modal, ...)
  layout/            -> sidebar, topbar
  theme/             -> ThemeProvider + ThemeToggle
prisma/
  schema.prisma      -> modele complet
  migrations/        -> historique Prisma Migrate
middleware.ts        -> redirection /setup + /login
instrumentation.ts   -> demarre le scheduler des dossiers d'ecoute
```

## Sauvegarde

Depuis `Administration > Sauvegardes`, telechargez un ZIP contenant un dump SQL Postgres (via `pg_dump` cote serveur) + le contenu de `storage/`.

## Export FEC

Depuis `Comptabilite > Export FEC`, selectionnez un exercice pour telecharger le fichier conforme DGFiP (nommage `{SIREN}FEC{AAAAMMJJ}.txt`).

## Deploiement (Coolify / Nixpacks)

Variables d'environnement **runtime** obligatoires : `DATABASE_URL`, `JWT_SECRET`, `STORAGE_DIR` (et optionnellement `JWT_EXPIRES_IN`).

Commande de demarrage recommandee :

```bash
npx prisma migrate deploy && npm start
```

Le fichier `nixpacks.toml` fixe `NODE_OPTIONS=--max-old-space-size=3072` pour limiter les echecs de build Next.js par manque de RAM. Sur un VPS tres petit, activez du swap (2–4 Go) ou augmentez la RAM du serveur de build.

## Notes

- Le schema Prisma est portable : pour passer a un autre SGBD, changez le `provider` dans `prisma/schema.prisma` et l'URL dans `.env`.
- Les PDF sont generes en HTML imprimable (via `window.print()`) pour eviter une dependance lourde.
- Les codes (articles, unites, OF, factures) sont configurables depuis `Administration > Parametres` (prefixe + longueur du padding).
- Les dossiers d'ecoute polent toutes les `pollIntervalSec` secondes (defini dans `/admin/watch`) ; les fichiers traites sont deplaces dans `.processed/`, les fichiers en erreur dans `.errors/`.

## Securite

- Cookie de session `httpOnly`, `SameSite=Lax`, `Secure` en production.
- Rate-limiting basique sur le login (5 tentatives / min / IP) et `/api/auth/forgot-password` (8 / 10 min / IP).
- Tokens de reset hashes en SHA-256 (le clair n'est expose qu'a l'affichage).
- Permissions verifiees cote serveur sur toutes les Server Actions et API.
- Audit log complet (`admin/audit`) pour toute action sensible (CREATE, UPDATE, DELETE, LOGIN, IMPORT, PASSWORD_RESET, ...).

## Licence

Projet interne - tous droits reserves.

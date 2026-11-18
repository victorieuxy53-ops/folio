# Folio — portfolios professionnels à 2 000 FCFA

Les clients créent leur portfolio sans code. Ils choisissent un style (6 mises en page animées, 8 palettes ou leurs propres couleurs, 6 typographies) et paient 2 000 FCFA (Mobile Money ou carte via Kkiapay). Leur site est alors déployé automatiquement sur Vercel. Le propriétaire suit toute l'activité depuis `/admin`.

**Pile technique** : Vue 3 + Vite + Tailwind 4 · Supabase (auth, base Postgres, stockage d'images) · une fonction Vercel (`api/publish.ts`).

## Mise en route

### 1. Supabase
1. Créez un projet sur [supabase.com](https://supabase.com).
2. Dans **SQL Editor**, collez et exécutez `supabase/schema.sql`.
3. Allez dans **Authentication > URL Configuration**.
   - Site URL : l'adresse de votre SaaS (ex. `https://folio.vercel.app`).
   - Redirect URLs : ajoutez `https://folio.vercel.app/**` (et `http://localhost:5173/**` pour le local).
4. Facultatif : **Authentication > Providers > Email**, mot de passe de 8 caractères minimum.

### 2. Kkiapay
Créez un compte sur [kkiapay.me](https://kkiapay.me) et récupérez, dans **Développeurs > Clés API**, les clés publique, privée et secrète. Testez avec les clés de test et `VITE_KKIAPAY_SANDBOX=true` (numéro de test MTN Bénin qui réussit, d'après la doc Kkiapay : `22961000000`), puis mettez les clés réelles avec `VITE_KKIAPAY_SANDBOX=false` et redéployez.

### 3. Jeton Vercel (déploiement des portfolios)
Dans **Vercel > Account Settings > Tokens**, créez un jeton. Si les portfolios doivent vivre dans une équipe, renseignez aussi son ID dans `DEPLOY_TEAM_ID`.
> Le plan Hobby de Vercel est réservé à un usage non commercial : pour vendre ce service, utilisez un compte **Pro**.

### 4. Déployer le SaaS
1. Poussez ce dossier sur GitHub, puis importez-le dans Vercel (le framework Vite est détecté automatiquement).
2. Dans **Settings > Environment Variables**, ajoutez toutes les variables de `.env.example`.
3. Déployez.

### 5. Offre de lancement (facultatif)
`PROMO_CODE` (ex. `Prince12`, majuscules indifférentes) offre la publication d'**un portfolio par compte**, jusqu'au jour `VITE_PROMO_UNTIL` inclus (`AAAA-MM-JJ`, heure du Bénin). Pour 3 jours à partir d'une ouverture le 20 novembre : `2026-11-22`. Le lendemain, le code est refusé et seul le paiement reste proposé. Après toute modification sur Vercel, redéployez. Les portfolios offerts apparaissent à 0 FCFA dans **Paiements** et ne comptent ni dans les revenus ni dans les clients payants.

### 6. Devenir administrateur
Inscrivez-vous sur votre site, puis exécutez dans Supabase :
```sql
update public.profiles set role = 'admin' where email = 'votre@email.com';
```
Le lien **Administration** apparaît alors dans la barre du haut.

## Développement local
```bash
npm install
cp .env.example .env      # puis remplissez les valeurs
npm run dev               # interface seule
npx vercel dev            # interface + API de publication
npm run build             # vérification des types + build de production
```

## Organisation du code
| Dossier | Rôle |
|---|---|
| `shared/` | Modèle de données et générateur HTML des portfolios, partagés par le navigateur (aperçu en direct) et le serveur (site déployé) |
| `api/publish.ts` | Vérifie l'utilisateur et le paiement Kkiapay (ou le code promo), déploie sur Vercel, enregistre l'URL |
| `src/pages/` | Accueil, connexion, mes portfolios, éditeur, administration |
| `supabase/schema.sql` | Tables, sécurité (RLS), déclencheurs d'activité, statistiques admin, stockage |

## Sécurité
- Les clients ne peuvent modifier que le contenu et le style. Le statut de paiement, l'URL et le rôle ne sont écrits que par le serveur.
- Chaque transaction Kkiapay est vérifiée côté serveur, liée au portfolio pour lequel elle a été payée, et ne peut servir qu'une seule fois.
- Les republications sont espacées d'au moins 30 secondes pour protéger le quota de déploiements Vercel.
- Tout le texte saisi est échappé et les liens dangereux (`javascript:`, etc.) sont filtrés dans les sites générés.

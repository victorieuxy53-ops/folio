# Folio — portfolios professionnels à 2 000 FCFA

Les clients créent leur portfolio sans code. Ils choisissent un style (6 mises en page animées, 8 palettes ou leurs propres couleurs, 6 typographies) et paient 2 000 FCFA (Mobile Money ou carte via SasPay). Leur site est alors déployé automatiquement sur Vercel. Le propriétaire suit toute l'activité depuis `/admin`.

**Pile technique** : Vue 3 + Vite + Tailwind 4 · Supabase (auth, base Postgres, stockage d'images) · une fonction Vercel (`api/publish.ts`).

## Mise en route

### 1. Supabase
1. Créez un projet sur [supabase.com](https://supabase.com).
2. Dans **SQL Editor**, collez et exécutez `supabase/schema.sql`.
3. Allez dans **Authentication > URL Configuration**.
   - Site URL : l'adresse de votre SaaS (ex. `https://folio.vercel.app`).
   - Redirect URLs : ajoutez `https://folio.vercel.app/**` (et `http://localhost:5173/**` pour le local).
4. Facultatif : **Authentication > Providers > Email**, mot de passe de 8 caractères minimum.
5. **E-mails** : sans SMTP personnalisé, Supabase n'envoie ses e-mails qu'aux membres de votre équipe Supabase. Vos clients ne reçoivent rien, même dans les spams. Désactivez **Confirm email** (inscription immédiate), et configurez un SMTP dans **Authentication > Emails > SMTP Settings** (ex. Brevo, gratuit : `smtp-relay.brevo.com`, port `587`) pour « Mot de passe oublié ».

### 2. SasPay (paiement)
Le client paie sur la page sécurisée de SasPay (Mobile Money ou carte), puis revient sur l'éditeur, qui publie son portfolio. Le serveur vérifie chaque paiement auprès de SasPay avant de publier.
1. **Tester** : sur [app.saspay.me](https://app.saspay.me), passez en **Sandbox** (menu du compte ; compte séparé, sans KYC), créez une clé API dans **Développeur** (`sk_test_…`, scope PAYIN ou BOTH) et mettez-la dans `SASPAY_API_KEY`. En bac à sable, le dernier chiffre du numéro décide du résultat : `0` réussit (ex. `0197234560`), `1` échoue, `9` reste en attente.
2. **Encaisser pour de vrai** : sur le compte Live (KYC validé), créez une clé `sk_live_…`, remplacez `SASPAY_API_KEY` sur Vercel et redéployez. Faites un premier paiement réel.
3. Les frais suivent le réglage de votre compte SasPay (**Paramètres > Frais**). L'administration affiche le montant net que vous recevez.

### 3. Jeton Vercel (déploiement des portfolios)
Dans **Vercel > Account Settings > Tokens**, créez un jeton. Si les portfolios doivent vivre dans une équipe, renseignez aussi son ID dans `DEPLOY_TEAM_ID`.
> Le plan Hobby de Vercel est réservé à un usage non commercial : pour vendre ce service, utilisez un compte **Pro**.

### 4. Déployer le SaaS
1. Poussez ce dossier sur GitHub, puis importez-le dans Vercel (le framework Vite est détecté automatiquement).
2. Dans **Settings > Environment Variables**, ajoutez toutes les variables de `.env.example`.
3. Déployez.

### 5. Offre de lancement (facultatif)
`PROMO_CODE` (ex. `Prince12`, majuscules indifférentes) offre la publication d'**un portfolio par compte**, du jour `PROMO_FROM` à 00:00 au jour `PROMO_UNTIL` à 23:59 inclus (`AAAA-MM-JJ`, heure du Bénin). Mettez les mêmes dates dans `VITE_PROMO_FROM` et `VITE_PROMO_UNTIL` : le site s'en sert pour afficher le champ « Code promo », le serveur vérifie les siennes. Les textes suivent ces dates, par exemple avec `2026-11-20` et `2026-11-24` : « Offre de lancement, valable du 20 au 24 novembre 2026. » (sur deux mois : « du 28 novembre au 3 décembre 2026 »). Hors période, le champ n'apparaît pas, le code est refusé (« Le code promo est valable du … au … ») et seul le paiement reste proposé. Après toute modification sur Vercel, redéployez. Les portfolios offerts apparaissent à 0 FCFA dans **Paiements** et ne comptent ni dans les revenus ni dans les clients payants.

### 6. Devenir administrateur
Inscrivez-vous sur votre site, puis exécutez dans Supabase :
```sql
update public.profiles set role = 'admin' where email = 'votre@email.com';
```
Le lien **Administration** apparaît alors dans la barre du haut (rechargez la page). Si `/admin` affiche « Accès réservé », la commande a été exécutée dans un autre projet Supabase que celui de `VITE_SUPABASE_URL` sur Vercel, ou avec un autre e-mail.

L'administration montre les chiffres clés, les revenus, les visites, le parcours du visiteur au client, et tout le journal d'activité : inscriptions, portfolios créés, paiements, codes promo, mises en ligne, et chaque **échec de mise en ligne avec sa raison** (paiement refusé, erreur SasPay ou Vercel…).

**Vérification en 2 étapes** : à la première visite de l'administration, scannez le QR code avec **Google Authenticator** (ou une application équivalente), puis entrez le code à 6 chiffres. Ce code est ensuite demandé à chaque connexion : sans lui, la base refuse l'accès aux données de la plateforme, même avec le bon mot de passe.
Téléphone perdu : exécutez dans Supabase, puis scannez le nouveau QR code proposé :
```sql
delete from auth.mfa_factors where user_id = (select id from auth.users where email = 'votre@email.com');
```

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
| `api/publish.ts` | Vérifie l'utilisateur et le paiement SasPay (ou le code promo), déploie sur Vercel, enregistre l'URL |
| `src/pages/` | Accueil, connexion, mes portfolios, éditeur, administration |
| `supabase/schema.sql` | Tables, sécurité (RLS), déclencheurs d'activité, statistiques admin, stockage |

## Sécurité
- Les clients ne peuvent modifier que le contenu et le style. Le statut de paiement, l'URL et le rôle ne sont écrits que par le serveur.
- La clé SasPay reste sur le serveur. Chaque paiement est vérifié auprès de SasPay (statut `SUCCESS` seulement), lié au portfolio pour lequel il a été ouvert, et ne sert qu'une seule fois. Un paiement en cours est toujours réutilisé : un client ne paie jamais deux fois.
- Les republications sont espacées d'au moins 30 secondes pour protéger le quota de déploiements Vercel.
- Tout le texte saisi est échappé et les liens dangereux (`javascript:`, etc.) sont filtrés dans les sites générés.

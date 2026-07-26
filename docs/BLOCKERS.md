# StockRadar — Blocages ouverts

> Dernière revue : 26 juillet 2026.
>
> Chacun de ces points demande une action **humaine** — une clé à créer, un
> domaine à vérifier, une information légale à fournir, un arbitrage à rendre.
> Aucun ne se résout en écrivant du code seul, c'est pour ça qu'ils sont ici et
> pas dans le backlog.

| # | Blocage | Gravité | Bloque |
|---|---|---|---|
| 1 | `RESEND_API_KEY` absente de Vercel | 🔴 | Toute la newsletter, et les crons dès lundi |
| 2 | Aucun domaine vérifié chez Resend | 🔴 | L'envoi à de vrais abonnés |
| 3 | 7 champs légaux vides | 🟠 | Toute communication publique du site |
| 4 | `npm run lint` en échec | 🟡 | Le branchement du lint sur la CI |
| 5 | `CRON_SECRET` = `dev-secret-123` | 🟠 | Rien fonctionnellement, mais c'est une porte ouverte |

---

## 1. `RESEND_API_KEY` absente de Vercel

### Symptôme

Depuis le prochain jour ouvré, les deux crons de production répondront
**HTTP 500** avec un corps de ce genre :

```json
{
  "error": "Configuration incomplète",
  "job": "morning-brief",
  "missing": ["RESEND_API_KEY"],
  "hint": "Renseigner ces variables dans les settings Vercel puis redéployer."
}
```

Le dashboard Vercel affichera donc deux exécutions de cron en échec par jour
ouvré, matin et soir.

### Cause

**C'est le comportement voulu, et c'est un changement récent, pas une
régression.**

Avant la phase 0, `lib/email.ts` retournait silencieusement quand la clé était
absente. Les crons concluaient `success: true` sans qu'un seul email parte : la
newsletter est restée muette en production pendant des semaines sans qu'aucune
alerte ne le signale. Une inscription ne pouvait pas aboutir, et rien ne le
disait.

`lib/env-guard.ts` déclare désormais `RESEND_API_KEY` dans `REQUIRED_CRON_ENV`
et `guardCronEnv()` refuse de laisser un cron s'exécuter à moitié **en
production**. Hors production, l'absence est seulement loggée — on peut
toujours lancer un cron en local sans compte Resend.

Un 500 bruyant est le résultat recherché : il est visible, contrairement au
succès mensonger qu'il remplace.

### Action attendue de ta part

1. Créer un compte sur [resend.com](https://resend.com) si ce n'est pas fait
   (plan gratuit : 3 000 emails/mois, 100/jour).
2. Créer une clé d'API avec la permission **Sending access** — pas `Full
   access`. La clé ne sert qu'à envoyer ; lui donner les droits de gestion du
   domaine et des clés serait gratuit en risque et nul en bénéfice.
3. La poser sur Vercel : *Project settings → Environment Variables*
   - **Name** : `RESEND_API_KEY`
   - **Value** : la clé (`re_...`)
   - **Type** : **Sensitive** — la valeur devient illisible après
     enregistrement, y compris pour toi. C'est le bon réglage pour un secret
     d'envoi : on ne la relit jamais, on la remplace.
   - **Environments** : **Production** *et* **Preview**. Sans Preview, chaque
     déploiement de branche repartira en 500 sur les crons et tu croiras à une
     régression.
4. **Redéployer.** Une variable d'environnement n'est injectée qu'au build :
   la poser ne suffit pas, le déploiement en cours ne la verra jamais.
5. Vérifier :
   ```bash
   curl -H "Authorization: Bearer $CRON_SECRET" \
     https://stockradar-five.vercel.app/api/cron/morning-brief
   ```
   Attendu : `200` et un `summary` avec `sent`, `failed`, `errors`.

⚠️ À l'étape 5, lire `failed` et `errors`, pas seulement le code HTTP.
`resend.emails.send()` **ne rejette pas** quand l'API refuse : elle résout avec
`{ data: null, error: {...} }`. Un `200` avec `sent: 0, failed: 1` est un
échec — et c'est très probablement le blocage n°2 ci-dessous.

---

## 2. Aucun domaine vérifié chez Resend

### Symptôme

Une fois la clé posée, les envois échouent en **403** avec un message du type
« The domain is not verified ». Le cron répond `200`, mais son `summary`
montre `sent: 0`, `failed: N`, et l'erreur dans `errors[]`.

### Cause

Resend n'accepte d'envoyer depuis un domaine qu'après en avoir obtenu la
preuve par enregistrements DNS. `stockradar.fr` n'est pas vérifié — il n'est
même pas enregistré, cf. le blocage « pas de nom de domaine » de
`HISTORY_AND_ROADMAP.md`.

**`lib/email.ts` utilisait `StockRadar <briefing@stockradar.fr>`** comme
expéditeur. Chaque envoi aurait donc échoué en 403, y compris avec une clé
parfaitement valide — le blocage n°1 aurait été résolu sans que rien ne parte,
pour une raison entièrement différente.

C'est corrigé : l'expéditeur est désormais `StockRadar <onboarding@resend.dev>`,
le domaine de test que Resend fournit vérifié d'avance.

### Ce que ça implique tant que ça dure

`onboarding@resend.dev` fonctionne sans vérification, **mais n'autorise
l'envoi qu'à l'adresse email du titulaire du compte Resend**. Toute tentative
d'envoi vers une autre adresse est refusée.

Concrètement : la chaîne technique est validable de bout en bout (inscription →
email de confirmation → clic → `verified: true`) à condition de s'inscrire
avec l'adresse du compte Resend. Mais **la newsletter ne peut pas être
diffusée**. Ne pas ouvrir les inscriptions au public dans cet état : les
abonnés resteraient bloqués à `verified: false` sans jamais rien recevoir,
ce qui est exactement la situation dont on sort.

### Action attendue de ta part

Deux options, dans l'ordre de coût croissant :

**a. Valider la chaîne dès maintenant, sans domaine.** Rien à faire :
s'inscrire sur le site avec l'adresse du compte Resend, et vérifier que
l'email de confirmation arrive. C'est le test à faire le jour où tu poses la
clé.

**b. Diffuser réellement.** Acheter un domaine (~10 €/an), le connecter à
Vercel, puis dans Resend : *Domains → Add Domain* → poser les
enregistrements DNS fournis (SPF, DKIM, et de préférence DMARC) → attendre la
vérification. Ensuite seulement, remettre une adresse de ce domaine dans la
constante `FROM` de `lib/email.ts`.

Ne pas faire (b) à moitié : une adresse d'un domaine ajouté mais non encore
vérifié donne le même 403 qu'aujourd'hui, en moins lisible.

---

## 3. Les 7 champs légaux vides de `lib/legal.ts`

### Symptôme

Les pages `/mentions-legales` et `/confidentialite` affichent un encart rouge
« à compléter » à la place des informations de l'éditeur.
`node scripts/audit-project.mjs` les signale en jaune, hors score.

### Cause

Ce sont des informations qui n'existent que dans ta tête et dans tes papiers —
aucun code ne peut les inventer. Elles sont obligatoires au titre de
l'article 6-III de la LCEN (mentions légales) et de l'article 13 du RGPD
(information de la personne concernée).

Le choix fait en phase 0 est de rendre le manque **visible** plutôt que
silencieux : le site reste publiable, mais l'omission s'affiche.

### Action attendue de ta part

Remplir les 7 constantes de `lib/legal.ts`, actuellement toutes à `null` :

| # | Champ | Attendu |
|---|---|---|
| 1 | `editorName` | Nom et prénom (entrepreneur individuel) ou raison sociale |
| 2 | `editorLegalForm` | Ex. « entrepreneur individuel », « SASU au capital de 1 000 € » |
| 3 | `editorAddress` | Adresse postale complète du siège ou du domicile déclaré |
| 4 | `editorSiren` | SIREN (9 chiffres) ou SIRET (14 chiffres) |
| 5 | `editorVat` | TVA intracommunautaire — **facultatif** si franchise en base de TVA |
| 6 | `publicationDirector` | Directeur de la publication (art. 6-III-1 LCEN) |
| 7 | `contactEmail` | Adresse de contact, sert aussi de canal d'exercice des droits RGPD |

Nuance importante : `missingLegalFields()` n'en contrôle que **6**.
`editorVat` en est volontairement exclu, parce qu'il est légitimement vide en
franchise en base de TVA — le laisser dans la liste obligatoire produirait une
alerte permanente et fausse. L'audit, lui, affiche bien les 7 pour que tu
puisses trancher toi-même sur la TVA.

Sans SIREN — si le projet n'est adossé à aucune structure déclarée — il n'y a
pas de bricolage possible : soit tu déclares une activité, soit le site reste
en l'état, avec l'encart rouge assumé, tant qu'il n'y a ni monétisation ni
diffusion large.

### Point connexe, même fichier

`UNCONFIRMED_RETENTION_MONTHS = 12` est annoncé sur `/confidentialite`, mais
**aucune purge n'existe**. Un abonné `verified: false` reste en base
indéfiniment. Le texte décrit donc une politique que le code n'applique pas.
À implémenter (suppression des `Subscriber` non vérifiés dont `createdAt`
dépasse 12 mois, par exemple dans le cron du matin) — c'est du code, pas une
action de ta part, mais ça ne peut pas rester en écart éternellement.

---

## 4. `npm run lint` échoue

### Symptôme

```
npm run lint      # biome check . → une vingtaine de signalements, exit 1
```

### Cause

Biome a été ajouté en phase 0 avec sa configuration et ses scripts, **sans
reformater le code existant**. Les ~22 signalements sont tous antérieurs à son
introduction : mise en forme, `import type` manquants, deux SVG sans
`<title>`. Les fichiers ajoutés depuis sont propres.

C'était délibéré : reformater tout l'arbre dans le même commit que
l'introduction de l'outil aurait noyé le vrai diff. Le lint n'est donc
volontairement **pas branché sur la CI** tant que la dette n'est pas soldée.

### Action attendue de ta part

Un arbitrage, puis une commande :

```bash
npm run lint:fix
```

À faire **dans un commit dédié, sans aucun autre changement**, pour que le
diff reste relisible. Vérifier que `npm test` et `npm run build` passent
toujours après — Biome touche à la mise en forme, mais aussi aux imports.

Ensuite seulement, ajouter `npm run lint` au workflow `.github/workflows/`,
sinon la dette se reconstitue.

---

## 5. `CRON_SECRET` vaut `dev-secret-123` en production

### Symptôme

Aucun. Tout fonctionne — c'est bien le problème.

### Cause

Valeur de développement posée au premier déploiement et jamais remplacée. Elle
est présente dans `.env.vercel.local`, et elle a été **écrite en clair dans
`PROJECT_STATUS.md`**, un fichier versionné sur un dépôt GitHub. Elle doit
donc être considérée comme compromise, indépendamment de sa faiblesse
intrinsèque.

Ce que ça permet à quiconque la connaît : déclencher les crons à volonté sur
`/api/cron/morning-brief` et `/api/cron/evening-recap`, et lire
`/api/debug-sources`. Donc écrire dans la base de production, épuiser le quota
Finnhub (60 req/min en gratuit), et — une fois le blocage n°1 résolu —
**déclencher des envois d'emails**.

### Action attendue de ta part

1. Générer un secret fort :
   ```bash
   openssl rand -base64 32
   ```
2. Le poser sur Vercel en `CRON_SECRET`, **Sensitive**, Production + Preview.
3. Redéployer.
4. Mettre à jour ta copie locale de `.env.vercel.local`. Le `CRON_SECRET` de
   `.env` (dev) n'a pas besoin de changer : il ne protège qu'un localhost.
5. Vérifier que l'ancien secret ne passe plus :
   ```bash
   curl -i -H "Authorization: Bearer dev-secret-123" \
     https://stockradar-five.vercel.app/api/cron/morning-brief
   # attendu : 401
   ```

Note : Vercel envoie lui-même cet en-tête `Authorization: Bearer <CRON_SECRET>`
sur les crons planifiés (cf. `lib/auth.ts`). Changer la valeur sur Vercel et
redéployer suffit donc : les crons planifiés suivent automatiquement. Ce sont
tes propres `curl` manuels qu'il faudra mettre à jour.

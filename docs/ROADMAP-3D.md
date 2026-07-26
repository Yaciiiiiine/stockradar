# StockRadar — Roadmap 3D (phases 2 et 3)

> Statut : **non commencé**. Ce document est une spécification, pas un compte-rendu.
> Phases 0 (assainissement) et 1 (animations 2D) sont livrées — voir `PROJECT_STATUS.md`.

Le principe qui gouverne tout ce document : la 3D est une **représentation des
données réelles du briefing**, pas un décor. Chaque forme affichée doit être la
projection d'une valeur qui existe déjà en base (`StockEntry.price`,
`.change`, `.market`, `.sparkline`). Une scène 3D qui serait jolie mais
déconnectée de la base n'a pas sa place ici : elle coûterait le poids d'une
librairie de rendu pour un GIF.

---

## Contraintes non négociables

Elles s'appliquent aux deux phases. Une PR qui en casse une ne passe pas, même
si le rendu est réussi.

### 1. `next/dynamic` avec `ssr: false`

Aucun composant qui touche WebGL ne doit être rendu côté serveur. Three.js
accède à `window`, `document` et au contexte canvas au moment du montage : un
rendu serveur plante le build ou, pire, passe et casse l'hydratation.

```tsx
const MarketGlobe = dynamic(() => import("@/components/three/MarketGlobe"), {
  ssr: false,
  loading: () => <MarketGlobeFallback />,
});
```

Corollaire : le composant 3D ne peut pas être un Server Component, et la page
qui l'accueille doit rester un Server Component qui lit la base. Les données
descendent en props sérialisables.

### 2. Fallback statique obligatoire

Chaque scène 3D a une version non-WebGL qui affiche **la même information**.
Ce n'est pas un spinner : c'est le rendu de repli permanent pour les cas où la
3D ne doit pas ou ne peut pas s'afficher.

Le fallback est servi quand :

- le composant est en cours de chargement (`loading:` ci-dessus) ;
- `prefers-reduced-motion: reduce` est actif (voir contrainte 4) ;
- le contexte WebGL est indisponible (navigateur ancien, GPU blacklisté,
  `canvas` bloqué par une extension) — à détecter et à traiter, pas à ignorer ;
- une erreur est levée dans la scène (`error boundary` autour du canvas).

Pour le Market Globe, le fallback est la carte statique des deux places avec
leurs performances chiffrées. Pour la treemap, c'est la grille 2D des 20
cartes déjà existante.

### 3. `frameloop="demand"`

Le canvas ne tourne **pas** en boucle continue. Les données du briefing
changent deux fois par jour : une boucle à 60 fps permanente viderait la
batterie d'un mobile pour redessiner exactement la même image.

```tsx
<Canvas frameloop="demand" ...>
```

Le rendu est invalidé explicitement (`invalidate()`) sur : montage, changement
de données, interaction pointeur, et pendant la durée d'une transition animée.
Une animation continue justifiée (rotation lente du globe) doit être bornée
dans le temps ou pilotée par l'interaction, pas laissée en `useFrame` infini.

### 4. `prefers-reduced-motion`

Respecté, et **au-delà de l'atténuation**. `lib/motion.ts` porte déjà la
convention 2D du projet ; la 3D s'y branche. Quand la préférence est active :

- aucune rotation, aucun mouvement de caméra, aucune transition de hauteur ;
- la scène est rendue **une seule fois**, statique, ou remplacée par le
  fallback de la contrainte 2 — au choix, mais le mouvement est nul, pas
  simplement ralenti.

### 5. Budget cumulé 600 KB gzip

C'est un plafond **cumulé sur tout le JS client de l'application**, phases 2 et
3 comprises — pas un budget par scène ni un delta.

`npm run bundle-size` (`scripts/bundle-size.mjs`) mesure le poids gzip du JS
client et existe précisément pour arbitrer ça. Il doit être lancé à chaque
étape de l'implémentation, pas à la fin.

Conséquences pratiques :

- import sélectif depuis `three`, jamais `import * as THREE` ;
- `@react-three/drei` est un buffet — n'en prendre que les helpers utilisés,
  et vérifier au bundle-size que le tree-shaking a bien opéré ;
- si le budget est dépassé, c'est la fonctionnalité qui est coupée, pas le
  budget qui est relevé.

### 6. Un seul `<Canvas>` par page

Deux contextes WebGL sur une même page, c'est deux fois la mémoire GPU et,
sur mobile, un risque réel de perte de contexte. Si une page doit montrer
plusieurs objets 3D, ils partagent une scène unique.

Cette contrainte est ce qui décide de l'architecture de la phase 3 : la
treemap et le détail d'une action ne peuvent pas être deux canvas côte à côte.

---

## Phase 2 — Market Globe en hero

### Intention

Remplacer le hero textuel de `/` par un globe qui répond à une question en une
seconde : **les marchés montent ou descendent aujourd'hui ?**

### Rendu

- **Globe low-poly.** Volontairement facetté, pas de texture photoréaliste :
  une sphère texturée coûte un asset lourd pour un gain nul ici. Géométrie
  icosaédrique, matériau plat, arêtes lisibles. La Terre est un support de
  lecture, pas le sujet.
- **Deux barres lumineuses**, plantées sur Paris et sur New York, orientées
  selon la normale à la surface.
- **Hauteur ∝ performance du marché.** La hauteur d'une barre est la
  performance agrégée du marché correspondant, calculée depuis les
  `StockEntry` du briefing du jour : moyenne des `change` des 10 tickers `FR`
  pour Paris, des 10 tickers `US` pour New York.
- **Couleur = signe.** Vert en hausse, rouge en baisse, avec les mêmes valeurs
  que le reste du produit (`#34c759` / `#ff3b30`, cf. `lib/email.ts`).
- Une barre de performance nulle reste **visible** : hauteur minimale non
  nulle, sinon un marché plat disparaît et se lit comme une donnée manquante.

### Données

La page reste un Server Component qui lit la base et passe au composant
dynamique un objet minimal — deux marchés, deux nombres, une date. Pas de
`StockEntry` complet dans les props : c'est du poids réseau pour rien.

Le cas « pas de briefing aujourd'hui » (week-end, cron en échec) doit être
traité explicitement. Pas de globe muet, pas de barres à zéro qui mentent :
le hero affiche la date du dernier briefing disponible et le dit.

### Interaction

Rotation lente au repos, arrêtée dès que le pointeur entre, reprise à la
sortie. Survol d'une barre : libellé de la place et performance chiffrée.
Aucun contrôle de caméra libre — on ne donne pas à l'utilisateur les moyens de
se perdre derrière le globe.

Sur mobile : pas de rotation automatique du tout, et le survol devient un
appui. Le budget batterie prime.

---

## Phase 3 — Treemap 3D et page action

### 3a — Treemap 3D des 20 actions

Une treemap où chaque action est un pavé :

- **surface** ∝ importance de la ligne dans le briefing (à trancher au moment
  de l'implémentation : capitalisation si on ajoute la donnée, sinon volume,
  sinon surface égale — une surface arbitraire non documentée serait pire que
  des surfaces égales) ;
- **hauteur** ∝ `|change|` ;
- **couleur** = signe de `change`, même palette que la phase 2.

Le clic sur un pavé mène à `/stock/[ticker]`. C'est la treemap qui remplace la
grille 2D, ou qui coexiste avec elle derrière un basculement — auquel cas la
grille 2D reste le rendu par défaut, la treemap l'option.

### 3b — Page `/stock/[ticker]`

Route dynamique pour une action : historique de la valeur à travers les
briefings archivés, sa `sparkline` intraday, sa raison du jour, ses
performances passées.

Cette page n'existe pas aujourd'hui — les tickers ne sont cliquables nulle
part. Elle demande donc aussi :

- une requête qui agrège les `StockEntry` d'un ticker sur tous les
  `DailyBrief`, triés par date ;
- `generateStaticParams` sur les 20 tickers connus (`lib/sources/tickers.ts`) ;
- un `not-found` propre pour un ticker inconnu ;
- des `metadata` par ticker, sinon les 20 pages partagent un titre et le SEO
  déjà en place (`app/sitemap.ts`, `app/opengraph-image.tsx`) est gâché.

La visualisation 3D de cette page, s'il y en a une, réutilise **le canvas de
la treemap** si les deux sont sur la même page. Sinon `/stock/[ticker]` a son
propre canvas unique — contrainte 6.

---

## Ordre d'implémentation suggéré

1. `npm run bundle-size` **avant** d'installer quoi que ce soit, pour avoir la
   ligne de base à comparer.
2. Ajouter la dépendance de rendu et mesurer immédiatement le coût à vide.
3. Phase 2 fallback statique d'abord, globe ensuite. Le fallback est la
   fonctionnalité ; la 3D est l'amélioration.
4. Phase 3a, puis 3b — ou 3b seule, qui a une valeur produit propre et ne
   demande aucune 3D. Si le budget de la contrainte 5 est déjà consommé par la
   phase 2, **faire 3b sans 3a** est la bonne décision.

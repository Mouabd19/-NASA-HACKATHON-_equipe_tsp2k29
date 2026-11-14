# SOL ZÉRO — Sources de données NASA

> **NASA Space Apps Challenge 2026 — Health Monitoring Software for Astronauts**  
> Inventaire des sources officielles à intégrer au prototype SOL ZÉRO.

## Objectif

SOL ZÉRO transforme des mesures physiologiques en **tendances, projections de santé et aides à la décision** pour une mission vers Mars : que faire maintenant, qui prévenir et quelle marge reste-t-il à l'arrivée ?

Le projet privilégie les **données, archives, API et normes de la NASA**. Les observations personnelles, résultats publiés et scénarios simulés doivent être clairement distingués dans l'interface.

## Sources prioritaires

| Source | Contenu | Application dans SOL ZÉRO | Type | Priorité |
|---|---|---|---|---|
| [NASA Open Science Data Repository (OSDR)](https://osdr.nasa.gov/) | Données biologiques et omiques de missions spatiales | Contextualiser les changements biologiques observés chez des équipages | Données de recherche | P0 |
| [OSDR — Inspiration4, OSD-575](https://osdr.nasa.gov/bio/repo/data/studies/OSD-575) | Analyses de sérum sanguin des quatre membres d'Inspiration4 | Exemple concret de biomarqueurs humains issus d'un vol spatial | Dataset NASA | P0 |
| [NASA Life Sciences Data Archive (LSDA)](https://nlsp.nasa.gov/explore/mtable/lsda_dataset/lsda_dataset) | Études physiologiques en vol et analogues au sol | Étayer les modèles d'endurance, de santé osseuse et de récupération | Archives scientifiques | P0 |
| [NASA-STD-3001, volume 1, rév. C](https://standards.nasa.gov/sites/default/files/standards/NASA/C//nasa-std-3001-vol-1-rev-c-signature.pdf) | Exigences de santé et de sécurité des équipages | Référencer les seuils avec leurs identifiants et leur contexte | **Norme, pas dataset** | P0 |
| [NASA DONKI API](https://api.nasa.gov/) | Éruptions solaires et événements de particules énergétiques | Rejouer une vraie alerte solaire et déclencher le scénario d'abri | API événementielle | P0 |
| [NASA JPL Horizons API](https://ssd-api.jpl.nasa.gov/doc/horizons.html) | Éphémérides et distances planétaires | Calculer le délai de propagation radio Terre–Mars | API astronomique | P0 |
| [NASA Planetary Data System (PDS)](https://pds.nasa.gov/) | Archives de données scientifiques planétaires, dont Curiosity/RAD | Documenter le risque radiatif en croisière et à la surface | Archives instrumentales | P0 |

### Liens supplémentaires utiles

- **Catalogue NASA des jeux de données Inspiration4** : https://www.nasa.gov/osdr-latest-news-i4-mission-datasets/
- **Article scientifique sur Inspiration4 et les données cardiovasculaires** (*Nature*, 2024) : https://www.nature.com/articles/s41586-024-07648-x
- **Événements de particules solaires DONKI autour du 10 septembre 2017** : https://api.nasa.gov/DONKI/SEP?startDate=2017-09-10&endDate=2017-09-12&api_key=DEMO_KEY
- **Procédure NASA d'accès aux jeux de données contrôlés** : https://www.nasa.gov/reference/osdr-tutorials-requesting-controlled-access-datasets/

## Point important : Apple Watch et Inspiration4

Les quatre membres de la mission **Inspiration4 (2021)** ont porté des **Apple Watch Series 6** pour des mesures physiologiques. Des **résultats publiés** comprennent notamment des analyses de fréquence cardiaque et de variabilité de la fréquence cardiaque (VFC).

**Limite à ne pas masquer :** nous n'avons **pas identifié de fichier public confirmé** contenant toutes les mesures Apple Watch individuelles **horodatées** (FC/VFC) des astronautes. Le dataset **OSD-575 n'est pas un export Apple Watch** : il concerne le sérum sanguin. Certains jeux humains bruts ou sensibles sont soumis à autorisation.

**Stratégie pour la démo :** importer un véritable export HealthKit/Apple Watch d'un membre volontaire de l'équipe, avec son consentement, et l'identifier comme **donnée personnelle de démonstration, non NASA**. Utiliser parallèlement les données NASA effectivement accessibles pour la validation scientifique et le contexte spatial.

## Utilisation prévue dans le MVP

| Fichier local envisagé | Provenance | Usage | Étiquette affichée |
|---|---|---|---|
| `data/solar-2017.json` | DONKI SEP/FLR | Rejeu d'un événement solaire réel | `NASA — événement` |
| `data/mars-communications.json` | JPL Horizons | Distance et délai radio selon les dates | `NASA — calculé` |
| `data/standards.json` | NASA-STD-3001 | Règles avec identifiant, version et lien vers la norme | `NASA — norme` |
| `data/radiation-model.json` | PDS/RAD + publications + hypothèses | Exposition indicative, avec incertitudes | `Publié / hypothèse` |
| `data/aerobic-model.json` | Études LSDA / publications | Projection de l'endurance | `Publié / hypothèse` |
| `data/bone-model.json` | Études LSDA / publications | Projection de la densité osseuse | `Publié / hypothèse` |
| `data/astronaut-j94.json` | Persona Haddad | Scénario médical de démonstration | `SIMULÉ` |
| `data/health-history.json` | Apple Watch de l'équipe, avec consentement | Vraie mesure physiologique et référence individuelle | `MESURE RÉELLE — NON NASA` |

> **Attention :** ces fichiers sont une proposition d'architecture, **pas** une liste de fichiers déjà publiés ou téléchargés. Leurs transformations et hypothèses devront être documentées.

## Travail d'intégration recommandé

1. **Récupérer et conserver localement** les réponses DONKI et Horizons nécessaires à la démonstration ; noter date de récupération, paramètres de requête et URL source. Le replay reste ainsi fonctionnel hors connexion.
2. **Encoder les normes NASA** avec leur numéro d'exigence, la version de la norme, le texte ou résumé validé, les unités et un lien de preuve. Vérifier l'applicabilité exacte des seuils avant d'en tirer une alerte individuelle.
3. **Choisir un jeu OSDR ou LSDA réellement téléchargeable**, documenter les colonnes, unités et conditions d'accès, puis en afficher un résultat explicite dans l'application.
4. **Utiliser les données d'une vraie Apple Watch** pour le check-in ; signaler les limites des mesures grand public (notamment VO₂max estimé et température du poignet).
5. **Tracer l'origine de chaque chiffre** dans l'interface : `NASA`, `PUBLIÉ`, `HYPOTHÈSE`, `SIMULÉ`, ou `MESURE RÉELLE`.

## Points de vigilance scientifique

- Inspiration4 est une **mission courte** : ses données ne permettent pas de prédire directement les effets d'un transit de plusieurs mois vers Mars.
- La **distance Terre–Mars** est utile pour la démo, mais le délai réel d'un équipage dépend de la trajectoire du vaisseau et de son architecture de communication.
- Les données de **Curiosity/RAD** décrivent un environnement de mesure donné ; elles ne constituent pas directement la dose individuelle reçue par un astronaute dans un véhicule protégé.
- Une **norme NASA** est un référentiel opérationnel, pas un diagnostic médical automatique. Les alertes du prototype restent une **aide à la décision démonstrative**.

## Proposition de valeur

> **SOL ZÉRO combine les mesures physiologiques, les archives biomédicales, les événements solaires, les éphémérides et les normes de la NASA pour répondre à trois questions : que faire maintenant, qui prévenir, et dans quel état arrivera-t-on sur Mars ?**

**Priorité hackathon :** quelques sources NASA **réellement intégrées et traçables** valent mieux qu'une grande liste de sources simplement citées.

# Prototype santé mentale (ROADMAP §11) — Steve (D)

Données **100 % SIMULÉES** (aucune personne réelle). Étiquette : « Prototype — données SIMULÉES — signal IA, pas un diagnostic ».
Hors du parcours de démo principal : il illustre la slide Vision (capture ou 20 s de vidéo).

## Chaîne
lunettes (simulées : transcription de la journée + capteurs)
→ **3 observateurs** indépendants (actions / paroles / corps), faits sans interprétation, rapports complémentaires
→ **3 psychologues** IA (état physico-psychique / anxiété / lien social et isolement), comparaison à la référence personnelle
→ **dossier** (règle fixe : niveau atteint par au moins 2 psychologues sur 3)
→ **psychologue humain au sol** : c'est lui qui décide. Aucun agent ne décide.

Modèle local **Ollama** (traitement « à bord », rien ne part sur Internet).

## Lancer
```bash
ollama pull qwen2.5:7b
node scripts/mental-agents/generate.mjs     # data/drift, data/control, data/truth.json
node scripts/mental-agents/run.mjs          # jours clés 65,74,78,85,94 × drift + control → public/data/mental/
```
Glissement dépressif injecté à **J75** (scénario `drift`) ; `control` = témoin sans glissement, même bruit de fond.
`run.mjs` ne lit jamais `data/truth.json`.

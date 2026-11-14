# Modèles 3D — crédits et licence

Usage **strictement non commercial, réservé au hackathon NASA Space Apps 2026** (SOL ZÉRO).
Ces fichiers sont dérivés de l'export glTF de [nqwrc/3d-anatomy](https://github.com/nqwrc/3d-anatomy) et sont distribués sous **CC BY-NC-SA 4.0**.

Attributions requises :
- "Z-Anatomy - The open source atlas of anatomy - CC-BY-SA 4.0"
- "BodyParts3D - The Database Center for Life Science - CC-BY-SA 2.1 Japan"
- "Cranial Nerves and Foramina - by University of Dundee, CAHID - CC-BY 4.0"
- "Anatomy of the Inner Ear - by University of Dundee School of Medicine - CC-BY-NC-SA 4.0"
- "Kidney - by lissiecowley - CC-BY-NC 4.0"
- "Brainder" et "White matter" — University of Washington

Notice amont : `License-Z-Anatomy.txt`. Régénération : `docs/tools/build-models.mjs`.

## Pour l'intégration (Walid)
- Compression **meshopt** (pas de Draco → aucun décodeur téléchargé depuis un CDN) : `useGLTF(url, false, true)` avec drei.
- Unités : mètres, Y vers le haut, +Z = face avant du corps, x > 0 = côté gauche de l'astronaute.
- Chaque calque contient un nœud par organe suivi (`userData.organId`, `userData.za_names`) + un nœud `<calque>:reste`.
- `manifest.json` : `anchor` = position monde du ⚠ (devant le corps, ou derrière pour `rachis` et `paravertebraux`).
- Budgets : 170–260 k triangles par calque, ~1 M si les 5 calques sont affichés ensemble.

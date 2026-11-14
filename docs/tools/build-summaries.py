import json, re
GEN = {"generatedBy": "IA-sol", "model": "Claude (Anthropic), rédigé hors ligne", "generatedAt": "2026-11-14", "reviewed": False,
       "note": "Synthèse IA rédigée au sol à partir des seuls chiffres du simulateur (src/sim, données de Mouad). À valider par le CMO. N'est jamais utilisée pour décider d'une alerte."}
P = "Projection du modèle, pas une mesure."
S = {
 "hanche": {
  (0,0): "Bilan de référence au sol (J0) : densité osseuse de la hanche à 100 % de la valeur pré-vol. C'est le point de départ de toutes les comparaisons. Le seuil NASA est de 95 % du pré-vol [V1 4027].",
  (30,0): "Densité estimée à 99,32 % du pré-vol, soit une perte de 0,68 %. La perte suit la pente attendue en apesanteur (−0,16 point par semaine). Statut nominal, au-dessus du seuil NASA de 95 % [V1 4027].",
  (60,0): "Densité estimée à 98,68 % du pré-vol (perte de 1,32 %), tendance −0,15 point par semaine. Toujours au-dessus du seuil de 95 % [V1 4027]. Mais au rythme actuel, la perte atteindrait 8,7 % au retour (J860), hors norme.",
  (94,0): "Densité estimée à 98,01 % du pré-vol (perte de 1,99 %), statut à surveiller. Le problème n'est pas aujourd'hui mais la trajectoire : au rythme actuel, 8,7 % de perte au retour (J860), sous le seuil NASA de 95 % [V1 4027]. Conduite proposée : ARED en charge lourde, calcium et vitamine D, et question des bisphosphonates au médecin au sol.",
  (210,0): "Projection à l'arrivée sur Mars (Sol 0, J210) au rythme actuel : 96,09 % du pré-vol, soit une perte de 3,91 %. Encore dans la norme mais à surveiller, et la pente mène à 8,7 % de perte au retour. " + P,
  (210,1): "Projection à Sol 0 (J210) avec le plan suivi : 97,37 % du pré-vol, soit une perte de 2,63 %, statut nominal. Le plan ralentit nettement la perte par rapport au rythme actuel (3,91 %). " + P,
  (860,0): "Projection au retour (J860) au rythme actuel : 91,30 % du pré-vol, soit une perte de 8,70 %. C'est sous le seuil NASA de 95 % [V1 4027] : statut hors seuil. Ce scénario justifie d'en parler dès maintenant avec le médecin au sol.",
  (860,1): "Projection au retour (J860) avec le plan suivi : 95,78 % du pré-vol, soit une perte de 4,22 %. C'est juste au-dessus du seuil NASA de 95 % [V1 4027] : statut à surveiller. Le plan divise la perte par deux, mais la marge reste mince (bisphosphonates : LeBlanc 2013).",
 },
 "femur": {
  (0,0): "Bilan de référence (J0) : densité du col du fémur à 100 % du pré-vol. Pour le col du fémur, le seuil NASA est de 90 % [V1 4027]. Statut nominal.",
  (30,0): "Col du fémur à 99,25 % du pré-vol, soit une perte de 0,75 %. La tendance est de −0,17 point par semaine. Loin du seuil de 90 % [V1 4027] : statut nominal.",
  (60,0): "Col du fémur à 98,55 % du pré-vol (perte de 1,45 %). La tendance est de −0,16 point par semaine. Marge confortable sur le seuil de 90 %.",
  (94,0): "Col du fémur à 97,81 % du pré-vol (perte de 2,19 %), statut nominal. La pente est régulière, un peu plus rapide qu'à la hanche. Les séances d'ARED en charge protègent aussi cette zone.",
  (210,0): "Projection à Sol 0 (J210) au rythme actuel : 95,70 % du pré-vol, soit une perte de 4,30 %. Statut nominal, au-dessus du seuil de 90 % [V1 4027]. " + P,
  (210,1): "Projection à Sol 0 (J210) avec le plan suivi : 97,11 % du pré-vol, soit une perte de 2,89 %. Statut nominal. " + P,
  (860,0): "Projection au retour (J860) au rythme actuel : 90,43 % du pré-vol, soit une perte de 9,57 %. C'est tout juste au-dessus du seuil NASA de 90 % pour le col [V1 4027] : statut à surveiller. " + P,
  (860,1): "Projection au retour (J860) avec le plan suivi : 95,36 % du pré-vol, soit une perte de 4,64 %. Statut nominal, avec plus de 5 points de marge sur le seuil. " + P,
 },
 "rachis": {
  (0,0): "Bilan de référence (J0) : densité du rachis lombaire à 100 % du pré-vol. Le seuil NASA est de 95 % [V1 4027]. Statut nominal.",
  (30,0): "Rachis à 99,66 % du pré-vol, soit une perte de 0,34 %. La colonne perd environ deux fois moins vite que la hanche. Statut nominal.",
  (60,0): "Rachis à 99,34 % du pré-vol (perte de 0,66 %). La perte reste lente et régulière (−0,07 point par semaine). Aucun signal.",
  (94,0): "Rachis à 99,01 % du pré-vol (perte de 1 %), statut nominal. La pente est la plus faible des trois sites osseux suivis. Pas d'action spécifique en plus du plan osseux général.",
  (210,0): "Projection à Sol 0 (J210) au rythme actuel : 98,05 % du pré-vol, soit une perte de 1,95 %. Statut nominal. " + P,
  (210,1): "Projection à Sol 0 (J210) avec le plan suivi : 98,69 % du pré-vol, soit une perte de 1,31 %. Statut nominal. " + P,
  (860,0): "Projection au retour (J860) au rythme actuel : 95,65 % du pré-vol, soit une perte de 4,35 %. C'est juste au-dessus du seuil de 95 % [V1 4027] : statut à surveiller. " + P,
  (860,1): "Projection au retour (J860) avec le plan suivi : 97,89 % du pré-vol, soit une perte de 2,11 %. Statut nominal. " + P,
 },
 "cuisse": {
  (0,0): "Bilan de référence (J0) : volume des muscles de la cuisse de 2 451 cm³ au scan. C'est la base de comparaison de toute la mission. Statut nominal.",
  (30,0): "Volume de la cuisse à 97,84 % de J0 (2 397 cm³), tendance −0,58 % par semaine. C'est la phase de perte la plus rapide, attendue en début de vol. Statut nominal.",
  (60,0): "Volume de la cuisse à 96,0 % de J0 (2 352 cm³). La tendance ralentit à −0,40 % par semaine. Statut nominal.",
  (94,0): "Volume de la cuisse à 94,05 % de J0 (2 304 cm³), tendance −0,32 % par semaine : statut à surveiller. L'alerte porte sur la tendance sur 7 jours, pas sur un point isolé. Conduite proposée : squat et soulevé de terre lourds sur l'ARED, protéines réparties dans la journée.",
  (210,0): "Projection à Sol 0 (J210) au rythme actuel : 88,77 % du volume de J0, statut hors seuil. Une cuisse affaiblie à l'arrivée complique les premières sorties sur Mars. " + P,
  (210,1): "Projection à Sol 0 (J210) avec le plan suivi : 92,17 % du volume de J0, statut à surveiller. Le plan gagne plus de 3 points par rapport au rythme actuel. " + P,
  (860,0): "Projection au retour (J860) au rythme actuel : 78,96 % du volume de J0, statut hors seuil. C'est la plus forte perte de tous les organes suivis. " + P,
  (860,1): "Projection au retour (J860) avec le plan suivi : 88,74 % du volume de J0, statut hors seuil. Le plan récupère près de 10 points, sans suffire à revenir dans la norme sur 860 jours. " + P,
 },
 "mollet": {
  (0,0): "Bilan de référence (J0) : volume du mollet de 890 cm³ au scan. C'est la base de comparaison de la mission. Statut nominal.",
  (30,0): "Mollet à 98,4 % du volume de J0 (876 cm³). La tendance est de −0,38 % par semaine. Statut nominal.",
  (60,0): "Mollet à 96,97 % du volume de J0 (863 cm³). La tendance reste stable autour de −0,36 % par semaine. Statut nominal.",
  (94,0): "Mollet à 95,51 % du volume de J0 (850 cm³), statut nominal. Très sollicité au sol, le mollet travaille peu en apesanteur. Les extensions de mollets sur l'ARED le protègent.",
  (210,0): "Projection à Sol 0 (J210) au rythme actuel : 91,58 % du volume de J0. Statut à surveiller. " + P,
  (210,1): "Projection à Sol 0 (J210) avec le plan suivi : 94,13 % du volume de J0. Statut à surveiller. " + P,
  (860,0): "Projection au retour (J860) au rythme actuel : 84,22 % du volume de J0. Statut hors seuil. " + P,
  (860,1): "Projection au retour (J860) avec le plan suivi : 91,55 % du volume de J0. Statut à surveiller. " + P,
 },
 "paravertebraux": {
  (0,0): "Bilan de référence (J0) : volume des muscles du dos (paravertébraux) de 610 cm³ au scan. Ils tiennent la colonne. Statut nominal.",
  (30,0): "Muscles du dos à 98,72 % du volume de J0 (602 cm³). La tendance est de −0,28 % par semaine. Statut nominal.",
  (60,0): "Muscles du dos à 97,63 % du volume de J0 (596 cm³). La perte reste régulière (−0,25 % par semaine). Statut nominal.",
  (94,0): "Muscles du dos à 96,51 % du volume de J0 (589 cm³), statut nominal. Leur perte peut expliquer une gêne au bas du dos signalée au check-in. La mobilité du dos fait partie du plan.",
  (210,0): "Projection à Sol 0 (J210) au rythme actuel : 93,45 % du volume de J0. Statut à surveiller. " + P,
  (210,1): "Projection à Sol 0 (J210) avec le plan suivi : 95,43 % du volume de J0. Statut nominal. " + P,
  (860,0): "Projection au retour (J860) au rythme actuel : 87,73 % du volume de J0. Statut hors seuil. " + P,
  (860,1): "Projection au retour (J860) avec le plan suivi : 93,43 % du volume de J0. Statut à surveiller. " + P,
 },
 "coeur": {
  (0,0): "Bilan de référence (J0) : VO₂max de 44,1 ml/kg/min, fraction d'éjection de 61,8 %. Bonne capacité d'endurance avant le départ. Statut nominal.",
  (30,0): "VO₂max à 42,2 ml/kg/min, soit 95,7 % du pré-vol. La baisse (environ −0,8 par semaine) est attendue en début de vol. Fraction d'éjection stable à 61,9 %.",
  (60,0): "VO₂max à 40,6 ml/kg/min, soit 92,2 % du pré-vol. Masse ventriculaire à 96,8 % de J0 : le cœur s'adapte à l'apesanteur. Toujours au-dessus des seuils NASA.",
  (94,0): "VO₂max à 39,3 ml/kg/min, soit 89,2 % du pré-vol : statut à surveiller. Au-dessus des deux seuils NASA (80 % du pré-vol [V1 4003] et 36,5 ml/kg/min [V1 4002]), mais la pente mène pile à la limite à l'arrivée sur Mars. Conduite proposée : intervalles sur vélo ou tapis un jour sur deux.",
  (210,0): "Projection à Sol 0 (J210) au rythme actuel : VO₂max de 36,5 ml/kg/min (83 % du pré-vol). C'est exactement le seuil NASA de 36,5 [V1 4002] : statut à surveiller. " + P,
  (210,1): "Projection à Sol 0 (J210) avec le plan suivi : VO₂max de 37,3 ml/kg/min (84,8 % du pré-vol). C'est au-dessus du seuil de 36,5 [V1 4002] : statut à surveiller. " + P,
  (860,0): "Projection au retour (J860) au rythme actuel : VO₂max de 34,5 ml/kg/min, soit 78,4 % du pré-vol. C'est sous les deux seuils NASA [V1 4002, V1 4003] : statut hors seuil. " + P,
  (860,1): "Projection au retour (J860) avec le plan suivi : VO₂max de 35,9 ml/kg/min, soit 81,6 % du pré-vol. C'est au-dessus de 80 % du pré-vol [V1 4003] mais sous 36,5 [V1 4002] : statut hors seuil. Le plan protège l'endurance sans suffire sur 860 jours.",
 },
 "sang": {
  (0,0): "Bilan de référence (J0) : FC de repos 57 bpm, SpO₂ 98,5 %, tension 116/76 mmHg. Hémoglobine à 15,1 g/dL. Toutes les valeurs sont dans la norme.",
  (30,0): "FC de repos 57 bpm, SpO₂ 99 %, tension 122/80 mmHg. Le volume des jambes est à 89,3 % de J0 : les fluides montent vers le haut du corps, comme attendu en apesanteur. Statut nominal.",
  (60,0): "FC de repos 60 bpm, SpO₂ 98,4 %, tension 122/77 mmHg. L'hémoglobine baisse lentement (14,7 g/dL), comme attendu (anémie spatiale, Trudel 2022). Statut nominal.",
  (94,0): "FC de repos 62 bpm, SpO₂ 98,7 %, tension 124/77 mmHg, hémoglobine 14,1 g/dL. La circulation reste dans les normes : statut nominal. Seul le VO₂max, suivi avec le cœur, est à surveiller.",
  (210,0): "Le modèle ne projette pas la circulation au-delà d'aujourd'hui. Dernières valeurs mesurées (J94) : FC 62 bpm, SpO₂ 98,7 %, hémoglobine 14,1 g/dL. Pour l'endurance à Sol 0, voir le cœur (VO₂max).",
  (210,1): "Le modèle ne projette pas la circulation au-delà d'aujourd'hui. Dernières valeurs mesurées (J94) : FC 62 bpm, SpO₂ 98,7 %, hémoglobine 14,1 g/dL. Pour l'endurance à Sol 0, voir le cœur (VO₂max).",
  (860,0): "Le modèle ne projette pas la circulation jusqu'au retour. Dernières valeurs mesurées (J94) : FC 62 bpm, SpO₂ 98,7 %, hémoglobine 14,1 g/dL. Pour l'endurance au retour, voir le cœur (VO₂max).",
  (860,1): "Le modèle ne projette pas la circulation jusqu'au retour. Dernières valeurs mesurées (J94) : FC 62 bpm, SpO₂ 98,7 %, hémoglobine 14,1 g/dL. Pour l'endurance au retour, voir le cœur (VO₂max).",
 },
 "reins": {
  (0,0): "Bilan de référence (J0) : aucun calcul à l'échographie. Calcium urinaire de 164 mg/24 h (référence 100–300). Statut nominal.",
  (30,0): "Calcium urinaire à 247 mg/24 h, en nette hausse depuis J0 : le calcium libéré par les os passe dans l'urine. Aucun calcul détecté. Hydratation renforcée conseillée.",
  (60,0): "Calcium urinaire à 255 mg/24 h : la hausse se stabilise. Aucun calcul à l'échographie. Statut nominal.",
  (94,0): "Calcium urinaire à 269 mg/24 h, aucun calcul détecté : statut nominal. Le risque de calcul reste à surveiller tant que l'os perd du calcium. Conduite proposée : au moins 2,5 L d'eau par jour et sel réduit.",
  (210,0): "Projection à Sol 0 (J210) : calcium urinaire stable autour de 270 mg/24 h, sous la limite de 300. Statut nominal. Le nombre de calculs n'est pas projeté par le modèle.",
  (210,1): "Projection à Sol 0 (J210) avec le plan suivi : calcium urinaire stable autour de 270 mg/24 h, sous la limite de 300. Statut nominal. Le nombre de calculs n'est pas projeté par le modèle.",
  (860,0): "Projection au retour (J860) au rythme actuel : calcium urinaire stable autour de 270 mg/24 h. Statut nominal. Le nombre de calculs n'est pas projeté par le modèle.",
  (860,1): "Projection au retour (J860) avec le plan suivi : calcium urinaire stable autour de 270 mg/24 h. Statut nominal. Le nombre de calculs n'est pas projeté par le modèle.",
 },
 "yeux": {
  (0,0): "Bilan de référence (J0) : gaine du nerf optique de 4,84 mm à l'échographie. Temps de réaction (PVT) de 262 ms. Statut nominal.",
  (30,0): "Gaine du nerf optique à 5,16 mm, en hausse : les fluides montent vers la tête en apesanteur. Vigilance stable (PVT 269 ms). Statut nominal.",
  (60,0): "Gaine du nerf optique à 5,33 mm : la hausse ralentit. Vigilance stable (PVT 269 ms). Statut nominal.",
  (94,0): "Gaine du nerf optique à 5,65 mm, en hausse sur 7 jours : statut à surveiller. C'est un indicateur indirect de la pression dans le crâne, liée aux troubles de la vision en vol (SANS). Conduite proposée : test de vision et nouvelle mesure, à transmettre au médecin au sol.",
  (210,0): "Le modèle ne projette pas l'œil au-delà d'aujourd'hui. Dernière mesure (J94) : gaine du nerf optique à 5,65 mm, à surveiller. Le suivi par échographie continue jusqu'à Sol 0.",
  (210,1): "Le modèle ne projette pas l'œil au-delà d'aujourd'hui. Dernière mesure (J94) : gaine du nerf optique à 5,65 mm, à surveiller. Le suivi par échographie continue jusqu'à Sol 0.",
  (860,0): "Le modèle ne projette pas l'œil jusqu'au retour. Dernière mesure (J94) : gaine du nerf optique à 5,65 mm, à surveiller. Un bilan ophtalmologique complet est prévu au retour.",
  (860,1): "Le modèle ne projette pas l'œil jusqu'au retour. Dernière mesure (J94) : gaine du nerf optique à 5,65 mm, à surveiller. Un bilan ophtalmologique complet est prévu au retour.",
 },
 "dose": {
  (0,0): "Départ (J0) : dose cumulée nulle. Débit prévu en croisière : 1,84 mSv par jour (mesures RAD de Curiosity). La limite de carrière NASA est de 600 mSv [V1 4030].",
  (30,0): "Dose cumulée de 55 mSv, exactement au niveau prévu. Aucun événement solaire détecté. Statut nominal.",
  (60,0): "Dose cumulée de 110 mSv, exactement au niveau prévu. Aucun événement solaire détecté. Statut nominal.",
  (94,0): "Dose cumulée de 173 mSv, exactement au niveau prévu : statut nominal. La limite de carrière NASA est de 600 mSv [V1 4030]. L'alerte se déclenche sur tout excès par rapport au prévu.",
  (210,0): "À l'arrivée sur Mars (Sol 0, J210) : dose cumulée prévue de 386 mSv. En surface, le débit tombe à 0,64 mSv par jour. Statut nominal.",
  (210,1): "À l'arrivée sur Mars (Sol 0, J210) : dose cumulée prévue de 386 mSv. En surface, le débit tombe à 0,64 mSv par jour. L'exercice ne change pas la dose.",
  (860,0): "Au retour (J860) au rythme actuel : dose cumulée prévue de 802 mSv. C'est au-dessus de la limite de carrière NASA de 600 mSv [V1 4030] : statut hors seuil. C'est une contrainte connue de toute mission martienne, pas un défaut du suivi.",
  (860,1): "Au retour (J860) avec le plan suivi : dose cumulée prévue de 802 mSv, au-dessus de la limite de 600 mSv [V1 4030]. L'exercice n'y change rien. Seuls le blindage et la trajectoire réduisent la dose.",
 },
}
split = re.compile(r'(?<=[.!?])\s+(?=[A-ZÀ-ÝŒ])')
bad=[]
for org, texts in S.items():
    for (d,a),t in texts.items():
        n=len(split.split(t))
        if n<3: bad.append((org,d,a,n))
    days=[{"day":d,"adherence":a,"text":t} for (d,a),t in sorted(texts.items())]
    json.dump({"organId":org, **GEN, "days":days}, open(f"public/data/summaries/{org}.json","w"), ensure_ascii=False, indent=1)
print("bad", bad)

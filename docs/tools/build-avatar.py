# SOL ZÉRO — Avatar de Haddad : enveloppe lisse construite à partir des muscles + squelette Z-Anatomy.
# Propriétaire : Steve (D). Même repère que les calques (mètres, pieds y≈0, regard +Z) : alignement parfait.
#
#   node /tmp/tools/dump-src.mjs /tmp/avatar/body muscular skeletal     # géométrie source (voir build-models.mjs)
#   python3 docs/tools/build-avatar.py /tmp/avatar/body /tmp/avatar/avatar-raw.glb
#   puis compression meshopt (décimation) : voir build-avatar.mjs
#
# Méthode : voxelisation de la surface (pas de 6 mm) → fermeture morphologique et remplissage (volume plein)
# → dilatation ≈ 1,2 cm (couche « peau ») → lissage gaussien → marching cubes → lissage de Taubin.
import sys
import numpy as np
import trimesh
from scipy import ndimage
from skimage import measure

src, out = sys.argv[1], sys.argv[2]
V = np.fromfile(src + '.v.bin', dtype=np.float32).reshape(-1, 3).astype(np.float64)
F = np.fromfile(src + '.f.bin', dtype=np.uint32).reshape(-1, 3)
PITCH = 0.006
lo = V.min(0) - 0.05
hi = V.max(0) + 0.05
shape = np.ceil((hi - lo) / PITCH).astype(int) + 1
print('bbox', lo.round(3), hi.round(3), 'grille', shape)

# Échantillonnage dense des triangles (barycentrique), assez fin pour ne pas laisser de trous au pas de 6 mm.
occ = np.zeros(shape, dtype=bool)
tri = V[F]
area = 0.5 * np.linalg.norm(np.cross(tri[:, 1] - tri[:, 0], tri[:, 2] - tri[:, 0]), axis=1)
rng = np.random.default_rng(2029)
n = np.clip(np.ceil(area / (PITCH * PITCH * 0.25)).astype(int), 1, 400)
CH = 400_000
for s in range(0, len(F), CH):
    t, k = tri[s:s + CH], n[s:s + CH]
    rep = np.repeat(np.arange(len(t)), k)
    u, v = rng.random(len(rep)), rng.random(len(rep))
    flip = u + v > 1
    u[flip], v[flip] = 1 - u[flip], 1 - v[flip]
    p = t[rep, 0] + u[:, None] * (t[rep, 1] - t[rep, 0]) + v[:, None] * (t[rep, 2] - t[rep, 0])
    ijk = np.floor((p - lo) / PITCH).astype(int)
    occ[ijk[:, 0], ijk[:, 1], ijk[:, 2]] = True
for vv in (V,):
    ijk = np.floor((vv - lo) / PITCH).astype(int)
    occ[ijk[:, 0], ijk[:, 1], ijk[:, 2]] = True
print('voxels de surface', int(occ.sum()))

ball = lambda r: (np.add.outer(np.add.outer(np.arange(-r, r + 1) ** 2, np.arange(-r, r + 1) ** 2), np.arange(-r, r + 1) ** 2) <= r * r)
solid = ndimage.binary_closing(occ, structure=ball(3), iterations=1)
solid = ndimage.binary_fill_holes(solid)
# Remplissage tranche par tranche (horizontal) pour boucher les cavités ouvertes (bouche, bassin…)
for j in range(solid.shape[1]):
    solid[:, j, :] = ndimage.binary_fill_holes(solid[:, j, :])
solid = ndimage.binary_dilation(solid, structure=ball(2))          # ≈ 1,2 cm de « peau »
# Garde la plus grande composante (évite les petits fragments flottants)
lab, nlab = ndimage.label(solid)
if nlab > 1:
    sizes = ndimage.sum(solid, lab, range(1, nlab + 1))
    solid = lab == (1 + int(np.argmax(sizes)))
field = ndimage.gaussian_filter(solid.astype(np.float32), sigma=1.2)
verts, faces, _, _ = measure.marching_cubes(field, level=0.5, spacing=(PITCH, PITCH, PITCH))
verts += lo
mesh = trimesh.Trimesh(verts, faces[:, ::-1], process=True)
trimesh.smoothing.filter_taubin(mesh, lamb=0.5, nu=-0.53, iterations=15)
mesh.fix_normals()
print('peau', len(mesh.vertices), 'sommets', len(mesh.faces), 'triangles', 'étanche' if mesh.is_watertight else 'non étanche')
print('bornes', mesh.bounds.round(3).tolist())
mesh.export(out)

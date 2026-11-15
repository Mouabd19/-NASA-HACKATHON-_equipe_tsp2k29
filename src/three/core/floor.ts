// Sol de la scène. Le disque gradué, les anneaux, le réticule et la règle verticale ont été retirés :
// la scène ne montre que le corps. Les deux fonctions restent exportées (signatures inchangées).
import * as THREE from 'three';

export function createFloor(): THREE.Group {
  return new THREE.Group();
}

export function disposeFloor(g: THREE.Group): void {
  g.traverse((o) => {
    if (o instanceof THREE.LineSegments || o instanceof THREE.Mesh) {
      o.geometry.dispose();
      (o.material as THREE.Material).dispose();
    }
  });
}

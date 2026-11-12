// Colisão com ilhas e montanhas.
// Cada modelo de terreno ganha uma BVH (three-mesh-bvh), o que deixa os raios
// muito rápidos. groundHeight(x, z) devolve a altura do chão naquele ponto
// (ou -Infinity se for só mar).
import * as THREE from 'three';
import { computeBoundsTree, disposeBoundsTree, acceleratedRaycast } from 'three-mesh-bvh';

THREE.BufferGeometry.prototype.computeBoundsTree = computeBoundsTree;
THREE.BufferGeometry.prototype.disposeBoundsTree = disposeBoundsTree;
THREE.Mesh.prototype.raycast = acceleratedRaycast;

const meshes = [];
// muda toda vez que um terreno novo é registrado (o mapa usa para se redesenhar)
export let terrainVersion = 0;
const raycaster = new THREE.Raycaster();
raycaster.firstHitOnly = true;
const DOWN = new THREE.Vector3(0, -1, 0);
const origin = new THREE.Vector3();

// Registra um modelo como terreno. `ignore` filtra malhas que não são chão
// (por exemplo o "mar" que vem junto com o modelo da ilha grande).
export function addTerrain(model, ignore = () => false) {
  model.updateMatrixWorld(true);
  model.traverse((o) => {
    if (o.isMesh && !ignore(o)) {
      o.geometry.computeBoundsTree();
      meshes.push(o);
    }
  });
  terrainVersion++;
}

export function groundHeight(x, z) {
  if (!meshes.length) return -Infinity;
  origin.set(x, 5000, z);
  raycaster.set(origin, DOWN);
  raycaster.far = 10000;
  const hits = raycaster.intersectObjects(meshes, false);
  let best = -Infinity;
  for (const h of hits) best = Math.max(best, h.point.y);
  return best;
}

// Verdadeiro se o ponto (x, z) tem terra acima do nível `level`.
export function isLand(x, z, level = -1) {
  return groundHeight(x, z) > level;
}

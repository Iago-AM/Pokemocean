// Cenário que costura as ilhas: ilhotas de pedra com palmeiras e plantas, pontes de
// corda ligando as ilhotas até o farol, uma praia arborizada no Monte Arco-Íris e
// conchas/estrelas-do-mar no fundo (estas acompanham o jogador, como a grama).
// As peças foram separadas e otimizadas no Blender (assets/cenario/*.glb).
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { addTerrain, groundHeight } from './terrain.js';
import { seabedHeight } from './underwater.js';

const loader = new GLTFLoader();
const cache = {};
function piece(name) {
  cache[name] ??= new Promise((resolve) => loader.load(`assets/cenario/${name}.glb`, (g) => resolve(g.scene), undefined, () => resolve(null)));
  return cache[name];
}

// gerador com semente: o cenário sai sempre igual
function rng(seed) {
  return () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
}

const ROCKS = ['rochedo_a', 'rochedo_b', 'rochedo_c', 'rochedo_d'];
const STONES = ['pedra_a', 'pedra_b', 'pedra_c', 'pedra_d', 'pedra_e'];
const PALMS = ['palmeira_a', 'palmeira_b', 'palmeira_c'];
const PLANTS = ['arbusto', 'samambaia', 'costela_de_adao', 'palmeirinha'];

// ilhotas: centro, tamanho e quantas palmeiras/plantas
const ISLETS = [
  { x: 260, z: 390, r: 45, palms: 2, plants: 4 },
  { x: -260, z: -140, r: 40, palms: 1, plants: 3 },
  { x: -120, z: 400, r: 35, palms: 2, plants: 2 },
  // corrente de ilhotas do píer até o farol, ligadas por pontes
  { x: 400, z: -190, r: 38, palms: 2, plants: 3, chain: true },
  { x: 500, z: -360, r: 34, palms: 1, plants: 3, chain: true },
  { x: 590, z: -530, r: 36, palms: 2, plants: 2, chain: true },
  { x: -620, z: -560, r: 40, palms: 2, plants: 3 },
  { x: 900, z: 520, r: 42, palms: 2, plants: 3 },
];

export function createScenery(scene) {
  const group = new THREE.Group();
  scene.add(group);
  const R = rng(20241111);
  const pick = (arr) => arr[Math.floor(R() * arr.length)];
  const place = async (name, pos, scale, yaw = R() * Math.PI * 2) => {
    const src = await piece(name);
    if (!src) return null;
    const o = src.clone();
    o.position.copy(pos); o.scale.setScalar(scale); o.rotation.y = yaw;
    group.add(o);
    return o;
  };

  // ---- ilhotas de pedra ----
  const isletReady = ISLETS.map(async (s) => {
    const rocks = [];
    // um rochedo grande no meio + pedras menores em volta (metade embaixo d'água)
    rocks.push(await place(pick(ROCKS), new THREE.Vector3(s.x, -14, s.z), s.r * 1.3));
    const n = 4 + Math.floor(R() * 3);
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + R() * 0.6, d = s.r * (0.7 + R() * 0.5);
      rocks.push(await place(pick(STONES), new THREE.Vector3(s.x + Math.cos(a) * d, -8 - R() * 4, s.z + Math.sin(a) * d), s.r * (0.35 + R() * 0.25)));
    }
    rocks.filter(Boolean).forEach((r) => addTerrain(r));
    // palmeiras e plantas em cima das pedras (procura o topo com um raio)
    const top = (x, z) => groundHeight(x, z);
    for (let i = 0; i < s.palms; i++) {
      const a = R() * Math.PI * 2, d = R() * s.r * 0.4;
      const x = s.x + Math.cos(a) * d, z = s.z + Math.sin(a) * d;
      const y = top(x, z);
      if (y > 0) await place(pick(PALMS), new THREE.Vector3(x, y - 1, z), 26 + R() * 10);
    }
    for (let i = 0; i < s.plants; i++) {
      const a = R() * Math.PI * 2, d = R() * s.r * 0.7;
      const x = s.x + Math.cos(a) * d, z = s.z + Math.sin(a) * d;
      const y = top(x, z);
      if (y > 0) await place(pick(PLANTS), new THREE.Vector3(x, y - 0.5, z), 6 + R() * 6);
    }
    return s;
  });

  // ---- pontes entre as ilhotas da corrente ----
  Promise.all(isletReady).then(async () => {
    const chain = ISLETS.filter((s) => s.chain);
    for (let i = 0; i < chain.length - 1; i++) {
      const a = chain[i], b = chain[i + 1];
      const from = new THREE.Vector3(a.x, 0, a.z), to = new THREE.Vector3(b.x, 0, b.z);
      const dir = to.clone().sub(from); const len = dir.length();
      dir.normalize();
      // a ponte começa e termina na beira das ilhotas
      const start = from.clone().addScaledVector(dir, a.r * 0.6), end = to.clone().addScaledVector(dir, -b.r * 0.6);
      const span = start.distanceTo(end);
      const mid = start.clone().add(end).multiplyScalar(0.5);
      const src = await piece('ponte');
      if (!src) return;
      const br = src.clone();
      br.position.set(mid.x, 4, mid.z);
      br.scale.set(14, 14, span / 10);          // a ponte mede 10 de comprimento no Blender
      br.rotation.y = Math.atan2(dir.x, dir.z);
      group.add(br);
      addTerrain(br);
    }
  });

  // ---- praia arborizada no Monte Arco-Íris (espera o Monte carregar) ----
  let beachDone = false;
  function tryBeach(monte) {
    if (beachDone) return;
    const test = groundHeight(monte.x, monte.z);
    if (!(test > 100)) return; // o Monte ainda não carregou
    beachDone = true;
    for (let i = 0; i < 40; i++) {
      const a = (i / 40) * Math.PI * 2 + R() * 0.1;
      // anda de fora para dentro até achar chão de praia (um pouco acima d'água)
      for (let r = 720; r > 300; r -= 6) {
        const x = monte.x + Math.cos(a) * r, z = monte.z + Math.sin(a) * r;
        const y = groundHeight(x, z);
        if (y > 4 && y < 40) {
          const inward = 20 + R() * 60;
          const px = x - Math.cos(a) * inward, pz = z - Math.sin(a) * inward;
          const py = groundHeight(px, pz);
          if (py > 0) {
            if (i % 2 === 0) place(pick(PALMS), new THREE.Vector3(px, py - 2, pz), 80 + R() * 40);
            else place(pick(PLANTS), new THREE.Vector3(px, py - 1, pz), 16 + R() * 10);
          }
          break;
        }
      }
    }
  }

  // ---- conchas e estrelas-do-mar no fundo, "recicladas" em volta da câmera ----
  const FLOOR = [];
  const floorItems = [['estrela_do_mar', 18, 3.5], ['concha', 18, 2.5], ['buzio', 14, 2.5]];
  floorItems.forEach(([name, count, scale]) => {
    for (let i = 0; i < count; i++) {
      place(name, new THREE.Vector3(0, -999, 0), scale * (0.8 + R() * 0.5)).then((o) => {
        if (!o) return;
        o.userData.floor = true;
        FLOOR.push(o);
      });
    }
  });
  const RANGE = 320;
  function respawn(o, cam, anywhere) {
    const a = R() * Math.PI * 2, d = anywhere ? Math.sqrt(R()) * RANGE : RANGE * (0.85 + R() * 0.15);
    const x = cam.x + Math.cos(a) * d, z = cam.z + Math.sin(a) * d;
    o.position.set(x, seabedHeight(x, z) + 0.2, z);
    o.rotation.set(o.name.includes('estrela') ? 0 : (R() - 0.5) * 0.6, R() * Math.PI * 2, (R() - 0.5) * 0.4);
  }

  return {
    update(camera, monte) {
      tryBeach(monte);
      const cam = camera.position;
      for (const o of FLOOR) {
        const dx = o.position.x - cam.x, dz = o.position.z - cam.z;
        if (o.position.y < -900) respawn(o, cam, true);
        else if (dx * dx + dz * dz > RANGE * RANGE * 1.1) respawn(o, cam, false);
      }
    },
  };
}

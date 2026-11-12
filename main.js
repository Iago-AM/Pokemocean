import './style.css';

import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

import { createEnvironment, WEATHERS, parseHour, formatHour, waveHeight } from './src/environment.js';
import { addTerrain, groundHeight, isLand } from './src/terrain.js';
import { createCreatures, DEX, playBlend, shinyConfig, rollShiny, tickSparkle } from './src/creatures.js';
import { createExtras, BOTTLES } from './src/extras.js';
import { createWorld, PLACES } from './src/world.js';
import { createAudio } from './src/audio.js';
import { createUI } from './src/ui.js';
import { createUnderwater, seabedHeight } from './src/underwater.js';
import { createMap } from './src/map.js';
import { createAchievements, ACHIEVEMENTS } from './src/achievements.js';
import { createSecret, SECRET_POS } from './src/secret.js';
import { createScenery } from './src/scenery.js';
import { createPostcardUI } from './src/postcard.js';

// ---------------------------------------------------------------------------
// Configuração básica
// ---------------------------------------------------------------------------
const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 1, 60000);
camera.position.set(0, 25, 60);
scene.add(camera); // para o áudio, que fica preso na câmera

const clock = new THREE.Clock();
const loader = new GLTFLoader();
const env = createEnvironment(renderer, scene, camera);
const audio = createAudio(camera);
const ui = createUI();
const underwater = createUnderwater(scene, camera);
const map = createMap();

const WORLD_RADIUS = 14000; // até onde vai o mar

// ---------------------------------------------------------------------------
// Câmera orbital que segue a Lapras
// ---------------------------------------------------------------------------
const controls = new OrbitControls(camera, renderer.domElement);
const FOLLOW_LIMITS = { minDistance: 25, maxDistance: 250, maxPolarAngle: Math.PI * 0.48 };
Object.assign(controls, FOLLOW_LIMITS);
controls.enableDamping = true;
controls.enablePan = false;
controls.target.set(0, 8, 0);
controls.update();

let dragging = false;
renderer.domElement.addEventListener('pointerdown', () => (dragging = true));
window.addEventListener('pointerup', () => (dragging = false));

// ---------------------------------------------------------------------------
// Carregamento de modelos
// ---------------------------------------------------------------------------
function loadModel(path, { scale = 1, position = [0, 0, 0], rotation = [0, 0, 0], onLoad } = {}) {
  const holder = new THREE.Group(); // grupo que movemos; o modelo fica dentro
  holder.position.set(...position);
  scene.add(holder);
  loader.load(path, (gltf) => {
    const model = gltf.scene;
    model.scale.setScalar(scale);
    model.rotation.set(...rotation);
    holder.add(model);
    holder.userData.model = model;
    onLoad?.(holder, gltf);
  }, undefined, (err) => console.error('Falha ao carregar', path, err));
  return holder;
}

// ---------------------------------------------------------------------------
// Cenário (ilhas e montanha também viram colisão)
// ---------------------------------------------------------------------------
loadModel('assets/Ilha_Flutuante/scene.gltf', { scale: 10, position: [-10, 10, 100], rotation: [0, 4, 0], onLoad: (h) => addTerrain(h) });
loadModel('assets/Sentada/scene.gltf', { scale: 10, position: [-6, 3.7, 83], rotation: [0, 3.5, 0] });
// a Ilha Grande vem com um "mar" próprio embaixo, que não conta como chão
loadModel('assets/Ilha_Grande/scene.gltf', {
  scale: 5000, position: [-2000, 100, -2000], rotation: [0, 1, 0],
  onLoad: (h) => addTerrain(h, (mesh) => mesh.material.name === 'ocean'),
});
loadModel('assets/Montanha_Gelada/scene.gltf', { scale: 1, position: [5000, 280, 5000], rotation: [0, 1, 0], onLoad: (h) => addTerrain(h) });
// placa "Pokémocean" no céu (letreiro 3D feito no Blender)
const logo = loadModel('assets/Pokemocean_Logo/logo.glb', { scale: 160, position: [-1500, 1000, -5000], rotation: [0, 0.3, 0] });

// ---------------------------------------------------------------------------
// Lapras (jogador)
// ---------------------------------------------------------------------------
const LAPRAS_Y = -2.5;
const START = { x: 0, z: 0, yaw: 3.5 };
const lapras = {
  // esqueleto e animações Parado/Nadar feitos no Blender (lapras_animado.glb)
  obj: loadModel('assets/Lapras/lapras_animado.glb', {
    scale: 3, position: [START.x, LAPRAS_Y, START.z],
    onLoad: (h, gltf) => playBlend(h, gltf, ['Parado', 'Nadar']),
  }),
  speed: 0,
  speedMul: 1,      // alterado pelo comando "set speed"
  maxSpeed: 30,     // unidades por segundo
  turnSpeed: 1.6,   // radianos por segundo
  turnVel: 0,
  depth: 0,         // 0 = na superfície; negativo = mergulhando
  depthVel: 0,
  breath: 1,        // fôlego: acaba em ~10 s embaixo d'água
};
lapras.obj.rotation.y = START.yaw;

const keys = new Set();
let photoMode = false;

// ---------------------------------------------------------------------------
// Tela de título: a câmera passeia até o jogador apertar uma tecla ou clicar
// ---------------------------------------------------------------------------
let titleMode = true;
const title = document.createElement('div');
title.className = 'title-screen';
title.innerHTML = '<h1>Pokémocean</h1><p>um passeio tranquilo pelo mar</p><span>aperte qualquer tecla ou clique para começar</span>';
document.body.appendChild(title);
controls.enabled = false;
function startGame() {
  if (!titleMode) return;
  titleMode = false;
  title.classList.add('out');
  setTimeout(() => title.remove(), 1200);
  controls.enabled = true;
  const p = lapras.obj.position, yaw = lapras.obj.rotation.y;
  controls.target.set(p.x, 8, p.z);
  camera.position.set(p.x - Math.sin(yaw) * 55, 26, p.z - Math.cos(yaw) * 55);
  ui.setVisible(true);
}
title.addEventListener('pointerdown', startGame);
ui.setVisible(false);

// Nome da tecla pela POSIÇÃO no teclado (e.code), não pela letra digitada (e.key).
// Com e.key, Caps Lock, Shift, teclas de acento e alguns layouts faziam a mesma tecla
// chegar com nomes diferentes no "apertar" e no "soltar", e ela ficava presa: aí A/D/S
// se anulavam e só funcionavam com Shift.
function keyName(e) {
  const c = e.code || '';
  if (c.startsWith('Key')) return c.slice(3).toLowerCase();
  if (c === 'Space') return ' ';
  if (c.startsWith('Shift')) return 'shift';
  if (c.startsWith('Control')) return 'control';
  if (c.startsWith('Arrow')) return c.toLowerCase();
  return (e.key || '').toLowerCase();
}

window.addEventListener('keydown', (e) => {
  const k = keyName(e);
  if (titleMode) { startGame(); return; }
  // segurar uma tecla de painel não deve ficar abrindo e fechando
  if (e.repeat && ['h', 'j', 'g', 'k', 'm', 'p', 't', 'f'].includes(k)) return;
  if (ui.isConsoleOpen()) return;
  // carta aberta ou foto ampliada: qualquer tecla fecha
  if (ui.letterOpen) { ui.closeLetter(); return; }
  if (postcard.open) { if (k === 'escape') postcard.close(); return; }
  if (ui.viewerOpen) { if (k === 'escape' || k === 'g') ui.closeViewer(); return; }
  if (k === 't') { e.preventDefault(); ui.openConsole(); keys.clear(); return; }
  if (k === 'p') return togglePhotoMode();
  if (k === 'escape' && photoMode) return togglePhotoMode(false);
  if (k === 'h') ui.toggleHelp();
  if (k === 'j') ui.toggleDex();
  if (k === 'g') ui.toggleGallery();
  if (k === 'k') { refreshAch(); ui.toggleAchievements(); }
  if (k === 'm' || (k === 'escape' && map.open)) { map.toggle(k === 'escape' ? false : undefined); return; }
  if (k === 'f' && photoMode) { takePhoto(); return; }
  // C no modo foto: tira a foto em resolução cheia e abre o cartão-postal
  if (k === 'c' && photoMode) { const full = renderer.domElement.toDataURL('image/jpeg', 0.92); const shot = takePhoto(); postcard.show(full, shot.caption); return; }
  if (k === ' ') e.preventDefault(); // Espaço mergulha, não rola a página
  keys.add(k);
});
window.addEventListener('keyup', (e) => keys.delete(keyName(e)));
window.addEventListener('blur', () => keys.clear());
document.addEventListener('visibilitychange', () => keys.clear());
// botões da interface não devem ficar com o foco (o Espaço "clicaria" neles de novo)
document.addEventListener('click', (e) => { if (e.target.closest('button')) e.target.closest('button').blur(); });

const axis = (pos, neg) => (keys.has(pos[0]) || keys.has(pos[1]) ? 1 : 0) - (keys.has(neg[0]) || keys.has(neg[1]) ? 1 : 0);
const tmp = new THREE.Vector3();
const lastLaprasPos = new THREE.Vector3();

function updateLapras(t, dt) {
  const o = lapras.obj;
  const fwd = photoMode ? 0 : axis(['w', 'arrowup'], ['s', 'arrowdown']);
  const turn = photoMode ? 0 : axis(['a', 'arrowleft'], ['d', 'arrowright']);
  const boost = keys.has('shift') ? 2 : 1;
  const max = lapras.maxSpeed * lapras.speedMul;

  // aceleração / desaceleração suave
  const targetSpeed = fwd * max * boost * (fwd < 0 ? 0.5 : 1);
  lapras.speed = THREE.MathUtils.damp(lapras.speed, targetSpeed, 2.0, dt);
  lapras.turnVel = THREE.MathUtils.damp(lapras.turnVel, turn * lapras.turnSpeed, 5.0, dt);

  lastLaprasPos.copy(o.position);
  o.rotation.y += lapras.turnVel * dt;

  // colisão: olha um ponto à frente do focinho (ou atrás, se estiver de ré)
  const dir = new THREE.Vector3(Math.sin(o.rotation.y), 0, Math.cos(o.rotation.y));
  const step = lapras.speed * dt;
  const sign = Math.sign(step) || 1;
  const probeNow = tmp.copy(o.position).addScaledVector(dir, sign * 14);
  const blockedNow = isLand(probeNow.x, probeNow.z);
  const probeNext = probeNow.clone().addScaledVector(dir, step);
  const outside = probeNext.x ** 2 + probeNext.z ** 2 > WORLD_RADIUS ** 2;
  if (outside || (!blockedNow && isLand(probeNext.x, probeNext.z))) {
    lapras.speed *= -0.3; // bate de leve e volta um pouquinho
  } else {
    o.position.addScaledVector(dir, step);
  }

  // mergulho: segurando Espaço a Lapras desce; o fôlego dura ~10 s e recarrega na superfície
  const wantsDive = !photoMode && keys.has(' ') && lapras.breath > 0;
  const floor = seabedHeight(o.position.x, o.position.z) + 8 - LAPRAS_Y;
  const targetDepth = wantsDive ? Math.max(-28, floor) : 0;
  const prevDepth = lapras.depth;
  lapras.depth = THREE.MathUtils.damp(lapras.depth, targetDepth, 1.4, dt);
  lapras.depthVel = (lapras.depth - prevDepth) / Math.max(dt, 1e-3);
  const under = lapras.depth < -3;
  lapras.breath = THREE.MathUtils.clamp(lapras.breath + (under ? -dt / 10 : dt / 3), 0, 1);
  ui.setBreath(under || lapras.breath < 1 ? lapras.breath : null);

  // balanço na água (sem acumular deriva); some quando está fundo
  const moving = Math.min(Math.abs(lapras.speed) / lapras.maxSpeed, 1);
  const surface = THREE.MathUtils.clamp(1 + lapras.depth / 6, 0, 1);
  // na superfície ela sobe e desce com as ondas (e a maré)
  o.position.y = LAPRAS_Y + lapras.depth + (waveHeight(o.position.x, o.position.z) + Math.sin(t * 1.5) * 0.3) * surface;
  const m = o.userData.model;
  if (m) {
    m.rotation.z = -lapras.turnVel * 0.15 + Math.sin(t * 1.2) * 0.03; // inclina na curva
    // aponta o focinho para baixo ao descer e para cima ao subir
    const pitch = THREE.MathUtils.clamp(-lapras.depthVel * 0.035, -0.45, 0.45);
    m.rotation.x = THREE.MathUtils.damp(m.rotation.x, pitch + Math.sin(t * (1.5 + moving * 2)) * 0.015, 6, dt);
  }
  // mistura parado/nadando pela velocidade; remando mais rápido quando acelera
  const acts = o.userData.actions;
  if (acts?.Nadar) {
    acts.Nadar.weight = moving;
    acts.Parado.weight = 1 - moving;
    acts.Nadar.timeScale = 0.7 + moving * 0.6 * (keys.has('shift') ? 1.5 : 1);
    o.userData.mixer.update(dt);
  }

  if (photoMode) return;

  // câmera acompanha o deslocamento da Lapras (o mouse continua girando ao redor)
  const delta = o.position.clone().sub(lastLaprasPos);
  if (Math.abs(lapras.depth) < 0.05) delta.y = 0; // na superfície ignora o balanço
  camera.position.add(delta);
  controls.target.set(o.position.x, LAPRAS_Y + lapras.depth + 10.5, o.position.z); // câmera não balança com as ondas

  // enquanto nada (e o mouse está solto), a câmera gira devagar para trás da Lapras
  if (!dragging && Math.abs(lapras.speed) > 1) {
    const offset = camera.position.clone().sub(controls.target);
    const current = Math.atan2(offset.x, offset.z);
    let diff = o.rotation.y + Math.PI - current;
    diff = Math.atan2(Math.sin(diff), Math.cos(diff));
    offset.applyAxisAngle(THREE.Object3D.DefaultUp, diff * (1 - Math.exp(-1.5 * dt)) * Math.min(moving, 1));
    camera.position.copy(controls.target).add(offset);
  }
}

// ---------------------------------------------------------------------------
// Modo foto: esconde a interface e solta a câmera
// ---------------------------------------------------------------------------
let savedView = null;
function togglePhotoMode(force) {
  photoMode = force === undefined ? !photoMode : force;
  ui.setPhotoMode(photoMode);
  keys.clear();
  if (photoMode) {
    savedView = { offset: camera.position.clone().sub(controls.target) };
    Object.assign(controls, { minDistance: 2, maxDistance: 8000, maxPolarAngle: Math.PI * 0.495 });
    controls.enablePan = true;
  } else {
    Object.assign(controls, FOLLOW_LIMITS);
    controls.enablePan = false;
    const p = lapras.obj.position;
    controls.target.set(p.x, 8, p.z);
    camera.position.copy(controls.target).add(savedView?.offset ?? new THREE.Vector3(0, 25, 60));
  }
  return photoMode;
}

function updatePhotoCamera(dt) {
  if (!photoMode) return;
  const f = axis(['w', 'arrowup'], ['s', 'arrowdown']);
  const r = axis(['d', 'arrowright'], ['a', 'arrowleft']);
  const u = axis(['e', ' '], ['q', 'control']);
  if (!f && !r && !u) return;
  const speed = 60 * (keys.has('shift') ? 5 : 1) * dt;
  const forward = new THREE.Vector3();
  camera.getWorldDirection(forward);
  forward.y = 0;
  forward.normalize();
  const right = new THREE.Vector3().crossVectors(forward, camera.up).normalize();
  const move = forward.multiplyScalar(f * speed).addScaledVector(right, r * speed);
  move.y = u * speed;
  if (camera.position.y + move.y < 2) move.y = 2 - camera.position.y;
  camera.position.add(move);
  controls.target.add(move);
}

// ---------------------------------------------------------------------------
// Pokémon e diário de avistamentos
// ---------------------------------------------------------------------------
const creatures = createCreatures(loadModel);
const world = createWorld(loadModel, creatures, scene);
const scenery = createScenery(scene);
const postcard = createPostcardUI(ui.toast);
ui.onPostcard = (src, caption) => postcard.show(src, caption);

// Tudo que fica salvo no navegador (diário, shinies, garrafas, fotos).
// Se o navegador não deixar salvar, o jogo funciona igual, só não lembra depois.
const load = (key, fallback) => { try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; } };
const save = (key, value) => { try { localStorage.setItem(key, JSON.stringify(value)); return true; } catch { return false; } };

const seen = new Set(['lapras', ...load('pokemocean-diario', [])]);
const shinies = new Set(load('pokemocean-shinies', []));
const bottlesFound = new Set(load('pokemocean-garrafas', []));
let photos = load('pokemocean-fotos', {});      // foto oficial de cada Pokémon
let gallery = load('pokemocean-galeria', []);   // todas as fotos tiradas
const saveSeen = () => { save('pokemocean-diario', [...seen]); save('pokemocean-shinies', [...shinies]); };
const refreshDex = () => ui.renderDex(DEX, seen, { shinies, photos });

// conquistas
const ach = createAchievements({ load, save, onUnlock: (a) => { ui.achievementToast(a); refreshAch(); } });
const refreshAch = () => ui.renderAchievements(ACHIEVEMENTS, ach.unlocked, `${ach.swumKm.toFixed(1)} km nadados`);
refreshAch();
refreshDex();
ui.renderGallery(gallery);
ui.setBottles(bottlesFound.size, BOTTLES.length);

function checkSightings() {
  const p = lapras.obj.position;
  for (const c of creatures) {
    const d = Math.hypot(c.obj.position.x - p.x, c.obj.position.z - p.z);
    if (!(d < c.seeRadius && c.obj.userData.model && c.obj.visible)) continue;
    if (c.underwater && lapras.depth > -10) continue; // os do fundo só contam se você mergulhar
    if (c.shiny && !shinies.has(c.id)) {
      shinies.add(c.id);
      seen.add(c.id);
      saveSeen();
      refreshDex();
      ui.toast(`✨ ${c.name} shiny! Que sorte!`);
      ach.unlock('shiny');
    }
    if (seen.has(c.id)) continue;
    seen.add(c.id);
    saveSeen();
    refreshDex();
    ui.toast(`Novo avistamento: ${c.name}!  (${seen.size}/${DEX.length})`);
    audio.play(c.id); // toca o grito, se existir em assets/Sounds/cries
    if (c.underwater) ach.unlock('fundo');
    if (seen.size === DEX.length) { ach.unlock('diario'); secret.unlock(); }
    if (seen.size === DEX.length) setTimeout(() => ui.toast('Diário completo! Obrigado por nadar com a Lapras.'), 1500);
  }
}

// ---------------------------------------------------------------------------
// Companheiro: ao chegar perto de um Pokémon pequeno, há 20% de chance de ele
// nadar junto. Depois de 1 a 3 minutos (ou se você se afastar correndo), ele se
// solta e volta nadando para o lugar dele.
// ---------------------------------------------------------------------------
const COMPANION_CHANCE = 0.2;
let companion = null;
const followPos = new THREE.Vector3();

function updateCompanion(c, t, dt) {
  if (!c.companion || !c.obj.userData.model) return;
  const o = c.obj, lp = lapras.obj.position;
  const d = Math.hypot(o.position.x - lp.x, o.position.z - lp.z);
  const st = (c.follow ??= { cooldown: 0, near: false, returning: 0, from: new THREE.Vector3() });
  st.cooldown = Math.max(0, st.cooldown - dt);

  // chegou perto agora: sorteia (uma vez por encontro, e não se já houver outro junto)
  const isNear = d < 70;
  if (isNear && !st.near && !companion && st.cooldown === 0 && !photoMode) {
    st.cooldown = 45;
    if (Math.random() < COMPANION_CHANCE) {
      companion = c;
      st.until = t + 60 + Math.random() * 120;
      st.pos = o.position.clone();
      ui.toast(`${c.name} quer nadar com você!`);
      ach.unlock('amigo');
      audio.play(c.id);
    }
  }
  st.near = isNear;

  if (companion === c) {
    // posição alvo: atrás e ao lado da Lapras; acompanha o mergulho
    const yaw = lapras.obj.rotation.y;
    followPos.set(lp.x - Math.sin(yaw) * 22 + Math.cos(yaw) * 14, 0, lp.z - Math.cos(yaw) * 22 - Math.sin(yaw) * 14);
    followPos.y = Math.min(c.floatY ?? -2.5, lp.y + 2) + Math.sin(t * 2) * 0.5;
    const toTarget = followPos.clone().sub(st.pos);
    const maxStep = 42 * dt; // nada no máximo 42/s: correndo com Shift você o deixa para trás
    if (toTarget.length() > maxStep) toTarget.setLength(maxStep);
    st.pos.add(toTarget);
    o.position.copy(st.pos);
    if (toTarget.lengthSq() > 1e-4) o.rotation.y = Math.atan2(toTarget.x, toTarget.z);
    const a = o.userData.actions;
    if (a?.Nadar) { a.Nadar.weight = 1; a.Idle.weight = 0; }
    const far = Math.hypot(st.pos.x - lp.x, st.pos.z - lp.z) > 160;
    if (t > st.until || far) {
      ui.toast(far ? `${c.name} ficou para trás e voltou para casa.` : `${c.name} se despediu e voltou a nadar livre.`);
      companion = null;
      st.returning = 1;
      st.from.copy(st.pos);
      st.cooldown = 90;
    }
    return;
  }

  // voltando para casa: mistura suave entre onde ficou e o trajeto normal
  if (st.returning > 0) {
    st.returning = Math.max(0, st.returning - dt / 5);
    const k = st.returning * st.returning * (3 - 2 * st.returning);
    o.position.lerp(st.from, k);
  }
}

// metas das conquistas que dependem do que está acontecendo no mundo
const lastSwimPos = new THREE.Vector3();
let lastHour = null;
function trackAchievements(t, dt) {
  const p = lapras.obj.position;
  if (!titleMode) {
    const d = Math.hypot(p.x - lastSwimPos.x, p.z - lastSwimPos.z);
    if (d < 200) ach.addSwim(d, dt); // pulos grandes (tp) não contam
  }
  lastSwimPos.copy(p);
  if (lapras.depth < -12) ach.unlock('mergulho');
  if (extras.auroraLevel > 0.5) ach.unlock('aurora');
  if (extras.rainbowLevel > 0.5) ach.unlock('arcoiris');
  const h = env.state.hour;
  if (lastHour !== null && lastHour < 18 && h >= 18 && h - lastHour < 0.2) ach.unlock('dianoite');
  lastHour = h;
  const near = (v, r) => Math.hypot(p.x - v.x, p.z - v.z) < r;
  if (near(PLACES.pier, 160)) ach.visit('pier');
  if (near(PLACES.lighthouse, 400)) ach.visit('farol');
  if (near(PLACES.islet, 220)) ach.visit('ilhota');
  if (near(PLACES.monte, 900)) ach.visit('monte');
  // o Jirachi vai embora depois de um tempo
  const j = creatures.find((c) => c.id === 'jirachi');
  if (j?.obj.userData.summoned && clock.elapsedTime > j.obj.userData.until) {
    j.obj.userData.summoned = false;
    ui.toast('O Jirachi voltou a dormir entre as estrelas.');
  }
}

// garrafas, aurora e arco-íris
const extras = createExtras(scene, camera, {
  onMeteor: () => ach.unlock('estrela'),
  onShowerStart: () => ui.toast('🌠 Chuva de estrelas! Abra o console (T) e faça um pedido: desejo'),
  isCollected: (id) => bottlesFound.has(id),
  onBottle(b) {
    bottlesFound.add(b.id);
    save('pokemocean-garrafas', [...bottlesFound]);
    ui.setBottles(bottlesFound.size, BOTTLES.length);
    keys.clear();
    ui.showLetter(b.text);
    ui.toast(`Garrafa encontrada! (${bottlesFound.size}/${BOTTLES.length})`);
    if (bottlesFound.size === BOTTLES.length) ach.unlock('garrafas');
  },
});

// ---------------------------------------------------------------------------
// Ilha secreta (Santuário das Estrelas) e a Lapras dourada
// ---------------------------------------------------------------------------
const CREDITS = [
  'Lapras e Magikarp: Katerina Novakova (CC BY-SA 4.0)',
  'Psyduck, Popplio, Totodile, Froakie, Wiglett, Clodsire, Keldeo, Jirachi e as Aves Lendárias: Squirmy Worm (CC BY 4.0)',
  'Sobble: HardyC · Chinchou: Isabel Cotta Pérez (CC BY 4.0)',
  'Gyarados: stam3D · Groudon: Ayush_Bharti · Mew: germydan (CC BY 4.0)',
  'Rayquaza Remastered: Master Galanodel · Ho-Oh: kaiyi97 (CC BY 4.0)',
  'Farol: cotman sam · Píer: Jungle Jim · Veleiro: Savy · Coqueiro: sujirour · Pedras: PolyOne Studio',
  'Ilhas: Tom Verbeeck, bilgehan.korkmaz, Gesy · Garota sentada: jasetroy (CC BY 4.0)',
  'Monte Arco-Íris, Santuário, letreiro e animações: feitos no Blender para o Pokémocean',
];
const secret = createSecret({
  scene, loadModel, ui, env, extras, audio,
  onFestivalStart: () => {
    const j = creatures.find((c) => c.id === 'jirachi');
    if (j) { j.obj.userData.summoned = true; j.obj.userData.anchor = null; j.obj.userData.until = clock.elapsedTime + 200; }
  },
  onFestivalEnd: () => { ach.unlock('santuario'); save('pokemocean-dourada', true); },
});
if (seen.size === DEX.length) secret.unlock({ instant: true });

// Lapras dourada: troca as cores por um dourado brilhante (e volta ao normal)
function setGoldenLapras(on) {
  const m = lapras.obj.userData.model;
  if (!m) return false;
  m.traverse((o) => {
    if (!o.isMesh) return;
    if (on) {
      o.userData.normalMat ??= o.material;
      const g = o.userData.normalMat.clone();
      g.color = new THREE.Color(1.0, 0.78, 0.32);
      g.metalness = 0.6; g.roughness = 0.35;
      g.emissive = new THREE.Color(0.25, 0.16, 0.02);
      o.material = g;
    } else if (o.userData.normalMat) {
      o.material = o.userData.normalMat;
    }
  });
  return true;
}
const PARTY = ['psyduck', 'totodile', 'popplio', 'sobble', 'froakie', 'magikarp', 'chinchou', 'clodsire'];
const partyTmp = new THREE.Vector3();

// ---------------------------------------------------------------------------
// Fotos (tecla F no modo foto): vão para a galeria e viram a "foto oficial"
// do Pokémon mais em destaque na imagem
// ---------------------------------------------------------------------------
function takePhoto() {
  // escolhe o Pokémon mais perto do centro da tela, que esteja visível e não muito longe
  const ndc = new THREE.Vector3();
  let subject = null, best = Infinity;
  for (const c of creatures) {
    if (!c.obj.visible || !c.obj.userData.model) continue;
    const box = new THREE.Box3().setFromObject(c.obj.userData.model);
    box.getCenter(ndc);
    const dist = ndc.distanceTo(camera.position);
    const size = box.getSize(new THREE.Vector3()).length();
    ndc.project(camera);
    if (ndc.z > 1 || Math.abs(ndc.x) > 0.9 || Math.abs(ndc.y) > 0.9) continue;
    if (size / dist < 0.06) continue; // pequeno demais na foto
    const score = Math.hypot(ndc.x, ndc.y) + dist / 5000;
    if (score < best) { best = score; subject = c; }
  }
  // reduz a imagem para caber no armazenamento do navegador
  const src = renderer.domElement;
  const w = 640, h = Math.round((src.height / src.width) * w);
  const cv = document.createElement('canvas');
  cv.width = w; cv.height = h;
  cv.getContext('2d').drawImage(src, 0, 0, w, h);
  const img = cv.toDataURL('image/jpeg', 0.82);
  const date = new Date().toLocaleString('pt-BR');
  const caption = subject ? `${subject.name}${subject.shiny ? ' ★' : ''} · ${date}` : `Paisagem · ${date}`;
  ui.flash();
  gallery.push({ img, caption });
  while (gallery.length > 30) gallery.shift();
  while (!save('pokemocean-galeria', gallery) && gallery.length > 1) gallery.shift(); // sem espaço: apaga as mais antigas
  ui.renderGallery(gallery);
  if (gallery.length >= 10) ach.unlock('foto10');
  if (subject) {
    seen.add(subject.id);
    photos[subject.id] = { img, date };
    if (!save('pokemocean-fotos', photos)) delete photos[subject.id];
    saveSeen();
    refreshDex();
    ui.toast(`Foto salva! Agora é a foto oficial de ${subject.name} no diário.`);
  } else {
    ui.toast('Foto salva na galeria (G).');
  }
  return { img, caption };
}

// ---------------------------------------------------------------------------
// Comandos (tecla T)
// ---------------------------------------------------------------------------
const WEATHER_ALIASES = {
  seco: 'seco', limpo: 'seco', sol: 'seco', clear: 'seco', sunny: 'seco', dry: 'seco',
  nublado: 'nublado', nuvens: 'nublado', cloudy: 'nublado',
  chuva: 'chuva', chuvoso: 'chuva', rain: 'chuva', rainy: 'chuva',
  neblina: 'neblina', nevoa: 'neblina', névoa: 'neblina', fog: 'neblina', foggy: 'neblina',
};
const strip = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

const HELP = [
  'Comandos disponíveis:',
  '  help                     mostra esta lista',
  '  play <pokemon>           toca o grito (arquivos em assets/Sounds/cries)',
  '  set speed <n>            velocidade da Lapras (1 = normal, de 0.2 a 10)',
  '  set time <hora>          muda a hora: 6, 18:30, manha, tarde, noite...',
  '  set cycle <minutos>      duração de um dia (0 para parar o relógio)',
  '  set weather <clima>      seco, nublado, chuva ou neblina',
  '  set volume <0-100>       volume dos sons e da música',
  '  set musica on|off        liga/desliga a música',
  '  time                     mostra a hora e o clima atuais',
  '  photo                    liga/desliga o modo foto (ou tecla P)',
  '  dex | dex reset          abre o diário / apaga avistamentos e shinies',
  '  galeria                  abre a galeria de fotos (ou tecla G)',
  '  garrafas                 relê as mensagens que você já achou',
  '  conquistas               abre as conquistas (ou tecla K)',
  '  estrelas                 chama uma chuva de estrelas (só à noite)',
  '  desejo                   faz um pedido durante a chuva de estrelas',
  '  set shiny <n>            chance de shiny: 1 em n (padrão 50; 1 = todos)',
  `  tp <lugar>               leva a Lapras até: inicio, farol, pier, ilhota,`,
  `                           ${creatures.map((c) => c.id).filter((v, i, a) => a.indexOf(v) === i).join(', ')}`,
  '  pos                      mostra onde você está',
  '  clear                    limpa o console',
];

function runCommand(raw) {
  const parts = strip(raw).replace(/-/g, '').split(/\s+/);
  const [cmd, a, b] = parts;
  const err = (msg) => ui.print(msg, 'err');

  switch (cmd) {
    case 'help': case 'ajuda': case '?':
      HELP.forEach((l) => ui.print(l));
      break;
    case 'play': case 'tocar': {
      const name = [a, b].filter(Boolean).join('');
      if (!name) return err('Use: play rayquaza');
      audio.play(name, () => ui.print(`Não achei assets/Sounds/cries/${name}.mp3 (nem .ogg/.wav).`, 'err'));
      break;
    }
    case 'set': case 'definir':
      return runSet(a, parts.slice(2).join(' '), err);
    case 'time': case 'hora':
      ui.print(`Agora são ${formatHour(env.state.hour)}, clima ${WEATHERS[env.state.weather].label}. Dia dura ${env.state.cycleMinutes || '∞'} min.`);
      break;
    case 'photo': case 'foto':
      ui.print(togglePhotoMode() ? 'Modo foto ligado (P para sair).' : 'Modo foto desligado.');
      ui.closeConsole();
      break;
    case 'dex': case 'diario':
      if (a === 'reset') {
        seen.clear(); seen.add('lapras'); shinies.clear(); saveSeen(); refreshDex(); ach.reset(); refreshAch();
        ui.print('Diário apagado.');
      } else {
        ui.toggleDex(true);
        ui.print(`Diário: ${seen.size}/${DEX.length} avistados. Tecla J abre e fecha.`);
      }
      break;
    case 'galeria': case 'gallery':
      ui.toggleGallery(true);
      ui.print(`Galeria: ${gallery.length} foto(s). Tecla G abre e fecha.`);
      break;
    case 'garrafas': case 'mensagens': {
      const found = BOTTLES.filter((b) => bottlesFound.has(b.id));
      if (!found.length) ui.print('Nenhuma garrafa ainda. Elas boiam pelo mar, procure!');
      found.forEach((b, i) => ui.print(`${i + 1}. ${b.text}`));
      break;
    }
    case 'desejo': case 'wish': {
      if (!extras.showering) { ui.print('Os desejos só funcionam durante uma chuva de estrelas (algumas noites têm). Use "estrelas" à noite para chamar uma.'); break; }
      const j = creatures.find((c) => c.id === 'jirachi');
      j.obj.userData.summoned = true;
      j.obj.userData.anchor = null;
      j.obj.userData.until = clock.elapsedTime + 180;
      ui.print('✨ Seu desejo foi ouvido... olhe para cima.');
      ach.unlock('desejo');
      break;
    }
    case 'estrelas': case 'meteoros':
      if ((env.state.night ?? 0) < 0.7) { ui.print('Estrelas cadentes só aparecem à noite. Ex.: set time 22'); break; }
      extras.startShower(150);
      break;
    case 'conquistas':
      refreshAch(); ui.toggleAchievements(true);
      ui.print(`Conquistas: ${ach.unlocked.size}/${ACHIEVEMENTS.length}. Tecla K abre e fecha.`);
      break;
    case 'revelar':
      secret.unlock();
      ui.print('A ilha secreta foi revelada (normalmente ela aparece com o diário completo).');
      break;
    case 'festa':
      if (!secret.unlocked) { ui.print('Ainda não... complete o diário primeiro.'); break; }
      secret.replayFestival();
      break;
    case 'arcoiris':
      extras.showRainbow();
      ui.print('Olhe para o lado oposto ao sol.');
      break;
    case 'tp': case 'ir':
      return teleport(a, err);
    case 'pos': {
      const p = lapras.obj.position;
      ui.print(`Lapras em x=${p.x.toFixed(0)}, z=${p.z.toFixed(0)}.`);
      break;
    }
    case 'clear': case 'limpar':
      document.querySelector('.console .log').innerHTML = '';
      break;
    default:
      err(`Comando "${cmd}" não existe. Digite help.`);
  }
}

function runSet(what, value, err) {
  const n = parseFloat(value);
  switch (what) {
    case 'speed': case 'velocidade':
      if (!(n >= 0.2 && n <= 10)) return err('Use um número de 0.2 a 10. Ex.: set speed 2');
      lapras.speedMul = n;
      return ui.print(`Velocidade ${n}x.`);
    case 'time': case 'hora': {
      const h = parseHour(value);
      if (h === null) return err('Hora inválida. Ex.: set time 6, set time 18:30, set time noite');
      env.setHour(h);
      return ui.print(`Hora ajustada para ${formatHour(env.state.hour)}.`);
    }
    case 'cycle': case 'ciclo':
      if (!(n >= 0)) return err('Use os minutos de um dia. Ex.: set cycle 10 (0 para parar)');
      env.state.cycleMinutes = n;
      return ui.print(n ? `Um dia agora dura ${n} min.` : 'Relógio parado.');
    case 'weather': case 'clima': {
      const w = WEATHER_ALIASES[value.trim()];
      if (!w) return err('Climas: seco, nublado, chuva, neblina');
      env.setWeather(w);
      return ui.print(`Clima: ${WEATHERS[w].label}.`);
    }
    case 'musica': case 'music':
      if (value.trim() === 'off' || value.trim() === '0') { audio.music.setEnabled(false); return ui.print('Música desligada.'); }
      audio.music.setEnabled(true);
      return ui.print('Música ligada.');
    case 'volume':
      if (!(n >= 0 && n <= 100)) return err('Use de 0 a 100. Ex.: set volume 40');
      audio.setVolume(n / 100);
      return ui.print(`Volume ${n}.`);
    case 'lapras': {
      const v = value.trim();
      if (v === 'dourada' || v === 'gold') {
        if (!load('pokemocean-dourada', false)) return err('A Lapras dourada é o presente do Santuário das Estrelas. Complete o diário e encontre a ilha secreta.');
        return setGoldenLapras(true) ? ui.print('✨ Lapras dourada!') : err('A Lapras ainda está carregando.');
      }
      setGoldenLapras(false);
      return ui.print('Lapras de volta ao normal.');
    }
    case 'shiny': {
      const odds = parseFloat(value.replace(/^1\//, ''));
      if (!(odds >= 1)) return err('Use: set shiny 50 (1 em 50), set shiny 1 (todos)');
      shinyConfig.odds = odds;
      creatures.forEach(rollShiny); // sorteia de novo quem ainda não é shiny
      return ui.print(`Chance de shiny: 1 em ${odds}. ${creatures.filter((c) => c.shiny).length} shiny(s) no mapa agora.`);
    }
    default:
      return err('Use: set speed | set time | set cycle | set weather | set volume | set shiny');
  }
}

// procura um ponto de água perto do alvo para a Lapras aparecer
function teleport(where, err) {
  let target;
  if (!where) return err('Use: tp inicio, tp farol, tp gyarados...');
  const places = { inicio: new THREE.Vector3(START.x, 0, START.z), start: new THREE.Vector3(START.x, 0, START.z), farol: PLACES.lighthouse, pier: PLACES.pier, ilhota: PLACES.islet, monte: PLACES.monte };
  if (secret.unlocked) places.santuario = SECRET_POS;
  if (places[where]) target = places[where].clone();
  else {
    const c = creatures.find((c) => c.id === where);
    if (!c) return err(`Não conheço "${where}".`);
    if (!c.obj.visible) ui.print(`${c.name} não está aparecendo agora (depende da hora). Te levo até a área dele.`);
    target = c.obj.position.clone();
  }
  for (let r = 60; r < 3000; r += 60) {
    for (let k = 0; k < 16; k++) {
      const a = (k / 16) * Math.PI * 2;
      const x = target.x + Math.cos(a) * r, z = target.z + Math.sin(a) * r;
      if (!isLand(x, z, -1) && !isLand(x + 20, z, -1) && !isLand(x - 20, z, -1) && !isLand(x, z + 20, -1) && !isLand(x, z - 20, -1)) {
        const o = lapras.obj;
        const moveBy = new THREE.Vector3(x - o.position.x, 0, z - o.position.z);
        o.position.add(moveBy);
        o.rotation.y = Math.atan2(target.x - x, target.z - z); // de frente para o alvo
        lapras.speed = 0;
        camera.position.add(moveBy);
        controls.target.add(moveBy);
        return ui.print(`Pronto! Você está perto de ${where}.`);
      }
    }
  }
  err('Não achei água por perto.');
}
ui.onCommand = runCommand;

// ---------------------------------------------------------------------------
// Loop
// ---------------------------------------------------------------------------
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

let statusTimer = 0;
const camDir = new THREE.Vector3();
renderer.setAnimationLoop(() => {
  const dt = Math.min(clock.getDelta(), 0.1);
  const t = clock.elapsedTime;

  updateLapras(t, dt);
  if (titleMode) {
    // voo lento em volta do ponto de partida
    const a = t * 0.06;
    controls.target.set(0, 30, 40);
    camera.position.set(Math.cos(a) * 320, 110 + Math.sin(t * 0.2) * 20, 40 + Math.sin(a) * 320);
  }
  updatePhotoCamera(dt);
  const ctx = { hour: env.state.hour, night: env.state.night, laprasPos: lapras.obj.position, laprasDistance: (o) => o.position.distanceTo(lapras.obj.position) };
  for (const c of creatures) {
    if (c.activeWhen) c.obj.visible = c.activeWhen(ctx.hour);
    if (c.obj.visible) { c.update(t, dt, ctx); tickSparkle(c.obj, t); }
    updateCompanion(c, t, dt);
    // festa no santuário: os pequenos nadam em roda em volta da ilha
    if (secret.festivalActive && PARTY.includes(c.id) && companion !== c) {
      const idx = creatures.indexOf(c);
      secret.partyPos(idx, creatures.length, t, partyTmp);
      c.obj.position.lerp(partyTmp, 1 - Math.exp(-0.8 * dt));
      c.obj.rotation.y = Math.atan2(partyTmp.x - SECRET_POS.x, partyTmp.z - SECRET_POS.z) + Math.PI / 2;
    }
  }
  world.update(t, dt, env);
  scenery.update(camera, PLACES.monte);
  secret.update(t, dt, lapras.obj.position, CREDITS);
  trackAchievements(t, dt);
  extras.update(t, dt, env, lapras.obj.position);
  logo.position.y = 1000 + Math.sin(t * 0.4) * 20;

  // bússola: norte é -Z no mundo
  camera.getWorldDirection(camDir);
  ui.setCompass(THREE.MathUtils.radToDeg(Math.atan2(camDir.x, -camDir.z)));

  env.update(dt);
  underwater.update(t, dt, env, lapras.obj.position);
  audio.update(env.state.mix.rain, underwater.underwater ? 'fundo' : (env.state.night > 0.5 ? 'noite' : 'dia'));

  statusTimer -= dt;
  if (statusTimer <= 0) {
    statusTimer = 0.5;
    checkSightings();
    if (map.open) map.draw({
      lapras: lapras.obj.position, yaw: lapras.obj.rotation.y, creatures, seen, bottles: BOTTLES, bottlesFound,
      places: [
        { name: 'Início', x: 0, z: 0, dy: 22, near: true }, { name: 'Farol', x: PLACES.lighthouse.x, z: PLACES.lighthouse.z, dy: 26 },
        { name: 'Píer', x: PLACES.pier.x, z: PLACES.pier.z, dy: -14, near: true }, { name: 'Ilhota', x: PLACES.islet.x, z: PLACES.islet.z, dy: 24, near: true },
        { name: 'Ilha Grande', x: -2600, z: -2400, dy: 0, far: true }, { name: 'Montanha Gelada', x: 5000, z: 5000, dy: 0, far: true },
        { name: 'Monte Arco-Íris', x: PLACES.monte.x, z: PLACES.monte.z, dy: 0, far: true },
        ...(secret.unlocked ? [{ name: '✦ Santuário das Estrelas', x: SECRET_POS.x, z: SECRET_POS.z, dy: 0, far: true }] : []),
      ],
    });
    ui.setStatus(formatHour(env.state.hour), WEATHERS[env.state.weather].label);
  }

  controls.update();
  renderer.render(scene, camera);
});

// atalhos para testes no console do navegador (só no modo de desenvolvimento)
if (import.meta.env.DEV) window.game = { scene, camera, controls, lapras, creatures, env, runCommand, groundHeight, isLand };

// Pokémon do mapa e suas animações.
// Alguns modelos têm animações próprias (tocadas com AnimationMixer); os outros
// ganham movimento em código (nado, pulos, voo em círculos, respiração).
// Cada criatura tem: id, nome, objeto 3D, raio de avistamento e update(t, dt, ctx).
import * as THREE from 'three';
import { groundHeight } from './terrain.js';
import { seabedHeight } from './underwater.js';

// Posição em círculo, olhando para a direção do movimento.
// Os modelos olham para +Z; faceOffset corrige os que olham para outro lado.
function circlePos(t, { center, radius, speed, phase = 0 }) {
  const a = phase + t * speed;
  return {
    x: center[0] + Math.cos(a) * radius,
    z: center[1] + Math.sin(a) * radius,
    yaw: -a + (speed < 0 ? Math.PI : 0),
  };
}

// Voadores sobem suavemente quando passam sobre terra, para não atravessar montanhas.
function flyer(obj, path, { y, yAmp = 0, yFreq = 1, clearance = 120, faceOffset = 0 }) {
  let alt = y;
  return (t, dt) => {
    const p = circlePos(t, path);
    const ahead = circlePos(t + 3, path); // olha um pouco à frente
    const ground = Math.max(groundHeight(p.x, p.z), groundHeight(ahead.x, ahead.z));
    const wanted = Math.max(y + Math.sin(t * yFreq) * yAmp, ground + clearance);
    alt = THREE.MathUtils.damp(alt, wanted, 1.5, dt);
    obj.position.set(p.x, alt, p.z);
    obj.rotation.y = p.yaw + faceOffset;
  };
}

function swimmer(obj, path, { y = 0, yAmp = 0, yFreq = 1, faceOffset = 0 }) {
  return (t) => {
    const p = circlePos(t, path);
    obj.position.set(p.x, y + Math.sin(t * yFreq) * yAmp, p.z);
    obj.rotation.y = p.yaw + faceOffset;
  };
}

// Os modelos "Official" vêm com brilho (emissive) branco e transparência em tudo,
// o que deixa o corpo branco ou invisível. Aqui deixamos os materiais normais.
export function fixOfficialMaterials(model) {
  model.traverse((o) => {
    if (!o.isMesh) return;
    for (const m of [].concat(o.material)) {
      if (m.emissiveMap) m.emissiveIntensity = 0.4;
      else m.emissive.setRGB(0, 0, 0);
      m.transparent = false;
      m.depthWrite = true;
      m.metalness = 0;
      m.roughness = 0.75;
    }
  });
}

// Toca uma animação do modelo (procura pelo trecho do nome).
function playClip(holder, gltf, nameIncludes, { timeScale = 1 } = {}) {
  const clip = gltf.animations.find((a) => a.name.includes(nameIncludes)) || gltf.animations[0];
  if (!clip) return null;
  const mixer = new THREE.AnimationMixer(gltf.scene);
  const action = mixer.clipAction(clip);
  action.timeScale = timeScale;
  action.time = Math.random() * clip.duration; // cada um começa num ponto diferente
  action.play();
  holder.userData.mixer = mixer;
  holder.userData.clips = gltf.animations;
  holder.userData.action = action;
  return mixer;
}

// Troca para outra animação com uma transição suave.
function switchClip(holder, nameIncludes, { loop = true, fade = 0.4 } = {}) {
  const { mixer, clips, action } = holder.userData;
  if (!mixer) return;
  const clip = clips.find((a) => a.name.includes(nameIncludes));
  if (!clip || action?.getClip() === clip) return;
  const next = mixer.clipAction(clip);
  next.reset();
  next.setLoop(loop ? THREE.LoopRepeat : THREE.LoopOnce, Infinity);
  next.clampWhenFinished = !loop;
  next.play();
  if (action) next.crossFadeFrom(action, fade, false);
  holder.userData.action = next;
}

const tickMixer = (obj, dt) => obj.userData.mixer?.update(dt);

// Toca várias animações ao mesmo tempo para misturar pelo peso (ex.: parado x nadando).
export function playBlend(holder, gltf, names) {
  const mixer = new THREE.AnimationMixer(gltf.scene);
  const actions = {};
  for (const n of names) {
    const clip = gltf.animations.find((a) => a.name === n);
    if (!clip) continue;
    const a = mixer.clipAction(clip);
    a.time = Math.random() * clip.duration;
    a.play();
    actions[n] = a;
  }
  holder.userData.mixer = mixer;
  holder.userData.actions = actions;
  return actions;
}

// ------------------------------------------------------------------ shiny ---
// Chance de cada Pokémon aparecer "shiny" (cores trocadas e brilhinhos).
export const shinyConfig = { odds: 50 }; // 1 em 50

// Gira o matiz das cores do modelo (no shader, depois de ler a textura).
export function makeShiny(holder) {
  const model = holder.userData.model;
  if (!model || holder.userData.shinyApplied) return;
  holder.userData.shinyApplied = true;
  const hue = holder.userData.shinyHue ?? 2.2; // radianos
  model.traverse((o) => {
    if (!o.isMesh) return;
    const mats = [].concat(o.material).map((m) => {
      const c = m.clone();
      c.onBeforeCompile = (shader) => {
        shader.fragmentShader = shader.fragmentShader.replace(
          '#include <map_fragment>',
          `#include <map_fragment>
           {
             const vec3 k = vec3(0.57735);
             float ca = cos(${hue.toFixed(3)});
             vec3 col = diffuseColor.rgb;
             diffuseColor.rgb = col * ca + cross(k, col) * sin(${hue.toFixed(3)}) + k * dot(k, col) * (1.0 - ca);
             diffuseColor.rgb *= 1.08;
           }`
        );
      };
      c.customProgramCacheKey = () => 'shiny' + hue.toFixed(3);
      return c;
    });
    o.material = Array.isArray(o.material) ? mats : mats[0];
  });
  // brilhinhos em volta
  const box = new THREE.Box3().setFromObject(model);
  const size = box.getSize(new THREE.Vector3()).length() / holder.scale.x;
  const n = 40, arr = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    const v = new THREE.Vector3().randomDirection().multiplyScalar(size * (0.3 + Math.random() * 0.35));
    arr.set([v.x, Math.abs(v.y) * 0.8 + size * 0.15, v.z], i * 3);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(arr, 3));
  const sparkle = new THREE.Points(geo, new THREE.PointsMaterial({ color: 0xfff6b0, size: 6, sizeAttenuation: false, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
  sparkle.userData.isSparkle = true;
  holder.add(sparkle);
  holder.userData.sparkle = sparkle;
}

export function rollShiny(c) {
  if (c.obj.userData.shiny) return;
  if (Math.random() < 1 / shinyConfig.odds) {
    c.obj.userData.shiny = true;
    c.shiny = true;
    if (c.obj.userData.model) makeShiny(c.obj);
  }
}

export function tickSparkle(obj, t) {
  const s = obj.userData.sparkle;
  if (s) { s.material.opacity = 0.35 + 0.65 * Math.abs(Math.sin(t * 3)); s.rotation.y = t * 0.6; }
}

// hora do dia: o Ho-Oh só aparece de dia

export function createCreatures(loadModelRaw) {
  const list = [];
  const add = (c) => { list.push(c); rollShiny(c); return c; };
  // ao terminar de carregar, aplica o shiny se a criatura foi sorteada
  const loadModel = (path, opts = {}) => loadModelRaw(path, {
    ...opts,
    onLoad: (h, gltf) => { opts.onLoad?.(h, gltf); if (h.userData.shiny) makeShiny(h); },
  });

  // ---------------------------------------------------------------- água ---

  // Magikarps: nadam em círculos e dão pulinhos de vez em quando
  [
    { center: [90, 10], radius: 40, speed: 0.35, scale: 1, phase: 0 },
    { center: [-60, -60], radius: 30, speed: -0.45, scale: 1, phase: 2 },
    { center: [140, 260], radius: 60, speed: 0.2, scale: 2, phase: 4 },
  ].forEach((cfg, i) => {
    // animações Nadar e Debater feitas no Blender (magikarp_animado.glb)
    const obj = loadModel('assets/Magikarp/magikarp_animado.glb', {
      scale: cfg.scale,
      onLoad: (h, gltf) => playBlend(h, gltf, ['Nadar', 'Debater']),
    });
    const swim = swimmer(obj, cfg, {});
    add({
      id: 'magikarp', name: 'Magikarp', obj, seeRadius: 60 * cfg.scale, instance: i,
      update(t, dt) {
        swim(t, dt);
        const hop = Math.max(0, Math.sin(t * 0.8 + cfg.phase)) ** 8; // pulo curto e raro
        obj.position.y = 1.0 + hop * 6 * cfg.scale;
        const m = obj.userData.model;
        if (m) m.rotation.x = -Math.cos(t * 0.8 + cfg.phase) * hop * 0.8;
        // no pulo ele se debate; na água, só nada
        const acts = obj.userData.actions;
        if (acts?.Nadar) { acts.Debater.weight = Math.min(1, hop * 3); acts.Nadar.weight = 1 - acts.Debater.weight; }
        tickMixer(obj, dt);
      },
    });
  });

  // Gyarados: patrulha em círculo; o modelo olha para -X, daí o faceOffset de 90°
  {
    // corpo ondulando: esqueleto e animação "Nadar" feitos no Blender (gyarados_animado.glb)
    const obj = loadModel('assets/Gyarados/gyarados_animado.glb', {
      scale: 10,
      onLoad: (h, gltf) => playClip(h, gltf, 'Nadar'),
    });
    const swim = swimmer(obj, { center: [800, 200], radius: 250, speed: 0.06 }, { y: 12, yAmp: 4, yFreq: 0.5, faceOffset: Math.PI / 2 });
    add({
      id: 'gyarados', name: 'Gyarados', obj, seeRadius: 220,
      update(t, dt) {
        swim(t, dt);
        const m = obj.userData.model;
        if (m) m.rotation.z = Math.sin(t * 1.3) * 0.04;
        tickMixer(obj, dt);
      },
    });
  }

  // ------------------------------------------------------------ em terra ---

  // Groudon: descansa no topo da ilha grande. As animações "Idle" (respirar,
  // balançar o rabo) e "Roar" (rugido) foram feitas no Blender e salvas em groudon_animado.glb.
  // Quando a Lapras chega perto, ele ruge uma vez e volta a descansar.
  {
    const obj = loadModel('assets/Groudon/groudon_animado.glb', {
      scale: 100, position: [-2300, 40, -2000], rotation: [0, 1, 0],
      onLoad: (h, gltf) => {
        playClip(h, gltf, 'Idle');
        h.userData.mixer.addEventListener('finished', () => switchClip(h, 'Idle', { loop: true, fade: 0.6 }));
      },
    });
    let roared = false;
    add({
      id: 'groudon', name: 'Groudon', obj, seeRadius: 900,
      update(t, dt, ctx) {
        // apoia os pés no chão: usa a média do terreno embaixo do corpo, não só o pico
        if (!obj.userData.grounded) {
          const c = groundHeight(obj.position.x, obj.position.z);
          if (c > -Infinity) {
            let sum = 0, n = 0;
            for (let k = 0; k < 8; k++) {
              const a = (k / 8) * Math.PI * 2;
              const g = groundHeight(obj.position.x + Math.cos(a) * 45, obj.position.z + Math.sin(a) * 45);
              if (g > -Infinity) { sum += g; n++; }
            }
            obj.position.y = Math.min(c, n ? sum / n : c) - 6;
            obj.userData.grounded = true;
          }
        }
        const near = ctx.laprasDistance(obj) < 1300;
        if (near && !roared) switchClip(obj, 'Roar', { loop: false, fade: 0.3 });
        roared = near ? true : (ctx.laprasDistance(obj) > 1800 ? false : roared);
        tickMixer(obj, dt);
      },
    });
  }

  // Mew: flutua acima da ilha flutuante, girando devagar
  {
    const obj = loadModel('assets/Mew/scene.gltf', { scale: 0.1, rotation: [0, 3, 0] });
    add({
      id: 'mew', name: 'Mew', obj, seeRadius: 90,
      update(t) {
        obj.position.set(-10 + Math.cos(t * 0.5) * 25, 55 + Math.sin(t * 1.3) * 3, 100 + Math.sin(t * 0.5) * 25);
        obj.rotation.y = t * 0.3;
      },
    });
  }

  // --------------------------------------------- pequenos (podem te acompanhar) ---
  // Os cinco abaixo ganharam esqueleto e animações (Idle e Nadar) no Blender.
  // "companion: true" quer dizer que, ao chegar perto, há uma chance de ele nadar junto.
  const small = (path, scale) => loadModel(path, {
    scale,
    onLoad: (h, gltf) => playBlend(h, gltf, ['Idle', 'Nadar']),
  });
  const blendSwim = (obj, swimming) => {
    const a = obj.userData.actions;
    if (!a?.Nadar) return;
    a.Nadar.weight = THREE.MathUtils.damp(a.Nadar.weight, swimming ? 1 : 0, 3, 1 / 60);
    a.Idle.weight = 1 - a.Nadar.weight;
  };

  // Psyduck: boia meio perdido perto da ilha flutuante, com dor de cabeça
  {
    const obj = small('assets/psyduck/psyduck_animado.glb', 9);
    const path = { center: [-140, 170], radius: 35, speed: 0.18 };
    add({
      id: 'psyduck', name: 'Psyduck', obj, seeRadius: 90, companion: true, floatY: -2.5,
      update(t, dt) {
        const p = circlePos(t, path);
        obj.position.set(p.x, -2.5 + Math.sin(t * 1.7) * 0.4, p.z);
        obj.rotation.y = p.yaw;
        blendSwim(obj, true);
        tickMixer(obj, dt);
      },
    });
  }

  // Totodile: dança na ponta do píer; quando a Lapras chega perto, fica agitado
  {
    const obj = small('assets/totodile/totodile_animado.glb', 9);
    add({
      id: 'totodile', name: 'Totodile', obj, seeRadius: 110, companion: true, floatY: -3,
      place(pos, yaw) { obj.position.copy(pos); obj.rotation.y = yaw; obj.userData.home = pos.clone(); obj.userData.homeYaw = yaw; obj.userData.placed = true; },
      activeWhen: () => !!obj.userData.placed, // fica escondido até achar o lugar dele no mapa
      update(t, dt, ctx) {
        if (obj.userData.home) { obj.position.copy(obj.userData.home); obj.rotation.y = obj.userData.homeYaw; }
        blendSwim(obj, ctx.laprasDistance(obj) < 90);
        tickMixer(obj, dt);
      },
    });
  }

  // Popplio: toma sol no alto da ilhota de pedras
  {
    const obj = small('assets/popplio/popplio_animado.glb', 8);
    add({
      id: 'popplio', name: 'Popplio', obj, seeRadius: 120, companion: true, floatY: -2,
      place(pos, yaw) { obj.position.copy(pos); obj.rotation.y = yaw; obj.userData.home = pos.clone(); obj.userData.homeYaw = yaw; obj.userData.placed = true; },
      activeWhen: () => !!obj.userData.placed, // fica escondido até achar o lugar dele no mapa
      update(t, dt) {
        if (obj.userData.home) { obj.position.copy(obj.userData.home); obj.rotation.y = obj.userData.homeYaw; }
        blendSwim(obj, false);
        tickMixer(obj, dt);
      },
    });
  }

  // Sobble: tímido, só nada perto do fundo (é preciso mergulhar para achar)
  {
    const obj = small('assets/sobble/sobble_animado.glb', 7);
    const path = { center: [220, 160], radius: 60, speed: -0.25 };
    add({
      id: 'sobble', name: 'Sobble', obj, seeRadius: 70, companion: true, underwater: true,
      update(t, dt) {
        const p = circlePos(t, path);
        obj.position.set(p.x, seabedHeight(p.x, p.z) + 6 + Math.sin(t * 1.2) * 1.5, p.z);
        obj.rotation.y = p.yaw;
        blendSwim(obj, true);
        tickMixer(obj, dt);
      },
    });
  }

  // Chinchou: perto do fundo, junto do farol; as luzinhas brilham (mais ainda à noite)
  {
    const obj = small('assets/chinchou/chinchou_animado.glb', 10);
    const glowTex = (() => {
      const c = document.createElement('canvas'); c.width = c.height = 64;
      const g = c.getContext('2d'); const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
      gr.addColorStop(0, 'rgba(255,250,190,1)'); gr.addColorStop(0.3, 'rgba(255,230,120,0.6)'); gr.addColorStop(1, 'rgba(255,220,100,0)');
      g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
      return new THREE.CanvasTexture(c);
    })();
    const glows = [-1, 1].map((s) => {
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }));
      sp.position.set(0.78 * s * 10, 3, 0);
      sp.scale.setScalar(9);
      obj.add(sp);
      return sp;
    });
    const path = { center: [620, -620], radius: 80, speed: 0.15 };
    add({
      id: 'chinchou', name: 'Chinchou', obj, seeRadius: 80, underwater: true,
      update(t, dt, ctx) {
        const p = circlePos(t, path);
        obj.position.set(p.x, seabedHeight(p.x, p.z) + 8 + Math.sin(t * 0.9) * 2, p.z);
        obj.rotation.y = p.yaw;
        const pulse = 0.6 + 0.4 * Math.sin(t * 2.5);
        glows.forEach((g) => { g.material.opacity = pulse * (0.5 + 0.5 * (ctx.night ?? 0)); g.scale.setScalar(8 + (ctx.night ?? 0) * 8); });
        blendSwim(obj, true);
        tickMixer(obj, dt);
      },
    });
  }

  // Froakie: nada em volta das pedras perto do píer; pode virar companheiro
  {
    const obj = small('assets/froakie/froakie_animado.glb', 8);
    const path = { center: [330, 90], radius: 30, speed: 0.3 };
    add({
      id: 'froakie', name: 'Froakie', obj, seeRadius: 90, companion: true, floatY: -2.5,
      update(t, dt) {
        const p = circlePos(t, path);
        const hop = Math.max(0, Math.sin(t * 1.3)) ** 6; // pulinhos de sapo
        obj.position.set(p.x, -2.5 + hop * 7, p.z);
        obj.rotation.y = p.yaw;
        blendSwim(obj, true);
        tickMixer(obj, dt);
      },
    });
  }

  // Wigletts: moram enterrados na areia do fundo e esticam o pescoço de vez em quando
  [[-180, -40], [-150, -70], [-205, -85]].forEach(([x, z], i) => {
    const obj = small('assets/wiglett/wiglett_animado.glb', 9);
    add({
      id: 'wiglett', name: 'Wiglett', obj, seeRadius: 70, underwater: true, instance: i,
      update(t, dt) {
        const out = THREE.MathUtils.smoothstep(Math.sin(t * 0.35 + i * 2.1), -0.2, 0.4); // aparece e se esconde
        obj.position.set(x, seabedHeight(x, z) - 9 + out * 9, z);
        obj.rotation.y = Math.sin(t * 0.2 + i) * 0.8;
        tickMixer(obj, dt);
      },
    });
  });

  // Clodsire: cochila na praia do Monte Arco-Íris
  {
    const obj = small('assets/clodsire/clodsire_animado.glb', 10);
    add({
      id: 'clodsire', name: 'Clodsire', obj, seeRadius: 140,
      place(pos, yaw) { obj.position.copy(pos); obj.rotation.y = yaw; obj.userData.placed = true; },
      activeWhen: () => !!obj.userData.placed, // fica escondido até achar a praia (antes aparecia junto da Lapras)
      update(t, dt) { blendSwim(obj, false); tickMixer(obj, dt); },
    });
  }

  // Keldeo: galopa sobre a água, em um grande círculo a leste
  {
    const obj = loadModel('assets/keldeo/keldeo_animado.glb', {
      scale: 14,
      onLoad: (h, gltf) => playClip(h, gltf, 'Correr', { timeScale: 1.2 }),
    });
    const path = { center: [1700, 900], radius: 450, speed: 0.12 };
    add({
      id: 'keldeo', name: 'Keldeo', obj, seeRadius: 250,
      update(t, dt) {
        const p = circlePos(t, path);
        obj.position.set(p.x, -0.5 + Math.abs(Math.sin(t * 9)) * 1.2, p.z);
        obj.rotation.y = p.yaw;
        tickMixer(obj, dt);
      },
    });
  }

  // Jirachi: só aparece em noites de estrelas cadentes (veja createSky / comando "desejo")
  {
    const obj = small('assets/jirachi/jirachi_animado.glb', 8);
    obj.userData.summoned = false;
    add({
      id: 'jirachi', name: 'Jirachi', obj, seeRadius: 120,
      activeWhen: () => obj.userData.summoned,
      update(t, dt, ctx) {
        // flutua perto da Lapras, girando devagar e brilhando
        const target = ctx.laprasPos;
        if (!obj.userData.anchor) obj.userData.anchor = target.clone().add(new THREE.Vector3(20, 0, 20));
        obj.userData.anchor.lerp(target.clone().add(new THREE.Vector3(Math.cos(t * 0.4) * 30, 0, Math.sin(t * 0.4) * 30)), 1 - Math.exp(-0.5 * dt));
        obj.position.set(obj.userData.anchor.x, 22 + Math.sin(t * 1.5) * 3, obj.userData.anchor.z);
        obj.rotation.y += dt * 0.5;
        blendSwim(obj, false);
        tickMixer(obj, dt);
      },
    });
  }

  // ------------------------------------------------------------- no céu ---

  // Aves lendárias (separadas do modelo "The Legendary Birds" no Blender, cada uma com
  // esqueleto e animações Voar/Planar). O modelo fica em pé, então deitamos para a frente.
  // pitch: quanto deitar o modelo para a frente (o Articuno já vem inclinado pelo esqueleto)
  const bird = (file, scale, pitch = 1.35) => loadModel(`assets/the_legendary_birds/${file}`, {
    scale, rotation: [pitch, 0, 0],
    onLoad: (h, gltf) => playBlend(h, gltf, ['Voar', 'Planar']),
  });
  // alterna entre bater as asas e planar, como um pássaro de verdade
  const flapGlide = (obj, t, ph) => {
    const a = obj.userData.actions;
    if (!a?.Voar) return;
    const glide = THREE.MathUtils.smoothstep(Math.sin(t * 0.25 + ph), 0.1, 0.6);
    a.Planar.weight = glide; a.Voar.weight = 1 - glide;
  };

  // Articuno: em volta da montanha gelada
  {
    // a cauda longa do Articuno fica melhor com ele voando mais "em pé"
    const obj = bird('articuno_animado.glb', 70, 0.6);
    const fly = flyer(obj, { center: [5000, 5000], radius: 1300, speed: 0.06 }, { y: 950, yAmp: 40, yFreq: 0.4, clearance: 220 });
    add({
      id: 'articuno', name: 'Articuno', obj, seeRadius: 900,
      update(t, dt) { fly(t, dt); obj.rotation.z = -0.25; flapGlide(obj, t, 0); tickMixer(obj, dt); },
    });
  }

  // Zapdos: sobre a ilha grande
  {
    const obj = bird('zapdos_animado.glb', 70);
    const calm = flyer(obj, { center: [-2300, -2000], radius: 1000, speed: 0.07 }, { y: 800, yAmp: 50, yFreq: 0.3, clearance: 220 });
    add({
      id: 'zapdos', name: 'Zapdos', obj, seeRadius: 900,
      update(t, dt) { calm(t, dt); obj.rotation.z = -0.3; flapGlide(obj, t, 2); tickMixer(obj, dt); },
    });
  }

  // Moltres: do pôr do sol ao amanhecer, em volta do Monte Arco-Íris
  {
    const obj = bird('moltres_animado.glb', 80);
    const fly = flyer(obj, { center: [-2100, 2000], radius: 900, speed: -0.06 }, { y: 900, yAmp: 40, yFreq: 0.35, clearance: 220 });
    add({
      id: 'moltres', name: 'Moltres', obj, seeRadius: 900, activeWhen: (h) => h >= 17 || h < 7,
      update(t, dt) { fly(t, dt); obj.rotation.z = 0.25; flapGlide(obj, t, 4); tickMixer(obj, dt); },
    });
  }

  // Rayquaza (versão animada): voa em círculos bem alto
  {
    const obj = loadModel('assets/rayquaza-remastered/source/model.gltf', {
      scale: 40,
      onLoad: (h, gltf) => playClip(h, gltf, 'fly'),
    });
    // o modelo olha para -Z, daí o faceOffset de 180°
    const fly = flyer(obj, { center: [0, -1500], radius: 1600, speed: 0.04 }, { y: 600, yAmp: 60, yFreq: 0.3, clearance: 250, faceOffset: Math.PI });
    add({
      id: 'rayquaza', name: 'Rayquaza', obj, seeRadius: 700,
      update(t, dt) { fly(t, dt); tickMixer(obj, dt); },
    });
  }

  // Ho-Oh: só de dia, voando alto a sudoeste
  {
    const obj = loadModel('assets/250_hooh_flying_animation/scene.gltf', {
      scale: 0.5,
      onLoad: (h, gltf) => playClip(h, gltf, 'Take 001'),
    });
    const fly = flyer(obj, { center: [-2200, 2200], radius: 1300, speed: -0.05 }, { y: 650, yAmp: 60, yFreq: 0.2, clearance: 200 });
    add({
      id: 'hooh', name: 'Ho-Oh', obj, seeRadius: 800, activeWhen: (h) => h >= 6 && h < 18.5,
      update(t, dt) { fly(t, dt); obj.rotation.z = 0.15; tickMixer(obj, dt); },
    });
  }

  return list;
}

// Informações do diário (texto próprio, curto). A ordem é a da lista na tela.
export const DEX = [
  { id: 'lapras', name: 'Lapras', hint: 'Sua companheira de viagem.' },
  { id: 'magikarp', name: 'Magikarp', hint: 'Pula sem parar perto do ponto de partida.' },
  { id: 'mew', name: 'Mew', hint: 'Dizem que brinca perto de uma ilha que flutua.' },
  { id: 'psyduck', name: 'Psyduck', hint: 'Boia meio perdido perto da ilha flutuante.' },
  { id: 'totodile', name: 'Totodile', hint: 'Dança na ponta do píer, a leste do início.' },
  { id: 'popplio', name: 'Popplio', hint: 'Toma sol na ilhota de pedras com coqueiros, a noroeste.' },
  { id: 'sobble', name: 'Sobble', hint: 'Tímido, só nada perto do fundo. Mergulhe para achar.' },
  { id: 'chinchou', name: 'Chinchou', hint: 'Suas luzes brilham no fundo do mar, perto do farol.' },
  { id: 'froakie', name: 'Froakie', hint: 'Pula entre as pedras perto do píer.' },
  { id: 'wiglett', name: 'Wiglett', hint: 'Mora enterrado na areia do fundo, perto do início. Mergulhe.' },
  { id: 'clodsire', name: 'Clodsire', hint: 'Cochila na praia do Monte Arco-Íris, a sudoeste.' },
  { id: 'keldeo', name: 'Keldeo', hint: 'Galopa sobre a água, bem a leste.' },
  { id: 'gyarados', name: 'Gyarados', hint: 'Patrulha as águas a leste.' },
  { id: 'rayquaza', name: 'Rayquaza', hint: 'Voa muito alto, em grandes círculos ao norte.' },
  { id: 'groudon', name: 'Groudon', hint: 'Descansa no topo da ilha grande, a noroeste.' },
  { id: 'hooh', name: 'Ho-Oh', hint: 'Só aparece de dia, voando alto a sudoeste.' },
  { id: 'articuno', name: 'Articuno', hint: 'Sobrevoa a montanha gelada, a sudeste.' },
  { id: 'zapdos', name: 'Zapdos', hint: 'Voa sobre a ilha grande, a noroeste.' },
  { id: 'moltres', name: 'Moltres', hint: 'Do pôr do sol ao amanhecer, em volta do Monte Arco-Íris.' },
  { id: 'jirachi', name: 'Jirachi', hint: 'Dizem que aparece quando alguém faz um desejo numa chuva de estrelas.' },
];

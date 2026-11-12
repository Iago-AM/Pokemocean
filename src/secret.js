// Ilha secreta: o "Santuário das Estrelas". Só aparece quando o diário está completo.
// Ao chegar lá pela primeira vez acontece a festa final: a noite cai, chovem estrelas,
// os Pokémon que você conheceu se reúnem em volta da ilha, há fogos de artifício,
// uma carta de agradecimento com os créditos e um presente: a Lapras dourada.
import * as THREE from 'three';
import { addTerrain } from './terrain.js';

export const SECRET_POS = new THREE.Vector3(0, 0, -6200);
const SCALE = 450;

// ---------------------------------------------------------------- fogos ---
function makeFireworks(scene) {
  const N = 3000;
  const pos = new Float32Array(N * 3), vel = new Float32Array(N * 3), col = new Float32Array(N * 3), base = new Float32Array(N * 3), life = new Float32Array(N);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  const dot = document.createElement('canvas'); dot.width = dot.height = 32;
  const g = dot.getContext('2d'); const gr = g.createRadialGradient(16, 16, 0, 16, 16, 16);
  gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 32, 32);
  const pts = new THREE.Points(geo, new THREE.PointsMaterial({ map: new THREE.CanvasTexture(dot), size: 14, vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }));
  pts.frustumCulled = false;
  scene.add(pts);
  let next = 0;
  const colors = [[1, 0.4, 0.4], [1, 0.85, 0.3], [0.4, 0.8, 1], [0.6, 1, 0.5], [1, 0.5, 1], [1, 1, 1]];
  function burst(center) {
    const c = colors[Math.floor(Math.random() * colors.length)];
    for (let k = 0; k < 220; k++) {
      const i = next; next = (next + 1) % N;
      const v = new THREE.Vector3().randomDirection().multiplyScalar(90 + Math.random() * 40);
      pos.set([center.x, center.y, center.z], i * 3); vel.set([v.x, v.y, v.z], i * 3);
      base.set(c, i * 3); life[i] = 2.2 + Math.random() * 0.8;
    }
  }
  return {
    burst,
    update(dt) {
      for (let i = 0; i < N; i++) {
        if (life[i] <= 0) { col[i * 3] = col[i * 3 + 1] = col[i * 3 + 2] = 0; continue; }
        life[i] -= dt;
        vel[i * 3 + 1] -= 40 * dt;                 // gravidade
        for (let a = 0; a < 3; a++) { vel[i * 3 + a] *= 0.985; pos[i * 3 + a] += vel[i * 3 + a] * dt; }
        const k = Math.min(1, life[i] / 1.2) * (0.7 + 0.3 * Math.sin(life[i] * 30 + i));
        col[i * 3] = base[i * 3] * k; col[i * 3 + 1] = base[i * 3 + 1] * k; col[i * 3 + 2] = base[i * 3 + 2] * k;
      }
      geo.attributes.position.needsUpdate = true;
      geo.attributes.color.needsUpdate = true;
    },
  };
}

export function createSecret({ scene, loadModel, ui, env, extras, audio, onFestivalStart, onFestivalEnd }) {
  const holder = loadModel('assets/Ilha_Secreta/ilha_secreta.glb', {
    scale: SCALE, position: [SECRET_POS.x, -80, SECRET_POS.z],
    onLoad: (h) => {
      h.traverse((o) => { if (o.isMesh && o.name.startsWith('Cristal')) crystal = o; });
      if (crystal) { crystal.material.emissiveIntensity = 2; crystal.userData.baseY = crystal.position.y; }
    },
  });
  holder.visible = false;
  let crystal = null;

  // brilho e luz do cristal
  const glowCanvas = document.createElement('canvas'); glowCanvas.width = glowCanvas.height = 64;
  { const g = glowCanvas.getContext('2d'); const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    gr.addColorStop(0, 'rgba(200,240,255,1)'); gr.addColorStop(0.4, 'rgba(120,200,255,0.45)'); gr.addColorStop(1, 'rgba(120,200,255,0)');
    g.fillStyle = gr; g.fillRect(0, 0, 64, 64); }
  const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(glowCanvas), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }));
  glow.scale.setScalar(160);
  const light = new THREE.PointLight(0x9fdcff, 0, 1200, 1.4);
  const glowHolder = new THREE.Group();
  glowHolder.add(glow, light);
  glowHolder.visible = false;
  scene.add(glowHolder);

  const fireworks = makeFireworks(scene);

  const state = { unlocked: false, rising: 0, festival: 0, festivalDone: false, terrainAdded: false, credits: null };

  function unlock({ instant = false } = {}) {
    if (state.unlocked) return;
    state.unlocked = true;
    holder.visible = true;
    glowHolder.visible = true;
    state.rising = instant ? 1 : 0;
    if (!instant) {
      ui.toast('✨ Uma luz estranha surgiu ao norte, além da névoa...');
      setTimeout(() => ui.showLetter('Quando todos os Pokémon do mar foram vistos, uma ilha que ninguém conhecia surgiu da névoa, ao norte. Dizem que é lá que as estrelas descansam. Siga a luz azul (veja o mapa).'), 2500);
    }
  }

  function startFestival() {
    state.festival = 0.001;
    onFestivalStart?.();
    ui.toast('🎉 Os Pokémon que você conheceu vieram comemorar!');
    // a noite cai devagar e começa uma chuva de estrelas
    state.savedCycle = env.state.cycleMinutes;
    env.state.cycleMinutes = 0.6;
    extras.startShower(260);
    audio.music?.setMood?.('dia');
  }

  function showCredits(credits) {
    const el = document.createElement('div');
    el.className = 'credits';
    el.innerHTML = `<div class="roll">
      <h1>Pokémocean</h1>
      <p class="thanks">Obrigado por navegar com a Lapras até o fim.<br>Todos os Pokémon do mar agora conhecem você.</p>
      <p class="gift">🎁 Presente: a <b>Lapras dourada</b>. Use <code>set lapras dourada</code> (e <code>set lapras normal</code> para voltar).</p>
      <h2>Criado por</h2><p>Iago</p>
      <h2>Modelos 3D</h2>${credits.map((c) => `<p>${c}</p>`).join('')}
      <h2>Feito com</h2><p>three.js · Vite · Blender</p>
      <p class="end">Clique para voltar ao mar</p>
    </div>`;
    document.body.appendChild(el);
    el.addEventListener('click', () => { el.classList.add('out'); setTimeout(() => el.remove(), 900); });
  }

  return {
    get unlocked() { return state.unlocked; },
    get festivalActive() { return state.festival > 0 && state.festival < 1; },
    unlock,
    replayFestival() { if (state.unlocked) { state.festivalDone = false; startFestival(); } },
    // posição de cada Pokémon pequeno na roda da festa
    partyPos(i, n, t, out) {
      const a = (i / n) * Math.PI * 2 + t * 0.15;
      return out.set(SECRET_POS.x + Math.cos(a) * 520, -2.5 + Math.sin(t * 2 + i) * 0.8, SECRET_POS.z + Math.sin(a) * 520);
    },
    update(t, dt, laprasPos, credits) {
      if (!state.unlocked) return;
      // a ilha sobe do mar
      if (state.rising < 1) {
        state.rising = Math.min(1, state.rising + dt / 9);
        const k = state.rising * state.rising * (3 - 2 * state.rising);
        holder.position.y = -80 * (1 - k);
      } else if (!state.terrainAdded && holder.userData.model) {
        state.terrainAdded = true;
        addTerrain(holder);
      }
      // cristal girando e pulsando
      if (crystal) crystal.getWorldPosition(glowHolder.position);
      else glowHolder.position.set(SECRET_POS.x, holder.position.y + 0.2 * SCALE, SECRET_POS.z);
      const pulse = 0.7 + 0.3 * Math.sin(t * 2);
      glow.scale.setScalar(140 + pulse * 60 + (env.state.night ?? 0) * 120);
      glow.material.opacity = 0.5 + 0.5 * pulse;
      light.intensity = (0.6 + (env.state.night ?? 0) * 2) * pulse;
      if (crystal) { crystal.rotation.y = t * 0.5; crystal.position.y = crystal.userData.baseY + Math.sin(t * 1.2) * 0.012; }

      // chegou perto pela primeira vez: festa!
      const d = Math.hypot(laprasPos.x - SECRET_POS.x, laprasPos.z - SECRET_POS.z);
      if (!state.festivalDone && state.rising >= 1 && d < 700 && state.festival === 0) startFestival();
      if (state.festival > 0 && state.festival < 1) {
        state.festival += dt / 75; // a festa dura uns 75 s
        if ((env.state.night ?? 0) > 0.9 && env.state.cycleMinutes !== 0) env.state.cycleMinutes = 0; // para de escurecer
        if (Math.random() < dt * 1.3) {
          fireworks.burst(new THREE.Vector3(SECRET_POS.x + (Math.random() - 0.5) * 900, 380 + Math.random() * 260, SECRET_POS.z + (Math.random() - 0.5) * 900));
        }
        if (state.festival > 0.45 && !state.creditsShown) { state.creditsShown = true; showCredits(credits); }
        if (state.festival >= 1) {
          state.festivalDone = true;
          state.creditsShown = false;
          env.state.cycleMinutes = state.savedCycle || 20;
          onFestivalEnd?.();
        }
      }
      fireworks.update(dt);
    },
  };
}

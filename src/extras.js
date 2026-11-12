// Garrafas com mensagem, aurora e arco-íris.
import * as THREE from 'three';
import { isLand } from './terrain.js';
import { waveHeight } from './environment.js';

// --------------------------------------------------------------- garrafas ---

export const BOTTLES = [
  { id: 'b1', pos: [60, -140], text: 'Se você está lendo isto, a maré foi gentil com nós dois. Dizem que a Lapras entende o canto das ondas.' },
  { id: 'b2', pos: [520, -420], text: 'O farol nunca apaga. Os Wingull usam a luz dele para achar o caminho de casa.' },
  { id: 'b3', pos: [-300, 220], text: 'A garota da ilha flutuante espera alguém há muito tempo. Talvez seja você.' },
  { id: 'b4', pos: [-900, -700], text: 'O Groudon dorme no alto da ilha grande. Chegue perto e ele vai te cumprimentar do jeito dele.' },
  { id: 'b5', pos: [1100, 600], text: 'Alguns Pokémon nascem com cores diferentes e brilham. São raros... muito raros.' },
  { id: 'b6', pos: [-150, -520], text: 'Segure o fôlego e desça: lá embaixo há jardins inteiros de algas dançando com a correnteza.' },
  { id: 'b7', pos: [2600, 2600], text: 'Nas noites de céu limpo, o céu sobre a montanha gelada dança em verde e roxo.' },
  { id: 'b8', pos: [-1400, 1300], text: 'Depois da chuva, olhe para o lado oposto ao sol. O Ho-Oh gosta de voar por ali.' },
  { id: 'b9', pos: [300, 900], text: 'O Mew aparece para quem não tem pressa. Este mar também.' },
  { id: 'b10', pos: [-2600, 400], text: 'Este oceano foi desenhado em 2022 e redescoberto anos depois. Obrigado por navegar por ele.' },
];

function makeBottleMesh() {
  const group = new THREE.Group();
  // perfil da garrafa (raio, altura) girado em volta do eixo
  const pts = [[0, 0], [1.1, 0], [1.2, 0.3], [1.2, 2.4], [0.9, 3.0], [0.45, 3.4], [0.45, 4.2], [0, 4.2]].map(([x, y]) => new THREE.Vector2(x, y));
  const glass = new THREE.Mesh(
    new THREE.LatheGeometry(pts, 20),
    new THREE.MeshStandardMaterial({ color: 0x7fd6a8, roughness: 0.1, metalness: 0.1, transparent: true, opacity: 0.55 })
  );
  const cork = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.38, 0.6, 12), new THREE.MeshStandardMaterial({ color: 0x9b6b3d, roughness: 0.9 }));
  cork.position.y = 4.3;
  const paper = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.45, 2, 10), new THREE.MeshStandardMaterial({ color: 0xf3e6c4, roughness: 1 }));
  paper.position.y = 1.4;
  group.add(paper, glass, cork);
  group.rotation.z = Math.PI / 2.4; // deitada, boiando
  const holder = new THREE.Group();
  holder.add(group);
  holder.scale.setScalar(3);
  return holder;
}

// --------------------------------------------------------------- aurora ---

function makeAurora() {
  const uniforms = { uTime: { value: 0 }, uOpacity: { value: 0 } };
  const mat = new THREE.ShaderMaterial({
    uniforms,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
    fog: false,
    vertexShader: `
      varying vec2 vUv;
      uniform float uTime;
      void main() {
        vUv = uv;
        vec3 p = position;
        p.z += sin(p.x * 0.0012 + uTime * 0.15) * 400.0 + sin(p.x * 0.004 - uTime * 0.3) * 120.0; // cortina ondulando
        gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
      }`,
    fragmentShader: `
      varying vec2 vUv;
      uniform float uTime;
      uniform float uOpacity;
      void main() {
        float bands = 0.5 + 0.5 * sin(vUv.x * 40.0 + uTime * 0.6 + sin(vUv.x * 9.0 - uTime * 0.2) * 3.0);
        bands *= 0.6 + 0.4 * sin(vUv.x * 13.0 - uTime * 0.35);
        float fadeY = smoothstep(0.0, 0.25, vUv.y) * (1.0 - smoothstep(0.55, 1.0, vUv.y));
        float fadeX = smoothstep(0.0, 0.15, vUv.x) * (1.0 - smoothstep(0.85, 1.0, vUv.x));
        vec3 col = mix(vec3(0.1, 1.0, 0.55), vec3(0.65, 0.3, 1.0), smoothstep(0.35, 0.9, vUv.y));
        gl_FragColor = vec4(col * bands * fadeY * fadeX * uOpacity, 1.0);
      }`,
  });
  const group = new THREE.Group();
  [[0, 0, 0], [400, 150, -700], [-600, -100, 500]].forEach(([dx, dy, dz], i) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(9000, 2200, 120, 1), mat);
    m.position.set(dx, dy, dz);
    m.rotation.y = 0.3 + i * 0.25;
    group.add(m);
  });
  group.position.set(5000, 2600, 3500); // sobre a montanha gelada, a sudeste
  group.visible = false;
  return { group, uniforms };
}

// ------------------------------------------------------------- arco-íris ---

function makeRainbow() {
  const uniforms = { uOpacity: { value: 0 } };
  const R = 3200, W = 420;
  const mat = new THREE.ShaderMaterial({
    uniforms,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
    fog: false,
    vertexShader: `
      varying float vR;
      void main() {
        vR = (length(position.xy) - ${(R - W / 2).toFixed(1)}) / ${W.toFixed(1)};
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }`,
    fragmentShader: `
      varying float vR;
      uniform float uOpacity;
      vec3 spectrum(float t) {
        return clamp(vec3(abs(t * 6.0 - 3.0) - 1.0, 2.0 - abs(t * 6.0 - 2.0), 2.0 - abs(t * 6.0 - 4.0)), 0.0, 1.0);
      }
      void main() {
        float t = clamp(vR, 0.0, 1.0);
        float edge = smoothstep(0.0, 0.15, t) * (1.0 - smoothstep(0.85, 1.0, t));
        gl_FragColor = vec4(spectrum(1.0 - t) * edge * 0.45 * uOpacity, 1.0);
      }`,
  });
  const mesh = new THREE.Mesh(new THREE.RingGeometry(R - W / 2, R + W / 2, 128, 1, 0, Math.PI), mat);
  mesh.layers.set(1); // camada 1: não aparece no reflexo da água (virava um círculo inteiro)
  mesh.visible = false;
  return { mesh, uniforms };
}

// -------------------------------------------------- plâncton brilhante ---
// À noite, a água brilha em azul onde a Lapras passa, e pontinhos piscam em volta.

function makePlankton() {
  const dot = document.createElement('canvas');
  dot.width = dot.height = 32;
  {
    const g = dot.getContext('2d');
    const gr = g.createRadialGradient(16, 16, 0, 16, 16, 16);
    gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.4, 'rgba(255,255,255,0.5)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gr; g.fillRect(0, 0, 32, 32);
  }
  const N = 900;
  const pos = new Float32Array(N * 3), col = new Float32Array(N * 3), life = new Float32Array(N), maxLife = new Float32Array(N);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  const mat = new THREE.PointsMaterial({ map: new THREE.CanvasTexture(dot), size: 3.6, vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false });
  const points = new THREE.Points(geo, mat);
  points.frustumCulled = false;
  points.renderOrder = 3;
  let next = 0;
  const last = new THREE.Vector3();
  const spawn = (x, y, z, l) => {
    const i = next; next = (next + 1) % N;
    pos.set([x, y, z], i * 3); life[i] = maxLife[i] = l;
  };
  return {
    points,
    update(t, dt, night, lapras, cam) {
      points.visible = night > 0.05;
      if (!points.visible) return;
      // rastro: nasce dos lados e atrás da Lapras, proporcional à velocidade
      const speed = last.distanceTo(lapras) / Math.max(dt, 1e-3);
      last.copy(lapras);
      const n = Math.min(12, Math.floor(speed * dt * 1.6 + (Math.random() < 0.3 ? 1 : 0)));
      for (let k = 0; k < n; k++) {
        const a = Math.random() * Math.PI * 2, r = 6 + Math.random() * 10;
        spawn(lapras.x + Math.cos(a) * r, Math.min(lapras.y + 2, -0.3), lapras.z + Math.sin(a) * r, 3 + Math.random() * 2);
      }
      // brilhos soltos em volta da câmera
      if (Math.random() < 0.6) {
        const a = Math.random() * Math.PI * 2, r = 20 + Math.random() * 200;
        spawn(cam.x + Math.cos(a) * r, -0.4, cam.z + Math.sin(a) * r, 1.5 + Math.random() * 1.5);
      }
      for (let i = 0; i < N; i++) {
        if (life[i] <= 0) { col[i * 3] = col[i * 3 + 1] = col[i * 3 + 2] = 0; continue; }
        life[i] -= dt;
        const k = Math.max(0, life[i] / maxLife[i]);
        const flicker = 0.7 + 0.3 * Math.sin(t * 9 + i);
        const b = k * flicker * night;
        col[i * 3] = 0.3 * b; col[i * 3 + 1] = 1.2 * b; col[i * 3 + 2] = 1.5 * b;
      }
      geo.attributes.position.needsUpdate = true;
      geo.attributes.color.needsUpdate = true;
    },
  };
}

// ------------------------------------------------------ estrelas cadentes ---
// De noite, de vez em quando passa uma; em algumas noites há uma "chuva de estrelas".

function makeMeteors() {
  const MAX = 24;
  const group = new THREE.Group();
  const list = [];
  for (let i = 0; i < MAX; i++) {
    // um rastro: linha com cor que vai de branco (cabeça) a transparente (cauda)
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(6), 3));
    geo.setAttribute('color', new THREE.BufferAttribute(new Float32Array([1, 1, 1, 0, 0, 0]), 3));
    const line = new THREE.Line(geo, new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
    line.frustumCulled = false;
    line.visible = false;
    group.add(line);
    list.push({ line, life: 0, start: new THREE.Vector3(), dir: new THREE.Vector3(), len: 0, speed: 0 });
  }
  let next = 5;
  return {
    group,
    // dispara uma estrela num ponto aleatório do céu, em volta da câmera
    spawn(cam) {
      const m = list.find((x) => x.life <= 0);
      if (!m) return;
      const a = Math.random() * Math.PI * 2, el = 0.35 + Math.random() * 0.5;
      m.start.set(Math.cos(a) * Math.cos(el), Math.sin(el), Math.sin(a) * Math.cos(el)).multiplyScalar(9000).add(cam);
      m.dir.set(Math.random() - 0.5, -0.35 - Math.random() * 0.3, Math.random() - 0.5).normalize();
      m.len = 500 + Math.random() * 600;
      m.speed = 4000 + Math.random() * 3000;
      m.life = 0.9 + Math.random() * 0.6;
      m.max = m.life;
      m.line.visible = true;
    },
    update(dt, night, clear, showering, cam, onSeen) {
      next -= dt;
      const rate = showering ? 0.6 + Math.random() * 1.6 : 25 + Math.random() * 50;
      if (next <= 0 && night > 0.7 && clear) { this.spawn(cam); next = rate; onSeen?.(); }
      for (const m of list) {
        if (m.life <= 0) continue;
        m.life -= dt;
        m.start.addScaledVector(m.dir, m.speed * dt);
        const p = m.line.geometry.attributes.position.array;
        const tail = m.start.clone().addScaledVector(m.dir, -m.len);
        p.set([m.start.x, m.start.y, m.start.z, tail.x, tail.y, tail.z]);
        m.line.geometry.attributes.position.needsUpdate = true;
        m.line.material.opacity = Math.min(1, m.life / m.max * 2) * night;
        if (m.life <= 0) m.line.visible = false;
      }
    },
  };
}

// ----------------------------------------------------------------- tudo ---

export function createExtras(scene, camera, { onBottle, isCollected, onMeteor, onShowerStart }) {
  const bottles = [];
  for (const b of BOTTLES) {
    const mesh = makeBottleMesh();
    mesh.position.set(b.pos[0], 0, b.pos[1]);
    mesh.userData.bottle = b;
    scene.add(mesh);
    bottles.push(mesh);
  }

  const meteors = makeMeteors();
  scene.add(meteors.group);
  let showerTime = 0;    // segundos restantes de chuva de estrelas
  let wasNight = false;
  const plankton = makePlankton();
  scene.add(plankton.points);
  const aurora = makeAurora();
  scene.add(aurora.group);
  const rainbow = makeRainbow();
  scene.add(rainbow.mesh);

  let lastWeather = null;
  let rainbowTime = 0; // segundos restantes de arco-íris
  const tmp = new THREE.Vector3();

  return {
    // mostra um arco-íris agora (também usado pelo comando)
    showRainbow(seconds = 150) { rainbowTime = seconds; },
    startShower(seconds = 150) { showerTime = seconds; onShowerStart?.(); },
    get showering() { return showerTime > 0; },
    get auroraLevel() { return aurora.uniforms.uOpacity.value; },
    get rainbowLevel() { return rainbow.uniforms.uOpacity.value; },
    update(t, dt, env, laprasPos) {
      // garrafas: boiam, giram devagar e somem quando coletadas
      for (const m of bottles) {
        const b = m.userData.bottle;
        if (isCollected(b.id)) { m.visible = false; continue; }
        // se o ponto cair em terra (por ajuste de mapa), a garrafa simplesmente não aparece
        if (m.userData.land === undefined) m.userData.land = isLand(b.pos[0], b.pos[1], -3);
        m.visible = !m.userData.land;
        if (!m.visible) continue;
        m.position.y = -0.4 + waveHeight(b.pos[0], b.pos[1]);
        m.rotation.y = t * 0.2 + b.pos[1];
        m.rotation.x = Math.sin(t * 1.1 + b.pos[1]) * 0.12;
        if (Math.hypot(laprasPos.x - b.pos[0], laprasPos.z - b.pos[1]) < 38 && laprasPos.y > -8) onBottle(b);
      }

      const s = env.state;
      plankton.update(t, dt, s.night ?? 0, laprasPos, camera.position);

      // ao anoitecer, 30% de chance de a noite ter chuva de estrelas
      const isNight = (s.night ?? 0) > 0.7;
      if (isNight && !wasNight && Math.random() < 0.3) this.startShower(150 + Math.random() * 120);
      wasNight = isNight;
      showerTime = Math.max(0, showerTime - dt);
      meteors.update(dt, s.night ?? 0, s.weather === 'seco' || s.weather === 'nublado', showerTime > 0, camera.position, onMeteor);
      const clear = s.weather === 'seco' || s.weather === 'nublado';

      // aurora: noite de céu limpo
      aurora.uniforms.uTime.value = t;
      const auroraTarget = clear ? (s.night ?? 0) * (s.weather === 'seco' ? 1 : 0.5) : 0;
      aurora.uniforms.uOpacity.value = THREE.MathUtils.damp(aurora.uniforms.uOpacity.value, auroraTarget, 0.5, dt);
      aurora.group.visible = aurora.uniforms.uOpacity.value > 0.01;

      // arco-íris: aparece quando a chuva para durante o dia
      if (lastWeather === 'chuva' && s.weather !== 'chuva' && (s.daylight ?? 0) > 0.5) rainbowTime = 150;
      lastWeather = s.weather;
      rainbowTime = Math.max(0, rainbowTime - dt);
      const rbTarget = rainbowTime > 0 && (s.daylight ?? 0) > 0.3 && s.weather !== 'chuva' ? Math.min(1, rainbowTime / 20) : 0;
      rainbow.uniforms.uOpacity.value = THREE.MathUtils.damp(rainbow.uniforms.uOpacity.value, rbTarget, 0.6, dt);
      rainbow.mesh.visible = rainbow.uniforms.uOpacity.value > 0.01;
      if (rainbow.mesh.visible && s.sunDir) {
        // sempre do lado oposto ao sol, com a base no horizonte
        tmp.set(-s.sunDir.x, 0, -s.sunDir.z).normalize();
        rainbow.mesh.position.set(camera.position.x + tmp.x * 7000, -150, camera.position.z + tmp.z * 7000);
        rainbow.mesh.lookAt(camera.position.x, -150, camera.position.z);
      }
    },
  };
}

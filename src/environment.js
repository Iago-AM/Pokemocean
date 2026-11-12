// Céu, água, ciclo dia/noite e clima.
import * as THREE from 'three';
import { Water } from 'three/examples/jsm/objects/Water.js';
import { Sky } from 'three/examples/jsm/objects/Sky.js';

const smooth = (a, b, x) => THREE.MathUtils.smoothstep(x, a, b);
const lerp = THREE.MathUtils.lerp;

export const WEATHERS = {
  seco:     { label: 'seco (céu limpo)', turbidity: 10, rayleigh: 2,   mie: 0.005, fog: 0,       rain: 0, exposure: 1.0, distortion: 3.7, hideSky: false },
  nublado:  { label: 'nublado',          turbidity: 20, rayleigh: 0.6, mie: 0.05,  fog: 0.00025, rain: 0, exposure: 0.75, distortion: 4.5, hideSky: false },
  chuva:    { label: 'chuva',            turbidity: 20, rayleigh: 0.5, mie: 0.05,  fog: 0.0012,  rain: 1, exposure: 0.6, distortion: 7,   hideSky: true },
  neblina:  { label: 'neblina',          turbidity: 15, rayleigh: 1,   mie: 0.02,  fog: 0.0025,  rain: 0, exposure: 0.8, distortion: 2.5, hideSky: true },
};

// Ondas: a mesma fórmula roda no shader da água e aqui no JavaScript (para a Lapras,
// as garrafas e o barco boiarem certinho em cima delas).
const WAVE_AMP = { seco: 0.7, nublado: 1.1, chuva: 2.4, neblina: 0.5 };
export const waveState = { amp: 0.7, time: 0, tide: 0 };
export function waveHeight(x, z) {
  const t = waveState.time, a = waveState.amp;
  return waveState.tide + a * (
    0.55 * Math.sin(x * 0.012 + t * 0.9) +
    0.35 * Math.sin(z * 0.017 - t * 1.1) +
    0.25 * Math.sin((x + z) * 0.008 + t * 0.6));
}

export function createEnvironment(renderer, scene, camera) {
  // --- água -----------------------------------------------------------------
  // a malha tem 300 x 300 divisões para as ondas poderem subir e descer
  const water = new Water(new THREE.PlaneGeometry(30000, 30000, 300, 300), {
    textureWidth: 512,
    textureHeight: 512,
    waterNormals: new THREE.TextureLoader().load('assets/waternormals.jpg', (t) => {
      t.wrapS = t.wrapT = THREE.RepeatWrapping;
    }),
    sunDirection: new THREE.Vector3(),
    sunColor: 0xffffff,
    waterColor: 0x0b4a52,
    alpha: 0.72, // água translúcida: dá para ver o fundo do mar
    distortionScale: 3.7,
    fog: true,
  });
  water.rotation.x = -Math.PI / 2;
  // injeta as ondas no shader da água (no plano local, z é "para cima")
  water.material.uniforms.uWaveAmp = { value: 0.7 };
  water.material.uniforms.uWaveTime = { value: 0 };
  water.material.vertexShader = water.material.vertexShader
    .replace('uniform float time;', `uniform float time;
      uniform float uWaveAmp;
      uniform float uWaveTime;
      vec3 waved(vec3 p) {
        vec4 w = modelMatrix * vec4(p, 1.0);
        float t = uWaveTime;
        p.z += uWaveAmp * (0.55 * sin(w.x * 0.012 + t * 0.9) + 0.35 * sin(w.z * 0.017 - t * 1.1) + 0.25 * sin((w.x + w.z) * 0.008 + t * 0.6));
        return p;
      }`)
    .replace('void main() {', 'void main() {\n vec3 wpos = waved(position);')
    .replaceAll('vec4( position, 1.0 )', 'vec4( wpos, 1.0 )');
  water.material.transparent = true;
  water.material.depthWrite = false;
  water.renderOrder = 2;
  scene.add(water);

  // --- céu ------------------------------------------------------------------
  const sky = new Sky();
  sky.scale.setScalar(40000);
  scene.add(sky);
  const skyU = sky.material.uniforms;
  skyU.mieDirectionalG.value = 0.8;

  // estrelas
  const starGeo = new THREE.BufferGeometry();
  const starPos = [];
  for (let i = 0; i < 2500; i++) {
    const v = new THREE.Vector3().randomDirection();
    if (v.y < 0.02) v.y = Math.abs(v.y) + 0.02;
    v.normalize().multiplyScalar(15000);
    starPos.push(v.x, v.y, v.z);
  }
  starGeo.setAttribute('position', new THREE.Float32BufferAttribute(starPos, 3));
  const starMat = new THREE.PointsMaterial({ color: 0xffffff, size: 2, sizeAttenuation: false, transparent: true, opacity: 0, depthWrite: false, fog: false });
  const stars = new THREE.Points(starGeo, starMat);
  stars.renderOrder = 1;
  stars.layers.set(1); // camada 1: não aparece no reflexo da água (ficava parecendo confete)
  camera.layers.enable(1);
  scene.add(stars);

  // lua
  const moon = new THREE.Mesh(
    new THREE.SphereGeometry(250, 32, 16),
    new THREE.MeshBasicMaterial({ color: 0xe8eeff, transparent: true, opacity: 0, fog: false, depthWrite: false })
  );
  moon.renderOrder = 1;
  scene.add(moon);

  // luzes (o céu ilumina via environment; estas luzes ajudam à noite e na chuva)
  const hemi = new THREE.HemisphereLight(0x9fb8ff, 0x0a1a22, 0);
  scene.add(hemi);
  const sunLight = new THREE.DirectionalLight(0xffffff, 0);
  scene.add(sunLight);

  // chuva: segmentos caindo numa caixa em volta da câmera
  const RAIN_N = 6000, RAIN_BOX = 600, RAIN_H = 400;
  const rainGeo = new THREE.BufferGeometry();
  const rainArr = new Float32Array(RAIN_N * 6);
  for (let i = 0; i < RAIN_N; i++) {
    const x = (Math.random() - 0.5) * RAIN_BOX, y = Math.random() * RAIN_H, z = (Math.random() - 0.5) * RAIN_BOX;
    rainArr.set([x, y, z, x + 0.4, y + 6, z], i * 6);
  }
  rainGeo.setAttribute('position', new THREE.BufferAttribute(rainArr, 3));
  const rain = new THREE.LineSegments(rainGeo, new THREE.LineBasicMaterial({ color: 0xaab8c8, transparent: true, opacity: 0.45, fog: false }));
  rain.frustumCulled = false;
  rain.visible = false;
  scene.add(rain);

  scene.fog = new THREE.FogExp2(0x8a96a0, 0);

  // --- estado ---------------------------------------------------------------
  const state = {
    hour: 12,            // o dia começa ao meio-dia
    cycleMinutes: 20,    // duração de um dia inteiro em minutos reais (0 = parado)
    weather: 'seco',
    mix: { ...WEATHERS.seco }, // valores atuais, interpolados até o clima alvo
  };

  const sun = new THREE.Vector3();
  const pmrem = new THREE.PMREMGenerator(renderer);
  let envRT = null;
  let lastEnvKey = '';

  function setWeather(name) {
    if (!WEATHERS[name]) return false;
    state.weather = name;
    return true;
  }

  function setHour(h) {
    state.hour = ((h % 24) + 24) % 24;
  }

  function update(dt) {
    if (state.cycleMinutes > 0) setHour(state.hour + (24 / (state.cycleMinutes * 60)) * dt);

    // interpola suavemente para o clima escolhido
    const target = WEATHERS[state.weather];
    const k = 1 - Math.exp(-0.8 * dt);
    for (const key of ['turbidity', 'rayleigh', 'mie', 'fog', 'rain', 'exposure', 'distortion']) {
      state.mix[key] = lerp(state.mix[key], target[key], k);
    }
    const w = state.mix;

    // posição do sol: nasce às 6h, ponto mais alto ao meio-dia, se põe às 18h
    const dayAngle = ((state.hour - 6) / 24) * Math.PI * 2;
    const elevation = Math.sin(dayAngle) * 65; // graus
    const azimuth = 90 + ((state.hour - 6) / 24) * 360;
    sun.setFromSphericalCoords(1, THREE.MathUtils.degToRad(90 - elevation), THREE.MathUtils.degToRad(azimuth));

    const day = smooth(-6, 8, elevation);      // 0 = noite, 1 = dia
    state.daylight = day;
    state.night = 1 - smooth(-12, 2, elevation);
    state.sunDir = sun;
    const night = 1 - smooth(-12, 2, elevation);

    skyU.sunPosition.value.copy(sun);
    skyU.turbidity.value = w.turbidity;
    skyU.rayleigh.value = w.rayleigh;
    skyU.mieCoefficient.value = w.mie;
    water.material.uniforms.sunDirection.value.copy(sun).normalize();
    water.material.uniforms.distortionScale.value = w.distortion;
    water.material.uniforms.sunColor.value.setRGB(1, lerp(0.75, 1, day), lerp(0.6, 1, day)).multiplyScalar(lerp(0.15, 1, day) * (1 - w.rain * 0.7));

    // céu escondido em chuva/neblina: vira um "teto" cinza com a cor da névoa
    const fogColor = new THREE.Color().setRGB(lerp(0.03, 0.55, day), lerp(0.04, 0.6, day), lerp(0.08, 0.65, day));
    if (w.rain > 0.5) fogColor.multiplyScalar(0.7);
    scene.fog.color.copy(fogColor);
    scene.fog.density = w.fog;
    sky.visible = !(target.hideSky && w.fog > 0.0006);
    scene.background = sky.visible ? null : fogColor;

    // estrelas e lua
    const clearSky = 1 - smooth(0.0001, 0.001, w.fog);
    starMat.opacity = night * clearSky * 0.9;
    stars.visible = starMat.opacity > 0.01;
    moon.position.copy(sun).multiplyScalar(-14000);
    moon.position.y = Math.abs(moon.position.y) + 1500;
    moon.material.opacity = night * clearSky;
    moon.visible = moon.material.opacity > 0.01;
    stars.position.copy(camera.position);
    moon.position.add(camera.position);

    // luzes
    // ao meio-dia o céu fica muito claro; no nascer/pôr do sol dá para abrir mais a exposição
    const golden = smooth(-4, 2, elevation) * (1 - smooth(8, 25, elevation));
    renderer.toneMappingExposure = (0.5 + golden * 0.45) * w.exposure;
    hemi.intensity = lerp(1.6, 0.15, day) + w.rain * 0.3;
    hemi.color.setRGB(lerp(0.45, 0.85, day), lerp(0.55, 0.9, day), lerp(0.9, 1, day));
    sunLight.intensity = day * 0.6 * (1 - w.rain * 0.8);
    sunLight.position.copy(sun).multiplyScalar(1000);

    // chuva
    rain.visible = w.rain > 0.05;
    if (rain.visible) {
      rain.material.opacity = 0.45 * w.rain;
      rain.position.set(camera.position.x, camera.position.y - RAIN_H / 2, camera.position.z);
      const arr = rainGeo.attributes.position.array;
      const fall = 380 * dt;
      for (let i = 0; i < RAIN_N; i++) {
        const o = i * 6;
        arr[o + 1] -= fall; arr[o + 4] -= fall;
        if (arr[o + 1] < 0) { arr[o + 1] += RAIN_H; arr[o + 4] += RAIN_H; }
      }
      rainGeo.attributes.position.needsUpdate = true;
    }

    // o mapa de reflexos do céu é caro: só refaz quando o céu muda o suficiente
    const envKey = [elevation.toFixed(0), w.turbidity.toFixed(0), w.rayleigh.toFixed(1)].join('|');
    if (envKey !== lastEnvKey) {
      lastEnvKey = envKey;
      const wasVisible = sky.visible;
      sky.visible = true;
      if (envRT) envRT.dispose();
      envRT = pmrem.fromScene(sky);
      sky.visible = wasVisible;
      scene.environment = envRT.texture;
    }

    water.material.uniforms.time.value += dt;

    // ondas (mais altas na chuva) e maré (sobe e desce duas vezes por dia)
    waveState.time += dt;
    waveState.amp = THREE.MathUtils.damp(waveState.amp, WAVE_AMP[state.weather] ?? 0.7, 0.4, dt);
    waveState.tide = Math.sin((state.hour / 12.42) * Math.PI * 2) * 1.2;
    water.position.y = waveState.tide;
    water.material.uniforms.uWaveAmp.value = waveState.amp;
    water.material.uniforms.uWaveTime.value = waveState.time;
  }

  // usado pela visão submersa: esconde céu, estrelas, lua e chuva
  function hideSky() {
    sky.visible = false; stars.visible = false; moon.visible = false; rain.visible = false;
  }

  return { state, update, setWeather, setHour, water, hideSky };
}

// "18:30" -> 18.5 ; também aceita nomes
export function parseHour(text) {
  const names = {
    amanhecer: 6, madrugada: 3, manha: 9, manhã: 9, dia: 12, meiodia: 12, 'meio-dia': 12, tarde: 15,
    entardecer: 17.6, 'por-do-sol': 17.8, pordosol: 17.8, noite: 21, meianoite: 0, 'meia-noite': 0,
  };
  const key = text.toLowerCase().replace(/\s+/g, '');
  if (key in names) return names[key];
  const m = key.match(/^(\d{1,2})(?:[:h](\d{1,2})?)?$/);
  if (!m) return null;
  const h = +m[1], min = +(m[2] || 0);
  if (h > 24 || min > 59) return null;
  return h + min / 60;
}

export function formatHour(h) {
  const hh = Math.floor(h), mm = Math.floor((h - hh) * 60);
  return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
}

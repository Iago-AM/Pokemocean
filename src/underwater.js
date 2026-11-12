// Fundo do mar (areia, algas e grama marinha), visão submersa e bolhas do mergulho.
import * as THREE from 'three';
import { mergeBufferGeometries as mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

// ruído suave barato (soma de senos) para o relevo da areia
const relief = (x, z) =>
  Math.sin(x * 0.004) * Math.cos(z * 0.005) * 6 +
  Math.sin(x * 0.013 + z * 0.009) * 2.5 +
  Math.sin(z * 0.021 - x * 0.017) * 1.2;

export const SEABED_Y = -55;
export const seabedHeight = (x, z) => SEABED_Y + relief(x, z);

// gerador pseudoaleatório com semente, para o fundo ser sempre igual
function mulberry(seed) {
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function createUnderwater(scene, camera) {
  const rng = mulberry(42);
  const group = new THREE.Group();
  scene.add(group);

  // ---------------------------------------------------------------------------
  // Fundo que acompanha o jogador: a areia e as plantas existem só num quadrado em
  // volta da câmera. Quando você nada, os tufos que ficam para trás "dão a volta" e
  // reaparecem na frente (tudo calculado no shader, sem custo de CPU). Assim o mar
  // inteiro tem vegetação, com densidade alta e sempre o mesmo número de plantas.
  // ---------------------------------------------------------------------------
  // (dentro do GLSL só pode haver caracteres sem acento)
  // meadow(): manchas de prado; onde o valor é baixo não nasce planta (clareiras no fundo)
  const GLSL_RELIEF = `
    float seabedAt(vec2 p) {
      return ${SEABED_Y.toFixed(1)}
        + sin(p.x * 0.004) * cos(p.y * 0.005) * 6.0
        + sin(p.x * 0.013 + p.y * 0.009) * 2.5
        + sin(p.y * 0.021 - p.x * 0.017) * 1.2;
    }
    float hash12(vec2 p) { vec3 p3 = fract(vec3(p.xyx) * 0.1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
    float meadow(vec2 p) {
      return 0.5 + 0.25 * sin(p.x * 0.011 + sin(p.y * 0.007) * 2.0) + 0.25 * sin(p.y * 0.013 - p.x * 0.004);
    }`;
  const uCenter = { value: new THREE.Vector2() };
  const uTime = { value: 0 };

  // areia: uma malha de 2400 x 2400 que segue a câmera; a altura vem do shader
  const SAND = 2400;
  const sandGeo = new THREE.PlaneGeometry(SAND, SAND, 240, 240);
  sandGeo.rotateX(-Math.PI / 2);
  const sandMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1 });
  sandMat.onBeforeCompile = (shader) => {
    shader.uniforms.uCenter = uCenter;
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nuniform vec2 uCenter;\nvarying vec3 vSand;\n' + GLSL_RELIEF)
      .replace('#include <beginnormal_vertex>', `
        vec2 wp0 = position.xz + uCenter;
        float hC = seabedAt(wp0), hX = seabedAt(wp0 + vec2(2.0, 0.0)), hZ = seabedAt(wp0 + vec2(0.0, 2.0));
        vec3 objectNormal = normalize(vec3(hC - hX, 2.0, hC - hZ));`)
      .replace('#include <begin_vertex>', `
        vec3 transformed = vec3(wp0.x, hC, wp0.y);
        float patchy = smoothstep(0.3, 1.4, sin(wp0.x * 0.02) * cos(wp0.y * 0.017) + sin(wp0.x * 0.007 + wp0.y * 0.011));
        vSand = mix(vec3(0.62, 0.64, 0.52), vec3(0.37, 0.48, 0.38), patchy * 0.6);
        float carpet = smoothstep(0.36, 0.55, meadow(wp0));
        vSand = mix(vSand, mix(vec3(0.2, 0.4, 0.15), vec3(0.28, 0.5, 0.2), patchy), carpet * 0.9);`); // carpet: nos prados o chão fica verde
    shader.fragmentShader = shader.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec3 vSand;').replace('vec4 diffuseColor = vec4( diffuse, opacity );', 'vec4 diffuseColor = vec4( diffuse * vSand, opacity );');
  };
  const sandMesh = new THREE.Mesh(sandGeo, sandMat);
  sandMesh.frustumCulled = false;
  group.add(sandMesh);
  // além do quadrado da areia, um fundo liso e mais escuro
  const far = new THREE.Mesh(new THREE.PlaneGeometry(30000, 30000), new THREE.MeshStandardMaterial({ color: 0x6f7f63, roughness: 1 }));
  far.rotation.x = -Math.PI / 2;
  far.position.y = SEABED_Y - 12;
  group.add(far);

  // plantas: uma lâmina de grama/alga instanciada; cada instância tem um ponto fixo
  // dentro de um quadrado de lado "span" e um número aleatório
  function vegetation({ blade, count, span, height, width, sway, colorA, colorB, minMeadow }) {
    const geo = new THREE.InstancedBufferGeometry();
    geo.index = blade.index;
    geo.attributes.position = blade.attributes.position;
    geo.attributes.uv = blade.attributes.uv;
    geo.attributes.normal = blade.attributes.normal;
    const offs = new Float32Array(count * 2), rnd = new Float32Array(count * 4);
    for (let i = 0; i < count; i++) {
      offs[i * 2] = rng() * span; offs[i * 2 + 1] = rng() * span;
      rnd.set([rng(), rng(), rng(), rng()], i * 4);
    }
    geo.setAttribute('aOffset', new THREE.InstancedBufferAttribute(offs, 2));
    geo.setAttribute('aRand', new THREE.InstancedBufferAttribute(rnd, 4));
    geo.instanceCount = count;
    const mat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.8, side: THREE.DoubleSide });
    mat.onBeforeCompile = (shader) => {
      shader.uniforms.uCenter = uCenter;
      shader.uniforms.uTime = uTime;
      // wp: a planta "dá a volta" no quadrado em volta da câmera (reciclagem);
      // edge/grow: some suavemente perto da borda e nas clareiras
      shader.vertexShader = shader.vertexShader
        .replace('#include <common>', `#include <common>
        uniform vec2 uCenter; uniform float uTime;
        attribute vec2 aOffset; attribute vec4 aRand;
        varying vec3 vTint; varying float vWorldY;
        ${GLSL_RELIEF}`)
        .replace('#include <beginnormal_vertex>', `
          float S = ${span.toFixed(1)};
          vec2 wp = uCenter + mod(aOffset - uCenter + S * 0.5, S) - S * 0.5;
          vec2 cellId = floor((wp - aOffset) / S + 0.5);
          float r1 = fract(aRand.x + hash12(cellId) * 7.0);
          float r2 = fract(aRand.y + hash12(cellId + 3.1) * 5.0);
          float edge = 1.0 - smoothstep(0.38, 0.5, max(abs(wp.x - uCenter.x), abs(wp.y - uCenter.y)) / S);
          float grow = edge * smoothstep(${minMeadow.toFixed(2)}, ${(minMeadow + 0.12).toFixed(2)}, meadow(wp) + (r2 - 0.5) * 0.2);
          float ang = r1 * 6.2831;
          float ca = cos(ang), sa = sin(ang);
          vec3 objectNormal = vec3(sa, 0.0, ca);`)
        .replace('#include <begin_vertex>', `
          float h = ${height[0].toFixed(1)} + r2 * ${(height[1] - height[0]).toFixed(1)};
          float w = ${width.toFixed(2)} * (0.8 + r1 * 0.6);
          vec3 lp = vec3(position.x * w, position.y * h * grow, position.z * w);
          float bend = uv.y * uv.y;
          float ph = wp.x * 0.05 + wp.y * 0.07;
          lp.x += sin(uTime * 1.1 + ph) * ${sway.toFixed(2)} * bend * grow;
          lp.z += cos(uTime * 0.8 + ph * 1.3) * ${(sway * 0.6).toFixed(2)} * bend * grow;
          vec3 transformed = vec3(wp.x + lp.x * ca + lp.z * sa, seabedAt(wp) - 0.3 + lp.y, wp.y - lp.x * sa + lp.z * ca);
          vTint = mix(vec3(${colorA.join(',')}), vec3(${colorB.join(',')}), r2);
          vWorldY = transformed.y;`);
      shader.fragmentShader = shader.fragmentShader
        .replace('#include <common>', '#include <common>\nvarying vec3 vTint; varying float vWorldY;')
        .replace('vec4 diffuseColor = vec4( diffuse, opacity );', 'vec4 diffuseColor = vec4( diffuse * vTint, opacity );')
        .replace('#include <dithering_fragment>', `#include <dithering_fragment>
          float deep = clamp((-vWorldY - 10.0) / 50.0, 0.0, 1.0);
          gl_FragColor.rgb = mix(gl_FragColor.rgb, vec3(0.05, 0.25, 0.3), 0.3 + deep * 0.4);`);
    };
    const mesh = new THREE.Mesh(geo, mat);
    mesh.frustumCulled = false;
    group.add(mesh);
    return mesh;
  }

  const kelpBlade = new THREE.PlaneGeometry(2.2, 1, 1, 8);
  kelpBlade.translate(0, 0.5, 0);
  {
    const p = kelpBlade.attributes.position;
    for (let i = 0; i < p.count; i++) p.setX(i, p.getX(i) * (1 - p.getY(i) * 0.7));
  }
  const grassBlade = new THREE.PlaneGeometry(0.6, 1, 1, 3);
  grassBlade.translate(0, 0.5, 0);
  {
    const p = grassBlade.attributes.position;
    for (let i = 0; i < p.count; i++) p.setX(i, p.getX(i) * (1 - p.getY(i)));
  }
  // algas altas: menos numerosas, quadrado grande (dá para ver de longe)
  vegetation({ blade: kelpBlade, count: 7000, span: 1500, height: [8, 24], width: 1.0, sway: 3.5, colorA: [0.16, 0.36, 0.13], colorB: [0.3, 0.5, 0.2], minMeadow: 0.55 });
  // tufo: 4 folhas cruzadas e um pouco abertas (parece um "montinho" de grama, não folhas soltas)
  const tuftParts = [];
  for (let k = 0; k < 4; k++) {
    const b = grassBlade.clone();
    b.rotateZ((k % 2 ? 1 : -1) * 0.18);     // abre um pouco para os lados
    b.rotateY((k / 4) * Math.PI);
    b.translate(Math.cos(k * 1.7) * 0.25, 0, Math.sin(k * 1.7) * 0.25);
    tuftParts.push(b);
  }
  const tuft = mergeGeometries(tuftParts);
  // grama marinha: tufos densos concentrados nos prados (o chão embaixo deles também é verde)
  vegetation({ blade: tuft, count: 42000, span: 640, height: [2.5, 5.5], width: 1.5, sway: 0.9, colorA: [0.24, 0.44, 0.16], colorB: [0.42, 0.6, 0.24], minMeadow: 0.42 });

  function updateVegetation(t) {
    uTime.value = t;
    uCenter.value.set(camera.position.x, camera.position.z);
    // a areia anda em passos de 10 (o tamanho de cada quadradinho), para o relevo não "escorregar"
    sandMesh.position.set(0, 0, 0);
    uCenter.value.set(Math.round(camera.position.x / 10) * 10, Math.round(camera.position.z / 10) * 10);
  }

  // --- superfície vista de baixo (a água do three.js só aparece de cima)
  const underside = new THREE.Mesh(
    new THREE.PlaneGeometry(30000, 30000),
    new THREE.MeshBasicMaterial({ color: 0x7fd4e8, transparent: true, opacity: 0.55, side: THREE.BackSide, fog: false, depthWrite: false })
  );
  underside.rotation.x = -Math.PI / 2;
  underside.position.y = 0.2;
  underside.visible = false;
  scene.add(underside);

  // --- bolhas que saem da Lapras durante o mergulho
  const BUB = 120;
  const bubGeo = new THREE.BufferGeometry();
  const bubPos = new Float32Array(BUB * 3);
  const bubLife = new Float32Array(BUB);
  bubGeo.setAttribute('position', new THREE.BufferAttribute(bubPos, 3));
  // bolinha redonda desenhada num canvas
  const dot = document.createElement('canvas');
  dot.width = dot.height = 32;
  {
    const g = dot.getContext('2d');
    g.strokeStyle = 'rgba(255,255,255,0.95)'; g.lineWidth = 3;
    g.beginPath(); g.arc(16, 16, 12, 0, Math.PI * 2); g.stroke();
    g.fillStyle = 'rgba(255,255,255,0.25)'; g.fill();
  }
  const bubbles = new THREE.Points(bubGeo, new THREE.PointsMaterial({ map: new THREE.CanvasTexture(dot), size: 1.2, transparent: true, opacity: 0.85, depthWrite: false, alphaTest: 0.05 }));
  bubbles.frustumCulled = false;
  scene.add(bubbles);
  let bubNext = 0;

  // véu azul na tela quando a câmera está submersa
  const veil = document.createElement('div');
  veil.className = 'underwater-veil';
  document.body.appendChild(veil);

  const fogColor = new THREE.Color(0x0e5a73);
  let isUnder = false;

  return {
    seabedHeight,
    get underwater() { return isUnder; },
    // chamado depois do ambiente, para sobrescrever névoa/fundo quando submerso
    update(t, dt, env, emitter) {
      updateVegetation(t);

      isUnder = camera.position.y < -0.5;
      underside.visible = isUnder;
      env.water.visible = !isUnder;
      veil.classList.toggle('on', isUnder);
      if (isUnder) {
        const day = THREE.MathUtils.clamp(env.state.daylight ?? 1, 0.15, 1);
        scene.fog.color.copy(fogColor).multiplyScalar(day);
        scene.fog.density = 0.006;
        scene.background = scene.fog.color;
        env.hideSky(true);
      }

      // bolhas: nascem perto da Lapras quando ela está embaixo d'água e sobem até a superfície
      if (emitter && emitter.y < -4 && t > bubNext) {
        bubNext = t + 0.05;
        const i = Math.floor(rng() * BUB);
        bubPos.set([emitter.x + (rng() - 0.5) * 6, emitter.y + 10 + rng() * 4, emitter.z + (rng() - 0.5) * 6], i * 3);
        bubLife[i] = 1;
      }
      for (let i = 0; i < BUB; i++) {
        if (bubLife[i] <= 0) { bubPos[i * 3 + 1] = -9999; continue; }
        bubPos[i * 3 + 1] += 9 * dt;
        bubPos[i * 3] += Math.sin(t * 3 + i) * 0.05;
        if (bubPos[i * 3 + 1] > -0.5) bubLife[i] = 0;
      }
      bubGeo.attributes.position.needsUpdate = true;
    },
  };
}

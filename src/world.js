// Estruturas do mapa: farol, píer, ilhota de pedras com coqueiros e veleiro.
import * as THREE from 'three';
import { addTerrain, groundHeight } from './terrain.js';
import { waveHeight } from './environment.js';

export const PLACES = {
  pier: new THREE.Vector3(240, 0, -20),
  lighthouse: new THREE.Vector3(700, 0, -800),
  islet: new THREE.Vector3(-450, 0, -350),
  monte: new THREE.Vector3(-2100, 0, 2000),
};

// Feixe do farol: dois cones de luz (um para cada lado) girando devagar, uma lanterna
// brilhante e uma luz de verdade que ilumina a ilha à noite.
function makeLighthouseBeam(scene) {
  const group = new THREE.Group();
  const mat = new THREE.ShaderMaterial({
    uniforms: { uOpacity: { value: 0 } },
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, fog: false,
    vertexShader: `varying vec2 vUv; varying vec3 vN; varying vec3 vView;
      void main() { vUv = uv; vec4 mv = modelViewMatrix * vec4(position, 1.0); vView = normalize(-mv.xyz); vN = normalize(normalMatrix * normal); gl_Position = projectionMatrix * mv; }`,
    fragmentShader: `varying vec2 vUv; varying vec3 vN; varying vec3 vView; uniform float uOpacity;
      void main() {
        float along = vUv.y;                       // 1 = perto da lanterna, 0 = longe
        float soft = pow(abs(dot(vN, vView)), 1.5); // mais forte no meio do cone
        float a = smoothstep(0.0, 0.9, along) * soft * uOpacity * 0.55;
        gl_FragColor = vec4(vec3(1.0, 0.93, 0.7) * a, 1.0);
      }`,
  });
  const LEN = 1400;
  for (const s of [1, -1]) {
    const cone = new THREE.Mesh(new THREE.CylinderGeometry(2, 110, LEN, 32, 1, true), mat);
    cone.rotation.z = (s * Math.PI) / 2;           // deitado, apontando para o lado
    cone.position.x = (s * LEN) / 2;
    cone.rotation.y = 0;
    group.add(cone);
  }
  // lanterna
  const c = document.createElement('canvas'); c.width = c.height = 64;
  const g = c.getContext('2d'); const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  gr.addColorStop(0, 'rgba(255,250,220,1)'); gr.addColorStop(0.35, 'rgba(255,230,160,0.5)'); gr.addColorStop(1, 'rgba(255,220,140,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
  const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(c), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }));
  glow.scale.setScalar(60);
  const holder = new THREE.Group();
  holder.add(group, glow);
  const light = new THREE.PointLight(0xffe2a8, 0, 900, 1.5);
  holder.add(light);
  scene.add(holder);
  return {
    group: holder,
    update(t, dt, env) {
      const night = env ? THREE.MathUtils.clamp((env.state.night ?? 0) * 1.2 + (env.state.weather === 'neblina' || env.state.weather === 'chuva' ? 0.4 : 0), 0, 1) : 0;
      group.rotation.y = t * 0.6; // uma volta a cada ~10 s
      mat.uniforms.uOpacity.value = night;
      group.visible = night > 0.02;
      glow.material.opacity = 0.3 + night * 0.7;
      glow.scale.setScalar(40 + night * 60);
      light.intensity = night * 2.2;
    },
  };
}

export function createWorld(loadModel, creatures, scene) {
  const updaters = [];
  const beam = makeLighthouseBeam(scene);
  const load = (path, opts = {}) => new Promise((resolve) => {
    loadModel(path, { ...opts, onLoad: (h, gltf) => { opts.onLoad?.(h, gltf); resolve(h); } });
  });
  const byId = (id) => creatures.find((c) => c.id === id);

  // --- Monte Arco-Íris: ilha montanhosa arredondada feita no Blender para o projeto
  load('assets/Monte_Arco_Iris/monte.glb', {
    scale: 750, position: [PLACES.monte.x, 0, PLACES.monte.z], rotation: [0, 0.8, 0],
  }).then((h) => {
    addTerrain(h);
    // procura a praia indo do centro do monte em direção ao início: Clodsire cochila ali
    const dir = new THREE.Vector3(-PLACES.monte.x, 0, -PLACES.monte.z).normalize();
    for (let r = 200; r < 900; r += 5) {
      const x = PLACES.monte.x + dir.x * r, z = PLACES.monte.z + dir.z * r;
      const g = groundHeight(x, z);
      if (g > -Infinity && g < 6) {
        const p = new THREE.Vector3(x - dir.x * 25, 0, z - dir.z * 25);
        p.y = Math.max(groundHeight(p.x, p.z), g) - 1;
        byId('clodsire')?.place(p, Math.atan2(dir.x, dir.z));
        break;
      }
    }
  });

  // --- farol: uma ilha inteira com casas; o disco de "água" do modelo não conta como chão
  load('assets/the_lighthouse/scene.gltf', {
    scale: 0.6, position: [PLACES.lighthouse.x, -3, PLACES.lighthouse.z], rotation: [0, 0.6, 0],
  }).then((h) => {
    addTerrain(h, (mesh) => mesh.material.name === 'Material_371');
    // o farol de verdade: acha o topo da torre e instala a lanterna com o feixe girando
    let tower = null;
    h.traverse((o) => { if (o.isMesh && o.name.startsWith('Cylinder001')) tower = o; });
    const box = new THREE.Box3().setFromObject(tower || h);
    const lamp = new THREE.Vector3((box.min.x + box.max.x) / 2, box.max.y - 6, (box.min.z + box.max.z) / 2);
    beam.group.position.copy(lamp);
  });

  // --- píer, com o Totodile esperando na ponta oposta ao telhado
  load('assets/simple_wooden_pier_or_dock/scene.gltf', {
    scale: 4, position: [PLACES.pier.x, -1, PLACES.pier.z], rotation: [0, Math.PI / 2, 0],
  }).then((h) => {
    addTerrain(h);
    const box = new THREE.Box3().setFromObject(h);
    let roof = null;
    h.traverse((o) => {
      if (!o.isMesh) return;
      const b = new THREE.Box3().setFromObject(o);
      if (!roof || b.max.y > roof.max.y) roof = b;
    });
    const center = box.getCenter(new THREE.Vector3());
    const roofC = roof.getCenter(new THREE.Vector3());
    const away = center.clone().sub(roofC).setY(0);
    const end = center.clone().addScaledVector(away, 0.85);
    end.y = groundHeight(end.x, end.z);
    // de frente para o mar aberto, do lado oposto ao telhado
    byId('totodile')?.place(end, Math.atan2(away.x, away.z));
  });

  // --- ilhota de pedras com coqueiros (e o Popplio tomando sol em cima)
  load('assets/free_pack_-_rocks_stylized/scene.gltf', {
    scale: 42, position: [PLACES.islet.x, -22, PLACES.islet.z], rotation: [0, 0.4, 0],
  }).then((h) => {
    addTerrain(h);
    const spots = [[-40, -15], [45, 18], [8, 45]];
    spots.forEach(([dx, dz], i) => {
      const x = PLACES.islet.x + dx, z = PLACES.islet.z + dz;
      const y = Math.max(groundHeight(x, z), 0);
      loadModel('assets/coconut_tree/scene.gltf', { scale: 6 + i * 1.5, position: [x, y - 1, z], rotation: [0, i * 2.1, 0] });
    });
    // Popplio no ponto mais alto da ilhota
    let best = null;
    for (let dx = -90; dx <= 90; dx += 6) {
      for (let dz = -60; dz <= 60; dz += 6) {
        const g = groundHeight(PLACES.islet.x + dx, PLACES.islet.z + dz);
        if (!best || g > best.y) best = new THREE.Vector3(PLACES.islet.x + dx, g, PLACES.islet.z + dz);
      }
    }
    if (best) byId('popplio')?.place(best, 2.2);
  });

  // --- veleiro dando voltas devagar a sudoeste; a proa do modelo aponta para -X
  {
    const obj = loadModel('assets/mini_schooner_pirateship_sailboat/scene.gltf', {
      scale: 8,
      onLoad: (h) => h.traverse((o) => { if (o.isMesh && o.material.name === 'Material.003') o.visible = false; }), // plano de sombra
    });
    const center = [-700, 700], radius = 350, speed = 0.03;
    updaters.push((t) => {
      const a = t * speed;
      const x = center[0] + Math.cos(a) * radius, z = center[1] + Math.sin(a) * radius;
      obj.position.set(x, -2 + waveHeight(x, z), z);
      // inclina acompanhando a onda
      obj.rotation.x = (waveHeight(x, z + 10) - waveHeight(x, z - 10)) * 0.02;
      obj.rotation.y = -a + Math.PI / 2;
      obj.rotation.z = Math.sin(t * 0.7) * 0.05; // balanço das ondas
    });
  }

  return { update: (t, dt, env) => { updaters.forEach((u) => u(t, dt)); beam.update(t, dt, env); } };
}

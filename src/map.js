// Mapa (tecla M): desenha as ilhas a partir do terreno de colisão e marca
// a Lapras, as garrafas já achadas, os Pokémon já vistos e os lugares.
import { groundHeight, terrainVersion } from './terrain.js';

// duas escalas: "Perto" (arredores do início) e "Tudo" (o mar inteiro)
const VIEWS = { perto: { ext: 1700, res: 170 }, tudo: { ext: 7500, res: 180 } };
const RES = 180;

export function createMap() {
  const panel = document.createElement('div');
  panel.className = 'map hidden';
  panel.innerHTML = '<div class="map-head"><b>Mapa</b><div class="map-tabs"><button type="button" data-v="perto" class="on">Perto</button><button type="button" data-v="tudo">Tudo</button></div><span>M ou Esc fecha</span></div><canvas width="560" height="560"></canvas>';
  document.body.appendChild(panel);
  const canvas = panel.querySelector('canvas');
  const g = canvas.getContext('2d');
  const W = canvas.width;
  let view = 'perto';
  const reliefs = {};     // relevo de cada escala, refeito quando um terreno novo carrega
  let EXTENT = VIEWS[view].ext;
  let lastArgs = null;
  panel.querySelectorAll('.map-tabs button').forEach((b) => b.addEventListener('click', () => {
    view = b.dataset.v;
    panel.querySelectorAll('.map-tabs button').forEach((x) => x.classList.toggle('on', x === b));
    if (lastArgs) draw(lastArgs);
  }));

  const toMap = (x, z) => [((x + EXTENT) / (2 * EXTENT)) * W, ((z + EXTENT) / (2 * EXTENT)) * W];

  function buildRelief(RES) {
    const img = g.createImageData(RES, RES);
    let land = 0;
    for (let j = 0; j < RES; j++) {
      for (let i = 0; i < RES; i++) {
        const x = -EXTENT + ((i + 0.5) / RES) * 2 * EXTENT;
        const z = -EXTENT + ((j + 0.5) / RES) * 2 * EXTENT;
        const h = groundHeight(x, z);
        let c;
        if (h > 0) {
          land++;
          const k = Math.min(1, h / 600);
          c = h < 12 ? [222, 205, 150] : k > 0.75 ? [240, 244, 250] : [Math.round(90 + 60 * k), Math.round(150 - 30 * k), Math.round(80 + 40 * k)];
        } else {
          const deep = Math.min(1, Math.hypot(x, z) / EXTENT);
          c = [Math.round(60 - 30 * deep), Math.round(140 - 50 * deep), Math.round(170 - 40 * deep)];
        }
        const o = (j * RES + i) * 4;
        img.data.set([...c, 255], o);
      }
    }
    if (!land) return null; // o terreno ainda não carregou
    const off = document.createElement('canvas');
    off.width = off.height = RES;
    off.getContext('2d').putImageData(img, 0, 0);
    return off;
  }

  function draw(args) {
    lastArgs = args;
    const { lapras, yaw, creatures, seen, bottles, bottlesFound, places } = args;
    EXTENT = VIEWS[view].ext;
    const cache = reliefs[view];
    if (!cache || cache.version !== terrainVersion) reliefs[view] = { version: terrainVersion, img: buildRelief(VIEWS[view].res) };
    const relief = reliefs[view].img;
    g.imageSmoothingEnabled = true;
    g.clearRect(0, 0, W, W);
    if (relief) g.drawImage(relief, 0, 0, W, W);
    else { g.fillStyle = '#3c8ca8'; g.fillRect(0, 0, W, W); }

    // grade bem leve e a rosa dos ventos
    g.strokeStyle = 'rgba(255,255,255,0.08)';
    for (let k = 1; k < 6; k++) { const p = (k / 6) * W; g.beginPath(); g.moveTo(p, 0); g.lineTo(p, W); g.moveTo(0, p); g.lineTo(W, p); g.stroke(); }
    g.fillStyle = 'rgba(255,255,255,0.85)'; g.font = '600 14px system-ui'; g.textAlign = 'center';
    g.fillText('N', W / 2, 18); g.fillText('S', W / 2, W - 8); g.fillText('L', W - 10, W / 2 + 5); g.fillText('O', 10, W / 2 + 5);

    // lugares
    g.font = 'italic 12px Georgia, serif'; g.fillStyle = 'rgba(255,255,255,0.9)';
    for (const pl of places) {
      if (view === 'perto' ? pl.far : pl.near) continue; // cada escala mostra os nomes que cabem
      const [x, y] = toMap(pl.x, pl.z);
      if (x > 0 && y > 0 && x < W && y < W) g.fillText(pl.name, x, y + pl.dy);
    }

    // garrafas achadas (✉) e ainda escondidas (?) só aparecem depois de achadas
    g.font = '13px system-ui';
    for (const b of bottles) {
      if (!bottlesFound.has(b.id)) continue;
      const [x, y] = toMap(b.pos[0], b.pos[1]);
      g.fillText('✉', x, y + 4);
    }

    // Pokémon já vistos: bolinha + nome (uma vez por espécie)
    const done = new Set();
    for (const c of creatures) {
      if (!seen.has(c.id) || done.has(c.id) || !c.obj.visible) continue;
      done.add(c.id);
      const [x, y] = toMap(c.obj.position.x, c.obj.position.z);
      g.fillStyle = c.shiny ? '#ffe46b' : '#ff7a7a';
      g.beginPath(); g.arc(x, y, 3.5, 0, Math.PI * 2); g.fill();
      g.fillStyle = 'rgba(255,255,255,0.95)'; g.font = '11px system-ui';
      g.fillText(c.name, x, y - 7);
    }

    // Lapras: setinha apontando para onde ela nada
    const [lx, ly] = toMap(lapras.x, lapras.z);
    g.save();
    g.translate(lx, ly);
    g.rotate(-yaw + Math.PI); // yaw 0 = +Z (sul, para baixo no mapa)
    g.fillStyle = '#4fc3ff'; g.strokeStyle = '#fff'; g.lineWidth = 2;
    g.beginPath(); g.moveTo(0, -10); g.lineTo(7, 8); g.lineTo(0, 4); g.lineTo(-7, 8); g.closePath(); g.fill(); g.stroke();
    g.restore();
  }

  return {
    get open() { return !panel.classList.contains('hidden'); },
    toggle(force) { panel.classList.toggle('hidden', force === undefined ? undefined : !force); },
    draw,
  };
}

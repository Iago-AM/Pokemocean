// Controles de toque (celular e tablet).
// - Joystick: aparece onde o dedo toca na metade esquerda da tela.
// - Botões à direita: mergulhar (segurar) e acelerar (segurar).
// - Por padrão eles somem sozinhos alguns segundos depois do último toque, para não
//   poluir a tela. A engrenagem pequena no canto deixa escolher: sempre visível,
//   esconder sozinho ou desligado, além do tamanho e de que lado fica o joystick.
// Arrastar com o dedo na metade direita (fora dos botões) continua girando a câmera.

const DEFAULTS = { mode: 'auto', size: 1, side: 'esquerda' }; // mode: auto | sempre | off
const HIDE_AFTER = 4000; // ms

export function isTouchDevice() {
  return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
}

export function createTouchControls({ load, save, onMenu }) {
  const input = { fwd: 0, turn: 0, dive: false, boost: false };
  const cfg = { ...DEFAULTS, ...load('pokemocean-toque', {}) };
  const touch = isTouchDevice();

  const root = document.createElement('div');
  root.className = 'touch';
  root.innerHTML = `
    <div class="joy"><div class="knob"></div></div>
    <div class="tbtns">
      <button type="button" class="tbtn dive" aria-label="Mergulhar">⤓<small>mergulhar</small></button>
      <button type="button" class="tbtn boost" aria-label="Acelerar">»<small>acelerar</small></button>
    </div>
    <div class="tmenu">
      <button type="button" data-k="j" aria-label="Diário">📖</button>
      <button type="button" data-k="m" aria-label="Mapa">🗺️</button>
      <button type="button" data-k="k" aria-label="Conquistas">🏆</button>
      <button type="button" data-k="g" aria-label="Galeria">🖼️</button>
      <button type="button" data-k="p" aria-label="Modo foto">📷</button>
      <button type="button" class="gear" aria-label="Ajustes dos controles">⚙️</button>
    </div>
    <div class="tsettings hidden">
      <b>Controles de toque</b>
      <label>Mostrar <select data-c="mode">
        <option value="auto">esconder sozinho</option>
        <option value="sempre">sempre visível</option>
        <option value="off">desligado</option>
      </select></label>
      <label>Tamanho <input data-c="size" type="range" min="0.7" max="1.5" step="0.1"></label>
      <label>Joystick à <select data-c="side">
        <option value="esquerda">esquerda</option>
        <option value="direita">direita</option>
      </select></label>
      <button type="button" class="close-set">Pronto</button>
    </div>`;
  document.body.appendChild(root);
  const joy = root.querySelector('.joy'), knob = root.querySelector('.knob');
  const settings = root.querySelector('.tsettings');

  function apply() {
    root.classList.toggle('enabled', touch && cfg.mode !== 'off');
    root.classList.toggle('always', cfg.mode === 'sempre');
    root.classList.toggle('right', cfg.side === 'direita');
    root.style.setProperty('--tsize', cfg.size);
    settings.querySelector('[data-c=mode]').value = cfg.mode;
    settings.querySelector('[data-c=size]').value = cfg.size;
    settings.querySelector('[data-c=side]').value = cfg.side;
  }
  apply();
  // a engrenagem aparece mesmo com os controles desligados (para poder religar)
  root.classList.toggle('has-touch', touch);

  // ---- mostrar / esconder sozinho
  let hideTimer = 0;
  function wake() {
    root.classList.add('awake');
    clearTimeout(hideTimer);
    if (cfg.mode === 'auto') hideTimer = setTimeout(() => { if (!joyId) root.classList.remove('awake'); }, HIDE_AFTER);
  }

  // ---- joystick: nasce onde o dedo encosta (no lado do joystick)
  let joyId = null, cx = 0, cy = 0;
  const R = () => 55 * cfg.size;
  const inJoySide = (x) => (cfg.side === 'esquerda' ? x < window.innerWidth * 0.45 : x > window.innerWidth * 0.55);
  window.addEventListener('touchstart', (e) => {
    if (!root.classList.contains('enabled')) return;
    wake();
    for (const t of e.changedTouches) {
      if (joyId !== null || !inJoySide(t.clientX)) continue;
      if (t.target.closest && t.target.closest('button, .panel, .tsettings, .console, .map, .viewer, .postcard, .letter, .credits')) continue;
      joyId = t.identifier; cx = t.clientX; cy = t.clientY;
      joy.style.left = `${cx}px`; joy.style.top = `${cy}px`;
      joy.classList.add('on');
      move(t.clientX, t.clientY);
      e.stopPropagation(); // não gira a câmera com o dedo do joystick
    }
  }, { capture: true, passive: true });
  function move(x, y) {
    let dx = x - cx, dy = y - cy;
    const d = Math.hypot(dx, dy), r = R();
    if (d > r) { dx *= r / d; dy *= r / d; }
    knob.style.transform = `translate(${dx}px, ${dy}px)`;
    const dead = 0.15;
    const nx = dx / r, ny = dy / r;
    input.turn = Math.abs(nx) > dead ? -nx : 0;
    input.fwd = Math.abs(ny) > dead ? -ny : 0;
  }
  window.addEventListener('touchmove', (e) => {
    for (const t of e.changedTouches) if (t.identifier === joyId) { move(t.clientX, t.clientY); e.stopPropagation(); }
  }, { capture: true, passive: true });
  const end = (e) => {
    for (const t of e.changedTouches) if (t.identifier === joyId) {
      joyId = null; input.fwd = 0; input.turn = 0;
      joy.classList.remove('on'); knob.style.transform = '';
      wake();
    }
  };
  window.addEventListener('touchend', end, { capture: true });
  window.addEventListener('touchcancel', end, { capture: true });

  // ---- botões de segurar
  const hold = (sel, key) => {
    const b = root.querySelector(sel);
    const on = (e) => { e.preventDefault(); e.stopPropagation(); input[key] = true; b.classList.add('down'); wake(); };
    const off = (e) => { e.preventDefault(); input[key] = false; b.classList.remove('down'); wake(); };
    b.addEventListener('touchstart', on, { passive: false });
    b.addEventListener('touchend', off); b.addEventListener('touchcancel', off);
  };
  hold('.dive', 'dive');
  hold('.boost', 'boost');

  // ---- menu e ajustes
  root.querySelectorAll('.tmenu [data-k]').forEach((b) => b.addEventListener('click', (e) => { e.stopPropagation(); onMenu(b.dataset.k); wake(); }));
  root.querySelector('.gear').addEventListener('click', (e) => { e.stopPropagation(); settings.classList.toggle('hidden'); wake(); });
  settings.addEventListener('input', (e) => {
    const k = e.target.dataset.c;
    if (!k) return;
    cfg[k] = k === 'size' ? parseFloat(e.target.value) : e.target.value;
    save('pokemocean-toque', cfg);
    apply(); wake();
  });
  root.querySelector('.close-set').addEventListener('click', () => settings.classList.add('hidden'));

  return {
    input,
    isTouch: touch,
    setPlaying(on) { root.classList.toggle('playing', on); if (on) wake(); },
  };
}

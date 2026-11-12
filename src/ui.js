// Interface na tela: ajuda, relógio, diário, galeria, cartas, avisos e o console de comandos.

const $ = (html) => {
  const t = document.createElement('template');
  t.innerHTML = html.trim();
  return t.content.firstElementChild;
};

export function createUI() {
  const root = $(`<div id="ui"></div>`);
  document.body.appendChild(root);

  const help = $(`
    <div class="panel help">
      <b>Pokémocean</b><br>
      W/S ou ↑/↓ nadar · A/D ou ←/→ virar · Shift mais rápido · <b>Espaço</b> (segurar) mergulhar<br>
      Mouse girar câmera · Roda zoom<br>
      <b>T</b> comandos (digite <i>help</i>) · <b>J</b> diário · <b>M</b> mapa · <b>K</b> conquistas · <b>G</b> galeria · <b>P</b> modo foto (<b>F</b> foto, <b>C</b> cartão-postal) · <b>H</b> esconder ajuda
    </div>`);
  const status = $(`<div class="panel status"><span class="clock"></span><span class="weather"></span><span class="count"></span><span class="bottles"></span></div>`);
  const dex = $(`<div class="panel dex hidden"><b>Diário de avistamentos</b><ul></ul></div>`);
  const gallery = $(`<div class="panel gallery hidden"><b>Galeria de fotos</b><p class="empty">Entre no modo foto (P) e aperte F para fotografar.</p><div class="grid"></div></div>`);
  const viewer = $(`<div class="viewer hidden"><img alt=""><div class="viewer-bar"><span class="caption"></span><a class="download" download="pokemocean.jpg">Baixar</a><button type="button" class="card">Cartão-postal</button><button type="button" class="close">Fechar</button></div></div>`);
  const letter = $(`<div class="letter hidden"><div class="paper"><p class="text"></p><small>Clique ou aperte qualquer tecla para fechar</small></div></div>`);
  const flash = $(`<div class="flash"></div>`);
  const toasts = $(`<div class="toasts"></div>`);
  const consoleBox = $(`
    <div class="console hidden">
      <div class="log"></div>
      <input type="text" spellcheck="false" autocomplete="off" placeholder="digite um comando (help para ajuda) · Esc fecha">
    </div>`);
  const photoHint = $(`<div class="photo-hint hidden">Modo foto · WASD move · Q/E desce/sobe · F fotografa · C cartão-postal · P sai</div>`);
  // bússola: o disco gira para o N apontar sempre para o norte de verdade (-Z no mundo)
  const compass = $(`
    <div class="panel compass" title="Bússola">
      <svg viewBox="-50 -50 100 100" width="64" height="64">
        <circle r="46" class="ring"/>
        <g class="rose">
          <path d="M0,-30 L6,0 L0,6 L-6,0 Z" class="needle-n"/>
          <path d="M0,30 L6,0 L0,-6 L-6,0 Z" class="needle-s"/>
          <text y="-34" class="n">N</text>
          <text y="42">S</text>
          <text x="38" y="4">L</text>
          <text x="-38" y="4">O</text>
        </g>
      </svg>
    </div>`);
  const breath = $(`<div class="breath hidden"><span></span></div>`);
  const trophies = $(`<div class="panel trophies hidden"><b>Conquistas</b> <span class="sub"></span><ul></ul></div>`);
  root.append(help, status, dex, gallery, trophies, toasts, consoleBox, photoHint, compass, breath);
  document.body.append(viewer, letter, flash);
  const rose = compass.querySelector('.rose');

  const input = consoleBox.querySelector('input');
  const log = consoleBox.querySelector('.log');

  // --- console ----------------------------------------------------------------
  let onCommand = () => {};
  const history = [];
  let histPos = 0;
  let logTimer = null;

  function print(text, kind = '') {
    const line = document.createElement('div');
    line.className = 'line ' + kind;
    line.textContent = text;
    log.appendChild(line);
    while (log.children.length > 60) log.firstChild.remove();
    log.scrollTop = log.scrollHeight; // a última linha (o que você acabou de digitar) sempre visível
    log.classList.add('show');
    clearTimeout(logTimer);
    if (!isConsoleOpen()) logTimer = setTimeout(() => log.classList.remove('show'), 6000);
  }

  function openConsole() {
    consoleBox.classList.remove('hidden');
    root.classList.add('console-open');
    log.classList.add('show');
    clearTimeout(logTimer);
    input.value = '';
    input.focus();
  }
  function closeConsole() {
    consoleBox.classList.add('hidden');
    root.classList.remove('console-open');
    input.blur();
    logTimer = setTimeout(() => log.classList.remove('show'), 4000);
  }
  const isConsoleOpen = () => !consoleBox.classList.contains('hidden');

  input.addEventListener('keydown', (e) => {
    e.stopPropagation(); // teclas digitadas não movem a Lapras
    if (e.key === 'Enter') {
      const cmd = input.value.trim();
      input.value = '';
      if (cmd) {
        history.push(cmd);
        histPos = history.length;
        print('> ' + cmd, 'cmd');
        onCommand(cmd);
      }
    } else if (e.key === 'Escape') {
      closeConsole();
    } else if (e.key === 'ArrowUp') {
      if (histPos > 0) input.value = history[--histPos];
      e.preventDefault();
    } else if (e.key === 'ArrowDown') {
      histPos = Math.min(history.length, histPos + 1);
      input.value = history[histPos] ?? '';
      e.preventDefault();
    }
  });
  input.addEventListener('keyup', (e) => e.stopPropagation());

  // --- avisos -------------------------------------------------------------------
  function toast(text) {
    const el = $(`<div class="toast"></div>`);
    el.textContent = text;
    toasts.appendChild(el);
    setTimeout(() => el.classList.add('out'), 3500);
    setTimeout(() => el.remove(), 4300);
  }

  // --- visualizador de foto ------------------------------------------------------
  function openViewer(src, caption) {
    viewer.querySelector('img').src = src;
    viewer.querySelector('.caption').textContent = caption;
    viewer.querySelector('.download').href = src;
    viewer.classList.remove('hidden');
  }
  const closeViewer = () => viewer.classList.add('hidden');
  viewer.querySelector('.close').addEventListener('click', closeViewer);
  let onPostcard = () => {};
  viewer.querySelector('.card').addEventListener('click', () => { closeViewer(); onPostcard(viewer.querySelector('img').src, viewer.querySelector('.caption').textContent); });
  viewer.addEventListener('click', (e) => { if (e.target === viewer) closeViewer(); });

  // --- diário ---------------------------------------------------------------------
  function renderDex(entries, seen, extra = {}) {
    const { shinies = new Set(), photos = {} } = extra;
    const ul = dex.querySelector('ul');
    ul.innerHTML = '';
    for (const e of entries) {
      const li = document.createElement('li');
      const ok = seen.has(e.id);
      li.className = ok ? 'seen' : '';
      li.innerHTML = `<div class="txt"><span class="name"></span><span class="hint"></span></div>`;
      li.querySelector('.name').textContent = ok ? e.name + (shinies.has(e.id) ? ' ★' : '') : '???';
      li.querySelector('.hint').textContent = e.hint;
      if (photos[e.id]) {
        const img = document.createElement('img');
        img.src = photos[e.id].img;
        img.title = 'Foto oficial (clique para ampliar)';
        img.addEventListener('click', () => openViewer(photos[e.id].img, `${e.name} · ${photos[e.id].date}`));
        li.prepend(img);
      }
      ul.appendChild(li);
    }
    status.querySelector('.count').textContent = `Diário ${seen.size}/${entries.length}`;
  }

  // --- galeria --------------------------------------------------------------------
  function renderGallery(list) {
    const grid = gallery.querySelector('.grid');
    grid.innerHTML = '';
    gallery.querySelector('.empty').classList.toggle('hidden', list.length > 0);
    for (const p of [...list].reverse()) {
      const img = document.createElement('img');
      img.src = p.img;
      img.title = p.caption;
      img.addEventListener('click', () => openViewer(p.img, p.caption));
      grid.appendChild(img);
    }
  }

  // --- carta da garrafa ----------------------------------------------------------------
  let letterOpen = false;
  function showLetter(text) {
    letter.querySelector('.text').textContent = text;
    letter.classList.remove('hidden');
    letterOpen = true;
  }
  function closeLetter() {
    letter.classList.add('hidden');
    letterOpen = false;
  }
  letter.addEventListener('click', closeLetter);

  return {
    print,
    toast,
    renderDex,
    renderGallery,
    renderAchievements(list, unlocked, kmText) {
      trophies.querySelector('.sub').textContent = `${unlocked.size}/${list.length} · ${kmText}`;
      const ul = trophies.querySelector('ul');
      ul.innerHTML = '';
      for (const a of list) {
        const li = document.createElement('li');
        li.className = unlocked.has(a.id) ? 'got' : '';
        li.innerHTML = '<span class="name"></span><span class="hint"></span>';
        li.querySelector('.name').textContent = (unlocked.has(a.id) ? '🏆 ' : '· ') + a.name;
        li.querySelector('.hint').textContent = a.desc;
        ul.appendChild(li);
      }
    },
    toggleAchievements: (force) => trophies.classList.toggle('hidden', force === undefined ? undefined : !force),
    achievementToast(a) {
      const el = $(`<div class="toast trophy"><b>🏆 Conquista</b><span></span></div>`);
      el.querySelector('span').textContent = a.name + ' — ' + a.desc;
      toasts.appendChild(el);
      setTimeout(() => el.classList.add('out'), 5000);
      setTimeout(() => el.remove(), 5900);
    },
    openConsole,
    closeConsole,
    isConsoleOpen,
    showLetter,
    closeLetter,
    get letterOpen() { return letterOpen; },
    get viewerOpen() { return !viewer.classList.contains('hidden'); },
    closeViewer,
    set onPostcard(fn) { onPostcard = fn; },
    set onCommand(fn) { onCommand = fn; },
    toggleHelp: () => help.classList.toggle('hidden'),
    setVisible: (v) => root.classList.toggle('hidden-all', !v),
    toggleDex: (force) => dex.classList.toggle('hidden', force === undefined ? undefined : !force),
    toggleGallery: (force) => gallery.classList.toggle('hidden', force === undefined ? undefined : !force),
    flash() {
      flash.classList.remove('on');
      void flash.offsetWidth; // reinicia a animação
      flash.classList.add('on');
    },
    // barra de fôlego do mergulho (null esconde)
    setBreath(v) {
      breath.classList.toggle('hidden', v === null);
      if (v !== null) breath.firstElementChild.style.width = `${Math.round(v * 100)}%`;
    },
    // heading: para onde a câmera olha, em graus a partir do norte, no sentido horário
    setCompass(heading) { rose.setAttribute('transform', `rotate(${-heading})`); },
    setStatus(clock, weather) {
      status.querySelector('.clock').textContent = clock;
      status.querySelector('.weather').textContent = weather;
    },
    setBottles(n, total) { status.querySelector('.bottles').textContent = `Garrafas ${n}/${total}`; },
    setPhotoMode(on) {
      root.classList.toggle('photo', on);
      photoHint.classList.toggle('hidden', !on);
      if (on) setTimeout(() => photoHint.classList.add('hidden'), 3000);
    },
  };
}

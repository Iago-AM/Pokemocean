// Cartão-postal: transforma uma foto num cartão com moldura Pokémocean, selo e
// carimbo, pronto para baixar, copiar ou compartilhar com os amigos.

const W = 1600, H = 1100;

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

// desenha o cartão num canvas e devolve o canvas
export async function drawPostcard(photoSrc, caption) {
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const g = c.getContext('2d');

  // papel creme com textura leve e borda azul-marinho
  g.fillStyle = '#f6efdc'; g.fillRect(0, 0, W, H);
  for (let i = 0; i < 4000; i++) {
    g.fillStyle = `rgba(120,100,60,${Math.random() * 0.05})`;
    g.fillRect(Math.random() * W, Math.random() * H, 2, 2);
  }
  g.strokeStyle = '#1f4fae'; g.lineWidth = 14; g.strokeRect(22, 22, W - 44, H - 44);
  g.strokeStyle = '#ffd21f'; g.lineWidth = 5; g.strokeRect(40, 40, W - 80, H - 80);

  // foto com borda branca, levemente inclinada, e sombra
  const img = await loadImage(photoSrc);
  const pw = 1060, ph = Math.round(pw * (img.height / img.width));
  const fh = Math.min(ph, 760);
  g.save();
  g.translate(95 + pw / 2, 230 + fh / 2);
  g.rotate(-0.025);
  g.shadowColor = 'rgba(0,0,0,0.35)'; g.shadowBlur = 30; g.shadowOffsetY = 12;
  g.fillStyle = '#fff'; g.fillRect(-pw / 2 - 18, -fh / 2 - 18, pw + 36, fh + 36);
  g.shadowColor = 'transparent';
  // recorta a foto no formato do quadro (centralizada)
  const sy = Math.max(0, (img.height - img.width * (fh / pw)) / 2);
  g.drawImage(img, 0, sy, img.width, img.width * (fh / pw), -pw / 2, -fh / 2, pw, fh);
  g.restore();

  // título Pokémocean
  g.save();
  g.font = '900 120px "Arial Black", Arial, sans-serif';
  g.textBaseline = 'alphabetic';
  g.lineJoin = 'round';
  g.translate(95, 175);
  g.rotate(-0.02);
  g.lineWidth = 22; g.strokeStyle = '#16367a'; g.strokeText('Pokémocean', 4, 8);
  g.lineWidth = 14; g.strokeStyle = '#1f4fae'; g.strokeText('Pokémocean', 0, 0);
  g.fillStyle = '#ffd21f'; g.fillText('Pokémocean', 0, 0);
  g.restore();

  // lado direito: "Lembranças do mar", linhas de carta, legenda e data
  const x0 = 1220;
  g.fillStyle = '#1f4fae';
  g.font = 'italic 44px Georgia, serif';
  g.fillText('Lembranças', x0, 400);
  g.fillText('do mar', x0, 455);
  g.strokeStyle = 'rgba(31,79,174,0.35)'; g.lineWidth = 2;
  for (let i = 0; i < 6; i++) { g.beginPath(); g.moveTo(x0, 520 + i * 70); g.lineTo(W - 90, 520 + i * 70); g.stroke(); }
  g.fillStyle = '#3a3a52';
  g.font = 'italic 34px Georgia, serif';
  wrap(g, caption, x0, 505, W - 90 - x0, 70);

  // selo com uma ondinha e o carimbo redondo
  g.save();
  g.translate(W - 230, 110);
  g.fillStyle = '#fff'; g.fillRect(0, 0, 150, 180);
  g.strokeStyle = '#d9cfb3'; g.setLineDash([6, 6]); g.lineWidth = 4; g.strokeRect(0, 0, 150, 180); g.setLineDash([]);
  const grad = g.createLinearGradient(0, 15, 0, 165); grad.addColorStop(0, '#7fd4ff'); grad.addColorStop(1, '#1f4fae');
  g.fillStyle = grad; g.fillRect(15, 15, 120, 150);
  g.strokeStyle = '#fff'; g.lineWidth = 5;
  for (let k = 0; k < 3; k++) { g.beginPath(); for (let x = 15; x <= 135; x += 4) g.lineTo(x, 100 + k * 22 + Math.sin(x * 0.12) * 6); g.stroke(); }
  g.fillStyle = '#ffd21f'; g.beginPath(); g.arc(95, 55, 18, 0, Math.PI * 2); g.fill();
  g.restore();
  g.save();
  g.translate(W - 215, 280);
  g.rotate(-0.25);
  g.strokeStyle = 'rgba(160,40,40,0.55)'; g.fillStyle = 'rgba(160,40,40,0.55)'; g.lineWidth = 4;
  g.beginPath(); g.arc(0, 0, 70, 0, Math.PI * 2); g.stroke();
  g.beginPath(); g.arc(0, 0, 58, 0, Math.PI * 2); g.stroke();
  g.font = 'bold 18px system-ui, sans-serif'; g.textAlign = 'center';
  g.fillText('POKÉMOCEAN', 0, -12);
  g.font = '16px system-ui, sans-serif';
  g.fillText(new Date().toLocaleDateString('pt-BR'), 0, 14);
  g.restore();

  return c;
}

function wrap(g, text, x, y, maxW, lineH) {
  const words = String(text || '').split(/\s+/);
  let line = '';
  for (const w of words) {
    const test = line ? line + ' ' + w : w;
    if (g.measureText(test).width > maxW && line) { g.fillText(line, x, y); line = w; y += lineH; }
    else line = test;
  }
  if (line) g.fillText(line, x, y);
}

// janela do cartão: prévia + Baixar / Copiar / Compartilhar
export function createPostcardUI(toast) {
  const el = document.createElement('div');
  el.className = 'postcard hidden';
  el.innerHTML = `<div class="postcard-box">
      <img alt="Cartão-postal">
      <div class="postcard-bar">
        <button type="button" data-a="baixar">Baixar</button>
        <button type="button" data-a="copiar">Copiar</button>
        <button type="button" data-a="compartilhar">Compartilhar</button>
        <button type="button" data-a="fechar">Fechar</button>
      </div>
    </div>`;
  document.body.appendChild(el);
  const img = el.querySelector('img');
  let blob = null;
  const shareBtn = el.querySelector('[data-a=compartilhar]');
  const copyBtn = el.querySelector('[data-a=copiar]');
  if (!navigator.clipboard || typeof ClipboardItem === 'undefined') copyBtn.style.display = 'none';

  const close = () => el.classList.add('hidden');
  el.addEventListener('click', async (e) => {
    const a = e.target.dataset?.a;
    if (e.target === el || a === 'fechar') return close();
    if (!blob) return;
    if (a === 'baixar') {
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `pokemocean-cartao-${Date.now()}.png`;
      link.click();
      setTimeout(() => URL.revokeObjectURL(link.href), 2000);
    } else if (a === 'copiar') {
      try { await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]); toast('Cartão copiado! É só colar (Ctrl+V) na conversa.'); }
      catch { toast('O navegador não deixou copiar a imagem. Use "Baixar".'); }
    } else if (a === 'compartilhar') {
      const file = new File([blob], 'pokemocean-cartao.png', { type: 'image/png' });
      try { await navigator.share({ files: [file], title: 'Pokémocean', text: 'Um cartão-postal do Pokémocean 🌊' }); }
      catch { /* cancelado */ }
    }
  });

  return {
    get open() { return !el.classList.contains('hidden'); },
    close,
    async show(photoSrc, caption) {
      const canvas = await drawPostcard(photoSrc, caption);
      blob = await new Promise((r) => canvas.toBlob(r, 'image/png'));
      img.src = URL.createObjectURL(blob);
      const file = new File([blob], 'pokemocean-cartao.png', { type: 'image/png' });
      shareBtn.style.display = navigator.canShare && navigator.canShare({ files: [file] }) ? '' : 'none';
      el.classList.remove('hidden');
    },
  };
}

// Música calma gerada no próprio navegador (sem arquivos, sem direitos autorais).
// Um "pad" de acordes bem suave e notas soltas de marimba numa escala pentatônica.
// Muda de humor de dia, à noite e embaixo d'água.

const MOODS = {
  dia: {
    chords: [[60, 64, 67, 71], [57, 60, 64, 67], [53, 57, 60, 64], [55, 59, 62, 67]], // Cmaj7 Am7 Fmaj7 G
    scale: [72, 74, 76, 79, 81, 84, 86],
    beat: 0.55, chordBars: 8, cutoff: 2600, pluck: 0.55,
  },
  noite: {
    chords: [[57, 60, 64, 71], [53, 57, 60, 67], [50, 53, 57, 64], [52, 55, 59, 62]], // Am9 Fmaj7 Dm9 Em7
    scale: [69, 72, 74, 76, 79, 81],
    beat: 0.8, chordBars: 10, cutoff: 1500, pluck: 0.4,
  },
  fundo: {
    chords: [[50, 57, 62, 65], [48, 55, 60, 64], [46, 53, 58, 62], [45, 52, 57, 60]],
    scale: [62, 65, 67, 69, 72],
    beat: 1.1, chordBars: 12, cutoff: 650, pluck: 0.25,
  },
};
const hz = (m) => 440 * Math.pow(2, (m - 69) / 12);

export function createMusic(ctx, destination) {
  const out = ctx.createGain();
  out.gain.value = 0;
  // "sala" grande: eco feito com ruído decaindo
  const verb = ctx.createConvolver();
  {
    const len = ctx.sampleRate * 3.5, ir = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const d = ir.getChannelData(ch);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.6);
    }
    verb.buffer = ir;
  }
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = 2600;
  const dry = ctx.createGain(); dry.gain.value = 0.55;
  const wet = ctx.createGain(); wet.gain.value = 0.6;
  filter.connect(dry).connect(out);
  filter.connect(verb).connect(wet).connect(out);
  out.connect(destination);

  let mood = 'dia';
  let volume = 0.5;
  let enabled = true;
  let nextBeat = 0, beatCount = 0, chordIndex = 0;

  function pad(notes, when, dur) {
    for (const n of notes) {
      for (const detune of [-6, 6]) {
        const o = ctx.createOscillator(), g = ctx.createGain();
        o.type = 'triangle';
        o.frequency.value = hz(n - 12);
        o.detune.value = detune;
        g.gain.setValueAtTime(0, when);
        g.gain.linearRampToValueAtTime(0.022, when + dur * 0.35);
        g.gain.linearRampToValueAtTime(0, when + dur);
        o.connect(g).connect(filter);
        o.start(when); o.stop(when + dur + 0.1);
      }
    }
  }

  function pluck(note, when, amount) {
    const o = ctx.createOscillator(), o2 = ctx.createOscillator(), g = ctx.createGain();
    o.type = 'sine'; o.frequency.value = hz(note);
    o2.type = 'sine'; o2.frequency.value = hz(note) * 4; // brilho de marimba
    const g2 = ctx.createGain(); g2.gain.value = 0.12;
    g.gain.setValueAtTime(0, when);
    g.gain.linearRampToValueAtTime(0.09 * amount, when + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, when + 1.8);
    o.connect(g); o2.connect(g2).connect(g); g.connect(filter);
    o.start(when); o2.start(when); o.stop(when + 2); o2.stop(when + 2);
  }

  return {
    get enabled() { return enabled; },
    setEnabled(v) { enabled = v; },
    setVolume(v) { volume = v; },
    setMood(m) { if (MOODS[m]) mood = m; },
    // chamado a cada quadro; agenda as notas um pouquinho adiantado
    update() {
      if (ctx.state !== 'running') return;
      const now = ctx.currentTime;
      const M = MOODS[mood];
      out.gain.setTargetAtTime(enabled ? volume * 0.9 : 0, now, 1.5);
      filter.frequency.setTargetAtTime(M.cutoff, now, 2);
      if (nextBeat < now) nextBeat = now + 0.1;
      while (nextBeat < now + 0.3) {
        if (beatCount % M.chordBars === 0) {
          pad(M.chords[chordIndex % M.chords.length], nextBeat, M.beat * M.chordBars + 1.5);
          chordIndex++;
        }
        if (Math.random() < M.pluck) {
          const chord = M.chords[(chordIndex - 1 + M.chords.length) % M.chords.length];
          const pool = Math.random() < 0.5 ? M.scale : chord.map((n) => n + 12);
          pluck(pool[Math.floor(Math.random() * pool.length)], nextBeat, mood === 'fundo' ? 0.7 : 1);
        }
        nextBeat += M.beat;
        beatCount++;
      }
    },
  };
}

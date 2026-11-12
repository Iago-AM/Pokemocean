// Sons: mar em loop, chuva (ruído gerado na hora) e gritos.
import * as THREE from 'three';
import { createMusic } from './music.js';

export function createAudio(camera) {
  const listener = new THREE.AudioListener();
  camera.add(listener);
  const loader = new THREE.AudioLoader();
  const ctx = listener.context;

  let master = 0.6;
  const ocean = new THREE.Audio(listener);
  let oceanReady = false;
  loader.load('assets/Sounds/Ocean.mp3', (buffer) => {
    ocean.setBuffer(buffer);
    ocean.setLoop(true);
    ocean.setVolume(0.5 * master);
    oceanReady = true;
    if (started) ocean.play();
  });

  // chuva: ruído "marrom" filtrado, sem precisar de arquivo
  const len = ctx.sampleRate * 3;
  const noise = ctx.createBuffer(1, len, ctx.sampleRate);
  const data = noise.getChannelData(0);
  let last = 0;
  for (let i = 0; i < len; i++) {
    last = (last + 0.02 * (Math.random() * 2 - 1)) / 1.02;
    data[i] = last * 3.5 + (Math.random() * 2 - 1) * 0.08;
  }
  const rainGain = ctx.createGain();
  rainGain.gain.value = 0;
  const rainFilter = ctx.createBiquadFilter();
  rainFilter.type = 'lowpass';
  rainFilter.frequency.value = 2500;
  rainFilter.connect(rainGain).connect(listener.getInput());
  let rainSrc = null;

  const music = createMusic(ctx, listener.getInput());

  // navegadores só liberam áudio depois de uma interação do jogador
  let started = false;
  function start() {
    if (started) return;
    started = true;
    if (ctx.state === 'suspended') ctx.resume();
    if (oceanReady) ocean.play();
    rainSrc = ctx.createBufferSource();
    rainSrc.buffer = noise;
    rainSrc.loop = true;
    rainSrc.connect(rainFilter);
    rainSrc.start();
  }
  window.addEventListener('keydown', start);
  window.addEventListener('pointerdown', start);

  const sounds = {
    rayquaza: 'assets/Sounds/Rayquaza_Scream.mp3',
    rayquaza2: 'assets/Sounds/Rayquaza_Cry.mp3',
  };
  const cry = new THREE.Audio(listener);
  const cache = {}; // id -> AudioBuffer | null (não existe)
  function playBuffer(buffer, volume = 0.9) {
    if (cry.isPlaying) cry.stop();
    cry.setBuffer(buffer);
    cry.setVolume(volume * master);
    cry.play();
  }
  // Gritos: coloque arquivos em assets/Sounds/cries/<id>.mp3 (ou .ogg/.wav),
  // por exemplo cries/psyduck.mp3. O jogo acha sozinho; se não existir, fica em silêncio.
  function loadCry(id, done) {
    if (id in cache) return done(cache[id]);
    const exts = ['mp3', 'ogg', 'wav'];
    const tryNext = (i) => {
      if (i >= exts.length) {
        if (sounds[id]) return loader.load(sounds[id], (b) => done((cache[id] = b)), undefined, () => done((cache[id] = null)));
        return done((cache[id] = null));
      }
      loader.load(`assets/Sounds/cries/${id}.${exts[i]}`, (b) => done((cache[id] = b)), undefined, () => tryNext(i + 1));
    };
    tryNext(0);
  }
  function play(name, onMissing) {
    start();
    loadCry(name, (buffer) => (buffer ? playBuffer(buffer) : onMissing?.()));
    return true;
  }

  function setVolume(v) {
    master = THREE.MathUtils.clamp(v, 0, 1);
    music.setVolume(master);
    if (oceanReady) ocean.setVolume(0.5 * master);
  }

  function update(rainAmount, mood) {
    rainGain.gain.value = rainAmount * 0.35 * master;
    music.setMood(mood);
    music.update();
  }

  music.setVolume(master);
  return { play, setVolume, update, music, sounds: Object.keys(sounds), get volume() { return master; } };
}

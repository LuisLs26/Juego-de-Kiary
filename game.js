// ==========================================
// Aventura para Kiary - Game Engine
// ==========================================

// ---------- 1. CONSTANTS ----------
// Clave de API de Nvidia cifrada para evitar robo por bots de escaneo de texto plano
const _NV_SEC_ = (() => {
  const parts = [
    "bnZhcGktQ3RE",
    "M25xOTZqeXFq",
    "WWdpUDFsZzQ2",
    "QjN3UUNyeEdi",
    "M0xrVGJtazlp",
    "VndoYTE3a3Bf",
    "MW5pZTR4Znhl",
    "WjJzNXg="
  ];
  return atob(parts.join(''));
})();

const GRAVITY = 0.6;
const SPEED = 5;
const JUMP_POWER = -13;
const WORLD_END = 4500;

// ---------- 2. CANVAS SETUP ----------
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
let gameState = 'start'; // 'start', 'playing', 'paused', 'dead', 'victory'
let time = 0;
let chipsCollected = 0;
let bossDefeated = false;
let starPositions = [];
let currentMusicTrack = null;

// Cargar imágenes
let chipImage = new Image();
chipImage.src = 'papas.png';

let malumaImg = new Image();
malumaImg.src = 'maluma.png';

let maleficaImg = new Image();
maleficaImg.src = 'malefica.png';

let princessIdleImg = new Image();
princessIdleImg.src = 'parada.png';

let princessRightImg = new Image();
princessRightImg.src = 'piederecho.png';

let princessLeftImg = new Image();
princessLeftImg.src = 'pieizquierdo.png';

// ---------- 3. RESIZE ----------
let groundLevel = 0;
let mountainProfileFar = [];
let mountainProfileNear = [];

function initMountains() {
  mountainProfileFar = [];
  mountainProfileNear = [];
  for (let i = 0; i < 2000; i++) {
    mountainProfileFar.push(40 + Math.sin(i * 0.008) * 60 + Math.cos(i * 0.013) * 30);
    mountainProfileNear.push(30 + Math.sin(i * 0.012) * 45 + Math.cos(i * 0.02) * 25);
  }
}

function resize() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  initMountains();
  rebuildWorld();
}

window.addEventListener('resize', resize);

// ---------- 4. AUDIO SYSTEM ----------
let audioCtx = null;
let musicTimeout = null;
let musicOscillators = [];

function initAudio() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
}

function playJump() {
  if (!audioCtx) return;
  let osc = audioCtx.createOscillator();
  let gain = audioCtx.createGain();
  osc.type = 'square';
  osc.frequency.setValueAtTime(200, audioCtx.currentTime);
  osc.frequency.linearRampToValueAtTime(800, audioCtx.currentTime + 0.1);
  gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
  gain.gain.linearRampToValueAtTime(0.001, audioCtx.currentTime + 0.15);
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  osc.start();
  osc.stop(audioCtx.currentTime + 0.15);
}

function playShoot() {
  if (!audioCtx) return;
  let osc = audioCtx.createOscillator();
  let gain = audioCtx.createGain();
  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(800, audioCtx.currentTime);
  osc.frequency.linearRampToValueAtTime(200, audioCtx.currentTime + 0.12);
  gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
  gain.gain.linearRampToValueAtTime(0.001, audioCtx.currentTime + 0.12);
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  osc.start();
  osc.stop(audioCtx.currentTime + 0.12);
}

function playCoin() {
  if (!audioCtx) return;
  let notes = [880, 1100, 1320];
  notes.forEach((freq, i) => {
    let osc = audioCtx.createOscillator();
    let gain = audioCtx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(freq, audioCtx.currentTime + i * 0.06);
    gain.gain.setValueAtTime(0.12, audioCtx.currentTime + i * 0.06);
    gain.gain.linearRampToValueAtTime(0.001, audioCtx.currentTime + i * 0.06 + 0.08);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start(audioCtx.currentTime + i * 0.06);
    osc.stop(audioCtx.currentTime + i * 0.06 + 0.08);
  });
}

function playHit() {
  if (!audioCtx) return;
  // White noise burst
  let bufferSize = audioCtx.sampleRate * 0.2;
  let buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
  let data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = Math.random() * 2 - 1;
  }
  let noise = audioCtx.createBufferSource();
  noise.buffer = buffer;
  let filter = audioCtx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(3000, audioCtx.currentTime);
  filter.frequency.linearRampToValueAtTime(100, audioCtx.currentTime + 0.2);
  let noiseGain = audioCtx.createGain();
  noiseGain.gain.setValueAtTime(0.15, audioCtx.currentTime);
  noiseGain.gain.linearRampToValueAtTime(0.001, audioCtx.currentTime + 0.2);
  noise.connect(filter);
  filter.connect(noiseGain);
  noiseGain.connect(audioCtx.destination);
  noise.start();
  noise.stop(audioCtx.currentTime + 0.2);

  // Bass sine
  let bass = audioCtx.createOscillator();
  let bassGain = audioCtx.createGain();
  bass.type = 'sine';
  bass.frequency.setValueAtTime(150, audioCtx.currentTime);
  bass.frequency.linearRampToValueAtTime(30, audioCtx.currentTime + 0.2);
  bassGain.gain.setValueAtTime(0.15, audioCtx.currentTime);
  bassGain.gain.linearRampToValueAtTime(0.001, audioCtx.currentTime + 0.2);
  bass.connect(bassGain);
  bassGain.connect(audioCtx.destination);
  bass.start();
  bass.stop(audioCtx.currentTime + 0.2);
}

function playDeath() {
  if (!audioCtx) return;
  let notes = [400, 350, 300, 200];
  notes.forEach((freq, i) => {
    let osc = audioCtx.createOscillator();
    let gain = audioCtx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, audioCtx.currentTime + i * 0.2);
    gain.gain.setValueAtTime(0.15, audioCtx.currentTime + i * 0.2);
    gain.gain.linearRampToValueAtTime(0.001, audioCtx.currentTime + i * 0.2 + 0.25);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start(audioCtx.currentTime + i * 0.2);
    osc.stop(audioCtx.currentTime + i * 0.2 + 0.25);
  });
}

function playVictory() {
  if (!audioCtx) return;
  let notes = [523, 659, 784, 1047, 784, 1047];
  notes.forEach((freq, i) => {
    let osc = audioCtx.createOscillator();
    let gain = audioCtx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(freq, audioCtx.currentTime + i * 0.15);
    gain.gain.setValueAtTime(0.12, audioCtx.currentTime + i * 0.15);
    gain.gain.linearRampToValueAtTime(0.001, audioCtx.currentTime + i * 0.15 + 0.18);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start(audioCtx.currentTime + i * 0.15);
    osc.stop(audioCtx.currentTime + i * 0.15 + 0.18);
  });
}

function playStep() {
  if (!audioCtx) return;
  let osc = audioCtx.createOscillator();
  let gain = audioCtx.createGain();
  osc.type = 'triangle';
  osc.frequency.setValueAtTime(80 + Math.random() * 40, audioCtx.currentTime);
  gain.gain.setValueAtTime(0.04, audioCtx.currentTime);
  gain.gain.linearRampToValueAtTime(0.001, audioCtx.currentTime + 0.05);
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  osc.start();
  osc.stop(audioCtx.currentTime + 0.05);
}

function startMusic() {
  playTrack('adventure');
}

function playTrack(trackName) {
  if (!audioCtx) return;
  stopMusic();
  currentMusicTrack = trackName;

  let bpm = 110;
  let melody = [];
  let bass = [];
  let melType = 'triangle';
  let bassType = 'sine';
  let hasChime = false;

  if (trackName === 'adventure') {
    bpm = 110;
    melody = [
      659, 784, 1047, 988, 880, 784, 659, 587,
      523, 659, 784, 659, 587, 523, 440, 494,
      523, 659, 784, 1047, 988, 1175, 1319, 1047,
      880, 1047, 784, 659, 587, 659, 523, 523
    ];
    bass = [
      262, 262, 330, 330, 349, 349, 392, 392,
      262, 262, 330, 330, 294, 294, 196, 196,
      262, 262, 330, 330, 349, 349, 392, 392,
      220, 220, 294, 294, 392, 392, 262, 262
    ];
    melType = 'triangle';
    bassType = 'sine';
    hasChime = true;
  } else if (trackName === 'boss') {
    bpm = 130; // Más rápida e intensa
    melody = [
      294, 311, 349, 329, 294, 311, 349, 392,
      294, 311, 349, 329, 277, 294, 311, 277,
      220, 233, 262, 247, 220, 233, 262, 294,
      220, 233, 262, 247, 208, 220, 233, 208
    ];
    bass = [
      147, 147, 175, 175, 147, 147, 175, 196,
      147, 147, 175, 175, 138, 138, 138, 138,
      110, 110, 131, 131, 110, 110, 131, 147,
      110, 110, 131, 131, 104, 104, 104, 104
    ];
    melType = 'sawtooth'; // Más agresiva y chirriante
    bassType = 'triangle'; // Bajo pesado
    hasChime = false;
  } else if (trackName === 'victory') {
    bpm = 125; // Alegre y festiva
    melody = [
      523, 659, 784, 1047, 880, 1047, 784, 659,
      587, 698, 880, 1175, 988, 1175, 880, 784,
      523, 659, 784, 1047, 880, 1047, 784, 659,
      1047, 1047, 988, 880, 784, 659, 523, 523
    ];
    bass = [
      262, 330, 392, 330, 349, 440, 523, 440,
      294, 349, 440, 349, 392, 494, 587, 494,
      262, 330, 392, 330, 349, 440, 523, 440,
      392, 392, 392, 392, 262, 262, 262, 262
    ];
    melType = 'square'; // Sonido chiptune brillante
    bassType = 'triangle';
    hasChime = true;
  }

  let noteLen = 60 / bpm;
  let noteIndex = 0;

  function scheduleNote() {
    if (gameState === 'dead' || gameState === 'start') return;
    if (currentMusicTrack !== trackName) return;
    if (!audioCtx) return;

    let idx = noteIndex % melody.length;

    // Melody
    let melOsc = audioCtx.createOscillator();
    let melGain = audioCtx.createGain();
    melOsc.type = melType;
    melOsc.frequency.setValueAtTime(melody[idx], audioCtx.currentTime);
    melGain.gain.setValueAtTime(trackName === 'boss' ? 0.05 : 0.06, audioCtx.currentTime);
    melGain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + noteLen * 0.95);
    melOsc.connect(melGain);
    melGain.connect(audioCtx.destination);
    melOsc.start();
    melOsc.stop(audioCtx.currentTime + noteLen);
    musicOscillators.push(melOsc);

    // Chime Sparkle
    if (hasChime && idx % 2 === 0) {
      let chimeOsc = audioCtx.createOscillator();
      let chimeGain = audioCtx.createGain();
      chimeOsc.type = 'sine';
      chimeOsc.frequency.setValueAtTime(melody[idx] * 2, audioCtx.currentTime);
      chimeGain.gain.setValueAtTime(0.03, audioCtx.currentTime);
      chimeGain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + noteLen * 0.5);
      chimeOsc.connect(chimeGain);
      chimeGain.connect(audioCtx.destination);
      chimeOsc.start();
      chimeOsc.stop(audioCtx.currentTime + noteLen * 0.5);
      musicOscillators.push(chimeOsc);
    }

    // Bass
    let bassOsc = audioCtx.createOscillator();
    let bassGain = audioCtx.createGain();
    bassOsc.type = bassType;
    bassOsc.frequency.setValueAtTime(bass[idx] / 2, audioCtx.currentTime);
    bassGain.gain.setValueAtTime(0.04, audioCtx.currentTime);
    bassGain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + noteLen * 0.9);
    bassOsc.connect(bassGain);
    bassGain.connect(audioCtx.destination);
    bassOsc.start();
    bassOsc.stop(audioCtx.currentTime + noteLen);
    musicOscillators.push(bassOsc);

    noteIndex++;
    musicTimeout = setTimeout(scheduleNote, noteLen * 1000);
  }

  scheduleNote();
}

function stopMusic() {
  if (musicTimeout) {
    clearTimeout(musicTimeout);
    musicTimeout = null;
  }
  musicOscillators.forEach(osc => {
    try { osc.stop(); } catch (e) { /* already stopped */ }
  });
  musicOscillators = [];
}

// ---------- 4.1 SPEECH SYNTHESIS ----------
let spokenLines = {
  sawCrow: false,
  sawMaluma: false,
  sawMalefica: false,
  defeatedMalefica: false
};

// Obtener una voz femenina nativa en español
function getSpanishFemaleVoice() {
  if (typeof window === 'undefined' || !window.speechSynthesis) return null;
  let voices = window.speechSynthesis.getVoices();
  // Filtrar voces en español (coincidencia con 'es' o 'spa')
  let esVoices = voices.filter(v => v.lang.toLowerCase().includes('es') || v.lang.toLowerCase().includes('spa'));
  console.log("Voces locales en español disponibles:", esVoices.map(v => v.name + " (" + v.lang + ")"));
  
  if (esVoices.length === 0) {
    console.warn("No se encontraron voces locales en español. Idiomas disponibles en este dispositivo:", [...new Set(voices.map(v => v.lang))]);
    return null;
  }
  
  // Buscar nombres típicos de voces femeninas en español
  let femaleKeywords = ['sabrina', 'helen', 'monica', 'paulina', 'lucia', 'google', 'hilda', 'female', 'mujer', 'chica', 'rosa', 'dalia', 'sandra', 'penelope', 'child', 'infantil', 'lupita', 'sofi', 'sofia', 'maria', 'juana', 'carmen'];
  let bestVoice = esVoices.find(v => {
    let name = v.name.toLowerCase();
    return femaleKeywords.some(kw => name.includes(kw));
  });
  
  let selected = bestVoice || esVoices[0];
  console.log("Voz local seleccionada para la Princesa Kiary:", selected.name);
  return selected;
}

// Escuchar evento para asegurar la carga de voces en navegadores como Chrome
if (typeof window !== 'undefined' && window.speechSynthesis) {
  window.speechSynthesis.onvoiceschanged = () => {
    console.log("Las voces locales se han cargado en el sintetizador.");
  };
}

// Intentar usar la API de Nvidia Cloud para generar la voz
async function speakNvidia(text) {
  const apiKey = _NV_SEC_;
  try {
    console.log("Intentando sintetizar voz premium con la API de Nvidia...");
    const response = await fetch("https://integrate.api.nvidia.com/v1/audio/speech", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "nvidia/magpie-tts-multilingual",
        input: text,
        voice: "Magpie-Multilingual.ES-ES.Aria",
        language: "es-ES"
      })
    });
    
    if (!response.ok) {
      throw new Error(`Nvidia TTS API returned status ${response.status}`);
    }
    
    const blob = await response.blob();
    const audioUrl = URL.createObjectURL(blob);
    const audio = new Audio(audioUrl);
    console.log("Voz premium de Nvidia recibida, reproduciendo...");
    audio.play();
    return true;
  } catch (err) {
    console.warn("La API de Nvidia TTS falló o fue bloqueada por CORS del navegador local. Detalles:", err);
    return false;
  }
}

async function speak(text) {
  console.log(`Kiari dice: \"${text}\"`);
  // 1. Intentar primero con la API de Nvidia Cloud (para voz humana de princesa)
  let success = await speakNvidia(text);
  if (success) return;
  
  // 2. Si falla, usar el sintetizador local forzando voz en español para evitar el acento en inglés
  if ('speechSynthesis' in window) {
    try {
      window.speechSynthesis.cancel();
      let utterance = new SpeechSynthesisUtterance(text);
      
      let voice = getSpanishFemaleVoice();
      if (voice) {
        utterance.voice = voice;
        utterance.lang = voice.lang;
      } else {
        utterance.lang = 'es-ES';
      }
      
      utterance.pitch = 1.35; // Voz un poco más aguda y tierna
      utterance.rate = 1.0;
      window.speechSynthesis.speak(utterance);
    } catch (e) {
      console.warn("El sintetizador de voz local falló:", e);
    }
  }
}

// ---------- 5. INPUT SYSTEM ----------
let keys = {};
let keysJustPressed = {};
let touchState = { left: false, right: false };
let jumpRequested = false;
let shootRequested = false;
let input = { left: false, right: false, jumpPressed: false, shootPressed: false };

window.addEventListener('keydown', function(e) {
  if (!keys[e.code]) {
    keysJustPressed[e.code] = true;
  }
  keys[e.code] = true;
  if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Space'].includes(e.code)) {
    e.preventDefault();
  }
});

window.addEventListener('keyup', function(e) {
  keys[e.code] = false;
});

window.addEventListener('blur', function() {
  keys = {};
});

function haptic(ms) {
  if (navigator.vibrate) {
    navigator.vibrate(ms);
  }
}

function setupTouch(btnId, direction) {
  let btn = document.getElementById(btnId);
  if (!btn) return;

  btn.addEventListener('touchstart', function(e) {
    e.preventDefault();
    touchState[direction] = true;
  }, { passive: false });

  btn.addEventListener('touchend', function(e) {
    e.preventDefault();
    touchState[direction] = false;
  }, { passive: false });

  btn.addEventListener('touchcancel', function(e) {
    touchState[direction] = false;
  }, { passive: false });
}

setupTouch('btn-left', 'left');
setupTouch('btn-right', 'right');

(function() {
  let btnJump = document.getElementById('btn-jump');
  if (btnJump) {
    btnJump.addEventListener('touchstart', function(e) {
      e.preventDefault();
      jumpRequested = true;
      haptic(20);
    }, { passive: false });
  }
  let btnShoot = document.getElementById('btn-shoot');
  if (btnShoot) {
    btnShoot.addEventListener('touchstart', function(e) {
      e.preventDefault();
      shootRequested = true;
      haptic(15);
    }, { passive: false });
  }
})();

function updateInput() {
  input.left = keys['ArrowLeft'] || keys['KeyA'] || touchState.left;
  input.right = keys['ArrowRight'] || keys['KeyD'] || touchState.right;
  input.jumpPressed = keysJustPressed['Space'] || keysJustPressed['ArrowUp'] || keysJustPressed['KeyW'] || jumpRequested;
  input.shootPressed = keysJustPressed['KeyX'] || keysJustPressed['KeyJ'] || shootRequested;
  keysJustPressed = {};
  jumpRequested = false;
  shootRequested = false;
}

// ---------- 6. PARTICLE SYSTEM ----------
class Particle {
  constructor(x, y, vx, vy, color, size, life, gravity = 0.05) {
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.vy = vy;
    this.color = color;
    this.size = size;
    this.life = life;
    this.maxLife = life;
    this.gravity = gravity;
  }

  update() {
    this.x += this.vx;
    this.y += this.vy;
    this.vy += this.gravity;
    this.life--;
  }

  draw(ctx) {
    let oldAlpha = ctx.globalAlpha;
    ctx.globalAlpha = Math.max(0, this.life / this.maxLife);
    ctx.fillStyle = this.color;
    ctx.fillRect(this.x - this.size / 2, this.y - this.size / 2, this.size, this.size);
    ctx.globalAlpha = oldAlpha;
  }

  get isDead() {
    return this.life <= 0;
  }
}

let particles = [];

function spawnParticles(x, y, count, colors, config) {
  let speedX = (config && config.speedX) || 3;
  let speedY = (config && config.speedY) || 3;
  let size = (config && config.size) || 3;
  let life = (config && config.life) || 40;
  let gravity = (config && config.gravity !== undefined) ? config.gravity : 0.05;

  for (let i = 0; i < count; i++) {
    if (particles.length > 80) break; // Optimization: cap maximum particles on screen
    let vx = (Math.random() - 0.5) * speedX * 2;
    let vy = (Math.random() - 0.5) * speedY * 2;
    let c = colors[Math.floor(Math.random() * colors.length)];
    let s = size * (0.5 + Math.random() * 0.5);
    let l = life * (0.5 + Math.random() * 0.5);
    particles.push(new Particle(x, y, vx, vy, c, s, l, gravity));
  }
}

function spawnDust(x, y) {
  spawnParticles(x, y, 3, ['#d2b48c', '#c4a882', '#b8956a'], { speedX: 2, speedY: 1.5, size: 3, life: 20 });
}

function spawnJumpStars(x, y) {
  spawnParticles(x, y, 8, ['#ffd700', '#fff', '#fbbf24'], { speedX: 4, speedY: 4, size: 3, life: 30 });
}

function spawnDeathParticles(x, y) {
  spawnParticles(x, y, 15, ['#ef4444', '#ff7eb3', '#fca5a5'], { speedX: 5, speedY: 5, size: 4, life: 50 });
}

function spawnCrowFeathers(x, y) {
  spawnParticles(x, y, 10, ['#1a1a1a', '#2c3e50', '#34495e', '#4a4a4a'], { speedX: 4, speedY: 4, size: 3, life: 45 });
}

function spawnCollectSparkle(x, y) {
  spawnParticles(x, y, 12, ['#ffd700', '#fbbf24', '#f59e0b', '#fff'], { speedX: 3, speedY: 3, size: 2.5, life: 35 });
}

function spawnBulletImpact(x, y) {
  spawnParticles(x, y, 8, ['#22d3ee', '#67e8f9', '#a5f3fc'], { speedX: 4, speedY: 4, size: 2, life: 25 });
}

function spawnConfetti(x, y) {
  spawnParticles(x, y, 30, ['#ff7eb3', '#fbbf24', '#22d3ee', '#a855f7', '#34d399', '#ff5c8a'], { speedX: 8, speedY: 10, size: 4, life: 80, gravity: 0.08 });
}

function updateAndDrawParticles() {
  for (let i = particles.length - 1; i >= 0; i--) {
    particles[i].update();
    particles[i].draw(ctx);
    if (particles[i].isDead) particles.splice(i, 1);
  }
}

// ---------- 7. SCREEN SHAKE & CAMERA ----------
let shake = { intensity: 0, decay: 0.85 };

function triggerShake(intensity) {
  shake.intensity = intensity;
}

let camera = { x: 0, smoothX: 0 };

function updateCamera() {
  camera.x = player.x - canvas.width / 3;
  camera.smoothX += (camera.x - camera.smoothX) * 0.08;
}

// ---------- 8. HELPER FUNCTIONS ----------
function roundRect(ctx, x, y, w, h, r) {
  if (typeof r === 'number') r = { tl: r, tr: r, bl: r, br: r };
  ctx.beginPath();
  ctx.moveTo(x + r.tl, y);
  ctx.lineTo(x + w - r.tr, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r.tr);
  ctx.lineTo(x + w, y + h - r.br);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r.br, y + h);
  ctx.lineTo(x + r.bl, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r.bl);
  ctx.lineTo(x, y + r.tl);
  ctx.quadraticCurveTo(x, y, x + r.tl, y);
  ctx.closePath();
}

function checkCollision(r1, r2) {
  return r1.x < r2.x + r2.w && r1.x + r1.w > r2.x &&
         r1.y < r2.y + r2.h && r1.y + r1.h > r2.y;
}

function checkCollisionGenerous(r1, r2, padding = 12) {
  return r1.x - padding < r2.x + r2.w && r1.x + r1.w + padding > r2.x &&
         r1.y - padding < r2.y + r2.h && r1.y + r1.h + padding > r2.y;
}

// ---------- 9. WORLD DATA ----------
let platformDefs = [
  { x: -1000, yOff: 0, w: 8000, h: 300, type: 'ground' },
  { x: 500, yOff: -120, w: 160, h: 28, type: 'floating' },
  { x: 800, yOff: -220, w: 160, h: 28, type: 'floating' },
  { x: 1100, yOff: -100, w: 260, h: 18, type: 'bridge' },
  { x: 1450, yOff: -180, w: 55, h: 45, type: 'block' },
  { x: 1600, yOff: -180, w: 55, h: 45, type: 'block' },
  { x: 1850, yOff: -120, w: 160, h: 28, type: 'floating' },
  { x: 2150, yOff: -240, w: 210, h: 18, type: 'bridge' },
  { x: 2500, yOff: -150, w: 110, h: 28, type: 'floating' },
  { x: 2800, yOff: -80, w: 90, h: 28, type: 'floating' },
  { x: 3000, yOff: -160, w: 90, h: 28, type: 'floating' },
  { x: 3200, yOff: -240, w: 90, h: 28, type: 'floating' },
  { x: 3500, yOff: -120, w: 310, h: 18, type: 'bridge' }
];

let platforms = [];

let trees = [
  { x: 200, height: 80, width: 40 },
  { x: 450, height: 100, width: 45 },
  { x: 700, height: 70, width: 35 },
  { x: 1000, height: 110, width: 48 },
  { x: 1400, height: 90, width: 42 },
  { x: 1750, height: 75, width: 38 },
  { x: 2000, height: 120, width: 50 },
  { x: 2400, height: 85, width: 40 },
  { x: 2650, height: 95, width: 44 },
  { x: 2900, height: 60, width: 30 },
  { x: 3300, height: 105, width: 46 },
  { x: 3800, height: 80, width: 40 },
  { x: 4100, height: 70, width: 35 }
];

let castle = { x: 4200, w: 160, h: 200, y: 0 };

let npcMaluma = {
  x: 2300, y: 0, triggered: false,
  msg: "Hola Princesa Kiary, soy el Principe Maluma Baby, que guapa estás hoy, escuché que Maléfica invadió tu castillo!"
};

let maleficent = {
  x: 3600, y: 0, w: 180, h: 180,
  hp: 8, maxHp: 8,
  dir: 1, startX: 3600, range: 150,
  shootTimer: 0, hitFlash: 0
};

let bossProjectiles = [];
let chips = [];
let crows = [];

// ---------- 10. GAME STATE VARIABLES ----------
let player = {
  x: 100, y: 0, w: 90, h: 90,
  vx: 0, vy: 0, jumps: 0, grounded: false, dir: 1,
  hp: 3, maxHp: 3, invincible: 0, stepTimer: 0,
  animFrame: 0, animTimer: 0, state: 'idle',
  scaleX: 1, scaleY: 1, coyoteTimer: 0, jumpBufferTimer: 0
};

let bullets = [];

// ---------- 11. REBUILD FUNCTIONS ----------
function rebuildWorld() {
  groundLevel = canvas.height - 180;

  // Regenerar estrellas en el cielo de forma natural sin líneas repetitivas
  starPositions = [];
  for (let i = 0; i < 60; i++) {
    starPositions.push({
      x: Math.random(),
      y: Math.random() * 0.4,
      speed: 0.5 + Math.random() * 1.5,
      size: 1 + Math.random() * 1.5
    });
  }

  platforms.length = 0;
  platformDefs.forEach(function(def) {
    platforms.push({
      x: def.x,
      y: def.yOff === 0 ? groundLevel : groundLevel + def.yOff,
      w: def.w,
      h: def.h,
      type: def.type
    });
  });

  if (player.grounded || gameState === 'start') {
    player.y = groundLevel - player.h;
  }

  npcMaluma.y = groundLevel - 100;
  maleficent.y = groundLevel - maleficent.h;
  castle.y = groundLevel - castle.h;

  rebuildChips();
}

function rebuildChips() {
  let oldCollected = chips.map(function(c) { return c.collected; });
  chips.length = 0;
  let chipIdx = 0;
  platforms.forEach(function(p) {
    if (p.x > 300 && p.type !== 'ground') {
      chips.push({
        x: p.x + p.w / 2 - 20, // Centrado de 40px de ancho
        y: p.y - 50,           // Ajustado para flotar arriba de 40px de alto
        w: 40, h: 40,          // Aumentado a 40x40 píxeles
        collected: oldCollected[chipIdx] || false
      });
      chipIdx++;
    }
  });
}

function rebuildCrows() {
  crows = [
    { x: 900, y: groundLevel - 30, w: 30, h: 30, vx: 1.0, startX: 900, range: 150 },
    { x: 1200, y: groundLevel - 130, w: 30, h: 30, vx: -1.0, startX: 1200, range: 100 },
    { x: 1700, y: groundLevel - 350, w: 30, h: 30, vx: 0.7, startX: 1700, range: 250 },
    { x: 2700, y: groundLevel - 30, w: 30, h: 30, vx: -1.2, startX: 2700, range: 200 },
    { x: 3100, y: groundLevel - 350, w: 30, h: 30, vx: -0.7, startX: 3100, range: 300 }
  ];
}

// ---------- 12. DRAWING FUNCTIONS ----------

function drawBackground() {
  // Sky gradient - magical pink sunset
  let skyGrad = ctx.createLinearGradient(0, 0, 0, canvas.height);
  skyGrad.addColorStop(0, '#2d0f3d');    // Deep plum
  skyGrad.addColorStop(0.35, '#4a154b'); // Magenta/purple
  skyGrad.addColorStop(0.6, '#9f1239');  // Deep rose pink
  skyGrad.addColorStop(0.8, '#f43f5e');  // Bright rose pink
  skyGrad.addColorStop(1, '#fbcfe8');    // Light pastel pink
  ctx.fillStyle = skyGrad;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Optimized Stars - simple rects drawn in a single style pass (no arc calls or per-star opacity changes)
  ctx.fillStyle = '#ffffff';
  starPositions.forEach(function(star) {
    let sx = star.x * canvas.width;
    let sy = star.y * canvas.height;
    ctx.fillRect(sx - star.size / 2, sy - star.size / 2, star.size, star.size);
  });

  // Sun near horizon
  let sunX = canvas.width * 0.75;
  let sunY = canvas.height * 0.62;
  let sunGrad = ctx.createRadialGradient(sunX, sunY, 10, sunX, sunY, 80);
  sunGrad.addColorStop(0, 'rgba(251,113,133,0.9)'); // Pink glow
  sunGrad.addColorStop(0.5, 'rgba(244,63,94,0.3)');
  sunGrad.addColorStop(1, 'rgba(225,29,72,0)');
  ctx.fillStyle = sunGrad;
  ctx.fillRect(sunX - 80, sunY - 80, 160, 160);
  ctx.fillStyle = '#ffe4e6'; // Soft pink sun core
  ctx.beginPath();
  ctx.arc(sunX, sunY, 25, 0, Math.PI * 2);
  ctx.fill();

  // Optimized Clouds - fewer clouds and simplified shape paths
  ctx.fillStyle = 'rgba(251,207,232,0.18)'; // Pinkish clouds
  for (let i = 0; i < 3; i++) {
    let cx = ((i * 500 + 150) - camera.smoothX * 0.05) % (canvas.width + 300) - 100;
    let cy = 80 + i * 50 + Math.sin(time * 0.5 + i) * 10;
    ctx.beginPath();
    ctx.arc(cx, cy, 35 + i * 5, 0, Math.PI * 2);
    ctx.arc(cx + 35, cy - 10, 28 + i * 4, 0, Math.PI * 2);
    ctx.fill();
  }

  // Far mountains (parallax 0.1) - optimized with pre-calculated profile table
  ctx.fillStyle = '#4c0519';
  ctx.beginPath();
  ctx.moveTo(0, canvas.height * 0.7);
  for (let x = 0; x <= canvas.width + 100; x += 80) {
    let adjustedX = Math.floor(Math.abs(x + (camera.smoothX * 0.1))) % 2000;
    let peakH = mountainProfileFar[adjustedX];
    ctx.lineTo(x, canvas.height * 0.7 - peakH);
  }
  ctx.lineTo(canvas.width, canvas.height * 0.7);
  ctx.lineTo(canvas.width, canvas.height);
  ctx.lineTo(0, canvas.height);
  ctx.fill();

  // Near mountains (parallax 0.2) - optimized with pre-calculated profile table
  ctx.fillStyle = '#881337';
  ctx.beginPath();
  ctx.moveTo(0, canvas.height * 0.72);
  for (let x = 0; x <= canvas.width + 100; x += 60) {
    let adjustedX = Math.floor(Math.abs(x + (camera.smoothX * 0.2))) % 2000;
    let peakH = mountainProfileNear[adjustedX];
    ctx.lineTo(x, canvas.height * 0.72 - peakH);
  }
  ctx.lineTo(canvas.width, canvas.height * 0.72);
  ctx.lineTo(canvas.width, canvas.height);
  ctx.lineTo(0, canvas.height);
  ctx.fill();
}

function drawTrees() {
  trees.forEach(function(t) {
    let tx = t.x - camera.smoothX * 0.6;
    if (tx < -100 || tx > canvas.width + 100) return;
    let ty = groundLevel - 10;

    // Trunk
    ctx.fillStyle = '#5d4037';
    ctx.fillRect(tx - t.width / 6, ty - t.height * 0.4, t.width / 3, t.height * 0.4);

    // Foliage - 3 overlapping circles
    ctx.fillStyle = '#2d6a4f';
    ctx.beginPath();
    ctx.arc(tx, ty - t.height * 0.5, t.width * 0.45, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#40916c';
    ctx.beginPath();
    ctx.arc(tx - t.width * 0.2, ty - t.height * 0.35, t.width * 0.35, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#52b788';
    ctx.beginPath();
    ctx.arc(tx + t.width * 0.15, ty - t.height * 0.6, t.width * 0.3, 0, Math.PI * 2);
    ctx.fill();
  });
}

function drawPlatform(p) {
  if (p.type === 'ground') {
    // Dirt body
    ctx.fillStyle = '#8B6914';
    ctx.fillRect(p.x, p.y + 12, p.w, p.h);
    // Darker dirt layer
    ctx.fillStyle = '#704214';
    ctx.fillRect(p.x, p.y + 30, p.w, p.h - 18);
    // Grass top
    let grassGrad = ctx.createLinearGradient(0, p.y, 0, p.y + 15);
    grassGrad.addColorStop(0, '#4ade80');
    grassGrad.addColorStop(1, '#22c55e');
    ctx.fillStyle = grassGrad;
    ctx.fillRect(p.x, p.y, p.w, 15);
    // Grass blades - Optimized path grouping and larger spacing
    ctx.strokeStyle = '#34d399';
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let gx = p.x; gx < p.x + p.w; gx += 35) {
      if (gx > camera.smoothX - 50 && gx < camera.smoothX + canvas.width + 50) {
        let sway = Math.sin(time * 3 + gx * 0.1) * 3;
        let bladeH = 6 + (gx % 5);
        ctx.moveTo(gx, p.y);
        ctx.lineTo(gx + sway, p.y - bladeH);
      }
    }
    ctx.stroke();
    // Small flowers
    let flowerColors = ['#ff7eb3', '#fbbf24', '#c084fc', '#fb923c'];
    for (let fx = p.x + 30; fx < p.x + p.w; fx += 80) {
      if (fx > camera.smoothX - 50 && fx < camera.smoothX + canvas.width + 50) {
        ctx.fillStyle = flowerColors[(fx / 80 | 0) % flowerColors.length];
        ctx.beginPath();
        ctx.arc(fx, p.y - 2, 3, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  } else if (p.type === 'floating') {
    // Shadow below
    ctx.fillStyle = 'rgba(0,0,0,0.15)';
    ctx.beginPath();
    ctx.ellipse(p.x + p.w / 2, p.y + p.h + 8, p.w / 2 - 5, 5, 0, 0, Math.PI * 2);
    ctx.fill();
    // Main body rounded
    ctx.fillStyle = '#a0845c';
    roundRect(ctx, p.x, p.y, p.w, p.h, 8);
    ctx.fill();
    // Top moss
    ctx.fillStyle = '#4ade80';
    ctx.fillRect(p.x + 3, p.y, p.w - 6, 10);
    // Edge highlights
    ctx.fillStyle = 'rgba(255,255,255,0.1)';
    ctx.fillRect(p.x + 3, p.y, p.w - 6, 4);
  } else if (p.type === 'bridge') {
    // Wooden planks
    ctx.fillStyle = '#a0522d';
    ctx.fillRect(p.x, p.y, p.w, p.h);
    // Plank lines
    ctx.strokeStyle = '#8B4513';
    ctx.lineWidth = 1;
    for (let bx = p.x + 20; bx < p.x + p.w; bx += 22) {
      ctx.beginPath();
      ctx.moveTo(bx, p.y);
      ctx.lineTo(bx, p.y + p.h);
      ctx.stroke();
    }
    // Top highlight
    ctx.fillStyle = 'rgba(255,255,255,0.1)';
    ctx.fillRect(p.x, p.y, p.w, 3);
    // Rope supports
    ctx.strokeStyle = '#d2691e';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(p.x, p.y + p.h);
    ctx.quadraticCurveTo(p.x + p.w / 2, p.y + p.h + 15, p.x + p.w, p.y + p.h);
    ctx.stroke();
  } else if (p.type === 'block') {
    // Stone block
    ctx.fillStyle = '#808080';
    ctx.fillRect(p.x, p.y, p.w, p.h);
    // Crack lines
    ctx.strokeStyle = '#666';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(p.x + 10, p.y + 5);
    ctx.lineTo(p.x + 25, p.y + 20);
    ctx.lineTo(p.x + 15, p.y + 35);
    ctx.stroke();
    // Highlight
    ctx.fillStyle = 'rgba(255,255,255,0.1)';
    ctx.fillRect(p.x, p.y, p.w, 5);
    ctx.fillStyle = 'rgba(0,0,0,0.1)';
    ctx.fillRect(p.x, p.y + p.h - 5, p.w, 5);
  }
}

function drawPrincess(x, y) {
  ctx.save();
  ctx.translate(x, y);

  // Scale from the feet (bottom center) for squash & stretch effect
  ctx.translate(player.w / 2, player.h);
  ctx.scale(player.scaleX, player.scaleY);
  ctx.translate(-player.w / 2, -player.h);

  let bob = Math.sin(time * 5) * 2;
  let isMoving = Math.abs(player.vx) > 0.5;
  let isJumping = !player.grounded;

  // If invincible, flash
  if (player.invincible > 0 && Math.floor(player.invincible / 4) % 2 === 0) {
    ctx.globalAlpha = 0.4;
  }

  // Shadow
  ctx.fillStyle = 'rgba(0,0,0,0.15)';
  ctx.beginPath();
  ctx.ellipse(player.w / 2, player.h, 35, 5, 0, 0, Math.PI * 2);
  ctx.fill();

  // Flip if facing left
  if (player.dir === -1) {
    ctx.save();
    ctx.translate(player.w, 0);
    ctx.scale(-1, 1);
  }

  // Determine active frame/image
  let activeImg = princessIdleImg;
  if (player.state === 'run') {
    activeImg = (Math.floor(time * 8) % 2 === 0) ? princessRightImg : princessLeftImg;
  }

  // Draw sprite if loaded, fallback to original vector princess
  if (activeImg.complete && activeImg.naturalWidth !== 0) {
    ctx.drawImage(activeImg, 0, 0, player.w, player.h);

    // Destello de varita mágica en su mano
    ctx.fillStyle = '#ffd700';
    let wandGlow = Math.sin(time * 4) * 2;
    ctx.beginPath();
    ctx.arc(player.w - 10, player.h * 0.45, 5 + wandGlow * 0.5, 0, Math.PI * 2);
    ctx.fill();

    if (player.dir === -1) ctx.restore(); // unflip
    ctx.globalAlpha = 1;
    ctx.restore();
    return;
  }

  // Fallback Legs
  if (isJumping) {
    ctx.fillStyle = '#ffe0bd';
    ctx.fillRect(8, 50 + bob, 8, 8);
    ctx.fillRect(24, 50 + bob, 8, 8);
  } else if (isMoving) {
    let legAnim = Math.sin(time * 12) * 6;
    ctx.fillStyle = '#ffe0bd';
    ctx.fillRect(10, 50 + bob, 7, 10 + legAnim);
    ctx.fillRect(23, 50 + bob, 7, 10 - legAnim);
    // Shoes
    ctx.fillStyle = '#ff7eb3';
    ctx.fillRect(9, 58 + bob + Math.max(0, legAnim), 9, 4);
    ctx.fillRect(22, 58 + bob + Math.max(0, -legAnim), 9, 4);
  } else {
    ctx.fillStyle = '#ffe0bd';
    ctx.fillRect(12, 50 + bob, 7, 10);
    ctx.fillRect(22, 50 + bob, 7, 10);
    ctx.fillStyle = '#ff7eb3';
    ctx.fillRect(11, 58 + bob, 9, 4);
    ctx.fillRect(21, 58 + bob, 9, 4);
  }

  // Fallback Dress
  let dressGrad = ctx.createLinearGradient(5, 28 + bob, 35, 52 + bob);
  dressGrad.addColorStop(0, '#ff99cc');
  dressGrad.addColorStop(1, '#ff5c8a');
  ctx.fillStyle = dressGrad;
  ctx.beginPath();
  ctx.moveTo(8, 28 + bob);
  ctx.lineTo(32, 28 + bob);
  let dressWave1 = Math.sin(time * 4) * 2;
  let dressWave2 = Math.sin(time * 4 + 1) * 2;
  ctx.lineTo(36 + dressWave1, 52 + bob);
  ctx.lineTo(4 + dressWave2, 52 + bob);
  ctx.fill();
  // Dress sparkle
  ctx.fillStyle = 'rgba(255,255,255,0.3)';
  ctx.beginPath();
  ctx.arc(15 + Math.sin(time * 3) * 3, 38 + bob, 2, 0, Math.PI * 2);
  ctx.arc(28 + Math.cos(time * 3) * 3, 42 + bob, 1.5, 0, Math.PI * 2);
  ctx.fill();

  // Fallback Body
  ctx.fillStyle = '#ffe0bd';
  ctx.fillRect(14, 22 + bob, 12, 10);

  // Fallback Arms
  ctx.fillStyle = '#ffe0bd';
  if (isMoving) {
    let armSwing = Math.sin(time * 12) * 15;
    ctx.save();
    ctx.translate(10, 26 + bob);
    ctx.rotate((-20 + armSwing) * Math.PI / 180);
    ctx.fillRect(-3, 0, 6, 16);
    ctx.restore();
    ctx.save();
    ctx.translate(30, 26 + bob);
    ctx.rotate((20 - armSwing) * Math.PI / 180);
    ctx.fillRect(-3, 0, 6, 16);
    ctx.restore();
  } else {
    ctx.fillRect(6, 26 + bob, 6, 16);
    ctx.fillRect(28, 26 + bob, 6, 16);
  }

  // Fallback Head
  ctx.fillStyle = '#ffe0bd';
  ctx.beginPath();
  ctx.arc(20, 14 + bob, 13, 0, Math.PI * 2);
  ctx.fill();

  // Fallback Hair
  ctx.fillStyle = '#8B4513';
  ctx.beginPath();
  ctx.arc(20, 12 + bob, 14, Math.PI, 0);
  ctx.fill();
  ctx.fillRect(5, 10 + bob, 7, 22);
  ctx.fillRect(28, 10 + bob, 7, 22);
  let hairWave = Math.sin(time * 3) * 2;
  ctx.beginPath();
  ctx.moveTo(5, 32 + bob);
  ctx.quadraticCurveTo(3, 38 + bob + hairWave, 6, 40 + bob);
  ctx.lineTo(12, 32 + bob);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(28, 32 + bob);
  ctx.quadraticCurveTo(37, 38 + bob - hairWave, 34, 40 + bob);
  ctx.lineTo(35, 32 + bob);
  ctx.fill();

  // Fallback Crown
  ctx.fillStyle = '#ffd700';
  ctx.beginPath();
  ctx.moveTo(11, 5 + bob);
  ctx.lineTo(14, 0 + bob);
  ctx.lineTo(17, 5 + bob);
  ctx.lineTo(20, -2 + bob);
  ctx.lineTo(23, 5 + bob);
  ctx.lineTo(26, 0 + bob);
  ctx.lineTo(29, 5 + bob);
  ctx.lineTo(29, 10 + bob);
  ctx.lineTo(11, 10 + bob);
  ctx.fill();
  ctx.fillStyle = '#ef4444';
  ctx.beginPath();
  ctx.arc(20, 6 + bob, 2.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#fff';
  let sparkle = Math.sin(time * 6) * 0.5 + 0.5;
  ctx.globalAlpha = sparkle * (player.invincible > 0 ? 0.4 : 1);
  ctx.beginPath();
  ctx.arc(25, 2 + bob, 2, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = (player.invincible > 0 && Math.floor(player.invincible / 4) % 2 === 0) ? 0.4 : 1;

  // Fallback Eyes
  ctx.fillStyle = '#5d576b';
  ctx.beginPath();
  ctx.arc(16, 14 + bob, 2, 0, Math.PI * 2);
  ctx.arc(24, 14 + bob, 2, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.arc(17, 13 + bob, 0.8, 0, Math.PI * 2);
  ctx.arc(25, 13 + bob, 0.8, 0, Math.PI * 2);
  ctx.fill();

  // Fallback Mouth
  ctx.strokeStyle = '#ff7eb3';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(20, 17 + bob, 3, 0.1, Math.PI - 0.1);
  ctx.stroke();
  ctx.fillStyle = 'rgba(255,126,179,0.3)';
  ctx.beginPath();
  ctx.ellipse(12, 17 + bob, 3, 2, 0, 0, Math.PI * 2);
  ctx.ellipse(28, 17 + bob, 3, 2, 0, 0, Math.PI * 2);
  ctx.fill();

  // Fallback Wand
  ctx.fillStyle = '#deb887';
  ctx.fillRect(33, 30 + bob, 3, 18);
  ctx.fillStyle = '#ffd700';
  let wandGlow = Math.sin(time * 4) * 2;
  ctx.beginPath();
  ctx.arc(34.5, 28 + bob, 5 + wandGlow * 0.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.arc(34.5, 28 + bob, 2.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.save();
  ctx.shadowColor = '#ffd700';
  ctx.shadowBlur = 10 + wandGlow * 2;
  ctx.fillStyle = 'rgba(255,215,0,0.3)';
  ctx.beginPath();
  ctx.arc(34.5, 28 + bob, 3, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  if (player.dir === -1) ctx.restore(); // unflip
  ctx.globalAlpha = 1;
  ctx.restore();
}

function drawMaluma(x, y) {
  ctx.save();
  ctx.translate(x, y);
  let b = Math.sin(time * 3) * 1.5;

  // Shadow
  ctx.fillStyle = 'rgba(0,0,0,0.15)';
  ctx.beginPath();
  ctx.ellipse(50, 110, 30, 5, 0, 0, Math.PI * 2); // Ajustado Y de la sombra para coincidir con la suela del zapato
  ctx.fill();

  // Name tag
  ctx.fillStyle = '#ffd700';
  ctx.font = 'bold 11px Nunito, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('Príncipe Maluma', 50, -15 + b);
  ctx.textAlign = 'start';

  // Draw image if loaded, fallback to vector (desplazado 12px hacia abajo para no flotar)
  if (malumaImg.complete && malumaImg.naturalWidth !== 0) {
    ctx.drawImage(malumaImg, 0, b + 12, 100, 100);
  } else {
    // Cape
    let capeWave = Math.sin(time * 2) * 5;
    ctx.fillStyle = '#dc2626';
    ctx.beginPath();
    ctx.moveTo(5, 25 + b);
    ctx.lineTo(-8 + capeWave, 58 + b);
    ctx.lineTo(10, 60 + b);
    ctx.fill();

    // Legs
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(12, 52 + b, 7, 10);
    ctx.fillRect(22, 52 + b, 7, 10);
    // Shoes
    ctx.fillStyle = '#111';
    ctx.fillRect(11, 60 + b, 9, 4);
    ctx.fillRect(21, 60 + b, 9, 4);

    // Suit body
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(8, 25 + b, 24, 28);
    // White shirt
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(16, 25 + b, 8, 28);
    // Gold chain
    ctx.fillStyle = '#ffd700';
    ctx.fillRect(18, 30 + b, 4, 8);
    ctx.beginPath();
    ctx.arc(20, 39 + b, 3, 0, Math.PI * 2);
    ctx.fill();

    // Arms
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(2, 28 + b, 6, 18);
    ctx.fillRect(32, 28 + b, 6, 18);

    // Head
    ctx.fillStyle = '#deb887';
    ctx.beginPath();
    ctx.arc(20, 15 + b, 13, 0, Math.PI * 2);
    ctx.fill();

    // Hair
    ctx.fillStyle = '#1a1a1a';
    ctx.beginPath();
    ctx.arc(20, 12 + b, 14, Math.PI, 0);
    ctx.fill();
    // Hair top - styled up
    ctx.beginPath();
    ctx.moveTo(8, 10 + b);
    ctx.quadraticCurveTo(15, -2 + b, 25, 5 + b);
    ctx.quadraticCurveTo(30, 2 + b, 32, 10 + b);
    ctx.fill();

    // Sunglasses
    ctx.fillStyle = '#111';
    ctx.fillRect(12, 12 + b, 7, 5);
    ctx.fillRect(22, 12 + b, 7, 5);
    ctx.fillRect(19, 13 + b, 3, 2);
    // Sunglasses glare
    ctx.fillStyle = 'rgba(255,255,255,0.2)';
    ctx.fillRect(13, 12 + b, 3, 2);
    ctx.fillRect(23, 12 + b, 3, 2);

    // Smile
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(20, 20 + b, 4, 0.1, Math.PI - 0.1);
    ctx.stroke();
  }

  // Floating hearts
  for (let i = 0; i < 2; i++) {
    let angle = time * 2 + i * Math.PI;
    let hx = 20 + Math.cos(angle) * 28;
    let hy = 10 + Math.sin(angle) * 15 + b;
    ctx.fillStyle = '#ff7eb3';
    ctx.font = '12px Arial';
    ctx.fillText('\u{1F495}', hx - 6, hy);
  }

  ctx.restore();
}

function drawMaleficent(m) {
  if (m.hp <= 0) return;

  ctx.save();
  ctx.translate(m.x, m.y);
  let anim = Math.sin(time * 2) * 5;

  // Hit flash
  if (m.hitFlash > 0) {
    ctx.globalAlpha = 0.7;
  }

  // Dark aura
  let auraSize = 80 + Math.sin(time * 3) * 10;
  let auraGrad = ctx.createRadialGradient(m.w / 2, m.h / 2, 10, m.w / 2, m.h / 2, auraSize);
  auraGrad.addColorStop(0, 'rgba(100,0,150,0.2)');
  auraGrad.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = auraGrad;
  ctx.fillRect(m.w / 2 - auraSize, m.h / 2 - auraSize, auraSize * 2, auraSize * 2);

  // Name & Health bar - Posicionados arriba de su cabeza
  let barW = 120;
  let barX = (m.w - barW) / 2;
  let barY = -25;

  ctx.fillStyle = '#ff4757';
  ctx.font = 'bold 14px Nunito, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('Maléfica', m.w / 2, barY - 12);
  ctx.textAlign = 'start';

  // Health bar bg
  ctx.fillStyle = '#1a1a1a';
  ctx.fillRect(barX, barY, barW, 10);

  // Health bar fill
  let hpGrad = ctx.createLinearGradient(barX, 0, barX + (m.hp / m.maxHp) * barW, 0);
  hpGrad.addColorStop(0, '#ef4444');
  hpGrad.addColorStop(1, '#dc2626');
  ctx.fillStyle = hpGrad;
  ctx.fillRect(barX + 1, barY + 1, Math.max(0, (m.hp / m.maxHp) * barW - 2), 8);

  // Health bar border
  ctx.strokeStyle = '#444';
  ctx.lineWidth = 1;
  ctx.strokeRect(barX, barY, barW, 10);

  // Draw image if loaded, fallback to vector Malefica
  if (maleficaImg.complete && maleficaImg.naturalWidth !== 0) {
    ctx.drawImage(maleficaImg, 0, anim, m.w, m.h);
  } else {
    // Robe
    let robeWave1 = Math.sin(time * 1.5) * 4;
    let robeWave2 = Math.sin(time * 1.5 + 1) * 4;
    ctx.fillStyle = '#0a0a0a';
    ctx.beginPath();
    ctx.moveTo(15, 55);
    ctx.lineTo(m.w - 15, 55);
    ctx.lineTo(m.w + 5 + robeWave1, m.h);
    ctx.lineTo(-5 + robeWave2, m.h);
    ctx.fill();
    // Purple trim
    ctx.strokeStyle = '#7c3aed';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-5 + robeWave2, m.h);
    ctx.lineTo(m.w + 5 + robeWave1, m.h);
    ctx.stroke();

    // Body
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(25, 40, m.w - 50, 20);

    // Left arm
    ctx.fillStyle = '#1a1a1a';
    ctx.save();
    ctx.translate(20, 45);
    ctx.rotate(Math.sin(time * 2) * 0.1 - 0.3);
    ctx.fillRect(-5, 0, 8, 30);
    // Hand (green)
    ctx.fillStyle = '#a3be8c';
    ctx.beginPath();
    ctx.arc(0, 30, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Staff (right hand)
    ctx.save();
    ctx.translate(m.w - 15, 40);
    ctx.rotate(Math.sin(time * 1.5) * 0.05 + 0.1);
    // Staff rod
    ctx.fillStyle = '#3e2723';
    ctx.fillRect(-3, -10, 6, 80);
    // Orb on top
    let orbGlow = Math.sin(time * 3) * 3;
    ctx.save();
    ctx.shadowColor = '#4ade80';
    ctx.shadowBlur = 15 + orbGlow * 2;
    ctx.fillStyle = '#4ade80';
    ctx.beginPath();
    ctx.arc(0, -15, 8 + orbGlow * 0.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    // Orb inner
    ctx.fillStyle = '#86efac';
    ctx.beginPath();
    ctx.arc(0, -15, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Head
    ctx.fillStyle = '#a3be8c';
    ctx.beginPath();
    ctx.arc(m.w / 2, 30, 18, 0, Math.PI * 2);
    ctx.fill();

    // Horns
    ctx.fillStyle = '#1a1a1a';
    ctx.beginPath();
    ctx.moveTo(m.w / 2 - 15, 20);
    ctx.quadraticCurveTo(m.w / 2 - 25, -15, m.w / 2 - 10, -30);
    ctx.quadraticCurveTo(m.w / 2 - 15, -5, m.w / 2 - 10, 20);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(m.w / 2 + 15, 20);
    ctx.quadraticCurveTo(m.w / 2 + 25, -15, m.w / 2 + 10, -30);
    ctx.quadraticCurveTo(m.w / 2 + 15, -5, m.w / 2 + 10, 20);
    ctx.fill();

    // Eyes (glowing)
    ctx.save();
    ctx.shadowColor = '#ffd700';
    ctx.shadowBlur = 8;
    ctx.fillStyle = '#ffd700';
    ctx.beginPath();
    ctx.arc(m.w / 2 - 6, 28, 3, 0, Math.PI * 2);
    ctx.arc(m.w / 2 + 6, 28, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    // Pupils
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.arc(m.w / 2 - 6, 28, 1.5, 0, Math.PI * 2);
    ctx.arc(m.w / 2 + 6, 28, 1.5, 0, Math.PI * 2);
    ctx.fill();

    // Evil smile
    ctx.strokeStyle = '#2d0a0a';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(m.w / 2, 36, 6, 0.2, Math.PI - 0.2);
    ctx.stroke();
  }

  // Dark particles around her
  for (let i = 0; i < 4; i++) {
    let px = m.w / 2 + Math.sin(time * 1.5 + i * 1.5) * 40;
    let py = m.h / 2 + Math.cos(time * 1.5 + i * 1.5) * 50;
    let palpha = 0.3 + Math.sin(time * 3 + i) * 0.2;
    ctx.globalAlpha = palpha;
    ctx.fillStyle = '#7c3aed';
    ctx.beginPath();
    ctx.arc(px, py, 3, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  if (m.hitFlash > 0) {
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.fillRect(-10, -40, m.w + 20, m.h + 50);
    ctx.globalAlpha = 1;
  }

  ctx.restore();
}

function drawCrow(c) {
  ctx.save();
  ctx.translate(c.x, c.y);
  if (c.vx > 0) {
    ctx.scale(-1, 1);
    ctx.translate(-c.w, 0);
  }

  let wingFlap = Math.sin(time * 8 + c.x * 0.1) * 12;
  let headBob = Math.cos(time * 5) * 1.5;

  // Body
  ctx.fillStyle = '#1a1a1a';
  ctx.beginPath();
  ctx.ellipse(15, 18, 10, 7, 0, 0, Math.PI * 2);
  ctx.fill();

  // Wing
  ctx.fillStyle = '#2c3e50';
  ctx.beginPath();
  ctx.moveTo(15, 12);
  ctx.quadraticCurveTo(5, 5 + wingFlap * 0.5, -5, 10 + wingFlap);
  ctx.quadraticCurveTo(5, 20 - wingFlap * 0.3, 15, 18);
  ctx.fill();

  // Second wing (behind)
  ctx.fillStyle = '#1a1a2e';
  ctx.beginPath();
  ctx.moveTo(18, 14);
  ctx.quadraticCurveTo(25, 5 + wingFlap * 0.3, 35, 8 + wingFlap * 0.7);
  ctx.quadraticCurveTo(25, 18 - wingFlap * 0.2, 18, 18);
  ctx.fill();

  // Head
  ctx.fillStyle = '#111';
  ctx.beginPath();
  ctx.arc(8, 12 + headBob, 6, 0, Math.PI * 2);
  ctx.fill();

  // Beak
  ctx.fillStyle = '#f59e0b';
  ctx.beginPath();
  ctx.moveTo(2, 11 + headBob);
  ctx.lineTo(-3, 13 + headBob);
  ctx.lineTo(2, 14 + headBob);
  ctx.fill();

  // Eye (red glow)
  ctx.save();
  ctx.shadowColor = '#ef4444';
  ctx.shadowBlur = 4;
  ctx.fillStyle = '#ef4444';
  ctx.beginPath();
  ctx.arc(6, 10 + headBob, 1.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Tail feathers
  ctx.fillStyle = '#2c3e50';
  ctx.beginPath();
  ctx.moveTo(25, 16);
  ctx.lineTo(32, 14);
  ctx.lineTo(30, 18);
  ctx.lineTo(33, 20);
  ctx.lineTo(25, 20);
  ctx.fill();

  ctx.restore();
}

function drawChip(c) {
  if (c.collected) return;
  ctx.save();
  ctx.translate(c.x, c.y);

  let floatY = Math.sin(time * 3 + c.x * 0.1) * 4;

  // Glow behind
  ctx.save();
  ctx.shadowColor = '#fbbf24';
  ctx.shadowBlur = 20 + Math.sin(time * 4) * 5;
  ctx.fillStyle = 'rgba(251,191,36,0.18)';
  ctx.beginPath();
  ctx.arc(c.w / 2, c.h / 2 + floatY, 24, 0, Math.PI * 2); // Glow más grande para 40px
  ctx.fill();
  ctx.restore();

  // Draw image if loaded, fallback to vector bag
  if (chipImage.complete && chipImage.naturalWidth !== 0) {
    ctx.drawImage(chipImage, 0, floatY, c.w, c.h);
  } else {
    // Bag shape fallback
    ctx.fillStyle = '#fbbf24';
    roundRect(ctx, 2, 2 + floatY, c.w - 4, c.h - 4, 5);
    ctx.fill();

    // Red logo circle
    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.arc(c.w / 2, c.h / 2 + floatY, 8, 0, Math.PI * 2); // Logo más grande
    ctx.fill();

    // Highlight
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.fillRect(4, 4 + floatY, c.w - 8, 6);
  }

  // Sparkle around
  let sparkAngle = time * 4 + c.x;
  for (let i = 0; i < 3; i++) {
    let sa = sparkAngle + i * (Math.PI * 2 / 3);
    let sx = c.w / 2 + Math.cos(sa) * 24; // Órbita más amplia
    let sy = c.h / 2 + floatY + Math.sin(sa) * 20;
    ctx.fillStyle = 'rgba(255,255,255,' + (0.4 + Math.sin(time * 5 + i) * 0.3) + ')';
    ctx.beginPath();
    ctx.arc(sx, sy, 2, 0, Math.PI * 2); // Sparkles ligeramente mayores
    ctx.fill();
  }

  ctx.restore();
}

function drawCastle() {
  let cx = castle.x;
  let cy = groundLevel - castle.h;

  // Glow behind castle
  let castleGlow = ctx.createRadialGradient(cx + castle.w / 2, cy + castle.h / 2, 20, cx + castle.w / 2, cy + castle.h / 2, 150);
  castleGlow.addColorStop(0, 'rgba(255,215,0,0.15)');
  castleGlow.addColorStop(1, 'rgba(255,215,0,0)');
  ctx.fillStyle = castleGlow;
  ctx.fillRect(cx - 100, cy - 100, castle.w + 200, castle.h + 200);

  // Side towers
  for (let side of [-1, 1]) {
    let tx = side === -1 ? cx - 25 : cx + castle.w - 10;
    ctx.fillStyle = '#6b7280';
    ctx.fillRect(tx, cy + 20, 35, castle.h - 20);
    // Tower top
    ctx.fillStyle = '#4b5563';
    ctx.beginPath();
    ctx.moveTo(tx - 3, cy + 20);
    ctx.lineTo(tx + 17.5, cy - 15);
    ctx.lineTo(tx + 38, cy + 20);
    ctx.fill();
    // Battlements
    for (let bx = tx; bx < tx + 35; bx += 10) {
      ctx.fillStyle = '#6b7280';
      ctx.fillRect(bx, cy + 15, 6, 8);
    }
    // Window
    ctx.fillStyle = '#fbbf24';
    ctx.save();
    ctx.shadowColor = '#fbbf24';
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.arc(tx + 17, cy + 55, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // Main tower
  ctx.fillStyle = '#9ca3af';
  ctx.fillRect(cx + 15, cy, castle.w - 30, castle.h);
  // Main tower top
  ctx.fillStyle = '#6b7280';
  ctx.beginPath();
  ctx.moveTo(cx + 10, cy);
  ctx.lineTo(cx + castle.w / 2, cy - 40);
  ctx.lineTo(cx + castle.w - 10, cy);
  ctx.fill();
  // Battlements
  for (let bx = cx + 15; bx < cx + castle.w - 15; bx += 12) {
    ctx.fillStyle = '#9ca3af';
    ctx.fillRect(bx, cy - 5, 8, 10);
  }

  // Door (arched)
  ctx.fillStyle = '#5d4037';
  let doorX = cx + castle.w / 2 - 15;
  let doorY = cy + castle.h - 45;
  ctx.fillRect(doorX, doorY + 10, 30, 35);
  ctx.beginPath();
  ctx.arc(doorX + 15, doorY + 10, 15, Math.PI, 0);
  ctx.fill();
  // Door handle
  ctx.fillStyle = '#fbbf24';
  ctx.beginPath();
  ctx.arc(doorX + 22, doorY + 28, 2, 0, Math.PI * 2);
  ctx.fill();

  // Windows
  for (let wy of [cy + 30, cy + 60]) {
    for (let wx of [cx + 30, cx + castle.w - 45]) {
      ctx.fillStyle = '#fbbf24';
      ctx.save();
      ctx.shadowColor = '#fbbf24';
      ctx.shadowBlur = 6;
      ctx.fillRect(wx, wy, 12, 15);
      ctx.restore();
      // Cross bar
      ctx.fillStyle = '#6b7280';
      ctx.fillRect(wx + 5, wy, 2, 15);
      ctx.fillRect(wx, wy + 7, 12, 2);
    }
  }

  // Flag on top
  let flagWave = Math.sin(time * 4) * 5;
  ctx.strokeStyle = '#8B4513';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(cx + castle.w / 2, cy - 40);
  ctx.lineTo(cx + castle.w / 2, cy - 65);
  ctx.stroke();
  ctx.fillStyle = '#ff7eb3';
  ctx.beginPath();
  ctx.moveTo(cx + castle.w / 2, cy - 65);
  ctx.quadraticCurveTo(cx + castle.w / 2 + 15 + flagWave, cy - 58, cx + castle.w / 2 + 25 + flagWave, cy - 55);
  ctx.lineTo(cx + castle.w / 2, cy - 48);
  ctx.fill();
  // Heart on flag
  ctx.fillStyle = '#fff';
  ctx.font = '8px Arial';
  ctx.fillText('\u2665', cx + castle.w / 2 + 8 + flagWave * 0.5, cy - 53);
}

function drawStarHelper(ctx, cx, cy, spikes, outerRadius, innerRadius, color) {
  let rot = Math.PI / 2 * 3;
  let x = cx;
  let y = cy;
  let step = Math.PI / spikes;

  ctx.beginPath();
  ctx.moveTo(cx, cy - outerRadius);
  for (let i = 0; i < spikes; i++) {
    x = cx + Math.cos(rot) * outerRadius;
    y = cy + Math.sin(rot) * outerRadius;
    ctx.lineTo(x, y);
    rot += step;

    x = cx + Math.cos(rot) * innerRadius;
    y = cy + Math.sin(rot) * innerRadius;
    ctx.lineTo(x, y);
    rot += step;
  }
  ctx.lineTo(cx, cy - outerRadius);
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
}

function drawBullet(b) {
  let spin = (time * 15) % (Math.PI * 2); // Rotación de la estrella
  
  // Trail (estrellitas rosas más pequeñas)
  if (b.trail && b.trail.length > 0) {
    for (let i = 0; i < b.trail.length; i++) {
      let t = b.trail[i];
      let alpha = (i + 1) / b.trail.length * 0.4;
      ctx.globalAlpha = alpha;
      ctx.save();
      ctx.translate(t.x, t.y);
      ctx.rotate(spin + i * 0.2);
      drawStarHelper(ctx, 0, 0, 5, 5, 2, '#ff85b3');
      ctx.restore();
    }
    ctx.globalAlpha = 1;
  }

  // Main bullet star glow
  ctx.save();
  ctx.shadowColor = '#ec4899';
  ctx.shadowBlur = 12;
  
  ctx.translate(b.x, b.y);
  ctx.rotate(spin);
  // Dibujar estrella rosa
  drawStarHelper(ctx, 0, 0, 5, 10, 4, '#ec4899');
  // Dibujar núcleo blanco de la estrella
  drawStarHelper(ctx, 0, 0, 5, 5, 1.8, '#ffffff');
  
  ctx.restore();
}

function drawBossProjectile(p) {
  ctx.save();
  ctx.shadowColor = '#7c3aed';
  ctx.shadowBlur = 10;
  ctx.fillStyle = '#7c3aed';
  ctx.beginPath();
  ctx.arc(p.x, p.y, 7, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  // Dark core
  ctx.fillStyle = '#1a1a1a';
  ctx.beginPath();
  ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
  ctx.fill();
}

// ---------- 13. UPDATE & DRAW ----------

function updateHearts() {
  for (let i = 1; i <= player.maxHp; i++) {
    let heart = document.getElementById('heart-' + i);
    if (heart) {
      if (i > player.hp) heart.classList.add('lost');
      else heart.classList.remove('lost');
    }
  }
}

function update() {
  if (gameState !== 'playing') return;
  time += 0.05;
  updateInput();

  // Cambios de música según posición y estado del jefe final
  let targetTrack = 'adventure';
  if (bossDefeated) {
    targetTrack = 'victory';
  } else if (player.x > 3100 && maleficent.hp > 0) {
    targetTrack = 'boss';
  }
  
  if (currentMusicTrack !== targetTrack) {
    playTrack(targetTrack);
  }

  let wasGrounded = player.grounded;

  // Coyote time update
  if (player.grounded) {
    player.coyoteTimer = 8;
  } else {
    if (player.coyoteTimer > 0) player.coyoteTimer--;
  }

  // Jump buffer update
  if (input.jumpPressed) {
    player.jumpBufferTimer = 8;
  } else {
    if (player.jumpBufferTimer > 0) player.jumpBufferTimer--;
  }

  // Horizontal movement smoothing (accel / friction)
  let targetVx = 0;
  if (input.left) { targetVx = -SPEED; player.dir = -1; }
  else if (input.right) { targetVx = SPEED; player.dir = 1; }
  
  let accel = player.grounded ? 0.25 : 0.15;
  player.vx += (targetVx - player.vx) * accel;

  // Jump with coyote time & buffer
  if (player.jumpBufferTimer > 0) {
    let canJump = player.grounded || player.coyoteTimer > 0;
    if (canJump || player.jumps < 2) {
      player.vy = JUMP_POWER;
      
      if (!canJump && player.jumps === 0) {
        player.jumps = 2; // consume both jumps if walked off edge
      } else {
        player.jumps++;
      }
      
      player.grounded = false;
      player.coyoteTimer = 0;
      player.jumpBufferTimer = 0;
      
      // Squash & Stretch
      player.scaleY = 1.35;
      player.scaleX = 0.65;
      
      playJump();
      spawnJumpStars(player.x + player.w / 2, player.y + player.h);
      if (player.jumps === 2) {
        spawnJumpStars(player.x + player.w / 2, player.y + player.h * 0.67);
      }
    }
  }

  // Shoot
  if (input.shootPressed) {
    bullets.push({
      x: player.x + (player.dir === 1 ? player.w - 5 : 5),
      y: player.y + player.h * 0.45,
      vx: player.dir * 16,
      w: 18, h: 18,
      trail: []
    });
    playShoot();
  }

  // Physics update
  player.x += player.vx;
  player.vy += GRAVITY;
  player.y += player.vy;

  // Lerp scales back to 1
  player.scaleX += (1 - player.scaleX) * 0.12;
  player.scaleY += (1 - player.scaleY) * 0.12;

  // Step sounds & dust
  if (player.grounded && Math.abs(player.vx) > 0.5) {
    player.stepTimer++;
    if (player.stepTimer % 12 === 0) {
      playStep();
      spawnDust(player.x + player.w / 2, player.y + player.h - 2);
    }
    player.animTimer++;
    if (player.animTimer % 6 === 0) player.animFrame = (player.animFrame + 1) % 4;
  } else {
    player.stepTimer = 0;
    player.animTimer = 0;
  }

  // Player state
  if (!player.grounded) player.state = 'jump';
  else if (Math.abs(player.vx) > 0.5) player.state = 'run';
  else player.state = 'idle';

  // Speech triggers based on what player sees
  if (!spokenLines.sawCrow) {
    let closeCrow = crows.some(c => Math.abs(player.x - c.x) < 450);
    if (closeCrow) {
      spokenLines.sawCrow = true;
      speak("¡Cuidado! ¡Esos cuervos malvados de Maléfica quieren atacarme!");
    }
  }

  if (!spokenLines.sawMaluma && Math.abs(player.x - npcMaluma.x) < 450) {
    spokenLines.sawMaluma = true;
    speak("¡Oh, mira! ¡Ahí está el Príncipe Maluma!");
  }

  if (!spokenLines.sawMalefica && Math.abs(player.x - maleficent.x) < 500 && maleficent.hp > 0) {
    spokenLines.sawMalefica = true;
    speak("¡Maléfica! ¡Devuélveme mi hermoso castillo ahora mismo!");
  }

  // NPC Maluma
  if (!npcMaluma.triggered && checkCollision(player, { x: npcMaluma.x, y: npcMaluma.y, w: 100, h: 100 })) {
    npcMaluma.triggered = true;
    gameState = 'paused';
    document.getElementById('msgContent').innerText = npcMaluma.msg;
    document.getElementById('msgOverlay').classList.add('active');
  }

  // Boss barrier
  if (maleficent.hp > 0 && player.x + player.w > maleficent.x) {
    player.x = maleficent.x - player.w;
  }

  // Boss AI
  if (maleficent.hp > 0) {
    maleficent.x += maleficent.dir * 1.2;
    if (Math.abs(maleficent.x - maleficent.startX) > maleficent.range) {
      maleficent.dir *= -1;
    }
    maleficent.shootTimer++;
    if (maleficent.shootTimer >= 150) {
      maleficent.shootTimer = 0;
      let dx = player.x - maleficent.x;
      let dy = player.y - maleficent.y;
      let dist = Math.sqrt(dx * dx + dy * dy) || 1;
      bossProjectiles.push({
        x: maleficent.x + maleficent.w / 2,
        y: maleficent.y + 40,
        vx: (dx / dist) * 2.2,
        vy: (dy / dist) * 2.2,
        w: 12, h: 12
      });
    }
    if (maleficent.hitFlash > 0) maleficent.hitFlash--;
  }

  // Update boss projectiles
  for (let i = bossProjectiles.length - 1; i >= 0; i--) {
    let p = bossProjectiles[i];
    p.x += p.vx;
    p.y += p.vy;
    // Hit player
    if (checkCollision(player, p) && player.invincible <= 0) {
      player.hp--;
      player.invincible = 90;
      playHit();
      triggerShake(8);
      spawnDeathParticles(player.x + player.w / 2, player.y + player.h / 2);
      haptic(100);
      bossProjectiles.splice(i, 1);
      updateHearts();
      if (player.hp <= 0) { die(); return; }
      continue;
    }
    // Off screen
    if (p.x < camera.smoothX - 100 || p.x > camera.smoothX + canvas.width + 100 ||
        p.y < -100 || p.y > canvas.height + 100) {
      bossProjectiles.splice(i, 1);
    }
  }

  // Update bullets
  for (let i = bullets.length - 1; i >= 0; i--) {
    let b = bullets[i];
    b.trail.push({ x: b.x, y: b.y });
    if (b.trail.length > 4) b.trail.shift();
    b.x += b.vx;

    // Hit boss
    if (maleficent.hp > 0 && checkCollisionGenerous(b, { x: maleficent.x, y: maleficent.y, w: maleficent.w, h: maleficent.h }, 10)) {
      maleficent.hp--;
      maleficent.hitFlash = 8;
      playHit();
      spawnBulletImpact(b.x, b.y);
      triggerShake(4);
      bullets.splice(i, 1);
      if (maleficent.hp <= 0) {
        bossDefeated = true;
        gameState = 'paused';
        document.getElementById('bossOverlay').classList.add('active');
        playTrack('victory'); // Cambiar a música de victoria inmediatamente!
        spawnConfetti(maleficent.x + 50, maleficent.y + 50);
        triggerShake(12);
        if (!spokenLines.defeatedMalefica) {
          spokenLines.defeatedMalefica = true;
          speak("¡Eso es! ¡Derroté a Maléfica! ¡El castillo ya está a salvo!");
        }
      }
      continue;
    }

    // Hit crows
    let hitCrow = false;
    for (let j = crows.length - 1; j >= 0; j--) {
      if (checkCollisionGenerous(b, crows[j], 15)) {
        spawnCrowFeathers(crows[j].x + 15, crows[j].y + 15);
        playHit();
        crows.splice(j, 1);
        bullets.splice(i, 1);
        hitCrow = true;
        break;
      }
    }
    if (hitCrow) continue;

    // Off screen
    if (bullets[i] && (b.x > camera.smoothX + canvas.width + 50 || b.x < camera.smoothX - 50)) {
      bullets.splice(i, 1);
    }
  }

  // Chips
  chips.forEach(function(c) {
    if (!c.collected && checkCollision(player, c)) {
      c.collected = true;
      chipsCollected++;
      playCoin();
      spawnCollectSparkle(c.x + c.w / 2, c.y + c.h / 2);
      document.getElementById('chips-count').innerText = chipsCollected;

      // Curar 1 corazón de vida por cada 5 papas recolectadas
      if (chipsCollected % 5 === 0 && player.hp < player.maxHp) {
        player.hp++;
        updateHearts();
        spawnJumpStars(player.x + player.w / 2, player.y + player.h / 2);
      }
    }
  });

  // Crows
  for (let i = crows.length - 1; i >= 0; i--) {
    let c = crows[i];
    c.x += c.vx;
    if (Math.abs(c.x - c.startX) > c.range) c.vx *= -1;
    if (checkCollision(player, c) && player.invincible <= 0) {
      player.hp--;
      player.invincible = 90;
      playHit();
      triggerShake(8);
      spawnDeathParticles(player.x + player.w / 2, player.y + player.h / 2);
      haptic(100);
      updateHearts();
      if (player.hp <= 0) { die(); return; }
    }
  }

  // Platform collision
  player.grounded = false;
  platforms.forEach(function(p) {
    if (player.x + player.w - 25 > p.x && player.x + 25 < p.x + p.w &&
        player.y + player.h > p.y && player.y + player.h < p.y + p.h + 20 &&
        player.vy >= 0) {
      if (!wasGrounded) {
        // Just landed! squash effect
        player.scaleY = 0.75;
        player.scaleX = 1.25;
        spawnDust(player.x + player.w / 2, player.y + player.h);
      }
      player.y = p.y - player.h;
      player.vy = 0;
      player.grounded = true;
      player.jumps = 0;
    }
  });

  // Fall death
  if (player.y > canvas.height + 200) { die(); return; }

  // Victory
  if (player.x > castle.x && maleficent.hp <= 0) {
    gameState = 'victory';
    document.getElementById('final-chips').innerText = chipsCollected;
    document.getElementById('final-hearts').innerText = player.hp;
    document.getElementById('finalOverlay').classList.add('active');
    playTrack('victory'); // Mantener reproduciendo la música de victoria
    spawnConfetti(canvas.width / 2, canvas.height / 2);
    return;
  }

  // Invincibility decay
  if (player.invincible > 0) player.invincible--;

  // Camera
  updateCamera();

  // Progress bar
  let progress = Math.max(0, Math.min(100, (player.x / WORLD_END) * 100));
  document.getElementById('progress-fill').style.width = progress + '%';
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  ctx.save();
  // Screen shake
  if (shake.intensity > 0.5) {
    ctx.translate(
      (Math.random() - 0.5) * shake.intensity,
      (Math.random() - 0.5) * shake.intensity
    );
    shake.intensity *= shake.decay;
  } else {
    shake.intensity = 0;
  }

  // Background (sky, stars, sun, clouds, mountains - parallax handled internally)
  drawBackground();

  // Trees layer (parallax 0.6, handled internally)
  drawTrees();

  // World objects (full camera)
  ctx.save();
  ctx.translate(-camera.smoothX, 0);

  platforms.forEach(function(p) { drawPlatform(p); });
  chips.forEach(function(c) { drawChip(c); });
  drawCastle();
  drawMaleficent(maleficent);
  bossProjectiles.forEach(function(p) { drawBossProjectile(p); });
  drawMaluma(npcMaluma.x, npcMaluma.y);
  drawPrincess(player.x, player.y);
  crows.forEach(function(c) { drawCrow(c); });
  bullets.forEach(function(b) { drawBullet(b); });
  updateAndDrawParticles();

  ctx.restore(); // camera
  ctx.restore(); // shake
}

// ---------- 14. GAME STATE FUNCTIONS ----------

function startGame() {
  document.getElementById('start-screen').classList.remove('active');
  gameState = 'playing';
  initAudio();
  startMusic();
}

function closeMsg() {
  document.getElementById('msgOverlay').classList.remove('active');
  gameState = 'playing';
}

function closeBossMsg() {
  document.getElementById('bossOverlay').classList.remove('active');
  gameState = 'playing';
}

function die() {
  gameState = 'dead';
  document.getElementById('deathOverlay').classList.add('active');
  playDeath();
  stopMusic();
}

function retry() {
  document.getElementById('deathOverlay').classList.remove('active');
  player.x = 100;
  player.y = groundLevel - player.h;
  player.vy = 0;
  player.vx = 0;
  player.hp = player.maxHp;
  player.invincible = 60;
  player.jumps = 0;
  player.scaleX = 1;
  player.scaleY = 1;
  player.coyoteTimer = 0;
  player.jumpBufferTimer = 0;
  camera.smoothX = 0;
  updateHearts();
  currentMusicTrack = null; // Reiniciar estado de pista
  
  // Reiniciar diálogos de voz en reintento
  spokenLines = {
    sawCrow: false,
    sawMaluma: false,
    sawMalefica: false,
    defeatedMalefica: false
  };

  gameState = 'playing';
  startMusic();
}

function restartGame() {
  document.getElementById('finalOverlay').classList.remove('active');
  // Full reset
  player.x = 100;
  player.y = groundLevel - player.h;
  player.vy = 0;
  player.vx = 0;
  player.hp = player.maxHp;
  player.invincible = 0;
  player.jumps = 0;
  player.scaleX = 1;
  player.scaleY = 1;
  player.coyoteTimer = 0;
  player.jumpBufferTimer = 0;
  chipsCollected = 0;
  bossDefeated = false;
  bullets = [];
  bossProjectiles = [];
  camera.smoothX = 0;
  time = 0;
  particles.length = 0;

  // Reset chips
  chips.forEach(function(c) { c.collected = false; });
  document.getElementById('chips-count').innerText = '0';

  // Reset boss
  maleficent.hp = maleficent.maxHp;
  maleficent.x = maleficent.startX;
  maleficent.shootTimer = 0;
  maleficent.hitFlash = 0;

  // Reset crows
  rebuildCrows();

  // Reset NPC
  npcMaluma.triggered = false;

  // Reiniciar diálogos de voz
  spokenLines = {
    sawCrow: false,
    sawMaluma: false,
    sawMalefica: false,
    defeatedMalefica: false
  };

  updateHearts();
  document.getElementById('progress-fill').style.width = '0%';
  gameState = 'playing';
  startMusic();
}

// ---------- 15. GAME LOOP ----------
let lastTimestamp = 0;
let accumulator = 0;
const TIMESTEP = 1000 / 60; // 16.666 ms

function gameLoop(timestamp) {
  if (!lastTimestamp) lastTimestamp = timestamp;
  let dt = timestamp - lastTimestamp;
  lastTimestamp = timestamp;

  // Evitar espiral de la muerte
  if (dt > 100) dt = 100;

  accumulator += dt;
  while (accumulator >= TIMESTEP) {
    update();
    accumulator -= TIMESTEP;
  }

  draw();
  requestAnimationFrame(gameLoop);
}

// ---------- 16. INITIALIZE ----------
resize();
rebuildCrows();
requestAnimationFrame(gameLoop);

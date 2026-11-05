import * as THREE from 'three';

/*
  MATERIAIS DO PAVILHÃO
  ---------------------
  Todo o acabamento do espaço mora aqui. O resto do código só pede
  criarMaterial('concreto', [largura, altura]) e não sabe de onde vem a textura.

  Tipos aceitos:
    procedural  desenhado por código (padrão de agora), com mapa de relevo gerado junto
    imagem      arquivos reais em /texturas, para quando quiser trocar
    cor         cor lisa
    vidro       vidro translúcido

  Campos:
    escala      quantos metros uma repetição da textura cobre
    aspereza    0 = espelhado, 1 = fosco
    relevo      força do relevo (normal map)

  Exemplo para trocar o piso por uma textura real (PBR):
    piso: {
      tipo: 'imagem',
      cor: 'texturas/piso_cor.jpg',
      normal: 'texturas/piso_normal.jpg',
      rugosidade: 'texturas/piso_rugosidade.jpg',
      escala: 2,
    },
  Texturas gratuitas (CC0): ambientCG e Poly Haven.
*/

export const MATERIAIS = {
  concreto:      { tipo: 'procedural', gerador: 'concreto', tom: '#a39e95', escala: 2.4, aspereza: 0.9,  relevo: 1.1 },
  concretoTeto:  { tipo: 'procedural', gerador: 'concreto', tom: '#8f8a81', escala: 3.0, aspereza: 0.95, relevo: 0.9 },
  piso:          { tipo: 'procedural', gerador: 'pedra',    tom: '#3c3d39', escala: 4.0, aspereza: 0.3,  relevo: 0.5 },
  assoalho:      { tipo: 'procedural', gerador: 'tabuas',   tom: '#4b3325', escala: 2.4, aspereza: 0.5,  relevo: 0.7 },
  grafite:       { tipo: 'procedural', gerador: 'grafite',  tom: '#2a2a2c', escala: 2.5, aspereza: 0.85, relevo: 0.6 },
  grama:         { tipo: 'procedural', gerador: 'grama',    tom: '#56704a', escala: 3.0, aspereza: 1.0,  relevo: 0.9 },
  calcada:       { tipo: 'procedural', gerador: 'calcada',  tom: '#e9e4d9', escala: 3.2, aspereza: 0.75, relevo: 1.4 },
  madeira:       { tipo: 'procedural', gerador: 'tabuas',   tom: '#8a5a32', escala: 1.2, aspereza: 0.6,  relevo: 0.5 },
  moldura:       { tipo: 'cor', cor: '#261e18', aspereza: 0.55 },
  metal:         { tipo: 'cor', cor: '#2b2d2c', aspereza: 0.4, metal: 0.7 },
  vidro:         { tipo: 'vidro', cor: '#d8ebe4', opacidade: 0.07 },
  vidroFachada:  { tipo: 'vidro', cor: '#e3efea', opacidade: 0.07 },
};

const carregador = new THREE.TextureLoader();
const cache = new Map();

export function criarMaterial(nome, tamanho = [1, 1]) {
  const def = MATERIAIS[nome];
  if (!def) throw new Error(`Material "${nome}" não existe em materiais.js`);

  if (def.tipo === 'cor') {
    return new THREE.MeshStandardMaterial({ color: def.cor, roughness: def.aspereza ?? 0.8, metalness: def.metal ?? 0 });
  }

  if (def.tipo === 'vidro') {
    return new THREE.MeshStandardMaterial({
      color: def.cor, transparent: true, opacity: def.opacidade,
      roughness: 0.04, metalness: 0.1, depthWrite: false, envMapIntensity: 2.2,
    });
  }

  const repetir = [tamanho[0] / def.escala, tamanho[1] / def.escala];

  if (def.tipo === 'procedural') {
    const { cor, normal } = telas(def);
    return new THREE.MeshStandardMaterial({
      map: prep(new THREE.CanvasTexture(cor), repetir, true),
      normalMap: prep(new THREE.CanvasTexture(normal), repetir, false),
      normalScale: new THREE.Vector2(def.relevo, def.relevo),
      roughness: def.aspereza,
    });
  }

  if (def.tipo === 'imagem') {
    const mat = new THREE.MeshStandardMaterial({ roughness: 1 });
    mat.map = prep(carregador.load(def.cor), repetir, true);
    if (def.normal) mat.normalMap = prep(carregador.load(def.normal), repetir, false);
    if (def.rugosidade) mat.roughnessMap = prep(carregador.load(def.rugosidade), repetir, false);
    return mat;
  }

  throw new Error(`Tipo de material desconhecido: ${def.tipo}`);
}

function prep(tex, repetir, ehCor) {
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repetir[0], repetir[1]);
  tex.anisotropy = 8;
  if (ehCor) tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function telas(def) {
  const chave = `${def.gerador}:${def.tom}`;
  if (!cache.has(chave)) {
    const gerar = { concreto, pedra, tabuas, grafite, grama, calcada }[def.gerador];
    const cor = gerar(def.tom);
    cache.set(chave, { cor, normal: normalDe(cor) });
  }
  return cache.get(chave);
}

/* ---------- utilidades de desenho ---------- */

function nova(t) {
  const c = document.createElement('canvas');
  c.width = c.height = t;
  return [c, c.getContext('2d', { willReadFrequently: true })];
}

export function aleatorio(semente) {
  let a = semente >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// desenha repetindo nas bordas, para a textura emendar sem costura
function emLoop(t, fn) {
  for (const dx of [-t, 0, t]) for (const dy of [-t, 0, t]) fn(dx, dy);
}

function granular(g, t, intensidade, r) {
  const img = g.getImageData(0, 0, t, t);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const n = (r() - 0.5) * intensidade;
    d[i] += n; d[i + 1] += n; d[i + 2] += n;
  }
  g.putImageData(img, 0, 0);
}

function manchas(g, t, r, n, forca) {
  for (let i = 0; i < n; i++) {
    const x = r() * t, y = r() * t, raio = t * (0.05 + r() * 0.25);
    const claro = r() > 0.5;
    emLoop(t, (dx, dy) => {
      const grad = g.createRadialGradient(x + dx, y + dy, 0, x + dx, y + dy, raio);
      grad.addColorStop(0, claro ? `rgba(255,255,255,${forca})` : `rgba(0,0,0,${forca * 1.2})`);
      grad.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = grad;
      g.fillRect(x + dx - raio, y + dy - raio, raio * 2, raio * 2);
    });
  }
}

// relevo a partir da luminância: partes escuras afundam
function normalDe(cor, forca = 2.5) {
  const t = cor.width;
  const src = cor.getContext('2d').getImageData(0, 0, t, t).data;
  const h = new Float32Array(t * t);
  for (let i = 0; i < t * t; i++) h[i] = (src[i * 4] * 0.3 + src[i * 4 + 1] * 0.59 + src[i * 4 + 2] * 0.11) / 255;
  const [c, g] = nova(t);
  const out = g.createImageData(t, t);
  const d = out.data;
  for (let y = 0; y < t; y++) {
    const ya = ((y - 1 + t) % t) * t, yb = ((y + 1) % t) * t, yc = y * t;
    for (let x = 0; x < t; x++) {
      const xa = (x - 1 + t) % t, xb = (x + 1) % t;
      const dx = (h[yc + xb] - h[yc + xa]) * forca;
      const dy = (h[yb + x] - h[ya + x]) * forca;
      const inv = 1 / Math.hypot(dx, dy, 1);
      const i = (yc + x) * 4;
      d[i] = (-dx * inv * 0.5 + 0.5) * 255;
      d[i + 1] = (dy * inv * 0.5 + 0.5) * 255;
      d[i + 2] = (inv * 0.5 + 0.5) * 255;
      d[i + 3] = 255;
    }
  }
  g.putImageData(out, 0, 0);
  return c;
}

/* ---------- geradores ---------- */

// Concreto aparente: marcas das tábuas da fôrma e furos dos tirantes
function concreto(tom) {
  const t = 1024;
  const [c, g] = nova(t);
  const r = aleatorio(7);
  g.fillStyle = tom;
  g.fillRect(0, 0, t, t);
  manchas(g, t, r, 50, 0.06);

  for (let y = 0; y < t; y += 128) {
    g.fillStyle = r() > 0.5 ? `rgba(255,255,255,${r() * 0.05})` : `rgba(0,0,0,${r() * 0.06})`;
    g.fillRect(0, y, t, 128);
    // veios da madeira da fôrma impressos no concreto
    g.strokeStyle = 'rgba(0,0,0,0.035)';
    g.lineWidth = 1.5;
    for (let k = 0; k < 7; k++) {
      const base = y + 8 + r() * 112, amp = 2 + r() * 5, fase = r() * 6;
      g.beginPath();
      for (let x = 0; x <= t; x += 16) g.lineTo(x, base + Math.sin(x / 90 + fase) * amp);
      g.stroke();
    }
    g.fillStyle = 'rgba(0,0,0,0.2)';
    g.fillRect(0, y, t, 2.5);
  }

  granular(g, t, 24, r);

  for (const x of [256, 768]) for (const y of [320, 832]) {
    g.beginPath(); g.arc(x, y, 22, 0, Math.PI * 2);
    g.fillStyle = 'rgba(255,255,255,0.07)'; g.fill();
    g.beginPath(); g.arc(x, y, 13, 0, Math.PI * 2);
    g.fillStyle = 'rgba(34,32,29,0.9)'; g.fill();
  }
  return c;
}

// Piso de pedra escura em placas, com pintas de granito
function pedra(tom) {
  const t = 1024;
  const [c, g] = nova(t);
  const r = aleatorio(19);
  g.fillStyle = tom;
  g.fillRect(0, 0, t, t);
  for (const x of [0, 512]) for (const y of [0, 512]) {
    g.fillStyle = r() > 0.5 ? `rgba(255,255,255,${r() * 0.04})` : `rgba(0,0,0,${r() * 0.09})`;
    g.fillRect(x, y, 512, 512);
  }
  manchas(g, t, r, 30, 0.04);
  granular(g, t, 26, r);
  for (let i = 0; i < 4000; i++) {
    g.fillStyle = r() > 0.72 ? 'rgba(225,220,210,0.4)' : 'rgba(8,8,8,0.4)';
    const s = 1 + r() * 3;
    g.fillRect(r() * t, r() * t, s, s);
  }
  g.fillStyle = 'rgba(0,0,0,0.7)';
  for (const p of [0, 512]) { g.fillRect(p, 0, 4, t); g.fillRect(0, p, t, 4); }
  g.fillStyle = 'rgba(255,255,255,0.06)';
  for (const p of [4, 516]) { g.fillRect(p, 0, 2, t); g.fillRect(0, p, t, 2); }
  return c;
}

// Tábuas de madeira com veios
function tabuas(tom) {
  const t = 1024;
  const [c, g] = nova(t);
  const r = aleatorio(31);
  const n = 8, larg = t / n;
  for (let i = 0; i < n; i++) {
    g.fillStyle = tom;
    g.fillRect(i * larg, 0, larg, t);
    g.fillStyle = r() > 0.5 ? `rgba(255,255,255,${r() * 0.08})` : `rgba(0,0,0,${r() * 0.12})`;
    g.fillRect(i * larg, 0, larg, t);
    for (let k = 0; k < 18; k++) {
      const x0 = i * larg + r() * larg, amp = 1 + r() * 4, fase = r() * 6, freq = 60 + r() * 140;
      g.strokeStyle = r() > 0.5 ? 'rgba(0,0,0,0.12)' : 'rgba(255,230,200,0.06)';
      g.lineWidth = 0.8 + r() * 1.6;
      g.beginPath();
      for (let y = 0; y <= t; y += 12) g.lineTo(Math.min(Math.max(x0 + Math.sin(y / freq + fase) * amp, i * larg + 2), (i + 1) * larg - 2), y);
      g.stroke();
    }
    const corte = r() * t;
    g.fillStyle = 'rgba(0,0,0,0.45)';
    g.fillRect(i * larg, corte, larg, 2);
    g.fillRect(i * larg, 0, 3, t);
  }
  granular(g, t, 10, r);
  return c;
}

// Parede escura de reboco queimado, para a sala final
function grafite(tom) {
  const t = 512;
  const [c, g] = nova(t);
  const r = aleatorio(43);
  g.fillStyle = tom;
  g.fillRect(0, 0, t, t);
  manchas(g, t, r, 60, 0.035);
  for (let i = 0; i < 220; i++) {
    const x = r() * t, y = r() * t, l = 20 + r() * 60, a = r() * Math.PI;
    g.strokeStyle = `rgba(255,255,255,${r() * 0.025})`;
    g.lineWidth = 6 + r() * 14;
    g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); g.stroke();
  }
  granular(g, t, 12, r);
  return c;
}

// Grama vista de cima
function grama(tom) {
  const t = 512;
  const [c, g] = nova(t);
  const r = aleatorio(57);
  g.fillStyle = tom;
  g.fillRect(0, 0, t, t);
  manchas(g, t, r, 40, 0.08);
  for (let i = 0; i < 9000; i++) {
    const x = r() * t, y = r() * t;
    g.strokeStyle = r() > 0.5 ? 'rgba(160,190,110,0.25)' : 'rgba(20,40,15,0.3)';
    g.lineWidth = 1;
    g.beginPath(); g.moveTo(x, y); g.lineTo(x + (r() - 0.5) * 4, y - 3 - r() * 6); g.stroke();
  }
  granular(g, t, 18, r);
  return c;
}

// Calçada portuguesa em ondas, como nos calçadões do litoral
function calcada(tom) {
  const t = 1024, passo = 16;
  const [c, g] = nova(t);
  const r = aleatorio(71);
  g.fillStyle = '#8f8b82';
  g.fillRect(0, 0, t, t);
  for (let y = 0; y < t; y += passo) {
    for (let x = 0; x < t; x += passo) {
      const cx = x + passo / 2, cy = y + passo / 2;
      const onda = Math.sin(((cy + 46 * Math.sin((cx / t) * Math.PI * 4)) / 256) * Math.PI * 2);
      const escura = onda > 0.15;
      const v = (r() - 0.5) * 22;
      const base = escura ? 46 : parseInt(tom.slice(1, 3), 16);
      const k = Math.max(0, Math.min(255, base + v));
      g.fillStyle = escura ? `rgb(${k},${k},${k + 2})` : `rgb(${k},${k - 4},${k - 12})`;
      const j = () => (r() - 0.5) * 3;
      const s = passo - 3 - r() * 2;
      g.beginPath();
      g.roundRect(x + 1.5 + j(), y + 1.5 + j(), s, s, 3);
      g.fill();
    }
  }
  granular(g, t, 14, r);
  return c;
}

/* ---------- telas avulsas ---------- */

// Céu de fim de tarde para a esfera ao redor do pavilhão
export function texturaCeu() {
  const c = document.createElement('canvas');
  c.width = 8; c.height = 512;
  const g = c.getContext('2d');
  const grad = g.createLinearGradient(0, 0, 0, 512);
  grad.addColorStop(0, '#8fa9bf');
  grad.addColorStop(0.32, '#c9d3d6');
  grad.addColorStop(0.47, '#f1dcc0');
  grad.addColorStop(0.5, '#f6d6ad');
  grad.addColorStop(0.53, '#b9bfa8');
  grad.addColorStop(1, '#8c9480');
  g.fillStyle = grad;
  g.fillRect(0, 0, 8, 512);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

// Sombra de contato macia para a base dos objetos
export function texturaSombra() {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d');
  const grad = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  grad.addColorStop(0, 'rgba(0,0,0,0.55)');
  grad.addColorStop(0.45, 'rgba(0,0,0,0.25)');
  grad.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 128, 128);
  return new THREE.CanvasTexture(c);
}

// Letreiro com fundo transparente
export function texturaLetreiro(linhas, { largura = 1024, altura = 256, cor = '#1d1c1a' } = {}) {
  const c = document.createElement('canvas');
  c.width = largura; c.height = altura;
  const g = c.getContext('2d');
  g.fillStyle = cor;
  g.textAlign = 'center';
  g.textBaseline = 'alphabetic';
  for (const l of linhas) {
    g.font = l.fonte;
    if (l.espaco) g.letterSpacing = l.espaco;
    g.fillText(l.texto, largura / 2, l.y);
    g.letterSpacing = '0px';
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

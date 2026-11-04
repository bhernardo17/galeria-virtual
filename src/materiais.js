import * as THREE from 'three';

/*
  MATERIAIS DO PAVILHÃO
  ---------------------
  Aqui mora todo o acabamento do espaço. O resto do código só pede
  criarMaterial('concreto', [largura, altura]) e não sabe de onde vem a textura.

  Tipos aceitos:
    procedural  gerado por código agora (concreto aparente, piso de pedra)
    imagem      arquivos reais em /texturas, para quando quiser embelezar
    cor         cor lisa
    vidro       vidro translúcido dos cavaletes

  `escala` = quantos metros uma repetição da textura cobre.

  Exemplo para trocar o piso por uma textura real (PBR):
    piso: {
      tipo: 'imagem',
      cor: 'texturas/piso_cor.jpg',
      normal: 'texturas/piso_normal.jpg',
      rugosidade: 'texturas/piso_rugosidade.jpg',
      escala: 2,
    },
  Bons lugares para baixar texturas gratuitas: ambientCG e Poly Haven (CC0).
*/

export const MATERIAIS = {
  concreto:     { tipo: 'procedural', gerador: 'concreto', tom: '#9c978e', escala: 2.4, aspereza: 0.92, relevo: 0.8 },
  concretoTeto: { tipo: 'procedural', gerador: 'concreto', tom: '#8a857c', escala: 3.0, aspereza: 0.95, relevo: 0.6 },
  piso:         { tipo: 'procedural', gerador: 'pedra',    tom: '#3a3b37', escala: 4.0, aspereza: 0.38, relevo: 0.25 },
  madeira:      { tipo: 'cor', cor: '#8a5a32', aspereza: 0.7 },
  metal:        { tipo: 'cor', cor: '#2b2d2c', aspereza: 0.45, metal: 0.6 },
  vidro:        { tipo: 'vidro', cor: '#cfe3dc', opacidade: 0.2 },
};

const carregador = new THREE.TextureLoader();
const cacheTelas = new Map();

export function criarMaterial(nome, tamanho = [1, 1]) {
  const def = MATERIAIS[nome];
  if (!def) throw new Error(`Material "${nome}" não existe em materiais.js`);

  if (def.tipo === 'cor') {
    return new THREE.MeshStandardMaterial({ color: def.cor, roughness: def.aspereza ?? 0.8, metalness: def.metal ?? 0 });
  }

  if (def.tipo === 'vidro') {
    return new THREE.MeshStandardMaterial({
      color: def.cor, transparent: true, opacity: def.opacidade, roughness: 0.05, metalness: 0, depthWrite: false,
    });
  }

  const repetir = [tamanho[0] / def.escala, tamanho[1] / def.escala];

  if (def.tipo === 'procedural') {
    const tela = telaProcedural(def);
    const mapa = prepararTextura(new THREE.CanvasTexture(tela), repetir, true);
    const relevo = prepararTextura(new THREE.CanvasTexture(tela), repetir, false);
    return new THREE.MeshStandardMaterial({ map: mapa, bumpMap: relevo, bumpScale: def.relevo, roughness: def.aspereza });
  }

  if (def.tipo === 'imagem') {
    const mat = new THREE.MeshStandardMaterial({ roughness: 1 });
    mat.map = prepararTextura(carregador.load(def.cor), repetir, true);
    if (def.normal) mat.normalMap = prepararTextura(carregador.load(def.normal), repetir, false);
    if (def.rugosidade) mat.roughnessMap = prepararTextura(carregador.load(def.rugosidade), repetir, false);
    return mat;
  }

  throw new Error(`Tipo de material desconhecido: ${def.tipo}`);
}

function prepararTextura(tex, repetir, ehCor) {
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repetir[0], repetir[1]);
  tex.anisotropy = 8;
  if (ehCor) tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function telaProcedural(def) {
  const chave = `${def.gerador}:${def.tom}`;
  if (!cacheTelas.has(chave)) {
    const gerar = { concreto: gerarConcreto, pedra: gerarPedra }[def.gerador];
    cacheTelas.set(chave, gerar(def.tom));
  }
  return cacheTelas.get(chave);
}

/* ---------- geradores ---------- */

const T = 512;

function novaTela() {
  const c = document.createElement('canvas');
  c.width = c.height = T;
  return [c, c.getContext('2d')];
}

function aleatorio(semente) {
  let a = semente >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// desenha repetindo nas bordas para a textura emendar sem costura
function emLoop(fn) {
  for (const dx of [-T, 0, T]) for (const dy of [-T, 0, T]) fn(dx, dy);
}

function granular(g, intensidade, r) {
  const img = g.getImageData(0, 0, T, T);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const n = (r() - 0.5) * intensidade;
    d[i] += n; d[i + 1] += n; d[i + 2] += n;
  }
  g.putImageData(img, 0, 0);
}

// Concreto aparente: marcas das tábuas da fôrma e furos dos tirantes
function gerarConcreto(tom) {
  const [c, g] = novaTela();
  const r = aleatorio(7);
  g.fillStyle = tom;
  g.fillRect(0, 0, T, T);

  for (let i = 0; i < 45; i++) {
    const x = r() * T, y = r() * T, raio = 40 + r() * 140;
    const claro = r() > 0.5;
    emLoop((dx, dy) => {
      const grad = g.createRadialGradient(x + dx, y + dy, 0, x + dx, y + dy, raio);
      grad.addColorStop(0, claro ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.07)');
      grad.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = grad;
      g.fillRect(x + dx - raio, y + dy - raio, raio * 2, raio * 2);
    });
  }

  for (let y = 0; y < T; y += 64) {
    const claro = r() > 0.5;
    g.fillStyle = claro ? `rgba(255,255,255,${r() * 0.05})` : `rgba(0,0,0,${r() * 0.06})`;
    g.fillRect(0, y, T, 64);
    g.fillStyle = 'rgba(0,0,0,0.16)';
    g.fillRect(0, y, T, 1.5);
  }

  granular(g, 26, r);

  for (const x of [128, 384]) for (const y of [160, 416]) {
    g.beginPath(); g.arc(x, y, 11, 0, Math.PI * 2);
    g.fillStyle = 'rgba(255,255,255,0.08)'; g.fill();
    g.beginPath(); g.arc(x, y, 6.5, 0, Math.PI * 2);
    g.fillStyle = 'rgba(38,36,33,0.85)'; g.fill();
  }
  return c;
}

// Piso de pedra escura em placas, com pintas de granito
function gerarPedra(tom) {
  const [c, g] = novaTela();
  const r = aleatorio(19);
  g.fillStyle = tom;
  g.fillRect(0, 0, T, T);

  for (const x of [0, 256]) for (const y of [0, 256]) {
    g.fillStyle = r() > 0.5 ? `rgba(255,255,255,${r() * 0.04})` : `rgba(0,0,0,${r() * 0.08})`;
    g.fillRect(x, y, 256, 256);
  }

  granular(g, 30, r);

  for (let i = 0; i < 900; i++) {
    g.fillStyle = r() > 0.7 ? 'rgba(220,215,205,0.35)' : 'rgba(10,10,10,0.35)';
    g.fillRect(r() * T, r() * T, 1 + r() * 2, 1 + r() * 2);
  }

  g.fillStyle = 'rgba(0,0,0,0.55)';
  for (const p of [0, 256]) { g.fillRect(p, 0, 2, T); g.fillRect(0, p, T, 2); }
  g.fillStyle = 'rgba(255,255,255,0.05)';
  for (const p of [2, 258]) { g.fillRect(p, 0, 1, T); g.fillRect(0, p, T, 1); }
  return c;
}

// Vista pelas janelas: céu claro e uma faixa de mata ao fundo
export function texturaJanela() {
  const c = document.createElement('canvas');
  c.width = 64; c.height = 256;
  const g = c.getContext('2d');
  const grad = g.createLinearGradient(0, 0, 0, 256);
  grad.addColorStop(0, '#eef3f3');
  grad.addColorStop(0.6, '#dfe8e6');
  grad.addColorStop(0.78, '#a9bfa6');
  grad.addColorStop(1, '#6f8a6c');
  g.fillStyle = grad;
  g.fillRect(0, 0, 64, 256);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

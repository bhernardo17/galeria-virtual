import * as THREE from 'three';

// Telas desenhadas em canvas: a composição provisória de cada obra
// e a ficha técnica presa no verso do cavalete.

export async function esperarFontes() {
  if (!document.fonts) return;
  const espera = Promise.all([
    document.fonts.load('60px "Instrument Serif"'),
    document.fonts.load('600 24px "Familjen Grotesk"'),
  ]);
  await Promise.race([espera, new Promise((ok) => setTimeout(ok, 2000))]).catch(() => {});
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

function finalizar(c) {
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

export const numero = (i) => String(i + 1).padStart(2, '0');

export function texturaPlaceholder(obra, i) {
  const L = 600, A = Math.round(600 / obra.proporcao);
  const c = document.createElement('canvas');
  c.width = L; c.height = A;
  const g = c.getContext('2d');
  const r = aleatorio(i * 977 + 13);
  const [fundo, ...cores] = obra.paleta;

  g.fillStyle = fundo;
  g.fillRect(0, 0, L, A);

  for (let k = 0; k < 6; k++) {
    g.fillStyle = cores[k % cores.length];
    g.globalAlpha = 0.75 + r() * 0.25;
    const w = L * (0.15 + r() * 0.5), h = A * (0.08 + r() * 0.4);
    g.fillRect(r() * (L - w), r() * (A - h), w, h);
  }
  g.globalAlpha = 1;
  g.fillStyle = cores[Math.floor(r() * cores.length)];
  g.beginPath();
  g.arc(L * (0.25 + r() * 0.5), A * (0.25 + r() * 0.5), L * (0.08 + r() * 0.16), 0, Math.PI * 2);
  g.fill();

  g.strokeStyle = cores[0];
  g.lineWidth = 3;
  for (let k = 0; k < 3; k++) {
    g.beginPath();
    g.moveTo(r() * L, r() * A);
    g.lineTo(r() * L, r() * A);
    g.stroke();
  }

  g.fillStyle = 'rgba(0,0,0,0.5)';
  g.fillRect(0, A - 44, L, 44);
  g.fillStyle = '#f4f1ea';
  g.font = '600 20px "Familjen Grotesk", system-ui, sans-serif';
  g.fillText(`LUGAR RESERVADO · OBRA ${numero(i)}`, 24, A - 16);
  return finalizar(c);
}

export function texturaFicha(obra, i, total) {
  const c = document.createElement('canvas');
  c.width = 512; c.height = 640;
  const g = c.getContext('2d');
  g.fillStyle = '#f3f0e8';
  g.fillRect(0, 0, 512, 640);
  g.fillStyle = '#c8322a';
  g.fillRect(40, 40, 36, 6);

  g.fillStyle = '#1d1c1a';
  g.font = '600 22px "Familjen Grotesk", system-ui, sans-serif';
  g.fillText(`Nº ${numero(i)} / ${numero(total - 1)}`, 40, 92);

  g.font = '64px "Instrument Serif", Georgia, serif';
  let y = 180;
  for (const linha of quebrar(g, obra.titulo, 432)) { g.fillText(linha, 40, y); y += 66; }

  g.font = '400 24px "Familjen Grotesk", system-ui, sans-serif';
  g.fillStyle = '#4b4843';
  y += 20;
  for (const linha of [obra.ano, obra.tecnica, obra.dimensoes]) {
    for (const parte of quebrar(g, linha, 432)) { g.fillText(parte, 40, y); y += 34; }
  }

  g.fillStyle = 'rgba(29,28,26,0.18)';
  g.fillRect(40, 560, 432, 1);
  g.fillStyle = '#1d1c1a';
  g.font = '600 18px "Familjen Grotesk", system-ui, sans-serif';
  g.fillText('VÃO LIVRE · BHERNARDO RAMOS VIEIRA', 40, 596);
  return finalizar(c);
}

function quebrar(g, texto, largura) {
  const palavras = String(texto).split(' ');
  const linhas = [];
  let atual = '';
  for (const p of palavras) {
    const teste = atual ? `${atual} ${p}` : p;
    if (g.measureText(teste).width > largura && atual) { linhas.push(atual); atual = p; }
    else atual = teste;
  }
  if (atual) linhas.push(atual);
  return linhas;
}

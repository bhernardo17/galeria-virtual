import * as THREE from 'three';
import { aleatorio } from './materiais.js';

// Telas desenhadas em canvas: a composição provisória de cada obra
// e a ficha técnica presa no verso do cavalete.

export async function esperarFontes() {
  if (!document.fonts) return;
  const espera = Promise.all([
    document.fonts.load('60px "Instrument Serif"'),
    document.fonts.load('600 24px "Familjen Grotesk"'),
    document.fonts.load('400 24px "Familjen Grotesk"'),
  ]);
  await Promise.race([espera, new Promise((ok) => setTimeout(ok, 2500))]).catch(() => {});
}

function finalizar(c) {
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

export const numero = (i) => String(i + 1).padStart(2, '0');

// Três estilos de composição se alternam para os lugares reservados
export function texturaPlaceholder(obra, i) {
  const L = 900, A = Math.round(900 / obra.proporcao);
  const c = document.createElement('canvas');
  c.width = L; c.height = A;
  const g = c.getContext('2d');
  const r = aleatorio(i * 977 + 13);
  const [fundo, ...cores] = obra.paleta;
  const cor = () => cores[Math.floor(r() * cores.length)];

  g.fillStyle = fundo;
  g.fillRect(0, 0, L, A);

  const estilo = i % 3;
  if (estilo === 0) {
    // campos de cor sobrepostos
    for (let k = 0; k < 7; k++) {
      g.fillStyle = cores[k % cores.length];
      g.globalAlpha = 0.7 + r() * 0.3;
      const w = L * (0.12 + r() * 0.5), h = A * (0.06 + r() * 0.35);
      g.fillRect(r() * (L - w), r() * (A - h), w, h);
    }
    g.globalAlpha = 1;
    g.fillStyle = cor();
    g.beginPath();
    g.arc(L * (0.3 + r() * 0.4), A * (0.3 + r() * 0.4), L * (0.1 + r() * 0.12), 0, Math.PI * 2);
    g.fill();
  } else if (estilo === 1) {
    // arcos concêntricos
    const cx = L * (0.3 + r() * 0.4), cy = A * (0.35 + r() * 0.3);
    for (let k = 9; k > 0; k--) {
      g.fillStyle = cores[k % cores.length];
      g.beginPath();
      g.arc(cx, cy, k * L * 0.065, Math.PI * (0.9 + r() * 0.2), Math.PI * (2.1 + r() * 0.2));
      g.lineTo(cx, cy);
      g.fill();
    }
    g.fillStyle = cor();
    g.fillRect(0, A * 0.72, L, A * 0.28);
  } else {
    // faixas e linhas
    const n = 5 + Math.floor(r() * 5);
    for (let k = 0; k < n; k++) {
      g.fillStyle = cor();
      const y = (A / n) * k, h = (A / n) * (0.3 + r() * 0.7);
      g.fillRect(L * 0.1, y + (A / n - h) / 2, L * (0.3 + r() * 0.6), h);
    }
    g.strokeStyle = cores[0];
    g.lineWidth = 6;
    for (let k = 0; k < 4; k++) {
      g.beginPath();
      g.moveTo(r() * L, 0);
      g.lineTo(r() * L, A);
      g.stroke();
    }
  }

  // grão de papel
  const img = g.getImageData(0, 0, L, A);
  for (let p = 0; p < img.data.length; p += 4) {
    const n = (r() - 0.5) * 22;
    img.data[p] += n; img.data[p + 1] += n; img.data[p + 2] += n;
  }
  g.putImageData(img, 0, 0);

  g.fillStyle = 'rgba(20,19,17,0.55)';
  g.fillRect(0, A - 58, L, 58);
  g.fillStyle = '#f4f1ea';
  g.font = '600 26px "Familjen Grotesk", system-ui, sans-serif';
  g.fillText(`LUGAR RESERVADO · OBRA ${numero(i)}`, 32, A - 21);
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

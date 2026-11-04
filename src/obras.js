/*
  OBRAS DA EXPOSIÇÃO
  ------------------
  Cada item vira um cavalete de vidro no pavilhão.

  Para usar uma imagem sua:
    1. coloque o arquivo em /obras (ex.: obras/retrato-01.jpg)
    2. troque `imagem: null` por `imagem: 'obras/retrato-01.jpg'`
    3. ajuste `proporcao` (largura / altura). Ex.: 3/4 retrato, 4/3 paisagem, 1 quadrado.

  Enquanto `imagem` for null, o cavalete mostra uma composição gerada
  por código com as cores de `paleta` (só um marcador de lugar).

  O layout comporta até 12 obras. Para mudar a posição de uma obra,
  adicione `posicao: { x: 0, z: 0, giro: 0 }` (metros e radianos).
*/

export const OBRAS = [
  { titulo: 'Obra 01', ano: '2026', tecnica: 'Imagem a definir', dimensoes: '—', imagem: null, proporcao: 3 / 4,
    paleta: ['#e9e4d8', '#c8322a', '#1f3a5f', '#e3b23c'] },
  { titulo: 'Obra 02', ano: '2026', tecnica: 'Imagem a definir', dimensoes: '—', imagem: null, proporcao: 3 / 4,
    paleta: ['#1d2b2a', '#6fa39a', '#f0e6cf', '#d9763a'] },
  { titulo: 'Obra 03', ano: '2026', tecnica: 'Imagem a definir', dimensoes: '—', imagem: null, proporcao: 3 / 4,
    paleta: ['#f2c94c', '#14213d', '#e5e5e5', '#b5452b'] },
  { titulo: 'Obra 04', ano: '2026', tecnica: 'Imagem a definir', dimensoes: '—', imagem: null, proporcao: 3 / 4,
    paleta: ['#d8dcd3', '#2f5d3a', '#8c2f39', '#f4d58d'] },
  { titulo: 'Obra 05', ano: '2026', tecnica: 'Imagem a definir', dimensoes: '—', imagem: null, proporcao: 3 / 4,
    paleta: ['#26221f', '#e07a5f', '#f2cc8f', '#81b29a'] },
  { titulo: 'Obra 06', ano: '2026', tecnica: 'Imagem a definir', dimensoes: '—', imagem: null, proporcao: 3 / 4,
    paleta: ['#efe9dd', '#0f4c5c', '#e36414', '#5f0f40'] },
  { titulo: 'Obra 07', ano: '2026', tecnica: 'Imagem a definir', dimensoes: '—', imagem: null, proporcao: 3 / 4,
    paleta: ['#3d405b', '#f4f1de', '#e07a5f', '#9fb8ad'] },
  { titulo: 'Obra 08', ano: '2026', tecnica: 'Imagem a definir', dimensoes: '—', imagem: null, proporcao: 3 / 4,
    paleta: ['#c9d6c2', '#283618', '#bc6c25', '#fefae0'] },
  { titulo: 'Obra 09', ano: '2026', tecnica: 'Imagem a definir', dimensoes: '—', imagem: null, proporcao: 3 / 4,
    paleta: ['#0b0f14', '#d1495b', '#edae49', '#00798c'] },
];

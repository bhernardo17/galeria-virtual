/*
  OBRAS DA EXPOSIÇÃO
  ------------------
  A ordem desta lista é a ordem do percurso (e do tour guiado).

  Para usar uma imagem sua:
    1. coloque o arquivo em /obras (ex.: obras/retrato-01.jpg)
    2. troque `imagem: null` por `imagem: 'obras/retrato-01.jpg'`
    3. a proporção é lida da própria imagem; `proporcao` só vale para o lugar reservado

  Campos:
    titulo, ano, tecnica, dimensoes   aparecem na ficha (na tela e no verso do cavalete)
    texto                             texto curatorial, aparece na ficha e na tela cheia
    destaque: true                    leva a obra para a Sala final (use em uma só, a última)
    posicao: { x, z, giro }           opcional, para posicionar à mão (metros e radianos)

  Enquanto `imagem` for null, o cavalete mostra uma composição gerada com as cores de `paleta`.
  O salão comporta até 12 obras.
*/

const TEXTO_PROVISORIO =
  'Texto curatorial a definir. Use este espaço para contar o contexto da obra: quando nasceu, o que ela investiga e como foi feita.';

export const OBRAS = [
  { titulo: 'Obra 01', ano: '2026', tecnica: 'Imagem a definir', dimensoes: '—', imagem: null, proporcao: 3 / 4,
    texto: TEXTO_PROVISORIO, paleta: ['#e9e4d8', '#c8322a', '#1f3a5f', '#e3b23c'] },
  { titulo: 'Obra 02', ano: '2026', tecnica: 'Imagem a definir', dimensoes: '—', imagem: null, proporcao: 3 / 4,
    texto: TEXTO_PROVISORIO, paleta: ['#1d2b2a', '#6fa39a', '#f0e6cf', '#d9763a'] },
  { titulo: 'Obra 03', ano: '2026', tecnica: 'Imagem a definir', dimensoes: '—', imagem: null, proporcao: 3 / 4,
    texto: TEXTO_PROVISORIO, paleta: ['#f2c94c', '#14213d', '#e5e5e5', '#b5452b'] },
  { titulo: 'Obra 04', ano: '2026', tecnica: 'Imagem a definir', dimensoes: '—', imagem: null, proporcao: 3 / 4,
    texto: TEXTO_PROVISORIO, paleta: ['#d8dcd3', '#2f5d3a', '#8c2f39', '#f4d58d'] },
  { titulo: 'Obra 05', ano: '2026', tecnica: 'Imagem a definir', dimensoes: '—', imagem: null, proporcao: 3 / 4,
    texto: TEXTO_PROVISORIO, paleta: ['#26221f', '#e07a5f', '#f2cc8f', '#81b29a'] },
  { titulo: 'Obra 06', ano: '2026', tecnica: 'Imagem a definir', dimensoes: '—', imagem: null, proporcao: 3 / 4,
    texto: TEXTO_PROVISORIO, paleta: ['#efe9dd', '#0f4c5c', '#e36414', '#5f0f40'] },
  { titulo: 'Obra 07', ano: '2026', tecnica: 'Imagem a definir', dimensoes: '—', imagem: null, proporcao: 3 / 4,
    texto: TEXTO_PROVISORIO, paleta: ['#3d405b', '#f4f1de', '#e07a5f', '#9fb8ad'] },
  { titulo: 'Obra 08', ano: '2026', tecnica: 'Imagem a definir', dimensoes: '—', imagem: null, proporcao: 3 / 4,
    texto: TEXTO_PROVISORIO, paleta: ['#c9d6c2', '#283618', '#bc6c25', '#fefae0'] },
  { titulo: 'Obra 09', ano: '2026', tecnica: 'Imagem a definir', dimensoes: '—', imagem: null, proporcao: 3 / 4,
    texto: TEXTO_PROVISORIO, paleta: ['#0b0f14', '#d1495b', '#edae49', '#00798c'], destaque: true },
];

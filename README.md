# Vão Livre

Galeria virtual em 3D feita com [three.js](https://threejs.org). Você chega pela praça, entra num pavilhão de concreto e vidro e encontra as obras soltas no vão, em cavaletes de vidro com a ficha técnica presa no verso, numa referência aos cavaletes de cristal de Lina Bo Bardi no MASP. O percurso termina numa sala escura com a obra de destaque.

## O que tem

- **Chegada:** tela de abertura com o pavilhão visto de fora e um voo de câmera pela porta até o salão
- **Espaço:** concreto aparente com marcas de fôrma, piso de pedra, calçada portuguesa em ondas, sala final em grafite e assoalho
- **Luz:** sol de fim de tarde entrando pelas fachadas e desenhando a sombra dos caixilhos, foco de luz em cada obra, reflexos e poeira no ar
- **Obras:** moldura, ficha com texto curatorial, visualização em tela cheia com zoom
- **Visita:** tour guiado, mapa da planta clicável, contador de obras vistas, som ambiente com passos e pássaros (sintetizado, sem arquivos)

## Como navegar

- **Arrastar** (mouse ou dedo): olhar ao redor
- **Tocar numa obra**: caminhar até ela e abrir a ficha
- **Tocar no chão**: caminhar até aquele ponto, inclusive para fora do pavilhão
- **WASD / setas**: andar pelo teclado (Shift corre)
- **Mapa**: tocar num ponto leva até a obra
- **Esc**: fecha a ficha ou a tela cheia, ou pula a chegada

## Rodar localmente

Não tem etapa de build, mas usa módulos ES, então precisa de um servidor local:

```bash
npx serve .
# ou
python3 -m http.server
```

Na Vercel, basta importar o repositório como site estático.

## Estrutura

```
index.html            página, interface e estilos
src/main.js           liga tudo: ficha, tour, mapa, tela cheia, entradas
src/obras.js          lista das obras (título, ano, técnica, texto, imagem)
src/materiais.js      acabamentos do espaço e os geradores de textura
src/arquitetura.js    planta: praça, salão, sala final, bancos, colisões
src/atmosfera.js      sol, céu, reflexos, árvores e poeira
src/cavaletes.js      cavaletes de vidro, molduras e focos de luz
src/navegacao.js      câmera, rotas entre ambientes, voo de chegada
src/audio.js          som ambiente sintetizado
src/telas.js          composições provisórias e fichas em canvas
obras/                suas imagens
texturas/             texturas reais para os materiais
```

## Trocar as obras

Em `src/obras.js`, troque `imagem: null` pelo caminho do arquivo (`'obras/minha-obra.jpg'`) e preencha título, ano, técnica e texto. A obra marcada com `destaque: true` vai para a sala final.

## Texturas reais

Os materiais hoje são desenhados por código. Para trocar por texturas fotográficas, edite só `src/materiais.js`:

```js
piso: {
  tipo: 'imagem',
  cor: 'texturas/piso_cor.jpg',
  normal: 'texturas/piso_normal.jpg',
  rugosidade: 'texturas/piso_rugosidade.jpg',
  escala: 2, // metros cobertos por uma repetição
},
```

Fontes de texturas gratuitas (CC0): ambientCG e Poly Haven.

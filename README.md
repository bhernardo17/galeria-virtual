# Vão Livre

Galeria digital em 3D feita com [three.js](https://threejs.org). Você entra num pavilhão de concreto e as obras ficam soltas no vão, em cavaletes de vidro com a ficha técnica presa no verso, numa referência aos cavaletes de cristal de Lina Bo Bardi no MASP.

## Como navegar

- **Arrastar** (mouse ou dedo): olhar ao redor
- **Tocar numa obra**: caminhar até ela e abrir a ficha
- **Tocar no chão**: caminhar até aquele ponto
- **WASD / setas**: andar pelo teclado (Shift corre)
- **Anterior / Próxima**: percorrer a exposição em ordem

## Rodar localmente

O projeto não tem etapa de build, mas usa módulos ES, então precisa de um servidor local:

```bash
npx serve .
# ou
python3 -m http.server
```

Na Vercel, basta importar o repositório como site estático.

## Estrutura

```
index.html          página, interface e estilos
src/main.js         cena, arquitetura, cavaletes e navegação
src/obras.js        lista das obras (título, ano, técnica, imagem)
src/materiais.js    acabamentos do espaço (concreto, piso, vidro, madeira)
src/telas.js        composições provisórias e fichas técnicas em canvas
obras/              suas imagens (crie a pasta)
texturas/           texturas reais para os materiais (crie a pasta)
```

## Trocar as obras

Em `src/obras.js`, troque `imagem: null` pelo caminho do arquivo (`'obras/minha-obra.jpg'`) e preencha título, ano e técnica. Enquanto não houver imagem, o cavalete mostra uma composição gerada com as cores da `paleta`.

## Texturas (próximo passo)

Hoje o concreto aparente e o piso de pedra são desenhados por código. Para embelezar o espaço com texturas reais, edite só `src/materiais.js`:

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

## Ideias para depois

- Texturas PBR no concreto, piso e madeira
- Luz de fim de tarde entrando pelas fachadas
- Áudio ambiente opcional
- Botão no portfólio levando para a exposição

import * as THREE from 'three';
import { criarMaterial } from './materiais.js';
import { PLANTA, sombraDeContato } from './arquitetura.js';
import { texturaPlaceholder, texturaFicha } from './telas.js';

// Disposição das obras no salão: fileiras de três, intercaladas
export function posicaoNoSalao(j) {
  const linha = Math.floor(j / 3), coluna = j % 3;
  return {
    x: (coluna - 1) * 7.5 + (linha % 2 ? 2.4 : -1.4),
    z: 9 - linha * 7.5,
    giro: (coluna - 1) * -0.12,
  };
}
export const POSICAO_DESTAQUE = { x: 0, z: -26.4, giro: 0 };

const ALTURA_QUADRO = 1.3;
const CENTRO_QUADRO = 1.78;

export function criarCavaletes(cena, obras) {
  const cavaletes = [];
  const alvos = [];
  const carregador = new THREE.TextureLoader();
  const concreto = criarMaterial('concreto', [0.5, 0.42]);
  const madeira = criarMaterial('madeira', [0.4, 0.2]);
  const vidro = criarMaterial('vidro');
  const moldura = criarMaterial('moldura');
  let j = 0;

  obras.forEach((obra, i) => {
    const destaque = !!obra.destaque;
    const escala = destaque ? 1.25 : 1;
    const { x, z, giro } = obra.posicao ?? (destaque ? POSICAO_DESTAQUE : posicaoNoSalao(j++));
    const grupo = new THREE.Group();

    const base = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.42, 0.5), concreto);
    base.position.y = 0.21;
    base.castShadow = base.receiveShadow = true;

    const cunhas = [-1, 1].map((lado) => {
      const c = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.12, 0.07), madeira);
      c.position.set(0, 0.48, lado * 0.055);
      c.castShadow = true;
      return c;
    });

    const placa = new THREE.Mesh(new THREE.BoxGeometry(1.3, 2.4, 0.03), vidro);
    placa.position.y = 1.57;

    const imagem = texturaPlaceholder(obra, i);
    const quadro = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshStandardMaterial({ map: imagem, roughness: 0.55 }));
    quadro.position.set(0, CENTRO_QUADRO, 0.045);
    const caixa = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 0.04), moldura);
    caixa.position.set(0, CENTRO_QUADRO, 0.022);
    caixa.castShadow = true;
    ajustar(quadro, caixa, obra.proporcao);

    const ficha = new THREE.Mesh(
      new THREE.PlaneGeometry(0.42, 0.525),
      new THREE.MeshStandardMaterial({ map: texturaFicha(obra, i, obras.length), roughness: 0.85 }),
    );
    ficha.position.set(0, 1.4, -0.02);
    ficha.rotation.y = Math.PI;

    grupo.add(base, ...cunhas, placa, caixa, quadro, ficha);
    grupo.position.set(x, 0, z);
    grupo.rotation.y = giro;
    grupo.scale.setScalar(escala);
    cena.add(grupo);
    sombraDeContato(cena, x, z, 1.6 * escala, 1.2 * escala, giro);

    const registro = {
      indice: i,
      destaque,
      centro: new THREE.Vector3(x, 0, z),
      frente: new THREE.Vector3(Math.sin(giro), 0, Math.cos(giro)),
      giro,
      escala,
      fonte: imagem.image, // canvas provisório; vira a URL quando houver imagem real
    };

    if (obra.imagem) {
      registro.fonte = obra.imagem;
      carregador.load(obra.imagem, (tex) => {
        tex.colorSpace = THREE.SRGBColorSpace;
        tex.anisotropy = 8;
        quadro.material.map = tex;
        quadro.material.needsUpdate = true;
        ajustar(quadro, caixa, tex.image.width / tex.image.height);
      });
    }

    // foco de luz vindo do teto, apontado para a obra
    const alturaFoco = destaque ? PLANTA.sala.altura - 0.3 : PLANTA.salao.altura - 1.1;
    const foco = new THREE.SpotLight('#fff1dc', destaque ? 55 : 70, 0, destaque ? 0.36 : 0.3, 0.75, 2);
    const recuo = destaque ? 2.2 : 2.4;
    foco.position.set(x + registro.frente.x * recuo, alturaFoco, z + registro.frente.z * recuo);
    foco.target.position.set(x, CENTRO_QUADRO * escala, z);
    cena.add(foco, foco.target);

    for (const m of [quadro, caixa, placa, ficha, base]) { m.userData.obra = i; alvos.push(m); }
    cavaletes.push(registro);
  });

  return { cavaletes, alvos };
}

function ajustar(quadro, caixa, proporcao) {
  let h = ALTURA_QUADRO, w = h * proporcao;
  if (w > 1.12) { w = 1.12; h = w / proporcao; }
  quadro.scale.set(w, h, 1);
  caixa.scale.set(w + 0.08, h + 0.08, 1);
}

export function pontoDeVista(c) {
  const distancia = c.destaque ? 3.4 : 3.0;
  return {
    pos: new THREE.Vector3(c.centro.x + c.frente.x * distancia, PLANTA.olho, c.centro.z + c.frente.z * distancia),
    yaw: c.giro,
    pitch: c.destaque ? 0.08 : 0.04,
  };
}

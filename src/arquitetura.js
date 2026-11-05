import * as THREE from 'three';
import { criarMaterial, texturaLetreiro, texturaSombra } from './materiais.js';

/*
  PLANTA (metros)
  Praça de entrada (z > 19) → porta de vidro → Salão do vão livre → passagem → Sala final.
  O eixo x vai da esquerda para a direita de quem entra; z diminui em direção ao fundo.
*/
export const PLANTA = {
  salao: { x0: -17, x1: 17, z0: -19, z1: 19, altura: 7.5 },
  sala: { x0: -6, x1: 6, z0: -29, z1: -19, altura: 4.6 },
  porta: { largura: 5, altura: 3.8 },
  passagem: { largura: 3.4, altura: 3.4 },
  espessura: 0.4,
  olho: 1.65,
};

export function construirArquitetura(cena) {
  const { salao: S, sala: F, porta, passagem, espessura: E } = PLANTA;
  const colisores = [];
  const pisos = [];

  const adicionar = (m, sombra = true) => { m.castShadow = sombra; m.receiveShadow = true; cena.add(m); return m; };

  // caixa definida por limites; registra colisão se tocar a altura do corpo
  const bloco = (x0, x1, y0, y1, z0, z1, material, { colide = true, sombra = true } = {}) => {
    const w = x1 - x0, h = y1 - y0, d = z1 - z0;
    const mat = typeof material === 'string' ? criarMaterial(material, [Math.max(w, d), h]) : material;
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    m.position.set((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
    if (colide && y0 < 1.8) colisores.push({ x0, x1, z0, z1 });
    return adicionar(m, sombra);
  };

  const plano = (x0, x1, z0, z1, material, y = 0, nome = '') => {
    const w = x1 - x0, d = z1 - z0;
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), criarMaterial(material, [w, d]));
    m.rotation.x = -Math.PI / 2;
    m.position.set((x0 + x1) / 2, y, (z0 + z1) / 2);
    m.name = nome;
    adicionar(m, false);
    pisos.push(m);
    return m;
  };

  /* ---------- salão ---------- */
  plano(S.x0, S.x1, S.z0, S.z1, 'piso', 0, 'salao');

  // laje de cobertura: por dentro é o teto, por fora é o volume do pavilhão
  bloco(S.x0 - E - 0.6, S.x1 + E + 0.6, S.altura, S.altura + 0.8, S.z0 - E - 0.6, S.z1 + E + 0.6, 'concretoTeto', { colide: false });
  for (let z = S.z0 + 2; z <= S.z1 - 2; z += 4) {
    bloco(S.x0, S.x1, S.altura - 0.9, S.altura, z - 0.22, z + 0.22, 'concretoTeto', { colide: false });
  }

  // parede da entrada, com a porta no centro
  const pz0 = S.z1, pz1 = S.z1 + E, meia = porta.largura / 2;
  bloco(S.x0 - E, -meia, 0, S.altura, pz0, pz1, 'concreto');
  bloco(meia, S.x1 + E, 0, S.altura, pz0, pz1, 'concreto');
  bloco(-meia, meia, porta.altura, S.altura, pz0, pz1, 'concreto', { colide: false });

  // caixilho e folhas de vidro abertas
  const metal = criarMaterial('metal');
  bloco(-meia - 0.08, -meia, 0, porta.altura, pz0 - 0.05, pz1 + 0.05, metal, { colide: false });
  bloco(meia, meia + 0.08, 0, porta.altura, pz0 - 0.05, pz1 + 0.05, metal, { colide: false });
  bloco(-meia, meia, porta.altura - 0.08, porta.altura, pz0 - 0.05, pz1 + 0.05, metal, { colide: false });
  const vidro = criarMaterial('vidro');
  for (const lado of [-1, 1]) {
    const folha = new THREE.Group();
    const placa = new THREE.Mesh(new THREE.BoxGeometry(2.4, porta.altura - 0.12, 0.03), vidro);
    placa.position.set(-lado * 1.2, (porta.altura - 0.12) / 2, 0);
    const puxador = new THREE.Mesh(new THREE.BoxGeometry(0.04, 1.1, 0.06), metal);
    puxador.position.set(-lado * 2.2, 1.1, 0.06);
    folha.add(placa, puxador);
    folha.position.set(lado * meia, 0, pz1 + 0.02);
    folha.rotation.y = lado * 1.45;
    cena.add(folha);
  }

  // parede do fundo, com a passagem para a sala final
  const fz0 = S.z0 - E, fz1 = S.z0, mp = passagem.largura / 2;
  bloco(S.x0 - E, -mp, 0, S.altura, fz0, fz1, 'concreto');
  bloco(mp, S.x1 + E, 0, S.altura, fz0, fz1, 'concreto');
  bloco(-mp, mp, passagem.altura, S.altura, fz0, fz1, 'concreto', { colide: false });

  // fachadas laterais de vidro: peitoril, caixilhos e o pano de vidro
  const vidroFachada = criarMaterial('vidroFachada');
  for (const lado of [-1, 1]) {
    const xi = lado === 1 ? S.x1 : S.x0 - E;
    bloco(xi, xi + E, 0, 0.6, S.z0, S.z1, 'concreto');
    const pano = new THREE.Mesh(new THREE.PlaneGeometry(S.z1 - S.z0, S.altura - 0.6), vidroFachada);
    pano.position.set(lado * (S.x1 + E / 2), 0.6 + (S.altura - 0.6) / 2, 0);
    pano.rotation.y = Math.PI / 2;
    cena.add(pano);
    for (let z = S.z0; z <= S.z1 + 0.01; z += 3.2) {
      bloco(lado * (S.x1 + E / 2) - 0.07, lado * (S.x1 + E / 2) + 0.07, 0.6, S.altura, z - 0.07, z + 0.07, metal, { colide: false });
    }
    bloco(lado * (S.x1 + E / 2) - 0.06, lado * (S.x1 + E / 2) + 0.06, 2.9, 3.02, S.z0, S.z1, metal, { colide: false, sombra: true });
  }

  /* ---------- sala final ---------- */
  plano(F.x0, F.x1, F.z0, F.z1, 'assoalho', 0, 'sala');
  bloco(F.x0 - E, F.x0, 0, F.altura, F.z0 - E, F.z1 - E, 'grafite');
  bloco(F.x1, F.x1 + E, 0, F.altura, F.z0 - E, F.z1 - E, 'grafite');
  bloco(F.x0 - E, F.x1 + E, 0, F.altura, F.z0 - E, F.z0, 'grafite');
  bloco(F.x0 - E, F.x1 + E, F.altura, F.altura + 0.5, F.z0 - E, F.z1 - E, 'grafite', { colide: false });

  /* ---------- praça e jardim ---------- */
  const chao = new THREE.Mesh(new THREE.CircleGeometry(150, 48), criarMaterial('grama', [300, 300]));
  chao.rotation.x = -Math.PI / 2;
  chao.position.y = -0.02;
  chao.name = 'fora';
  adicionar(chao, false);
  pisos.push(chao);
  plano(-13, 13, S.z1, 31, 'calcada', -0.005, 'fora');
  plano(-2.6, 2.6, 31, 60, 'calcada', -0.006, 'fora');
  // calçada ao redor do pavilhão
  plano(S.x0 - E - 2, S.x0 - E, S.z0 - 11, S.z1 + E, 'calcada', -0.007, 'fora');
  plano(S.x1 + E, S.x1 + E + 2, S.z0 - 11, S.z1 + E, 'calcada', -0.007, 'fora');

  /* ---------- bancos ---------- */
  const madeira = criarMaterial('madeira', [2.4, 0.6]);
  const concretoBanco = criarMaterial('concreto', [0.5, 0.42]);
  const banco = (x, z, giro = 0) => {
    const g = new THREE.Group();
    const assento = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.08, 0.55), madeira);
    assento.position.y = 0.46;
    for (const s of [-0.85, 0.85]) {
      const pe = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.42, 0.5), concretoBanco);
      pe.position.set(s, 0.21, 0);
      pe.castShadow = pe.receiveShadow = true;
      g.add(pe);
    }
    assento.castShadow = assento.receiveShadow = true;
    g.add(assento);
    g.position.set(x, 0, z);
    g.rotation.y = giro;
    cena.add(g);
    const cx = Math.abs(Math.cos(giro)) * 1.25 + Math.abs(Math.sin(giro)) * 0.3;
    const cz = Math.abs(Math.sin(giro)) * 1.25 + Math.abs(Math.cos(giro)) * 0.3;
    colisores.push({ x0: x - cx, x1: x + cx, z0: z - cz, z1: z + cz });
    sombraDeContato(cena, x, z, 3.2, 1.2, giro);
  };
  banco(-8.5, -13.5);
  banco(8.5, -13.5);
  banco(-12, 13, Math.PI / 2);
  banco(F.x0 + 0.9, -23.5, Math.PI / 2);
  banco(-8, 27);
  banco(8, 27);

  /* ---------- letreiros ---------- */
  const letreiro = new THREE.Mesh(
    new THREE.PlaneGeometry(9, 2.25),
    new THREE.MeshStandardMaterial({
      map: texturaLetreiro([
        { texto: 'VÃO LIVRE', fonte: '400 150px "Instrument Serif", Georgia, serif', y: 150, espaco: '18px' },
        { texto: 'BHERNARDO RAMOS VIEIRA', fonte: '600 34px "Familjen Grotesk", system-ui, sans-serif', y: 220, espaco: '8px' },
      ], { cor: '#211f1c' }),
      transparent: true, roughness: 0.6, metalness: 0.2,
    }),
  );
  letreiro.position.set(0, porta.altura + 1.75, pz1 + 0.01);
  cena.add(letreiro);

  const placaSala = new THREE.Mesh(
    new THREE.PlaneGeometry(3, 0.5),
    new THREE.MeshStandardMaterial({
      map: texturaLetreiro([{ texto: 'SALA FINAL', fonte: '600 70px "Familjen Grotesk", system-ui, sans-serif', y: 125, espaco: '14px' }],
        { largura: 1024, altura: 170, cor: '#2a2824' }),
      transparent: true, roughness: 0.7,
    }),
  );
  placaSala.position.set(0, passagem.altura + 0.5, S.z0 + 0.01);
  cena.add(placaSala);

  return { pisos, colisores };
}

const texSombra = { valor: null };
export function sombraDeContato(cena, x, z, largura, profundidade, giro = 0) {
  texSombra.valor ??= texturaSombra();
  const m = new THREE.Mesh(
    new THREE.PlaneGeometry(largura, profundidade),
    new THREE.MeshBasicMaterial({ map: texSombra.valor, transparent: true, depthWrite: false }),
  );
  m.rotation.set(-Math.PI / 2, 0, giro);
  m.position.set(x, 0.006, z);
  m.renderOrder = 1;
  cena.add(m);
  return m;
}

import * as THREE from 'three';
import { criarMaterial, aleatorio } from './materiais.js';
import { PLANTA, sombraDeContato } from './arquitetura.js';
import { EXPOSICAO } from './obras.js';

/*
  MOBILIÁRIO E ELEMENTOS DO ESPAÇO
  Painel de abertura com o texto da exposição, balcão de recepção,
  trilhos de iluminação com as luminárias de cada obra e vasos com plantas.
  Tudo o que fica no caminho devolve uma área de colisão.
*/

export function construirMobiliario(cena, cavaletes) {
  const colisores = [];
  const S = PLANTA.salao;

  painelDeAbertura(cena, colisores, -8.3, 13.4, 0.18);
  balcao(cena, colisores, 11, 15.6);
  iluminacao(cena, cavaletes);

  const vasos = [
    [S.x0 + 1.4, S.z1 - 1.4, 1.1], [S.x1 - 1.4, S.z0 + 1.4, 1.2], [S.x0 + 1.4, S.z0 + 1.4, 0.9],
    [S.x1 - 1.4, 2, 1], [-4.2, 21.6, 0.8], [4.2, 21.6, 0.8],
    [PLANTA.sala.x1 - 1, PLANTA.sala.z0 + 1, 0.8],
  ];
  vasos.forEach(([x, z, e], i) => vaso(cena, colisores, x, z, e, i));

  return { colisores };
}

/* ---------- painel de abertura ---------- */
function painelDeAbertura(cena, colisores, x, z, giro) {
  const L = 4.2, A = 3.2, E = 0.3;
  const g = new THREE.Group();
  const parede = new THREE.Mesh(new THREE.BoxGeometry(L, A, E), criarMaterial('concreto', [L, A]));
  parede.position.y = A / 2;
  parede.castShadow = parede.receiveShadow = true;

  const texto = new THREE.Mesh(
    new THREE.PlaneGeometry(L - 0.5, A - 0.5),
    new THREE.MeshStandardMaterial({ map: telaDoPainel(), transparent: true, roughness: 0.8 }),
  );
  texto.position.set(0, A / 2, E / 2 + 0.005);
  g.add(parede, texto);
  g.position.set(x, 0, z);
  g.rotation.y = giro;
  cena.add(g);
  sombraDeContato(cena, x, z, L + 0.8, 1.2, giro);
  colisores.push(caixaGirada(x, z, L, E, giro));
}

function telaDoPainel() {
  const c = document.createElement('canvas');
  c.width = 1400; c.height = 1080;
  const g = c.getContext('2d');
  g.fillStyle = '#1f1d1a';
  g.font = '600 30px "Familjen Grotesk", system-ui, sans-serif';
  g.letterSpacing = '8px';
  g.fillText(EXPOSICAO.chamada.toUpperCase(), 0, 60);
  g.letterSpacing = '0px';
  g.fillStyle = '#c8322a';
  g.fillRect(0, 96, 70, 8);
  g.fillStyle = '#1f1d1a';
  g.font = '400 190px "Instrument Serif", Georgia, serif';
  g.fillText(EXPOSICAO.titulo, -6, 300);
  g.font = '600 40px "Familjen Grotesk", system-ui, sans-serif';
  g.fillText(EXPOSICAO.artista, 0, 380);
  g.font = '400 38px "Familjen Grotesk", system-ui, sans-serif';
  g.fillStyle = '#34312c';
  let y = 490;
  for (const linha of quebrar(g, EXPOSICAO.texto, 1240)) { g.fillText(linha, 0, y); y += 56; }
  g.font = '600 30px "Familjen Grotesk", system-ui, sans-serif';
  g.fillStyle = '#1f1d1a';
  g.fillText(EXPOSICAO.rodape, 0, 1050);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

/* ---------- balcão de recepção ---------- */
function balcao(cena, colisores, x, z) {
  const g = new THREE.Group();
  const corpo = new THREE.Mesh(new THREE.BoxGeometry(3.2, 1.05, 0.8), criarMaterial('concreto', [3.2, 1.05]));
  corpo.position.y = 0.525;
  const tampo = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.06, 0.95), criarMaterial('madeira', [3.4, 0.95]));
  tampo.position.y = 1.08;
  const folhetos = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.03, 0.22), new THREE.MeshStandardMaterial({ color: '#f1ede4', roughness: 0.9 }));
  folhetos.position.set(-0.9, 1.125, 0.1);
  folhetos.rotation.y = 0.2;
  for (const m of [corpo, tampo, folhetos]) { m.castShadow = m.receiveShadow = true; g.add(m); }
  g.position.set(x, 0, z);
  g.rotation.y = -Math.PI / 2;
  cena.add(g);
  sombraDeContato(cena, x, z, 1.6, 4, 0);
  colisores.push({ x0: x - 0.5, x1: x + 0.5, z0: z - 1.75, z1: z + 1.75 });
}

/* ---------- trilhos e luminárias ---------- */
function iluminacao(cena, cavaletes) {
  const preto = new THREE.MeshStandardMaterial({ color: '#1b1b1b', roughness: 0.45, metalness: 0.5 });
  const lente = new THREE.MeshBasicMaterial({ color: '#fff4e2' });
  const corpo = new THREE.CylinderGeometry(0.075, 0.09, 0.26, 16);
  const vidro = new THREE.CircleGeometry(0.07, 16);
  const haste = new THREE.CylinderGeometry(0.012, 0.012, 1, 6);
  const trilhos = new Map();

  for (const c of cavaletes) {
    // mesma posição do foco de luz criado em cavaletes.js; o trilho fica rente à laje
    const altura = c.destaque ? PLANTA.sala.altura - 0.03 : PLANTA.salao.altura - 0.03;
    const yFoco = c.destaque ? PLANTA.sala.altura - 0.3 : PLANTA.salao.altura - 1.1;
    const recuo = c.destaque ? 2.2 : 2.4;
    const p = new THREE.Vector3(c.centro.x + c.frente.x * recuo, yFoco, c.centro.z + c.frente.z * recuo);
    const alvo = new THREE.Vector3(c.centro.x, 1.78 * c.escala, c.centro.z);

    const lum = new THREE.Group();
    const caixa = new THREE.Mesh(corpo, preto);
    caixa.rotation.x = Math.PI / 2;
    const luz = new THREE.Mesh(vidro, lente);
    luz.position.z = 0.131;
    lum.add(caixa, luz);
    lum.position.copy(p);
    lum.lookAt(alvo);
    cena.add(lum);

    const fio = new THREE.Mesh(haste, preto);
    fio.scale.y = altura - p.y;
    fio.position.set(p.x, (altura + p.y) / 2, p.z);
    cena.add(fio);

    // um trilho por fileira, preso na laje
    const chave = c.destaque ? 'sala' : Math.round(p.z * 2) / 2;
    if (!trilhos.has(chave)) trilhos.set(chave, { z: p.z, x0: p.x, x1: p.x, y: altura, destaque: c.destaque });
    const t = trilhos.get(chave);
    t.x0 = Math.min(t.x0, p.x); t.x1 = Math.max(t.x1, p.x);
  }

  for (const t of trilhos.values()) {
    const comprimento = t.destaque ? 3 : t.x1 - t.x0 + 3;
    const trilho = new THREE.Mesh(new THREE.BoxGeometry(comprimento, 0.05, 0.06), preto);
    trilho.position.set((t.x0 + t.x1) / 2, t.y, t.z);
    cena.add(trilho);
  }
}

/* ---------- vasos com plantas ---------- */
function vaso(cena, colisores, x, z, escala, semente) {
  const r = aleatorio(400 + semente * 17);
  const g = new THREE.Group();
  const corpo = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.34, 0.75, 20), criarMaterial('concreto', [2.6, 0.75]));
  corpo.position.y = 0.375;
  const terra = new THREE.Mesh(new THREE.CircleGeometry(0.39, 20), new THREE.MeshStandardMaterial({ color: '#3b2d22', roughness: 1 }));
  terra.rotation.x = -Math.PI / 2;
  terra.position.y = 0.72;
  g.add(corpo, terra);

  // folhas largas, como uma costela-de-adão
  const folha = new THREE.MeshStandardMaterial({ color: '#3f6b3a', roughness: 0.7, side: THREE.DoubleSide, flatShading: true });
  const forma = new THREE.Shape();
  forma.moveTo(0, 0);
  forma.bezierCurveTo(0.28, 0.12, 0.3, 0.5, 0, 0.62);
  forma.bezierCurveTo(-0.3, 0.5, -0.28, 0.12, 0, 0);
  const geoFolha = new THREE.ShapeGeometry(forma, 6);
  const n = 9 + Math.floor(r() * 5);
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + r() * 0.4;
    const h = 0.55 + r() * 0.75;
    const caule = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.014, h, 5), folha);
    const ramo = new THREE.Group();
    caule.position.y = h / 2;
    const f = new THREE.Mesh(geoFolha, folha);
    f.position.y = h;
    f.rotation.x = -0.9 - r() * 0.5;
    f.scale.setScalar(0.8 + r() * 0.6);
    ramo.add(caule, f);
    ramo.position.y = 0.72;
    ramo.rotation.set(0.25 + r() * 0.35, a, 0, 'YXZ');
    g.add(ramo);
  }
  g.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  g.position.set(x, 0, z);
  g.scale.setScalar(escala);
  cena.add(g);
  sombraDeContato(cena, x, z, 1.4 * escala, 1.4 * escala);
  const raio = 0.45 * escala;
  colisores.push({ x0: x - raio, x1: x + raio, z0: z - raio, z1: z + raio });
}

/* ---------- utilidades ---------- */
function caixaGirada(x, z, largura, espessura, giro) {
  const c = Math.abs(Math.cos(giro)), s = Math.abs(Math.sin(giro));
  const mx = (largura / 2) * c + (espessura / 2) * s;
  const mz = (largura / 2) * s + (espessura / 2) * c;
  return { x0: x - mx, x1: x + mx, z0: z - mz, z1: z + mz };
}

function quebrar(g, texto, largura) {
  const linhas = [];
  let atual = '';
  for (const p of String(texto).split(' ')) {
    const teste = atual ? `${atual} ${p}` : p;
    if (g.measureText(teste).width > largura && atual) { linhas.push(atual); atual = p; }
    else atual = teste;
  }
  if (atual) linhas.push(atual);
  return linhas;
}

import * as THREE from 'three';
import { OBRAS } from './obras.js';
import { criarMaterial, texturaJanela } from './materiais.js';
import { texturaPlaceholder, texturaFicha, esperarFontes, numero } from './telas.js';

/* ---------- medidas do pavilhão (metros) ---------- */
const SALAO = { largura: 34, profundidade: 38, altura: 7.5 };
const OLHO = 1.65;
const ENTRADA = { x: 0, z: 16, yaw: 0, pitch: -0.03 };
const DISTANCIA_OBRA = 3.0;

const $ = (id) => document.getElementById(id);
const tela = $('cena');

let renderer;
try {
  renderer = new THREE.WebGLRenderer({ canvas: tela, antialias: true });
} catch (erro) {
  $('carregando').textContent = 'Seu navegador não abriu o 3D. Verifique se o WebGL está ativado.';
  throw erro;
}
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;

const cena = new THREE.Scene();
cena.background = new THREE.Color('#d6dddb');
cena.fog = new THREE.Fog('#d6dddb', 32, 75);

const camera = new THREE.PerspectiveCamera(62, 1, 0.1, 120);
camera.rotation.order = 'YXZ';

/* ---------- luz ---------- */
cena.add(new THREE.HemisphereLight('#eef2f1', '#4a463e', 1.15));
const sol = new THREE.DirectionalLight('#fff1dc', 2.3);
sol.position.set(-22, 17, 9);
sol.castShadow = true;
sol.shadow.mapSize.set(2048, 2048);
Object.assign(sol.shadow.camera, { left: -24, right: 24, top: 24, bottom: -24, near: 1, far: 70 });
sol.shadow.bias = -0.0004;
cena.add(sol);

/* ---------- arquitetura ---------- */
function construirSalao() {
  const { largura: L, profundidade: P, altura: A } = SALAO;

  const piso = new THREE.Mesh(new THREE.PlaneGeometry(L, P), criarMaterial('piso', [L, P]));
  piso.rotation.x = -Math.PI / 2;
  piso.receiveShadow = true;
  piso.name = 'piso';
  cena.add(piso);

  const teto = new THREE.Mesh(new THREE.PlaneGeometry(L, P), criarMaterial('concretoTeto', [L, P]));
  teto.rotation.x = Math.PI / 2;
  teto.position.y = A;
  cena.add(teto);

  // vigas aparentes atravessando o vão
  for (let z = -P / 2 + 2; z <= P / 2 - 2; z += 4) {
    const viga = new THREE.Mesh(new THREE.BoxGeometry(L, 0.9, 0.45), criarMaterial('concretoTeto', [L, 0.9]));
    viga.position.set(0, A - 0.45, z);
    viga.castShadow = true;
    cena.add(viga);
  }

  // paredes de concreto no fundo e na entrada
  for (const lado of [-1, 1]) {
    const parede = new THREE.Mesh(new THREE.PlaneGeometry(L, A), criarMaterial('concreto', [L, A]));
    parede.position.set(0, A / 2, lado * P / 2);
    parede.rotation.y = lado === 1 ? Math.PI : 0;
    parede.receiveShadow = true;
    cena.add(parede);
  }

  // fachadas laterais de vidro, com peitoril e caixilhos
  const vista = new THREE.MeshBasicMaterial({ map: texturaJanela() });
  const metal = criarMaterial('metal');
  for (const lado of [-1, 1]) {
    const x = lado * L / 2;
    const janela = new THREE.Mesh(new THREE.PlaneGeometry(P, A - 0.6), vista);
    janela.position.set(x, 0.6 + (A - 0.6) / 2, 0);
    janela.rotation.y = -lado * Math.PI / 2;
    cena.add(janela);

    const peitoril = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.6, P), criarMaterial('concreto', [P, 0.6]));
    peitoril.position.set(x - lado * 0.15, 0.3, 0);
    peitoril.receiveShadow = true;
    cena.add(peitoril);

    for (let z = -P / 2; z <= P / 2; z += 3.2) {
      const montante = new THREE.Mesh(new THREE.BoxGeometry(0.14, A, 0.14), metal);
      montante.position.set(x - lado * 0.07, A / 2, z);
      montante.castShadow = true;
      cena.add(montante);
    }
    const travessa = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, P), metal);
    travessa.position.set(x - lado * 0.06, 2.9, 0);
    cena.add(travessa);
  }
  return piso;
}

/* ---------- cavaletes de vidro ---------- */
function posicaoDaObra(i) {
  const linha = Math.floor(i / 3), coluna = i % 3;
  return {
    x: (coluna - 1) * 7 + (linha % 2 ? 2.2 : -1.2),
    z: 6 - linha * 6.5,
    giro: (coluna - 1) * -0.1,
  };
}

const cavaletes = [];
const alvosClicaveis = [];
const carregador = new THREE.TextureLoader();

function criarCavalete(obra, i) {
  const grupo = new THREE.Group();
  const { x, z, giro } = obra.posicao ?? posicaoDaObra(i);

  const base = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.42, 0.5), criarMaterial('concreto', [0.5, 0.42]));
  base.position.y = 0.21;
  base.castShadow = base.receiveShadow = true;
  grupo.add(base);

  // cunhas de madeira que prendem o vidro no bloco
  const madeira = criarMaterial('madeira');
  for (const lado of [-1, 1]) {
    const cunha = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.12, 0.07), madeira);
    cunha.position.set(0, 0.48, lado * 0.055);
    cunha.castShadow = true;
    grupo.add(cunha);
  }

  const vidro = new THREE.Mesh(new THREE.BoxGeometry(1.3, 2.4, 0.03), criarMaterial('vidro'));
  vidro.position.y = 1.57;
  grupo.add(vidro);

  const altura = 1.3;
  const quadro = new THREE.Mesh(
    new THREE.PlaneGeometry(1, 1),
    new THREE.MeshStandardMaterial({ map: texturaPlaceholder(obra, i), roughness: 0.6 }),
  );
  ajustarQuadro(quadro, obra.proporcao, altura);
  quadro.position.set(0, 1.78, 0.02);
  quadro.castShadow = true;
  grupo.add(quadro);

  if (obra.imagem) {
    carregador.load(obra.imagem, (tex) => {
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.anisotropy = 8;
      quadro.material.map = tex;
      quadro.material.needsUpdate = true;
      ajustarQuadro(quadro, tex.image.width / tex.image.height, altura);
    });
  }

  const ficha = new THREE.Mesh(
    new THREE.PlaneGeometry(0.42, 0.525),
    new THREE.MeshStandardMaterial({ map: texturaFicha(obra, i, OBRAS.length), roughness: 0.85 }),
  );
  ficha.position.set(0, 1.4, -0.02);
  ficha.rotation.y = Math.PI;
  grupo.add(ficha);

  grupo.position.set(x, 0, z);
  grupo.rotation.y = giro;
  cena.add(grupo);

  for (const m of [quadro, vidro, ficha, base]) { m.userData.obra = i; alvosClicaveis.push(m); }
  cavaletes.push({
    centro: new THREE.Vector3(x, 0, z),
    frente: new THREE.Vector3(Math.sin(giro), 0, Math.cos(giro)),
    giro,
  });
}

function ajustarQuadro(quadro, proporcao, alturaMax) {
  let h = alturaMax, w = h * proporcao;
  if (w > 1.15) { w = 1.15; h = w / proporcao; }
  quadro.scale.set(w, h, 1);
}

/* ---------- navegação ---------- */
const estado = {
  pos: new THREE.Vector3(ENTRADA.x, OLHO, ENTRADA.z),
  yaw: ENTRADA.yaw,
  pitch: ENTRADA.pitch,
  alvoPos: null,
  alvoYaw: null,
  alvoPitch: null,
  teclas: new Set(),
  atual: -1,
};

function irPara(pos, yaw = null, pitch = null) {
  estado.alvoPos = pos;
  estado.alvoYaw = yaw;
  estado.alvoPitch = pitch;
}

function irParaObra(i) {
  const c = cavaletes[i];
  const destino = c.centro.clone().addScaledVector(c.frente, DISTANCIA_OBRA);
  destino.y = OLHO;
  irPara(destino, c.giro, 0.03);
  mostrarFicha(i);
}

function voltarEntrada() {
  irPara(new THREE.Vector3(ENTRADA.x, OLHO, ENTRADA.z), ENTRADA.yaw, ENTRADA.pitch);
  esconderFicha();
}

const raio = new THREE.Raycaster();
let piso;

function clique(e) {
  const r = tela.getBoundingClientRect();
  const ponto = new THREE.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
  raio.setFromCamera(ponto, camera);
  const [acerto] = raio.intersectObjects([...alvosClicaveis, piso], false);
  if (!acerto) return;
  if (acerto.object.userData.obra !== undefined) {
    irParaObra(acerto.object.userData.obra);
  } else if (acerto.object === piso) {
    const destino = new THREE.Vector3(acerto.point.x, OLHO, acerto.point.z);
    const dx = destino.x - estado.pos.x, dz = destino.z - estado.pos.z;
    irPara(destino, Math.atan2(-dx, -dz), null);
    esconderFicha();
  }
}

let arrasto = null;
tela.addEventListener('pointerdown', (e) => {
  if (arrasto) return;
  arrasto = { id: e.pointerId, x: e.clientX, y: e.clientY, total: 0 };
  tela.setPointerCapture(e.pointerId);
});
tela.addEventListener('pointermove', (e) => {
  if (!arrasto || e.pointerId !== arrasto.id) return;
  const dx = e.clientX - arrasto.x, dy = e.clientY - arrasto.y;
  arrasto.x = e.clientX; arrasto.y = e.clientY;
  arrasto.total += Math.abs(dx) + Math.abs(dy);
  if (arrasto.total < 6) return;
  estado.yaw += dx * 0.0045;
  estado.pitch = THREE.MathUtils.clamp(estado.pitch + dy * 0.0035, -0.6, 0.6);
  estado.alvoYaw = estado.alvoPitch = null;
  esconderDica();
});
const soltar = (e) => {
  if (!arrasto || e.pointerId !== arrasto.id) return;
  if (arrasto.total < 6 && e.type === 'pointerup') clique(e);
  arrasto = null;
};
tela.addEventListener('pointerup', soltar);
tela.addEventListener('pointercancel', soltar);

const TECLAS = ['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright', 'shift'];
window.addEventListener('keydown', (e) => {
  const k = e.key.toLowerCase();
  if (k === 'escape') return esconderFicha();
  if (!TECLAS.includes(k) || e.target.closest?.('button')) return;
  estado.teclas.add(k);
  estado.alvoPos = estado.alvoYaw = estado.alvoPitch = null;
  esconderDica();
});
window.addEventListener('keyup', (e) => estado.teclas.delete(e.key.toLowerCase()));
window.addEventListener('blur', () => estado.teclas.clear());

function anguloMaisCurto(de, para) {
  return Math.atan2(Math.sin(para - de), Math.cos(para - de));
}

function atualizar(dt) {
  const t = estado.teclas;
  const frente = (t.has('w') || t.has('arrowup') ? 1 : 0) - (t.has('s') || t.has('arrowdown') ? 1 : 0);
  const lado = (t.has('d') ? 1 : 0) - (t.has('a') ? 1 : 0);
  const giro = (t.has('arrowleft') ? 1 : 0) - (t.has('arrowright') ? 1 : 0);
  estado.yaw += giro * dt * 1.6;

  if (frente || lado) {
    const v = (t.has('shift') ? 6 : 3.2) * dt;
    const s = Math.sin(estado.yaw), c = Math.cos(estado.yaw);
    estado.pos.x += (-s * frente + c * lado) * v;
    estado.pos.z += (-c * frente - s * lado) * v;
    esconderFicha();
  }

  const k = 1 - Math.exp(-dt * 3);
  if (estado.alvoPos) {
    estado.pos.lerp(estado.alvoPos, k);
    if (estado.pos.distanceTo(estado.alvoPos) < 0.02) estado.alvoPos = null;
  }
  if (estado.alvoYaw !== null) {
    const d = anguloMaisCurto(estado.yaw, estado.alvoYaw);
    estado.yaw += d * k;
    if (Math.abs(d) < 0.002) estado.alvoYaw = null;
  }
  if (estado.alvoPitch !== null) {
    estado.pitch += (estado.alvoPitch - estado.pitch) * k;
    if (Math.abs(estado.alvoPitch - estado.pitch) < 0.002) estado.alvoPitch = null;
  }

  // não atravessar os cavaletes nem as paredes
  for (const c of cavaletes) {
    const dx = estado.pos.x - c.centro.x, dz = estado.pos.z - c.centro.z;
    const d = Math.hypot(dx, dz);
    if (d < 0.9 && d > 0.0001) {
      estado.pos.x = c.centro.x + (dx / d) * 0.9;
      estado.pos.z = c.centro.z + (dz / d) * 0.9;
    }
  }
  const mx = SALAO.largura / 2 - 1.2, mz = SALAO.profundidade / 2 - 1.2;
  estado.pos.x = THREE.MathUtils.clamp(estado.pos.x, -mx, mx);
  estado.pos.z = THREE.MathUtils.clamp(estado.pos.z, -mz, mz);

  camera.position.copy(estado.pos);
  camera.rotation.set(estado.pitch, estado.yaw, 0);
}

/* ---------- interface ---------- */
const painel = $('ficha');

function mostrarFicha(i) {
  const obra = OBRAS[i];
  estado.atual = i;
  $('ficha-num').textContent = `Obra ${numero(i)} de ${numero(OBRAS.length - 1)}`;
  $('ficha-titulo').textContent = obra.titulo;
  $('ficha-ano').textContent = obra.ano;
  $('ficha-tecnica').textContent = obra.tecnica;
  $('ficha-dimensoes').textContent = obra.dimensoes;
  painel.hidden = false;
  esconderDica();
}

function esconderFicha() {
  painel.hidden = true;
  estado.atual = -1;
}

function esconderDica() {
  $('dica').classList.add('sumir');
}

$('anterior').addEventListener('click', () => irParaObra((Math.max(estado.atual, 0) - 1 + OBRAS.length) % OBRAS.length));
$('proxima').addEventListener('click', () => irParaObra((estado.atual + 1) % OBRAS.length));
$('fechar').addEventListener('click', esconderFicha);
$('entrada').addEventListener('click', voltarEntrada);
$('comecar').addEventListener('click', () => irParaObra(0));

/* ---------- ciclo ---------- */
function redimensionar() {
  const { clientWidth: w, clientHeight: h } = tela;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.fov = w < h ? 72 : 62;
  camera.updateProjectionMatrix();
}
window.addEventListener('resize', redimensionar);

async function iniciar() {
  await esperarFontes();
  piso = construirSalao();
  OBRAS.forEach(criarCavalete);
  redimensionar();
  $('carregando').hidden = true;

  const relogio = new THREE.Clock();
  renderer.setAnimationLoop(() => {
    atualizar(Math.min(relogio.getDelta(), 0.05));
    renderer.render(cena, camera);
  });
}

iniciar();

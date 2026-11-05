import * as THREE from 'three';
import { OBRAS } from './obras.js';
import { PLANTA, construirArquitetura } from './arquitetura.js';
import { criarAtmosfera } from './atmosfera.js';
import { criarCavaletes, pontoDeVista } from './cavaletes.js';
import { Navegacao, INICIO } from './navegacao.js';
import { esperarFontes, numero } from './telas.js';
import { Som } from './audio.js';

const $ = (id) => document.getElementById(id);
const tela = $('cena');
const leve = matchMedia('(pointer: coarse)').matches || Math.min(screen.width, screen.height) < 700;
const TOTAL = OBRAS.length;

/* ---------- renderizador ---------- */
let renderer;
try {
  renderer = new THREE.WebGLRenderer({ canvas: tela, antialias: !leve, powerPreference: 'high-performance' });
} catch (erro) {
  $('carregando').textContent = 'Seu navegador não abriu o 3D. Verifique se a aceleração gráfica (WebGL) está ativada.';
  throw erro;
}
renderer.setPixelRatio(Math.min(window.devicePixelRatio, leve ? 1.5 : 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;

const cena = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 400);
camera.rotation.order = 'YXZ';

const som = new Som();
let nav, atmosfera, cavaletes, alvos, pisos;
const vistas = new Set();
let atual = -1;
let tour = null;

/* ---------- ficha da obra ---------- */
function mostrarFicha(i) {
  const obra = OBRAS[i];
  atual = i;
  $('ficha-num').textContent = obra.destaque ? `Sala final · Obra ${numero(i)} de ${numero(TOTAL - 1)}` : `Obra ${numero(i)} de ${numero(TOTAL - 1)}`;
  $('ficha-titulo').textContent = obra.titulo;
  $('ficha-meta').textContent = [obra.ano, obra.tecnica, obra.dimensoes].filter((t) => t && t !== '—').join(' · ');
  $('ficha-texto').textContent = obra.texto ?? '';
  $('ficha').hidden = false;
  document.body.classList.add('com-ficha');
}

function esconderFicha() {
  $('ficha').hidden = true;
  document.body.classList.remove('com-ficha');
  atual = -1;
}

function marcarVista(i) {
  vistas.add(i);
  $('progresso').textContent = `${vistas.size} de ${TOTAL} obras vistas`;
  document.querySelector(`[data-obra="${i}"]`)?.classList.add('vista');
}

function irParaObra(i, aoChegar) {
  const vista = pontoDeVista(cavaletes[i]);
  // em tela de celular em pé, recua um pouco e baixa o olhar para a obra ficar acima da ficha
  if (tela.clientHeight > tela.clientWidth * 1.2) {
    const c = cavaletes[i];
    vista.pos.addScaledVector(c.frente, 1.1);
    vista.pitch = -0.2;
  }
  mostrarFicha(i);
  nav.seguir(vista.pos, {
    yaw: vista.yaw, pitch: vista.pitch,
    aoChegar: () => { marcarVista(i); aoChegar?.(); },
  });
  esconderDica();
}

/* ---------- tour guiado ---------- */
function iniciarTour() {
  tour = { i: atual >= 0 ? atual : 0, espera: null };
  $('btn-tour').innerHTML = 'Parar<span class="longo"> tour</span>';
  $('btn-tour').setAttribute('aria-pressed', 'true');
  visitarDoTour();
}

function visitarDoTour() {
  if (!tour) return;
  irParaObra(tour.i, () => {
    if (!tour) return;
    tour.espera = setTimeout(() => {
      if (!tour) return;
      tour.i++;
      if (tour.i >= TOTAL) {
        pararTour();
        avisar('Fim do percurso. Obrigado pela visita.');
        return;
      }
      visitarDoTour();
    }, 7000);
  });
}

function pararTour() {
  if (!tour) return;
  clearTimeout(tour.espera);
  tour = null;
  $('btn-tour').innerHTML = 'Tour<span class="longo"> guiado</span>';
  $('btn-tour').setAttribute('aria-pressed', 'false');
}

/* ---------- avisos e dica ---------- */
let relogioAviso;
function avisar(texto) {
  const el = $('aviso');
  el.textContent = texto;
  el.hidden = false;
  clearTimeout(relogioAviso);
  relogioAviso = setTimeout(() => { el.hidden = true; }, 4200);
}
function esconderDica() { $('dica').classList.add('sumir'); }

/* ---------- visualização em tela cheia ---------- */
const visor = { escala: 1, x: 0, y: 0, toques: new Map(), inicio: null };

function abrirVisor(i) {
  const obra = OBRAS[i];
  const fonte = cavaletes[i].fonte;
  $('visor-img').src = typeof fonte === 'string' ? fonte : fonte.toDataURL('image/jpeg', 0.92);
  $('visor-img').alt = obra.titulo;
  $('visor-titulo').textContent = obra.titulo;
  $('visor-meta').textContent = [obra.ano, obra.tecnica, obra.dimensoes].filter((t) => t && t !== '—').join(' · ');
  $('visor-texto').textContent = obra.texto ?? '';
  zoom(1, 0, 0);
  $('visor').hidden = false;
  pararTour();
  $('visor-fechar').focus();
}

function fecharVisor() {
  $('visor').hidden = true;
  $('ver-perto').focus();
}

function zoom(escala, x, y) {
  visor.escala = THREE.MathUtils.clamp(escala, 1, 5);
  const limite = (visor.escala - 1) * 0.5;
  const area = $('visor-area').getBoundingClientRect();
  visor.x = THREE.MathUtils.clamp(x, -area.width * limite, area.width * limite);
  visor.y = THREE.MathUtils.clamp(y, -area.height * limite, area.height * limite);
  $('visor-img').style.transform = `translate(${visor.x}px, ${visor.y}px) scale(${visor.escala})`;
}

function ligarVisor() {
  const area = $('visor-area');
  area.addEventListener('wheel', (e) => {
    e.preventDefault();
    zoom(visor.escala * (e.deltaY < 0 ? 1.15 : 1 / 1.15), visor.x, visor.y);
  }, { passive: false });
  area.addEventListener('dblclick', () => zoom(visor.escala > 1.2 ? 1 : 2.5, 0, 0));
  area.addEventListener('pointerdown', (e) => {
    area.setPointerCapture(e.pointerId);
    visor.toques.set(e.pointerId, { x: e.clientX, y: e.clientY });
    visor.inicio = null;
  });
  area.addEventListener('pointermove', (e) => {
    const t = visor.toques.get(e.pointerId);
    if (!t) return;
    const antes = [...visor.toques.values()].map((p) => ({ ...p }));
    t.x = e.clientX; t.y = e.clientY;
    const agora = [...visor.toques.values()];
    if (agora.length === 1) {
      zoom(visor.escala, visor.x + (agora[0].x - antes[0].x), visor.y + (agora[0].y - antes[0].y));
    } else if (agora.length === 2) {
      const d0 = Math.hypot(antes[0].x - antes[1].x, antes[0].y - antes[1].y);
      const d1 = Math.hypot(agora[0].x - agora[1].x, agora[0].y - agora[1].y);
      if (d0 > 0) zoom(visor.escala * (d1 / d0), visor.x, visor.y);
    }
  });
  const soltar = (e) => visor.toques.delete(e.pointerId);
  area.addEventListener('pointerup', soltar);
  area.addEventListener('pointercancel', soltar);
}

/* ---------- mapa da planta ---------- */
function montarMapa() {
  const { salao: S, sala: F, porta, passagem } = PLANTA;
  const ns = 'http://www.w3.org/2000/svg';
  const svg = $('mapa-svg');
  const el = (tag, attrs, pai = svg) => {
    const n = document.createElementNS(ns, tag);
    for (const [k, val] of Object.entries(attrs)) n.setAttribute(k, val);
    pai.appendChild(n);
    return n;
  };
  el('rect', { x: -13, y: S.z1, width: 26, height: 12, class: 'praca' });
  el('rect', { x: S.x0, y: S.z0, width: S.x1 - S.x0, height: S.z1 - S.z0, class: 'ambiente' });
  el('rect', { x: F.x0, y: F.z0, width: F.x1 - F.x0, height: F.z1 - F.z0, class: 'ambiente escuro' });
  el('line', { x1: -porta.largura / 2, y1: S.z1, x2: porta.largura / 2, y2: S.z1, class: 'abertura' });
  el('line', { x1: -passagem.largura / 2, y1: S.z0, x2: passagem.largura / 2, y2: S.z0, class: 'abertura' });
  cavaletes.forEach((c, i) => {
    const g = el('g', { class: 'ponto', 'data-obra': i, tabindex: 0, role: 'button', 'aria-label': `Ir para ${OBRAS[i].titulo}` });
    el('circle', { cx: c.centro.x, cy: c.centro.z, r: 2.4, class: 'toque' }, g);
    el('circle', { cx: c.centro.x, cy: c.centro.z, r: 1.15 }, g);
    const ir = () => { pararTour(); irParaObra(i); };
    g.addEventListener('click', ir);
    g.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); ir(); } });
  });
  const voce = el('g', { id: 'voce' });
  el('path', { d: 'M0 -2.6 L1.7 1.8 L0 0.9 L-1.7 1.8 Z' }, voce);
}

function atualizarMapa() {
  const p = nav.modo === 'livre' ? nav.pos : camera.position;
  $('voce').setAttribute('transform', `translate(${p.x.toFixed(2)} ${p.z.toFixed(2)}) rotate(${(-nav.yaw * 180 / Math.PI).toFixed(1)})`);
}

/* ---------- entrada pelo mouse, toque e teclado ---------- */
const raio = new THREE.Raycaster();
const ponteiro = new THREE.Vector2();
let arrasto = null;
let pairar = null;

function lancarRaio(x, y, objetos) {
  const r = tela.getBoundingClientRect();
  ponteiro.set(((x - r.left) / r.width) * 2 - 1, -((y - r.top) / r.height) * 2 + 1);
  raio.setFromCamera(ponteiro, camera);
  return raio.intersectObjects(objetos, false)[0];
}

function clique(x, y) {
  const acerto = lancarRaio(x, y, [...alvos, ...pisos]);
  if (!acerto) return;
  pararTour();
  const obra = acerto.object.userData.obra;
  if (obra !== undefined) return irParaObra(obra);
  if (pisos.includes(acerto.object)) {
    esconderFicha();
    nav.seguir(acerto.point);
    esconderDica();
  }
}

function ligarEntradas() {
  tela.addEventListener('pointerdown', (e) => {
    if (nav.modo !== 'livre' || arrasto) return;
    arrasto = { id: e.pointerId, x: e.clientX, y: e.clientY, total: 0 };
    tela.setPointerCapture(e.pointerId);
  });
  tela.addEventListener('pointermove', (e) => {
    if (e.pointerType === 'mouse' && !arrasto) pairar = { x: e.clientX, y: e.clientY };
    if (!arrasto || e.pointerId !== arrasto.id) return;
    const dx = e.clientX - arrasto.x, dy = e.clientY - arrasto.y;
    arrasto.x = e.clientX; arrasto.y = e.clientY;
    arrasto.total += Math.abs(dx) + Math.abs(dy);
    if (arrasto.total < 7) return;
    nav.olhar(dx, dy);
    pararTour();
    esconderDica();
  });
  const soltar = (e) => {
    if (!arrasto || e.pointerId !== arrasto.id) return;
    if (arrasto.total < 7 && e.type === 'pointerup') clique(e.clientX, e.clientY);
    arrasto = null;
  };
  tela.addEventListener('pointerup', soltar);
  tela.addEventListener('pointercancel', soltar);
  tela.addEventListener('pointerleave', () => { pairar = null; $('rotulo').hidden = true; });

  const TECLAS = ['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright', 'shift'];
  window.addEventListener('keydown', (e) => {
    const k = e.key.toLowerCase();
    if (k === 'escape') {
      if (!$('visor').hidden) return fecharVisor();
      if (nav.modo === 'voo') return nav.pularVoo();
      return esconderFicha();
    }
    if (!$('visor').hidden || nav.modo !== 'livre') return;
    if (!TECLAS.includes(k) || e.target.closest?.('button, input, a')) return;
    e.preventDefault();
    nav.teclas.add(k);
    esconderDica();
  });
  window.addEventListener('keyup', (e) => nav.teclas.delete(e.key.toLowerCase()));
  window.addEventListener('blur', () => nav.teclas.clear());

  nav.aoMover = () => { pararTour(); if (atual >= 0) esconderFicha(); };

  $('anterior').addEventListener('click', () => { pararTour(); irParaObra((Math.max(atual, 0) - 1 + TOTAL) % TOTAL); });
  $('proxima').addEventListener('click', () => { pararTour(); irParaObra((atual + 1) % TOTAL); });
  $('fechar').addEventListener('click', esconderFicha);
  $('ver-perto').addEventListener('click', () => atual >= 0 && abrirVisor(atual));
  $('visor-fechar').addEventListener('click', fecharVisor);
  $('btn-tour').addEventListener('click', () => (tour ? pararTour() : iniciarTour()));
  $('btn-entrada').addEventListener('click', () => {
    pararTour();
    esconderFicha();
    nav.seguir(INICIO.pos, { yaw: INICIO.yaw, pitch: INICIO.pitch });
  });
  $('btn-som').addEventListener('click', () => definirSom(!som.ligado));
  $('entrar').addEventListener('click', entrar);
  $('pular').addEventListener('click', () => nav.pularVoo());
  ligarVisor();
}

function definirSom(ligado) {
  som.definir(ligado);
  $('btn-som').innerHTML = `Som<span class="longo"> ${ligado ? 'ligado' : 'desligado'}</span>`;
  $('btn-som').setAttribute('aria-pressed', String(ligado));
  try { localStorage.setItem('vao-livre:som', ligado ? '1' : '0'); } catch {}
}

/* ---------- chegada ---------- */
function entrar() {
  definirSom($('som-inicial').checked);
  document.body.classList.replace('em-abertura', 'em-voo');
  const reduzir = matchMedia('(prefers-reduced-motion: reduce)').matches;
  nav.entrar(reduzir ? 0.01 : 8.5, () => {
    document.body.classList.replace('em-voo', 'livre');
    $('btn-tour').focus({ preventScroll: true });
  });
}

/* ---------- ciclo ---------- */
function redimensionar() {
  const { clientWidth: w, clientHeight: h } = tela;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.fov = w < h ? 70 : 58;
  camera.updateProjectionMatrix();
}
window.addEventListener('resize', redimensionar);

function atualizarPairar() {
  if (!pairar || nav.modo !== 'livre') return;
  const acerto = lancarRaio(pairar.x, pairar.y, alvos);
  const rotulo = $('rotulo');
  if (acerto) {
    rotulo.textContent = OBRAS[acerto.object.userData.obra].titulo;
    rotulo.style.transform = `translate(${pairar.x + 14}px, ${pairar.y + 14}px)`;
    rotulo.hidden = false;
    tela.style.cursor = 'pointer';
  } else {
    rotulo.hidden = true;
    tela.style.cursor = '';
  }
  pairar = null;
}

async function iniciar() {
  await esperarFontes();
  const arq = construirArquitetura(cena);
  pisos = arq.pisos;
  atmosfera = criarAtmosfera(cena, renderer, { leve });
  ({ cavaletes, alvos } = criarCavaletes(cena, OBRAS));
  const circulos = cavaletes.map((c) => ({ x: c.centro.x, z: c.centro.z, r: 0.85 * c.escala }));
  nav = new Navegacao(camera, arq.colisores, circulos);

  $('total-obras').textContent = TOTAL;
  $('progresso').textContent = `0 de ${TOTAL} obras vistas`;
  try { $('som-inicial').checked = localStorage.getItem('vao-livre:som') !== '0'; } catch {}
  montarMapa();
  ligarEntradas();
  redimensionar();

  const relogio = new THREE.Clock();
  renderer.setAnimationLoop(() => {
    const dt = Math.min(relogio.getDelta(), 0.05);
    const t = relogio.elapsedTime;
    nav.atualizar(dt, t);
    atmosfera.atualizar(dt, t);
    som.atualizar(dt, { velocidade: nav.modo === 'livre' ? nav.velocidade : 0, zona: nav.zonaAtual });
    atualizarPairar();
    atualizarMapa();
    renderer.render(cena, camera);
  });

  $('carregando').hidden = true;
  $('entrar').disabled = false;
  $('entrar').focus({ preventScroll: true });
}

iniciar();

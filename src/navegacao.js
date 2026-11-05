import * as THREE from 'three';
import { PLANTA } from './arquitetura.js';

const { clamp } = THREE.MathUtils;
const v = (x, z) => new THREE.Vector3(x, PLANTA.olho, z);

// pontos de passagem entre os ambientes
const PONTOS = {
  portaFora: v(0, 21.4),
  portaDentro: v(0, 16.8),
  fundoSalao: v(0, -17.2),
  fundoSala: v(0, -21),
};
export const INICIO = { pos: v(0, 15), yaw: 0, pitch: -0.03 };

export function zona(p) {
  const { salao: S, sala: F } = PLANTA;
  if (p.x > S.x0 && p.x < S.x1 && p.z > S.z0 && p.z < S.z1) return 'salao';
  if (p.x > F.x0 && p.x < F.x1 && p.z > F.z0 && p.z <= S.z0) return 'sala';
  return 'fora';
}

// por fora, dá a volta pelo lado do pavilhão até a praça
function rodeio(p) {
  if (p.z >= 20.5) return [];
  const sx = Math.sign(p.x) || 1;
  return [v(sx * 21.5, p.z), v(sx * 21.5, 23.5)];
}

export function caminho(origem, destino) {
  const ordem = { fora: 0, salao: 1, sala: 2 };
  let zo = ordem[zona(origem)];
  const zd = ordem[zona(destino)];
  const pts = [];
  if (zo === 0 && zd === 0 && (origem.z < 20.5) !== (destino.z < 20.5)) {
    pts.push(...(origem.z < 20.5 ? rodeio(origem) : rodeio(destino).reverse()));
  }
  while (zo < zd) {
    if (zo === 0) pts.push(...rodeio(origem), PONTOS.portaFora, PONTOS.portaDentro);
    else pts.push(PONTOS.fundoSalao, PONTOS.fundoSala);
    zo++;
  }
  while (zo > zd) {
    if (zo === 2) pts.push(PONTOS.fundoSala, PONTOS.fundoSalao);
    else pts.push(PONTOS.portaDentro, PONTOS.portaFora, ...rodeio(destino).reverse());
    zo--;
  }
  pts.push(new THREE.Vector3(destino.x, PLANTA.olho, destino.z));
  return pts.map((p) => p.clone());
}

const curto = (de, para) => Math.atan2(Math.sin(para - de), Math.cos(para - de));
const suave = (t) => t * t * (3 - 2 * t);

export class Navegacao {
  constructor(camera, colisores, circulos) {
    this.camera = camera;
    this.colisores = colisores;
    this.circulos = circulos;
    this.pos = INICIO.pos.clone();
    this.yaw = INICIO.yaw;
    this.pitch = INICIO.pitch;
    this.vel = new THREE.Vector3();
    this.teclas = new Set();
    this.modo = 'abertura';
    this.rota = null;
    this.final = null;
    this.voo = null;
    this.velocidade = 0;
    this.aoMover = null;
  }

  get zonaAtual() { return zona(this.camera.position); }

  seguir(destino, { yaw = null, pitch = null, aoChegar = null } = {}) {
    this.rota = caminho(this.pos, destino);
    this.final = { yaw, pitch, aoChegar, tempo: 0 };
  }

  parar() {
    this.rota = null;
    this.final = null;
  }

  olhar(dx, dy) {
    // arrastar para a direita vira a vista para a direita; para cima, olha para cima
    this.yaw -= dx * 0.0045;
    this.pitch = clamp(this.pitch - dy * 0.0035, -0.75, 0.75);
    if (this.final) { this.final.yaw = null; this.final.pitch = null; }
  }

  definirOlhar(de, para) {
    const dx = para.x - de.x, dy = para.y - de.y, dz = para.z - de.z;
    this.yaw = Math.atan2(-dx, -dz);
    this.pitch = Math.atan2(dy, Math.hypot(dx, dz));
  }

  // voo da praça até o salão
  entrar(duracao, aoFim) {
    const inicio = this.camera.position.clone();
    const curva = new THREE.CatmullRomCurve3([
      inicio,
      new THREE.Vector3(inicio.x * 0.45, 5, 36),
      new THREE.Vector3(1.2, 2.3, 26),
      new THREE.Vector3(0, 1.8, 20.6),
      new THREE.Vector3(0, PLANTA.olho, 17.6),
      INICIO.pos.clone(),
    ], false, 'centripetal');
    this.voo = { curva, t: 0, duracao, aoFim, yaw0: this.yaw, pitch0: this.pitch };
    this.modo = 'voo';
  }

  pularVoo() {
    if (this.modo !== 'voo') return;
    this.voo.t = this.voo.duracao;
  }

  atualizar(dt, tempo) {
    if (this.modo === 'abertura') {
      const a = 0.62 + Math.sin(tempo * 0.05) * 0.32;
      const p = new THREE.Vector3(Math.sin(a) * 46, 10.5 + Math.sin(tempo * 0.08) * 0.8, Math.cos(a) * 46 + 4);
      this.camera.position.copy(p);
      this.definirOlhar(p, new THREE.Vector3(0, 3.6, -1));
      this.aplicarRotacao();
      return;
    }

    if (this.modo === 'voo') {
      const vo = this.voo;
      vo.t = Math.min(vo.t + dt, vo.duracao);
      const e = suave(vo.t / vo.duracao);
      const p = vo.curva.getPointAt(e);
      this.camera.position.copy(p);
      const frente = vo.curva.getPointAt(Math.min(1, e + 0.05));
      frente.y = THREE.MathUtils.lerp(frente.y, p.y, 0.6);
      if (frente.distanceTo(p) > 0.05) this.definirOlhar(p, frente);
      const entrada = suave(clamp(e / 0.2, 0, 1));
      const saida = suave(clamp((e - 0.75) / 0.25, 0, 1));
      this.yaw = vo.yaw0 + curto(vo.yaw0, this.yaw) * entrada;
      this.yaw += curto(this.yaw, INICIO.yaw) * saida;
      this.pitch = THREE.MathUtils.lerp(vo.pitch0, this.pitch, entrada);
      this.pitch = THREE.MathUtils.lerp(this.pitch, INICIO.pitch, saida);
      this.aplicarRotacao();
      if (vo.t >= vo.duracao) {
        this.pos.copy(INICIO.pos);
        this.yaw = INICIO.yaw;
        this.pitch = INICIO.pitch;
        this.modo = 'livre';
        this.voo = null;
        vo.aoFim?.();
      }
      return;
    }

    this.mover(dt);
  }

  mover(dt) {
    const t = this.teclas;
    const desejada = new THREE.Vector3();
    const frente = (t.has('w') || t.has('arrowup') ? 1 : 0) - (t.has('s') || t.has('arrowdown') ? 1 : 0);
    const lado = (t.has('d') ? 1 : 0) - (t.has('a') ? 1 : 0);
    this.yaw += ((t.has('arrowleft') ? 1 : 0) - (t.has('arrowright') ? 1 : 0)) * dt * 1.7;

    if (frente || lado) {
      if (this.rota) this.parar();
      const s = Math.sin(this.yaw), c = Math.cos(this.yaw);
      const vmax = t.has('shift') ? 6 : 3;
      desejada.set(-s * frente + c * lado, 0, -c * frente - s * lado).setLength(vmax);
      this.aoMover?.();
    } else if (this.rota) {
      this.seguirRota(dt, desejada);
    }

    this.vel.lerp(desejada, 1 - Math.exp(-dt * 6));
    this.pos.addScaledVector(this.vel, dt);
    this.velocidade = this.vel.length();
    this.colidir();

    if (!this.rota && this.final) this.alinharFinal(dt);

    this.camera.position.copy(this.pos);
    this.camera.position.y += Math.sin(this.passada = (this.passada ?? 0) + this.velocidade * dt * 4.2) * 0.012 * Math.min(1, this.velocidade / 2);
    this.aplicarRotacao();
  }

  seguirRota(dt, desejada) {
    const alvo = this.rota[0];
    const dx = alvo.x - this.pos.x, dz = alvo.z - this.pos.z;
    const dist = Math.hypot(dx, dz);
    const ultimo = this.rota.length === 1;
    this.final.tempo += dt;

    if (!ultimo && dist < 0.7) { this.rota.shift(); return; }
    if ((ultimo && dist < 0.04) || this.final.tempo > 30) {
      this.rota = null;
      const cb = this.final.aoChegar;
      this.final.aoChegar = null;
      cb?.();
      return;
    }
    const vmax = 2.8;
    const s = ultimo ? Math.min(vmax, dist * 1.6 + 0.05) : vmax;
    desejada.set(dx / dist, 0, dz / dist).multiplyScalar(s);

    const k = 1 - Math.exp(-dt * 3);
    const perto = ultimo && dist < 2.4;
    if (perto && this.final.yaw !== null) this.yaw += curto(this.yaw, this.final.yaw) * k;
    else if (dist > 0.4 && (this.final.yaw !== null || !ultimo || dist > 1.2)) this.yaw += curto(this.yaw, Math.atan2(-dx, -dz)) * k;
    const pitchAlvo = perto && this.final.pitch !== null ? this.final.pitch : 0;
    this.pitch += (pitchAlvo - this.pitch) * k;
  }

  alinharFinal(dt) {
    const k = 1 - Math.exp(-dt * 3);
    let pronto = true;
    if (this.final.yaw !== null) {
      const d = curto(this.yaw, this.final.yaw);
      this.yaw += d * k;
      if (Math.abs(d) > 0.002) pronto = false;
    }
    if (this.final.pitch !== null) {
      const d = this.final.pitch - this.pitch;
      this.pitch += d * k;
      if (Math.abs(d) > 0.002) pronto = false;
    }
    if (pronto) this.final = null;
  }

  colidir() {
    const r = 0.35, p = this.pos;
    for (const b of this.colisores) {
      const cx = clamp(p.x, b.x0, b.x1), cz = clamp(p.z, b.z0, b.z1);
      const dx = p.x - cx, dz = p.z - cz;
      const d = Math.hypot(dx, dz);
      if (d >= r) continue;
      if (d > 1e-5) {
        p.x = cx + (dx / d) * r;
        p.z = cz + (dz / d) * r;
      } else {
        const saidas = [[b.x0 - r - p.x, 0], [b.x1 + r - p.x, 0], [0, b.z0 - r - p.z], [0, b.z1 + r - p.z]];
        saidas.sort((a, b2) => Math.abs(a[0] + a[1]) - Math.abs(b2[0] + b2[1]));
        p.x += saidas[0][0];
        p.z += saidas[0][1];
      }
    }
    for (const c of this.circulos) {
      const dx = p.x - c.x, dz = p.z - c.z;
      const d = Math.hypot(dx, dz);
      if (d < c.r && d > 1e-5) { p.x = c.x + (dx / d) * c.r; p.z = c.z + (dz / d) * c.r; }
    }
    p.x = clamp(p.x, -60, 60);
    p.z = clamp(p.z, -60, 65);
  }

  aplicarRotacao() {
    this.camera.rotation.set(this.pitch, this.yaw, 0);
  }
}

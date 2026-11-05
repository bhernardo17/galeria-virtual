import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { texturaCeu, aleatorio } from './materiais.js';
import { PLANTA } from './arquitetura.js';

// Luz de fim de tarde, reflexos, céu, árvores e poeira no ar.
export function criarAtmosfera(cena, renderer, { leve = false } = {}) {
  const pmrem = new THREE.PMREMGenerator(renderer);
  cena.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  cena.environmentIntensity = 0.42;
  pmrem.dispose();

  const ceu = new THREE.Mesh(
    new THREE.SphereGeometry(160, 32, 16),
    new THREE.MeshBasicMaterial({ map: texturaCeu(), side: THREE.BackSide, fog: false, depthWrite: false }),
  );
  cena.add(ceu);
  cena.background = new THREE.Color('#d9d6cc');
  cena.fog = new THREE.Fog('#e3dccd', 45, 150);

  cena.add(new THREE.HemisphereLight('#e9eef0', '#5a5246', 0.6));

  // sol baixo entrando pela fachada da esquerda
  const sol = new THREE.DirectionalLight('#ffdcb0', 3.2);
  sol.position.set(-34, 15, 12);
  sol.castShadow = true;
  sol.shadow.mapSize.set(leve ? 1024 : 2048, leve ? 1024 : 2048);
  Object.assign(sol.shadow.camera, { left: -30, right: 30, top: 30, bottom: -30, near: 1, far: 100 });
  sol.shadow.bias = -0.0005;
  sol.shadow.normalBias = 0.02;
  cena.add(sol, sol.target);

  plantarArvores(cena);
  const poeira = criarPoeira(cena, leve ? 250 : 600);

  return {
    atualizar(dt, tempo) {
      const pos = poeira.geometry.attributes.position;
      const base = poeira.userData.base;
      for (let i = 0; i < pos.count; i++) {
        const f = base[i * 4 + 3];
        pos.setXYZ(i,
          base[i * 4] + Math.sin(tempo * 0.11 + f) * 0.35,
          base[i * 4 + 1] + Math.sin(tempo * 0.07 + f * 2) * 0.25,
          base[i * 4 + 2] + Math.cos(tempo * 0.09 + f) * 0.35);
      }
      pos.needsUpdate = true;
    },
  };
}

function criarPoeira(cena, n) {
  const { salao: S } = PLANTA;
  const r = aleatorio(91);
  const geo = new THREE.BufferGeometry();
  const posicoes = new Float32Array(n * 3);
  const base = new Float32Array(n * 4);
  for (let i = 0; i < n; i++) {
    base[i * 4] = S.x0 + r() * (S.x1 - S.x0);
    base[i * 4 + 1] = 0.4 + r() * (S.altura - 1.2);
    base[i * 4 + 2] = S.z0 + r() * (S.z1 - S.z0);
    base[i * 4 + 3] = r() * 100;
  }
  geo.setAttribute('position', new THREE.BufferAttribute(posicoes, 3));
  const disco = document.createElement('canvas');
  disco.width = disco.height = 32;
  const g = disco.getContext('2d');
  const grad = g.createRadialGradient(16, 16, 0, 16, 16, 16);
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 32, 32);
  const pontos = new THREE.Points(geo, new THREE.PointsMaterial({
    color: '#fff3dc', size: 0.028, sizeAttenuation: true, transparent: true, opacity: 0.6,
    map: new THREE.CanvasTexture(disco),
    depthWrite: false, blending: THREE.AdditiveBlending,
  }));
  pontos.userData.base = base;
  pontos.frustumCulled = false;
  cena.add(pontos);
  return pontos;
}

function plantarArvores(cena) {
  const r = aleatorio(123);
  const lugares = [];
  const orbita = (x, z) => { const a = Math.atan2(x, z - 4); return a > 0.05 && a < 1.25 && Math.hypot(x, z - 4) < 60; };
  const livre = (x, z) =>
    !(x > -24 && x < 24 && z > -36 && z < 24) && // pavilhão e calçadas
    !(x > -15 && x < 15 && z >= 24 && z < 33) && // praça
    !(Math.abs(x) < 5 && z > 30) &&               // caminho de entrada
    !orbita(x, z) &&                              // trajeto da câmera na abertura
    !(x < -24 && x > -52 && z > -45 && z < 45);   // deixa o sol da tarde entrar no salão
  let tentativas = 0;
  while (lugares.length < 90 && tentativas++ < 3000) {
    const a = r() * Math.PI * 2, d = 26 + r() * 55;
    const x = Math.sin(a) * d, z = Math.cos(a) * d - 4;
    if (!livre(x, z)) continue;
    if (lugares.some((p) => Math.hypot(p.x - x, p.z - z) < 4.5)) continue;
    lugares.push({ x, z, s: 0.8 + r() * 0.8 });
  }

  const tronco = new THREE.InstancedMesh(
    new THREE.CylinderGeometry(0.14, 0.24, 1, 6),
    new THREE.MeshStandardMaterial({ color: '#4a3b2e', roughness: 0.95 }),
    lugares.length,
  );
  const copa = new THREE.InstancedMesh(
    new THREE.IcosahedronGeometry(1, 1),
    new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.9, flatShading: true }),
    lugares.length * 2,
  );
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const cor = new THREE.Color();
  const verdes = ['#4f6b3c', '#5d7a44', '#3f5a34', '#6f8a4a', '#7a8c52'];
  lugares.forEach((p, i) => {
    const h = 3.2 * p.s;
    m.compose(new THREE.Vector3(p.x, h / 2, p.z), q, new THREE.Vector3(p.s, h, p.s));
    tronco.setMatrixAt(i, m);
    for (let k = 0; k < 2; k++) {
      const raio = (1.6 + r() * 1.2) * p.s;
      q.setFromEuler(new THREE.Euler(r(), r() * 3, r()));
      m.compose(new THREE.Vector3(p.x + (r() - 0.5) * 1.2, h + raio * (0.5 + k * 0.6), p.z + (r() - 0.5) * 1.2), q,
        new THREE.Vector3(raio, raio * (0.8 + r() * 0.3), raio));
      copa.setMatrixAt(i * 2 + k, m);
      copa.setColorAt(i * 2 + k, cor.set(verdes[Math.floor(r() * verdes.length)]));
    }
    q.identity();
  });
  tronco.castShadow = copa.castShadow = true;
  cena.add(tronco, copa);
}

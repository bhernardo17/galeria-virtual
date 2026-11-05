// Som ambiente sintetizado na hora: ar do salão, passos e pássaros lá fora.
// Nenhum arquivo de áudio é necessário.

export class Som {
  constructor() {
    this.ctx = null;
    this.ligado = false;
    this.relogioPasso = 0;
    this.relogioPassaro = 2;
  }

  iniciar() {
    if (this.ctx) return true;
    const Contexto = window.AudioContext || window.webkitAudioContext;
    if (!Contexto) return false;
    const ctx = (this.ctx = new Contexto());

    this.mestre = ctx.createGain();
    this.mestre.gain.value = 0;
    this.mestre.connect(ctx.destination);

    // reverberação do salão de concreto
    this.eco = ctx.createConvolver();
    this.eco.buffer = this.respostaDoSalao(2.6);
    this.molhado = ctx.createGain();
    this.molhado.gain.value = 0.35;
    this.eco.connect(this.molhado).connect(this.mestre);

    // ar do ambiente: ruído marrom filtrado
    const tam = ctx.sampleRate * 4;
    const buf = ctx.createBuffer(1, tam, ctx.sampleRate);
    const d = buf.getChannelData(0);
    let ultimo = 0;
    for (let i = 0; i < tam; i++) {
      ultimo = (ultimo + 0.02 * (Math.random() * 2 - 1)) / 1.02;
      d[i] = ultimo * 3.5;
    }
    const ar = ctx.createBufferSource();
    ar.buffer = buf;
    ar.loop = true;
    const filtro = ctx.createBiquadFilter();
    filtro.type = 'lowpass';
    filtro.frequency.value = 520;
    this.ar = ctx.createGain();
    this.ar.gain.value = 0.3;
    ar.connect(filtro).connect(this.ar).connect(this.mestre);
    ar.start();

    // ruído branco curto para os passos
    this.ruido = ctx.createBuffer(1, ctx.sampleRate * 0.25, ctx.sampleRate);
    const r = this.ruido.getChannelData(0);
    for (let i = 0; i < r.length; i++) r[i] = Math.random() * 2 - 1;
    return true;
  }

  respostaDoSalao(segundos) {
    const ctx = this.ctx;
    const tam = Math.floor(ctx.sampleRate * segundos);
    const buf = ctx.createBuffer(2, tam, ctx.sampleRate);
    for (let c = 0; c < 2; c++) {
      const d = buf.getChannelData(c);
      for (let i = 0; i < tam; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / tam, 3.2);
    }
    return buf;
  }

  definir(ligado) {
    this.ligado = ligado;
    if (ligado && !this.iniciar()) return;
    if (!this.ctx) return;
    if (ligado) this.ctx.resume();
    const t = this.ctx.currentTime;
    this.mestre.gain.cancelScheduledValues(t);
    this.mestre.gain.setTargetAtTime(ligado ? 0.7 : 0, t, 0.35);
  }

  passo(zona) {
    const ctx = this.ctx;
    const t = ctx.currentTime;
    const fonte = ctx.createBufferSource();
    fonte.buffer = this.ruido;
    fonte.playbackRate.value = 0.8 + Math.random() * 0.4;
    const banda = ctx.createBiquadFilter();
    banda.type = 'bandpass';
    banda.frequency.value = zona === 'fora' ? 500 + Math.random() * 200 : 1100 + Math.random() * 500;
    banda.Q.value = 1.4;
    const env = ctx.createGain();
    const volume = zona === 'fora' ? 0.12 : 0.26;
    env.gain.setValueAtTime(0.0001, t);
    env.gain.exponentialRampToValueAtTime(volume, t + 0.006);
    env.gain.exponentialRampToValueAtTime(0.0001, t + 0.13);
    fonte.connect(banda).connect(env);
    env.connect(this.mestre);
    if (zona !== 'fora') env.connect(this.eco);
    fonte.start(t);
    fonte.stop(t + 0.2);
  }

  passaro(volume) {
    const ctx = this.ctx;
    let t = ctx.currentTime;
    const base = 2400 + Math.random() * 1400;
    const notas = 2 + Math.floor(Math.random() * 3);
    for (let k = 0; k < notas; k++) {
      const osc = ctx.createOscillator();
      const env = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(base, t);
      osc.frequency.exponentialRampToValueAtTime(base * (1.25 + Math.random() * 0.3), t + 0.06);
      osc.frequency.exponentialRampToValueAtTime(base * 0.9, t + 0.12);
      env.gain.setValueAtTime(0.0001, t);
      env.gain.exponentialRampToValueAtTime(volume, t + 0.015);
      env.gain.exponentialRampToValueAtTime(0.0001, t + 0.13);
      osc.connect(env).connect(this.mestre);
      osc.start(t);
      osc.stop(t + 0.15);
      t += 0.16 + Math.random() * 0.08;
    }
  }

  atualizar(dt, { velocidade, zona }) {
    if (!this.ligado || !this.ctx) return;
    const alvoAr = zona === 'sala' ? 0.16 : zona === 'fora' ? 0.42 : 0.3;
    this.ar.gain.setTargetAtTime(alvoAr, this.ctx.currentTime, 0.8);

    if (velocidade > 0.6) {
      this.relogioPasso -= dt * (velocidade / 2.6);
      if (this.relogioPasso <= 0) { this.passo(zona); this.relogioPasso = 0.52; }
    } else {
      this.relogioPasso = 0.15;
    }

    this.relogioPassaro -= dt;
    if (this.relogioPassaro <= 0) {
      if (zona === 'fora') this.passaro(0.05);
      else if (zona === 'salao') this.passaro(0.012);
      this.relogioPassaro = (zona === 'fora' ? 2 : 6) + Math.random() * 6;
    }
  }
}

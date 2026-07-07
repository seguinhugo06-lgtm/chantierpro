/**
 * celebrate — micro-délice sans dépendance
 *
 * Burst de confettis en canvas éphémère (aucune lib externe, ~2 Ko).
 * Respecte `prefers-reduced-motion` et se nettoie tout seul.
 *
 * @module celebrate
 */

let running = false;

/**
 * Lance un burst de confettis plein écran.
 * @param {Object} [opts]
 * @param {number} [opts.particleCount=110]
 * @param {number} [opts.duration=2400] durée en ms
 * @param {string[]} [opts.colors] palette hex
 */
export function confetti({ particleCount = 110, duration = 2400, colors } = {}) {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  if (running) return; // évite les doublons rapprochés
  // Accessibilité : pas d'animation si l'utilisateur la refuse
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  running = true;

  const canvas = document.createElement('canvas');
  canvas.setAttribute('aria-hidden', 'true');
  canvas.style.cssText = 'position:fixed;inset:0;width:100vw;height:100vh;pointer-events:none;z-index:99999;';
  document.body.appendChild(canvas);

  const ctx = canvas.getContext('2d');
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  // Chaîne de repli : évite un canvas 0×0 si les métriques du viewport
  // ne sont pas encore disponibles (tir avant layout, contextes exotiques).
  const W = window.innerWidth || document.documentElement.clientWidth || (window.screen && window.screen.width) || 1024;
  const H = window.innerHeight || document.documentElement.clientHeight || (window.screen && window.screen.height) || 768;
  canvas.width = W * dpr;
  canvas.height = H * dpr;
  ctx.scale(dpr, dpr);

  const palette = colors || ['#f97316', '#10b981', '#6366f1', '#f59e0b', '#ef4444', '#3b82f6', '#ec4899'];
  const parts = Array.from({ length: particleCount }, () => ({
    x: W / 2 + (Math.random() - 0.5) * W * 0.35,
    y: H * 0.32 + (Math.random() - 0.5) * 50,
    vx: (Math.random() - 0.5) * 13,
    vy: Math.random() * -15 - 4,
    size: Math.random() * 7 + 4,
    color: palette[(Math.random() * palette.length) | 0],
    rot: Math.random() * Math.PI * 2,
    vrot: (Math.random() - 0.5) * 0.35,
    shape: Math.random() > 0.5 ? 'rect' : 'circle',
  }));

  const gravity = 0.32;
  const drag = 0.992;
  const start = performance.now();

  function frame(now) {
    const t = now - start;
    const fade = t > duration - 500 ? Math.max(0, (duration - t) / 500) : 1;
    ctx.clearRect(0, 0, W, H);
    ctx.globalAlpha = fade;
    for (const p of parts) {
      p.vx *= drag;
      p.vy = p.vy * drag + gravity;
      p.x += p.vx;
      p.y += p.vy;
      p.rot += p.vrot;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.fillStyle = p.color;
      if (p.shape === 'rect') {
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
      } else {
        ctx.beginPath();
        ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }
    if (t < duration) {
      requestAnimationFrame(frame);
    } else {
      canvas.remove();
      running = false;
    }
  }
  requestAnimationFrame(frame);
}

/**
 * Célèbre un jalon métier : confettis + (au 1er) toast spécial.
 * @param {'devis_signe'|'facture_payee'} kind
 * @param {Object} [toast] store toast ({ success })
 */
export function celebrateMilestone(kind, toast) {
  const flag = `cp_first_${kind}`;
  let isFirst = false;
  try {
    isFirst = !localStorage.getItem(flag);
    if (isFirst) localStorage.setItem(flag, '1');
  } catch {
    // localStorage indisponible — on célèbre quand même
  }

  confetti(kind === 'facture_payee'
    ? { colors: ['#10b981', '#34d399', '#6ee7b7', '#f59e0b', '#fbbf24'] }
    : undefined);

  // Toast célébration uniquement au tout premier jalon (les composants
  // affichent déjà leur propre confirmation pour les suivants).
  if (isFirst && toast?.success) {
    if (kind === 'facture_payee') {
      toast.success('🎉 Votre première facture payée !', 'Bravo — vous êtes payé pour votre travail.');
    } else {
      toast.success('🎉 Votre premier devis signé !', 'Félicitations, un nouveau chantier commence.');
    }
  }
}

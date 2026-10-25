// Page du profil : Cat.exe, éclats d'emoji, œufs de Pâques et compteur GoatCounter (visites et événements).
import { $, el } from './outils.js?v=0.30.0';
import { status } from './donnees.js?v=0.30.0';
import { openTile } from './divers.js?v=0.30.0';

/* ---- Cat.exe : la planche de Cat.exe (8 × 6 cases) ---- */
const CAT = {
  cols: 8,
  rows: 6,
  anims: {
    sit: [25, 25, 25, 25, 25, 26, 26],
    purr: [27],
    groom: [28, 29, 30, 29],
    sleep: [33],
    stretch: [34, 35, 35, 36],
    pounce: [37, 38, 39, 40, 41],
    walk: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
  },
};
function makeCat(size = 160) {
  const c = el('div', { class: 'scat', style: `width:${size}px;height:${size * 0.75}px` });
  let frames = CAT.anims.sit,
    i = 0,
    timer = null,
    once = null;
  const show = (f) => {
    c.style.backgroundPosition = `${((f % CAT.cols) / (CAT.cols - 1)) * 100}% ${(Math.floor(f / CAT.cols) / (CAT.rows - 1)) * 100}%`;
  };
  const play = (name, fps = 4, after = null) => {
    frames = CAT.anims[name] || CAT.anims.sit;
    i = 0;
    once = after;
    clearInterval(timer);
    show(frames[0]);
    timer = setInterval(() => {
      i++;
      if (i >= frames.length) {
        if (once) {
          const f = once;
          once = null;
          f();
          return;
        }
        i = 0;
      }
      show(frames[i]);
    }, 1000 / fps);
  };
  c.play = play;
  play('sit', 1);
  return c;
}
export function catView(d) {
  const n0 = (d.evenements || {}).calins || 0;
  let mine = 0;
  try {
    mine = Number(localStorage.getItem('kp-calins-' + new Date().toDateString()) || 0);
  } catch {
    /* rien */
  }
  const cat = makeCat(200);
  const count = el('strong', { class: 'big' }, (n0 + 0).toLocaleString('fr-FR'));
  const hint = el(
    'p',
    { class: 'muted small' },
    'Clique sur le chat pour le caresser. Il ronronne, et le compteur de câlins est partagé entre tous les visiteurs (30 par jour et par personne, il faut le laisser dormir).',
  );
  let local = 0,
    last = 0;
  const idle = () => {
    const r = Math.random();
    cat.play(r < 0.5 ? 'sit' : r < 0.8 ? 'groom' : 'sleep', 2);
  };
  const idleTimer = setInterval(idle, 6000);
  cat.addEventListener('click', () => {
    const now = Date.now();
    if (now - last < 700) return;
    last = now;
    if (mine >= 30) {
      hint.textContent = 'Il dort… reviens demain pour d’autres câlins.';
      cat.play('sleep', 1);
      return;
    }
    mine++;
    local++;
    try {
      localStorage.setItem('kp-calins-' + new Date().toDateString(), String(mine));
    } catch {
      /* rien */
    }
    gcEvent('calins', 'Câlin à Cat.exe');
    count.textContent = (n0 + local).toLocaleString('fr-FR');
    burst(cat, '💗');
    cat.play(Math.random() < 0.2 ? 'stretch' : 'purr', 3, () => cat.play('sit', 1));
  });
  const eggs = foundEggs();
  const obs = new MutationObserver(() => {
    if ($('modal').hidden) {
      clearInterval(idleTimer);
      obs.disconnect();
    }
  });
  obs.observe($('modal'), { attributes: true });
  return [
    el(
      'div',
      { class: 'center' },
      el('span', { class: 'catpad' }, cat, window.KP_EXTRAS ? window.KP_EXTRAS.chapeau() : null),
      el('div', { class: 'calins' }, count, el('span', { class: 'muted small' }, ' câlins')),
      hint,
    ),
    el('hr'),
    el(
      'p',
      { class: 'muted small' },
      `🥚 Œufs de Pâques trouvés sur ce site : ${eggs.length} / ${EGGS.length}. ${eggs.length ? `Trouvés : ${eggs.map((e) => EGG_NAMES[e]).join(', ')}.` : 'Il y en a cachés un peu partout…'}`,
    ),
  ];
}
export function burst(node, emoji) {
  const r = node.getBoundingClientRect();
  for (let k = 0; k < 6; k++) {
    const p = el(
      'span',
      {
        class: 'fx',
        style: `left:${r.left + r.width / 2 + (Math.random() - 0.5) * r.width * 0.6}px;top:${r.top + r.height / 2}px;--dx:${(Math.random() - 0.5) * 120}px;--d:${600 + Math.random() * 500}ms`,
      },
      emoji,
    );
    document.body.append(p);
    setTimeout(() => p.remove(), 1200);
  }
}

/* ---------------- GoatCounter : visites + événements (ping, câlins, œufs) ---------------- */
let gcCode = '';
export function gcEvent(path, title) {
  if (!gcCode) return;
  if (window.goatcounter && window.goatcounter.count) {
    window.goatcounter.count({ path, title, event: true });
    return;
  }
  const u = `https://${gcCode}.goatcounter.com/count?p=${encodeURIComponent(path)}&t=${encodeURIComponent(title || path)}&e=true&rnd=${Math.random().toString(36).slice(2)}`;
  try {
    navigator.sendBeacon ? navigator.sendBeacon(u) : (new Image().src = u);
  } catch {
    new Image().src = u;
  }
}

/* ---------------- Œufs de Pâques ---------------- */
const EGGS = ['konami', 'logo', 'miaou', 'hibou'];
const EGG_NAMES = {
  konami: 'le code Konami',
  logo: 'le logo caressé',
  miaou: 'le mot magique',
  hibou: 'le hibou de nuit',
};
const foundEggs = () => {
  try {
    return JSON.parse(localStorage.getItem('kp-oeufs') || '[]');
  } catch {
    return [];
  }
};
function egg(id, text) {
  const f = foundEggs();
  const first = !f.includes(id);
  if (first) {
    f.push(id);
    try {
      localStorage.setItem('kp-oeufs', JSON.stringify(f));
    } catch {
      /* rien */
    }
    gcEvent(`oeuf-${id}`, `Œuf : ${id}`);
  }
  const t = el(
    'div',
    { class: 'egg-toast' },
    el('strong', {}, first ? '🥚 Œuf de Pâques trouvé !' : '🥚 Déjà trouvé'),
    el('span', {}, text),
  );
  document.body.append(t);
  setTimeout(() => t.remove(), 4000);
}
function catRain() {
  for (let k = 0; k < 14; k++) {
    const c = makeCat(70 + Math.random() * 60);
    c.classList.add('rain');
    c.style.left = `${Math.random() * 95}vw`;
    c.style.animationDuration = `${3 + Math.random() * 3}s`;
    c.style.animationDelay = `${Math.random() * 2}s`;
    c.play('walk', 12);
    document.body.append(c);
    setTimeout(() => c.remove(), 7000);
  }
}
export function brancherOeufs() {
  const konami = [
    'ArrowUp',
    'ArrowUp',
    'ArrowDown',
    'ArrowDown',
    'ArrowLeft',
    'ArrowRight',
    'ArrowLeft',
    'ArrowRight',
    'b',
    'a',
  ];
  let ki = 0,
    typed = '';
  document.addEventListener('keydown', (e) => {
    ki = e.key === konami[ki] ? ki + 1 : e.key === konami[0] ? 1 : 0;
    if (ki === konami.length) {
      ki = 0;
      egg('konami', 'Il pleut des chats.');
      catRain();
    }
    if (e.key.length === 1) {
      typed = (typed + e.key.toLowerCase()).slice(-5);
      if (typed === 'miaou') {
        typed = '';
        egg('miaou', 'Miaou à toi aussi.');
        document.body.classList.add('party');
        setTimeout(() => document.body.classList.remove('party'), 6000);
      }
    }
  });
  let clicks = 0,
    t0 = 0;
  $('footLogo').addEventListener('click', () => {
    const now = Date.now();
    clicks = now - t0 < 4000 ? clicks + 1 : 1;
    t0 = now;
    if (clicks === 7) {
      clicks = 0;
      egg('logo', 'Sept caresses sur le logo : le chat apprécie.');
      document.body.classList.add('paws');
      setTimeout(() => document.body.classList.remove('paws'), 15000);
    }
  });
  const h = new Date().getHours();
  if (h >= 2 && h < 5)
    setTimeout(() => egg('hibou', 'Toi aussi tu es debout à cette heure-ci ? Bienvenue chez les hiboux.'), 4000);
}

/* ---------------- Vues : GoatCounter (visiteurs uniques, sans cookie) ---------------- */
let gcLoaded = false;
export async function views(enabled, code) {
  const box = $('views');
  gcCode = String(code || '')
    .replace(/[^a-z0-9-]/gi, '')
    .toLowerCase();
  box.hidden = !enabled || !gcCode;
  box.onclick = () => openTile('visiteurs');
  if (!enabled || !gcCode) return;
  if (!gcLoaded) {
    gcLoaded = true;
    const sc = document.createElement('script');
    sc.async = true;
    sc.src = '//gc.zgo.at/count.js';
    sc.setAttribute('data-goatcounter', `https://${gcCode}.goatcounter.com/count`);
    document.head.append(sc);
    try {
      const r = await fetch(`https://${gcCode}.goatcounter.com/counter/TOTAL.json`, { cache: 'no-store' });
      const j = await r.json();
      const n = Number(String(j.count || '').replace(/\D/g, ''));
      box.textContent =
        Number.isFinite(n) && n > 0 ? `${n.toLocaleString('fr-FR')} visite${n > 1 ? 's' : ''}` : 'visites';
    } catch {
      const v = status && status.divers && status.divers.visiteurs;
      box.textContent = v && v.total ? `${v.total.toLocaleString('fr-FR')} visiteurs` : 'visites';
    }
  }
}

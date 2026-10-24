// Page du profil : page Divers — tuiles, ouverture des fiches, fiches Activité, Trophées et Mes tops.
import { $, el, pad } from './outils.js?v=0.29.0';
import { status } from './donnees.js?v=0.29.0';
import { openSheet } from './rendu.js?v=0.29.0';
import { stat } from './bibliotheque.js?v=0.29.0';
import {
  collectionView,
  guestbookView,
  habitsView,
  hoursView,
  pingView,
  playlistView,
  recapView,
  recordsView,
  setupView,
  visitorsView,
} from './fiches.js?v=0.29.0';
import { catView } from './amusements.js?v=0.29.0';

/* ---------------- Divers : tuiles + fiches ---------------- */
export const flag = (code) =>
  String(code || '').length === 2
    ? String.fromCodePoint(...[...code.toUpperCase()].map((c) => 127397 + c.charCodeAt(0)))
    : '🌐';
export const hms = (sec) => {
  const h = Math.floor(sec / 3600),
    m = Math.round((sec % 3600) / 60);
  return h ? `${h} h ${pad(m)}` : `${m} min`;
};
export const monthName = (ym) => {
  const [y, m] = ym.split('-').map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
};
const TILE_DEF = {
  activite: ['📊', 'Activité', (d) => (d.activite ? `${d.activite.joursActifs} jours actifs` : 'bientôt')],
  trophees: [
    '🏆',
    'Trophées',
    (d) => (d.trophees ? `${d.trophees.or} or · ${d.trophees.argent} argent · ${d.trophees.bronze} bronze` : 'bientôt'),
  ],
  tops: ['🥇', 'Mes tops', (d) => `${(d.tops || []).length} classement${(d.tops || []).length > 1 ? 's' : ''}`],
  records: [
    '⚡',
    'Records',
    (d) => (d.records && d.records.sessionMax ? `session max ${hms(d.records.sessionMax.secondes)}` : 'bientôt'),
  ],
  recap: ['📆', 'Récap du mois', (d) => (d.recaps && d.recaps.length ? monthName(d.recaps[0].mois) : 'bientôt')],
  horaires: ['🕒', 'Quand me trouver', (d) => (d.activite ? peakLabel(d.activite.heures) : 'bientôt')],
  setup: [
    '🖥️',
    'Setup',
    (d) =>
      d.setup && d.setup.machine && d.setup.machine.processeur
        ? d.setup.machine.processeur
            .split(' · ')[0]
            .replace(/\(R\)|\(TM\)|CPU|Processor/g, '')
            .trim()
        : 'mon PC',
  ],
  collection: [
    '🎞️',
    'Collection',
    (d) => `${(d.collection || []).length} média${(d.collection || []).length > 1 ? 's' : ''}`,
  ],
  livreOr: [
    '📖',
    'Livre d’or',
    (d) =>
      `${((d.livreOr || {}).messages || []).length} message${((d.livreOr || {}).messages || []).length > 1 ? 's' : ''}`,
  ],
  playlist: [
    '🎵',
    'Playlist',
    (d) => {
      const p = d.playlist || {};
      const n = (p.propositions || []).length;
      const c = (p.coupsDeCoeur || []).length;
      return `${c ? `${c} coup${c > 1 ? 's' : ''} de cœur · ` : ''}${n} proposition${n > 1 ? 's' : ''}`;
    },
  ],
  ping: [
    '👋',
    'Me faire coucou',
    (d) => `${(d.evenements || {}).ping || 0} coucou${((d.evenements || {}).ping || 0) > 1 ? 's' : ''}`,
  ],
  visiteurs: [
    '🌍',
    'Visiteurs',
    (d) =>
      d.visiteurs
        ? `${(d.visiteurs.total || 0).toLocaleString('fr-FR')} · ${(d.visiteurs.pays || []).length} pays`
        : 'bientôt',
  ],
  chat: [
    '🐈‍⬛',
    'Cat.exe',
    (d) => `${(d.evenements || {}).calins || 0} câlin${((d.evenements || {}).calins || 0) > 1 ? 's' : ''}`,
  ],
  habitudes: [
    '✅',
    'Habitudes',
    (d) =>
      d.habitudes
        ? `série de ${d.habitudes.serie} jour${d.habitudes.serie > 1 ? 's' : ''} · record ${d.habitudes.record}`
        : 'bientôt',
  ],
};
export function peakLabel(h) {
  if (!h || !h.some((x) => x > 0)) return 'pas encore assez de données';
  // Meilleure fenêtre de 4 h consécutives
  let best = 0,
    bi = 0;
  for (let i = 0; i < 24; i++) {
    const v = h[i] + h[(i + 1) % 24] + h[(i + 2) % 24] + h[(i + 3) % 24];
    if (v > best) {
      best = v;
      bi = i;
    }
  }
  return `plutôt ${bi} h – ${(bi + 4) % 24} h`;
}
export function renderDivers(s) {
  const d = s.divers;
  const box = $('tiles');
  if (!d) {
    box.replaceChildren(el('p', { class: 'empty' }, 'Rien ici pour l’instant.'));
    return;
  }
  const tiles = d.tuiles.filter((t) => TILE_DEF[t]);
  box.replaceChildren(
    ...tiles.map((t) => {
      const [ico, label, sub] = TILE_DEF[t];
      return el(
        'button',
        { class: 'tile', type: 'button', 'data-tile': t, onclick: () => openTile(t) },
        el('span', { class: 'ico' }, ico),
        el('strong', {}, label),
        el('span', { class: 'muted small' }, sub(d)),
      );
    }),
  );
  if (!tiles.length) box.replaceChildren(el('p', { class: 'empty' }, 'Rien ici pour l’instant.'));
}
export function openTile(t) {
  const d = status.divers || {};
  const open = (title, nodes, wide) => {
    openSheet(title, nodes);
    $('modal').querySelector('.modal-box').classList.toggle('wide', !!wide);
  };
  switch (t) {
    case 'activite':
      return open('Activité', activityView(d.activite), true);
    case 'trophees':
      return open('Trophées KuroPurr', trophiesView(d.trophees), true);
    case 'tops':
      return open('Mes tops', topsView(d.tops || []), true);
    case 'records':
      return open('Records', recordsView(d.records));
    case 'recap':
      return open('Récap', recapView(d.recaps || []), true);
    case 'horaires':
      return open('Quand me trouver', hoursView(d.activite));
    case 'setup':
      return open('Setup', setupView(d.setup));
    case 'collection':
      return open('Collection', collectionView(d.collection || []), true);
    case 'livreOr':
      return open('Livre d’or', guestbookView(d.livreOr || {}), true);
    case 'playlist':
      return open('Playlist', playlistView(d.playlist || {}));
    case 'ping':
      return open('Me faire coucou', pingView(d));
    case 'visiteurs':
      return open('Visiteurs', visitorsView(d.visiteurs));
    case 'chat':
      return open('Cat.exe', catView(d));
    case 'habitudes':
      return open('Habitudes', habitsView(d.habitudes));
    default:
      return null;
  }
}
export const note = (t) => el('p', { class: 'muted small', style: 'margin:8px 0 0' }, t);
function activityView(a) {
  if (!a) return [note('Pas encore de données.')];
  const days = a.jours;
  const max = Math.max(1, ...days.map((x) => x.j + x.m));
  const level = (v) => (v <= 0 ? 0 : v < max * 0.15 ? 1 : v < max * 0.4 ? 2 : v < max * 0.7 ? 3 : 4);
  // Colonnes = semaines (lundi en haut)
  const first = new Date(days[0].d + 'T00:00:00');
  const lead = (first.getDay() + 6) % 7;
  const cells = [...Array(lead).fill(null), ...days];
  const weeks = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  const months = [];
  weeks.forEach((w, i) => {
    const c = w.find(Boolean);
    if (!c) return;
    const dt = new Date(c.d + 'T00:00:00');
    if (dt.getDate() <= 7) months.push([i, dt.toLocaleDateString('fr-FR', { month: 'short' })]);
  });
  const grid = el(
    'div',
    { class: 'heat' },
    el(
      'div',
      { class: 'heat-months' },
      months.map(([i, m]) => el('span', { style: `grid-column:${i + 1}` }, m)),
    ),
    el(
      'div',
      { class: 'heat-grid', style: `grid-template-columns:repeat(${weeks.length}, 1fr)` },
      weeks.map((w) =>
        el(
          'div',
          { class: 'heat-col' },
          [0, 1, 2, 3, 4, 5, 6].map((k) => {
            const c = w[k];
            return el('span', {
              class: `heat-cell l${c ? level(c.j + c.m) : 0} ${c ? '' : 'none'}`,
              title: c
                ? `${new Date(c.d + 'T00:00:00').toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })} · jeu ${hms(c.j)} · musique ${hms(c.m)}${c.a ? ` · animé ${hms(c.a)}` : ''}`
                : '',
            });
          }),
        ),
      ),
    ),
    el(
      'div',
      { class: 'heat-legend muted small' },
      'moins ',
      [0, 1, 2, 3, 4].map((l) => el('span', { class: `heat-cell l${l}` })),
      ' plus',
    ),
  );
  const last30 = days.slice(-30);
  const sum = (k) => last30.reduce((n, x) => n + x[k], 0);
  return [
    el(
      'div',
      { class: 'pstats' },
      stat('Jours actifs', a.joursActifs),
      stat('Heures de jeu', a.heuresJeu),
      stat('Heures de musique', a.heuresMusique),
      a.heuresAnime ? stat('Heures d’animé', a.heuresAnime) : null,
      stat('30 derniers jours', hms(sum('j') + sum('m') + last30.reduce((n, x) => n + (x.a || 0), 0))),
    ),
    el('hr'),
    grid,
    note('Une case par jour sur un an : jeu et musique vus par KuroPurr (au moins 5 min pour compter un jour actif).'),
  ];
}
function trophiesView(t) {
  if (!t) return [note('Pas encore de trophées.')];
  const medal = (n) => ['⚪', '🥉', '🥈', '🥇'][n] || '⚪';
  const names = ['à débloquer', 'bronze', 'argent', 'or'];
  const list = t.liste.slice().sort((a, b) => b.niveau - a.niveau || b.progression - a.progression);
  return [
    el(
      'div',
      { class: 'pstats' },
      stat('Or', t.or),
      stat('Argent', t.argent),
      stat('Bronze', t.bronze),
      stat('Total', t.total),
    ),
    el('hr'),
    el(
      'div',
      { class: 'trophies' },
      list.map((x) =>
        el(
          'div',
          { class: `trophy n${x.niveau}` },
          el('span', { class: 'ico' }, x.icone),
          el(
            'div',
            { class: 'tt' },
            el('strong', {}, x.nom, ' ', el('span', { class: 'medal', title: names[x.niveau] }, medal(x.niveau))),
            el('span', { class: 'muted small' }, x.description),
            el(
              'span',
              { class: 'bar' },
              el('span', { class: 'fill', style: `width:${Math.round(x.progression * 100)}%` }),
            ),
            el(
              'span',
              { class: 'muted small nums' },
              `${Number.isInteger(x.valeur) ? x.valeur : x.valeur.toFixed(1)} ${x.unite}${x.prochain != null ? ` · prochain palier ${x.prochain}` : ' · palier maximum'}`,
            ),
          ),
        ),
      ),
    ),
    note('Calculés par KuroPurr à partir de l’activité réelle : paliers bronze, argent, or.'),
  ];
}
function topsView(tops) {
  if (!tops.length) return [note('Pas encore de classement.')];
  const wrap = el('div', {});
  const grid = () =>
    el(
      'div',
      { class: 'topsgrid' },
      tops.map((t) => {
        const first = t.items[0] || {};
        return el(
          'button',
          { class: 'topsq', type: 'button', onclick: () => show(t) },
          first.image
            ? el('img', { src: first.image, alt: '', loading: 'lazy', onerror: (e) => e.target.remove() })
            : null,
          el(
            'span',
            { class: 'nm' },
            el('strong', {}, t.nom),
            el(
              'span',
              { class: 'small' },
              `${t.items.length} entrée${t.items.length > 1 ? 's' : ''}${first.nom ? ` · n°1 ${first.nom}` : ''}`,
            ),
          ),
        );
      }),
    );
  const show = (t) => {
    let i = 0;
    const card = el('div', { class: 'topcard' });
    const draw = () => {
      const it = t.items[i] || {};
      card.replaceChildren(
        el('span', { class: 'rank' }, `#${i + 1}`),
        it.image
          ? el('img', { src: it.image, alt: '', onerror: (e) => e.target.remove() })
          : el('span', { class: 'ph' }, String(it.nom || '?').charAt(0)),
        el('strong', {}, it.nom || '—'),
        it.note ? el('p', {}, it.note) : null,
        el('span', { class: 'muted small' }, `${i + 1} / ${t.items.length} · clique pour continuer`),
      );
    };
    card.addEventListener('click', () => {
      i = (i + 1) % Math.max(1, t.items.length);
      draw();
    });
    draw();
    wrap.replaceChildren(
      el(
        'button',
        {
          class: 'link-btn',
          type: 'button',
          onclick: () => wrap.replaceChildren(el('h2', {}, 'Choisis un top'), grid()),
        },
        '← Tous les tops',
      ),
      el('h2', {}, t.nom),
      card,
      el(
        'div',
        { class: 'topdots' },
        t.items.map((_, k) =>
          el('button', {
            class: k === i ? 'on' : '',
            type: 'button',
            onclick: (e) => {
              e.stopPropagation();
              i = k;
              draw();
              [...e.currentTarget.parentElement.children].forEach((b, j) => b.classList.toggle('on', j === k));
            },
          }),
        ),
      ),
    );
  };
  wrap.replaceChildren(el('h2', {}, 'Choisis un top'), grid());
  return [wrap];
}

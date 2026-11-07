// Page du profil : page Divers — tuiles, ouverture des fiches, fiches Activité, Trophées et Mes tops.
import { $, el, pad } from './outils.js?v=0.35.0';
import { status } from './donnees.js?v=0.35.0';
import { openSheet } from './rendu.js?v=0.35.0';
import { stat } from './bibliotheque.js?v=0.35.0';
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
} from './fiches.js?v=0.35.0';
import { catView } from './amusements.js?v=0.35.0';
import { locale, pl, t } from './i18n.js?v=0.35.0';

/* ---------------- Divers : tuiles + fiches ---------------- */
export const flag = (code) =>
  String(code || '').length === 2
    ? String.fromCodePoint(...[...code.toUpperCase()].map((c) => 127397 + c.charCodeAt(0)))
    : '🌐';
export const hms = (sec) => {
  const h = Math.floor(sec / 3600),
    m = Math.round((sec % 3600) / 60);
  return h ? t('{h} h {m}', { h, m: pad(m) }) : t('{n} min', { n: m });
};
export const monthName = (ym) => {
  const [y, m] = ym.split('-').map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString(locale(), { month: 'long', year: 'numeric' });
};
const TILE_DEF = {
  activite: [
    '📊',
    'Activité',
    (d) => (d.activite ? t('{n} jours actifs', { n: d.activite.joursActifs }) : t('bientôt')),
  ],
  trophees: [
    '🏆',
    'Trophées',
    (d) =>
      d.trophees
        ? t('{or} or · {argent} argent · {bronze} bronze', {
            or: d.trophees.or,
            argent: d.trophees.argent,
            bronze: d.trophees.bronze,
          })
        : t('bientôt'),
  ],
  tops: ['🥇', 'Mes tops', (d) => pl((d.tops || []).length, '{n} classement', '{n} classements')],
  records: [
    '⚡',
    'Records',
    (d) =>
      d.records && d.records.sessionMax
        ? t('session max {d}', { d: hms(d.records.sessionMax.secondes) })
        : t('bientôt'),
  ],
  recap: ['📆', 'Récap du mois', (d) => (d.recaps && d.recaps.length ? monthName(d.recaps[0].mois) : t('bientôt'))],
  horaires: ['🕒', 'Quand me trouver', (d) => (d.activite ? peakLabel(d.activite.heures) : t('bientôt'))],
  setup: [
    '🖥️',
    'Setup',
    (d) =>
      d.setup && d.setup.machine && d.setup.machine.processeur
        ? d.setup.machine.processeur
            .split(' · ')[0]
            .replace(/\(R\)|\(TM\)|CPU|Processor/g, '')
            .trim()
        : t('mon PC'),
  ],
  collection: ['🎞️', 'Collection', (d) => pl((d.collection || []).length, '{n} média', '{n} médias')],
  livreOr: ['📖', 'Livre d’or', (d) => pl(((d.livreOr || {}).messages || []).length, '{n} message', '{n} messages')],
  playlist: [
    '🎵',
    'Playlist',
    (d) => {
      const p = d.playlist || {};
      const n = (p.propositions || []).length;
      const c = (p.coupsDeCoeur || []).length;
      return `${c ? `${pl(c, '{n} coup de cœur', '{n} coups de cœur')} · ` : ''}${pl(n, '{n} proposition', '{n} propositions')}`;
    },
  ],
  ping: ['👋', 'Me faire coucou', (d) => pl((d.evenements || {}).ping || 0, '{n} coucou', '{n} coucous')],
  visiteurs: [
    '🌍',
    'Visiteurs',
    (d) =>
      d.visiteurs
        ? t('{n} · {p} pays', {
            n: (d.visiteurs.total || 0).toLocaleString(locale()),
            p: (d.visiteurs.pays || []).length,
          })
        : t('bientôt'),
  ],
  chat: ['🐈‍⬛', 'Cat.exe', (d) => pl((d.evenements || {}).calins || 0, '{n} câlin', '{n} câlins')],
  habitudes: [
    '✅',
    'Habitudes',
    (d) =>
      d.habitudes
        ? `${pl(d.habitudes.serie, 'série de {n} jour', 'série de {n} jours')} · ${t('record {n}', { n: d.habitudes.record })}`
        : t('bientôt'),
  ],
};
export function peakLabel(h) {
  if (!h || !h.some((x) => x > 0)) return t('pas encore assez de données');
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
  return t('plutôt {a} h – {b} h', { a: bi, b: (bi + 4) % 24 });
}
export function renderDivers(s) {
  const d = s.divers;
  const box = $('tiles');
  if (!d) {
    box.replaceChildren(el('p', { class: 'empty' }, t('Rien ici pour l’instant.')));
    return;
  }
  // Jamais `t` comme nom de variable ici : `t` est la traduction (i18n.js) — 0.32.1
  const tiles = d.tuiles.filter((id) => TILE_DEF[id]);
  box.replaceChildren(
    ...tiles.map((id) => {
      const [ico, label, sub] = TILE_DEF[id];
      return el(
        'button',
        { class: 'tile', type: 'button', 'data-tile': id, onclick: () => openTile(id) },
        el('span', { class: 'ico' }, ico),
        el('strong', {}, t(label)),
        el('span', { class: 'muted small' }, sub(d)),
      );
    }),
  );
  if (!tiles.length) box.replaceChildren(el('p', { class: 'empty' }, t('Rien ici pour l’instant.')));
}
export function openTile(id) {
  const d = status.divers || {};
  const open = (title, nodes, wide) => {
    openSheet(t(title), nodes);
    $('modal').querySelector('.modal-box').classList.toggle('wide', !!wide);
  };
  switch (id) {
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
export const note = (texte) => el('p', { class: 'muted small', style: 'margin:8px 0 0' }, texte);
function activityView(a) {
  if (!a) return [note(t('Pas encore de données.'))];
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
    if (dt.getDate() <= 7) months.push([i, dt.toLocaleDateString(locale(), { month: 'short' })]);
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
                ? `${new Date(c.d + 'T00:00:00').toLocaleDateString(locale(), { weekday: 'short', day: 'numeric', month: 'short' })} · ${t('jeu {d}', { d: hms(c.j) })} · ${t('musique {d}', { d: hms(c.m) })}${c.a ? ` · ${t('animé {d}', { d: hms(c.a) })}` : ''}`
                : '',
            });
          }),
        ),
      ),
    ),
    el(
      'div',
      { class: 'heat-legend muted small' },
      `${t('moins')} `,
      [0, 1, 2, 3, 4].map((l) => el('span', { class: `heat-cell l${l}` })),
      ` ${t('plus')}`,
    ),
  );
  const last30 = days.slice(-30);
  const sum = (k) => last30.reduce((n, x) => n + x[k], 0);
  return [
    el(
      'div',
      { class: 'pstats' },
      stat(t('Jours actifs'), a.joursActifs),
      stat(t('Heures de jeu'), a.heuresJeu),
      stat(t('Heures de musique'), a.heuresMusique),
      a.heuresAnime ? stat(t('Heures d’animé'), a.heuresAnime) : null,
      stat(t('30 derniers jours'), hms(sum('j') + sum('m') + last30.reduce((n, x) => n + (x.a || 0), 0))),
    ),
    el('hr'),
    grid,
    note(
      t('Une case par jour sur un an : jeu et musique vus par KuroPurr (au moins 5 min pour compter un jour actif).'),
    ),
  ];
}
function trophiesView(tr) {
  if (!tr) return [note(t('Pas encore de trophées.'))];
  const medal = (n) => ['⚪', '🥉', '🥈', '🥇'][n] || '⚪';
  const names = ['à débloquer', 'bronze', 'argent', 'or'];
  const list = tr.liste.slice().sort((a, b) => b.niveau - a.niveau || b.progression - a.progression);
  return [
    el(
      'div',
      { class: 'pstats' },
      stat(t('Or'), tr.or),
      stat(t('Argent'), tr.argent),
      stat(t('Bronze'), tr.bronze),
      stat(t('Total'), tr.total),
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
            el('strong', {}, x.nom, ' ', el('span', { class: 'medal', title: t(names[x.niveau]) }, medal(x.niveau))),
            el('span', { class: 'muted small' }, x.description),
            el(
              'span',
              { class: 'bar' },
              el('span', { class: 'fill', style: `width:${Math.round(x.progression * 100)}%` }),
            ),
            el(
              'span',
              { class: 'muted small nums' },
              `${Number.isInteger(x.valeur) ? x.valeur : x.valeur.toFixed(1)} ${x.unite}${x.prochain != null ? ` · ${t('prochain palier {n}', { n: x.prochain })}` : ` · ${t('palier maximum')}`}`,
            ),
          ),
        ),
      ),
    ),
    note(t('Calculés par KuroPurr à partir de l’activité réelle : paliers bronze, argent, or.')),
  ];
}
function topsView(tops) {
  if (!tops.length) return [note(t('Pas encore de classement.'))];
  const wrap = el('div', {});
  const grid = () =>
    el(
      'div',
      { class: 'topsgrid' },
      tops.map((tp) => {
        const first = tp.items[0] || {};
        return el(
          'button',
          { class: 'topsq', type: 'button', onclick: () => show(tp) },
          first.image
            ? el('img', { src: first.image, alt: '', loading: 'lazy', onerror: (e) => e.target.remove() })
            : null,
          el(
            'span',
            { class: 'nm' },
            el('strong', {}, tp.nom),
            el(
              'span',
              { class: 'small' },
              `${pl(tp.items.length, '{n} entrée', '{n} entrées')}${first.nom ? ` · ${t('n°1 {nom}', { nom: first.nom })}` : ''}`,
            ),
          ),
        );
      }),
    );
  const show = (tp) => {
    let i = 0;
    const card = el('div', { class: 'topcard' });
    const draw = () => {
      const it = tp.items[i] || {};
      card.replaceChildren(
        el('span', { class: 'rank' }, `#${i + 1}`),
        it.image
          ? el('img', { src: it.image, alt: '', onerror: (e) => e.target.remove() })
          : el('span', { class: 'ph' }, String(it.nom || '?').charAt(0)),
        el('strong', {}, it.nom || '—'),
        it.note ? el('p', {}, it.note) : null,
        el('span', { class: 'muted small' }, t('{i} / {n} · clique pour continuer', { i: i + 1, n: tp.items.length })),
      );
    };
    card.addEventListener('click', () => {
      i = (i + 1) % Math.max(1, tp.items.length);
      draw();
    });
    draw();
    wrap.replaceChildren(
      el(
        'button',
        {
          class: 'link-btn',
          type: 'button',
          onclick: () => wrap.replaceChildren(el('h2', {}, t('Choisis un top')), grid()),
        },
        t('← Tous les tops'),
      ),
      el('h2', {}, tp.nom),
      card,
      el(
        'div',
        { class: 'topdots' },
        tp.items.map((_, k) =>
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
  wrap.replaceChildren(el('h2', {}, t('Choisis un top')), grid());
  return [wrap];
}

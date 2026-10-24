// Page du profil : briques des bibliothèques (Jeux, Médiathèque, Musique) — profil, compteurs, tri, recherche, critiques.
import { dateFmt, el } from './outils.js?v=0.28.1';
import { status } from './donnees.js?v=0.28.1';
import { renderGames } from './jeux.js?v=0.28.1';
import { renderAnime } from './mediatheque.js?v=0.28.1';
import { renderMusic } from './musique.js?v=0.28.1';

const gstate = {
  steam: { q: '', genre: '', sort: 'hours', desc: true },
  roblox: { q: '', genre: '', sort: 'hours', desc: true },
  anime: { q: '', genre: '', sort: 'score', desc: true },
  manga: { q: '', genre: '', sort: 'score', desc: true },
  series: { q: '', genre: '', sort: 'updated', desc: true },
  films: { q: '', genre: '', sort: 'updated', desc: true },
  spotify: { q: '', genre: '', sort: 'date', desc: true },
};

export const gprofile = (p, sub) =>
  p
    ? el(
        'div',
        { class: 'gprofile' },
        p.avatar
          ? el('img', {
              src: p.avatar,
              alt: '',
              onerror: (e) => e.target.replaceWith(el('span', { class: 'ini' }, String(p.nom || '?').charAt(0))),
            })
          : el('span', { class: 'ini' }, String(p.nom || '?').charAt(0)),
        el(
          'div',
          { class: 'gt' },
          el('strong', {}, p.nom || p.pseudo),
          sub ? el('span', { class: 'muted' }, sub) : null,
          p.url ? el('a', { href: p.url, target: '_blank', rel: 'noopener' }, 'Voir le profil ↗') : null,
        ),
      )
    : null;
export const stat = (label, value, id, on, onclick) =>
  el(
    'button',
    { class: `pstat ${on ? 'on' : ''} ${onclick ? '' : 'static'}`, type: 'button', onclick: onclick || null },
    el('span', {}, label),
    el('b', { class: typeof value === 'string' && value.length > 6 ? 'txt' : '' }, String(value)),
  );
const SORTS = {
  steam: [
    ['hours', 'Heures de jeu'],
    ['recent', 'Heures récentes'],
    ['last', 'Dernière session'],
    ['name', 'Nom'],
  ],
  roblox: [
    ['hours', 'Temps de jeu'],
    ['sessions', 'Sessions'],
    ['last', 'Dernière session'],
    ['name', 'Nom'],
  ],
  anime: [
    ['score', 'Ma note'],
    ['mean', 'Note MAL'],
    ['progress', 'Épisodes vus'],
    ['updated', 'Dernière mise à jour'],
    ['year', 'Année'],
    ['name', 'Titre'],
  ],
  manga: [
    ['score', 'Ma note'],
    ['mean', 'Note MAL'],
    ['progress', 'Chapitres lus'],
    ['updated', 'Dernière mise à jour'],
    ['year', 'Année'],
    ['name', 'Titre'],
  ],
  series: [
    ['updated', 'Dernier épisode vu'],
    ['score', 'Ma note'],
    ['mean', 'Note Simkl'],
    ['progress', 'Épisodes vus'],
    ['year', 'Année'],
    ['name', 'Titre'],
  ],
  films: [
    ['updated', 'Dernier visionnage'],
    ['score', 'Ma note'],
    ['mean', 'Note Simkl'],
    ['year', 'Année'],
    ['name', 'Titre'],
  ],
  spotify: [
    ['date', 'Date d’écoute'],
    ['duration', 'Durée écoutée'],
    ['name', 'Titre'],
    ['artist', 'Artiste'],
  ],
};
/** Barre d'outils : recherche, genre, tri, ordre. */
export function tools(kind, genres, label = 'Tous les genres') {
  const st = gstate[kind];
  const redo = () =>
    kind === 'steam' || kind === 'roblox'
      ? renderGames(status)
      : kind === 'spotify'
        ? renderMusic(status)
        : renderAnime(status);
  const q = el('input', {
    class: 'gsearch',
    type: 'search',
    placeholder: 'Chercher…',
    value: st.q,
    oninput: (e) => {
      st.q = e.target.value;
      redo();
    },
  });
  const genre = el(
    'select',
    {
      class: 'gsel',
      onchange: (e) => {
        st.genre = e.target.value;
        redo();
      },
    },
    el('option', { value: '' }, label),
    ...genres.map((g) => el('option', { value: g, selected: st.genre === g }, g)),
  );
  const sort = el(
    'select',
    {
      class: 'gsel',
      onchange: (e) => {
        st.sort = e.target.value;
        redo();
      },
    },
    ...SORTS[kind].map(([v, l]) => el('option', { value: v, selected: st.sort === v }, l)),
  );
  const order = el(
    'button',
    {
      class: 'gorder',
      type: 'button',
      title: 'Inverser l’ordre',
      onclick: () => {
        st.desc = !st.desc;
        redo();
      },
    },
    st.desc ? '↓ Décroissant' : '↑ Croissant',
  );
  return el('div', { class: 'gtools' }, q, genres.length ? genre : null, sort, order);
}
export function applyTools(kind, list, keyOf) {
  const st = gstate[kind];
  const q = st.q.trim().toLowerCase();
  let out = list.filter(
    (g) =>
      (!q ||
        String(g.nom || g.titre)
          .toLowerCase()
          .includes(q)) &&
      (!st.genre || (g.genres || [g.genre]).includes(st.genre)),
  );
  out.sort((a, b) => {
    const ka = keyOf(a, st.sort),
      kb = keyOf(b, st.sort);
    const r = typeof ka === 'string' ? ka.localeCompare(kb) : ka - kb;
    return st.desc ? -r : r;
  });
  return out;
}
/* Mes critiques (KuroPurr 0.23) : notes perso publiées, en bloc discret sous la bibliothèque. */
export function critiquesBlock(s, type) {
  const list = (Array.isArray(s.critiques) ? s.critiques : []).filter((c) => c && c.type === type && c.titre);
  if (!list.length) return [];
  const safe = (u) => (typeof u === 'string' && u.startsWith('https://') ? u : null);
  return [
    el(
      'details',
      { class: 'crits' },
      el('summary', {}, `Mes critiques (${list.length})`),
      el(
        'div',
        { class: 'crits-list' },
        list.map((c) =>
          el(
            'article',
            { class: 'crit' },
            safe(c.image)
              ? el('img', {
                  src: safe(c.image),
                  alt: '',
                  loading: 'lazy',
                  class: type === 'jeu' ? 'wide' : '',
                  onerror: (e) => e.target.remove(),
                })
              : null,
            el(
              'div',
              { class: 'crit-body' },
              el(
                'div',
                { class: 'crit-top' },
                safe(c.url)
                  ? el('a', { href: safe(c.url), target: '_blank', rel: 'noopener' }, c.titre)
                  : el('b', {}, c.titre),
                c.note != null ? el('span', { class: 'star' }, '★ ', el('b', {}, `${c.note}/10`)) : null,
              ),
              c.texte ? el('p', {}, c.texte) : null,
              c.date ? el('small', { class: 'muted' }, dateFmt.format(Date.parse(c.date))) : null,
            ),
          ),
        ),
      ),
    ),
  ];
}
export const scroller = (cards, empty) =>
  el(
    'div',
    { class: 'scroller' },
    cards.length ? el('div', { class: 'ggrid' }, cards) : el('p', { class: 'empty' }, empty),
  );

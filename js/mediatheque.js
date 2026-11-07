// Page du profil : Médiathèque — anime et manga (MyAnimeList), séries et films (Simkl).
import { $, el, when } from './outils.js?v=0.35.0';
import { status } from './donnees.js?v=0.35.0';
import { applyTools, critiquesBlock, gprofile, scroller, stat, tools } from './bibliotheque.js?v=0.35.0';
import { t } from './i18n.js?v=0.35.0';

let aniKind = 'anime',
  aniFilter = 'all';

/* ---------------- Médiathèque : Anime / Manga (MyAnimeList), Séries / Films (Simkl) ---------------- */
const ANI_STATUS = {
  watching: ['watching', '👁', 'En cours', 'En lecture'],
  completed: ['completed', '✨', 'Terminé', 'Terminé'],
  on_hold: ['onhold', '⏸', 'En pause', 'En pause'],
  dropped: ['dropped', '✖', 'Abandonné', 'Abandonné'],
  plan_to_watch: ['plan', '🕒', 'Prévu', 'Prévu'],
};
const FILM_STATUS = {
  completed: ['completed', '✨', 'Vu'],
  plan_to_watch: ['plan', '🕒', 'À voir'],
  dropped: ['dropped', '✖', 'Abandonné'],
  on_hold: ['onhold', '⏸', 'En pause'],
  watching: ['watching', '👁', 'En cours'],
};
const TYPES = {
  series: 'Série',
  film: 'Film',
  tv: 'TV',
  movie: 'Film',
  ova: 'OVA',
  ona: 'ONA',
  special: 'Spécial',
  music: 'Musique',
  manga: 'Manga',
  novel: 'Roman',
  light_novel: 'Light novel',
  one_shot: 'One-shot',
  manhwa: 'Manhwa',
  manhua: 'Manhua',
  doujinshi: 'Dōjinshi',
};
function aniCard(a, kind) {
  const manga = kind === 'manga',
    film = kind === 'films';
  const st = (film ? FILM_STATUS[a.statut] : ANI_STATUS[a.statut]) || ['plan', '•', a.statut, a.statut];
  const unit = manga ? t('ch.') : t('eps');
  const prog = film
    ? a.duree
      ? t('{n} min', { n: a.duree })
      : ''
    : `${a.progression}${a.total ? `/${a.total}` : ''} ${unit}`;
  return el(
    'a',
    { class: 'gcard', href: a.url, target: '_blank', rel: 'noopener', title: a.titre },
    el(
      'span',
      { class: 'cov' },
      String(a.titre).charAt(0),
      a.image ? el('img', { src: a.image, alt: '', loading: 'lazy', onerror: (e) => e.target.remove() }) : null,
      el('span', { class: 'nm' }, el('span', {}, a.titre)),
    ),
    el(
      'div',
      { class: 'gi' },
      el(
        'div',
        { class: 'nums' },
        el('span', { class: 'star' }, '★ ', el('b', {}, a.note ? a.note : 'N/A')),
        el('span', {}, prog),
      ),
      el(
        'p',
        {},
        [
          TYPES[a.type] ? t(TYPES[a.type]) : a.type,
          a.annee,
          a.moyenne ? `${film || kind === 'series' ? 'Simkl' : 'MAL'} ${a.moyenne}` : '',
          ...(a.genres || []).slice(0, 2),
        ]
          .filter(Boolean)
          .join(' · '),
      ),
      el('span', { class: `st ${st[0]}` }, `${st[1]} ${t(manga ? st[3] : st[2])}`),
    ),
  );
}
export function renderAnime(s) {
  for (const b of $('aniSwitch').children) b.classList.toggle('on', b.dataset.kind === aniKind);
  const body = $('aniBody');
  const active = document.activeElement && document.activeElement.classList.contains('gsearch');
  const trakt = aniKind === 'series' || aniKind === 'films'; // Simkl
  const root = trakt ? s.simkl : s.anime;
  const data = root && root[aniKind];
  const EMPTY = {
    anime: 'Pas de liste d’animes pour l’instant.',
    manga: 'Pas de liste de mangas pour l’instant.',
    series: 'Pas de séries pour l’instant.',
    films: 'Pas de films pour l’instant.',
  };
  if (!data || !data.liste) {
    body.replaceChildren(el('p', { class: 'empty' }, t(EMPTY[aniKind])), ...agendaLien(s));
    return;
  }
  const manga = aniKind === 'manga',
    film = aniKind === 'films';
  const p = root.profil || {};
  const ps = p[aniKind] || {};
  const sub = trakt
    ? [
        ps.nombre ? (film ? t('{n} films vus', { n: ps.nombre }) : t('{n} séries', { n: ps.nombre })) : '',
        ps.episodes ? t('{n} épisodes', { n: ps.episodes }) : '',
        ps.heures ? t('{n} h', { n: ps.heures }) : '',
        root.maj ? t('lu {quand}', { quand: when(root.maj) }) : '',
      ]
        .filter(Boolean)
        .join(' · ')
    : [
        ps.jours
          ? manga
            ? t('{n} jours de lecture', { n: ps.jours })
            : t('{n} jours de visionnage', { n: ps.jours })
          : '',
        ps.note ? t('note moyenne {n}', { n: ps.note }) : '',
        root.maj ? t('liste lue {quand}', { quand: when(root.maj) }) : '',
      ]
        .filter(Boolean)
        .join(' · ');
  const pick = (id) => {
    aniFilter = aniFilter === id ? 'all' : id;
    renderAnime(status);
  };
  const st = data.stats || {};
  const base = aniFilter === 'all' ? data.liste : data.liste.filter((a) => a.statut === aniFilter);
  const genres = [...new Set(base.flatMap((a) => a.genres || []))].sort();
  const list = applyTools(aniKind, base, (a, k) =>
    k === 'name'
      ? String(a.titre)
      : k === 'mean'
        ? a.moyenne || 0
        : k === 'progress'
          ? a.progression || 0
          : k === 'plays'
            ? a.vues || 0
            : k === 'updated'
              ? Date.parse(a.maj || 0)
              : k === 'year'
                ? a.annee || 0
                : a.note || 0,
  );
  const counters = film
    ? [
        stat(t('Total'), st.total || 0, 'all', aniFilter === 'all', () => pick('all')),
        stat(t('Vus'), st.termines || 0, 'completed', aniFilter === 'completed', () => pick('completed')),
        stat(t('Abandonnés'), st.abandonnes || 0, 'dropped', aniFilter === 'dropped', () => pick('dropped')),
        stat(t('À voir'), st.prevus || 0, 'plan_to_watch', aniFilter === 'plan_to_watch', () => pick('plan_to_watch')),
      ]
    : trakt
      ? [
          stat(t('Total'), st.total || 0, 'all', aniFilter === 'all', () => pick('all')),
          stat(t('En cours'), st.enCours || 0, 'watching', aniFilter === 'watching', () => pick('watching')),
          stat(t('Terminées'), st.termines || 0, 'completed', aniFilter === 'completed', () => pick('completed')),
          stat(t('En pause'), st.enPause || 0, 'on_hold', aniFilter === 'on_hold', () => pick('on_hold')),
          stat(t('Abandonnées'), st.abandonnes || 0, 'dropped', aniFilter === 'dropped', () => pick('dropped')),
          stat(t('À voir'), st.prevus || 0, 'plan_to_watch', aniFilter === 'plan_to_watch', () =>
            pick('plan_to_watch'),
          ),
        ]
      : [
          stat(t('Total'), st.total || 0, 'all', aniFilter === 'all', () => pick('all')),
          stat(t(manga ? 'En lecture' : 'En cours'), st.enCours || 0, 'watching', aniFilter === 'watching', () =>
            pick('watching'),
          ),
          stat(t('Terminés'), st.termines || 0, 'completed', aniFilter === 'completed', () => pick('completed')),
          stat(t('En pause'), st.enPause || 0, 'on_hold', aniFilter === 'on_hold', () => pick('on_hold')),
          stat(t('Abandonnés'), st.abandonnes || 0, 'dropped', aniFilter === 'dropped', () => pick('dropped')),
          stat(t('Prévus'), st.prevus || 0, 'plan_to_watch', aniFilter === 'plan_to_watch', () =>
            pick('plan_to_watch'),
          ),
        ];
  const foot = film
    ? ''
    : trakt
      ? t('{n} épisodes vus au total.', { n: st.episodes || 0 })
      : manga
        ? t('{c} chapitres et {v} volumes lus au total.', { c: st.chapitres || 0, v: st.volumes || 0 })
        : t('{n} épisodes vus au total.', { n: st.episodes || 0 });
  body.replaceChildren(
    gprofile({ nom: p.pseudo || root.utilisateur, avatar: p.avatar, url: p.url }, sub || null),
    el('hr'),
    el('div', { class: `pstats ${counters.length === 6 ? 'six' : counters.length === 3 ? 'three' : ''}` }, counters),
    el('hr'),
    tools(aniKind, genres),
    scroller(
      list.map((a) => aniCard(a, aniKind)),
      t('Rien ici.'),
    ),
    ...(foot ? [el('p', { class: 'muted small', style: 'margin:10px 0 0' }, foot)] : []),
    ...(aniKind === 'anime' ? [...agendaLien(s), ...critiquesBlock(s, 'anime')] : []),
  );
  if (active) {
    const q = body.querySelector('.gsearch');
    if (q) {
      q.focus();
      q.setSelectionRange(q.value.length, q.value.length);
    }
  }
}
/** 0.31 · Lien vers l'agenda des prochains épisodes (.ics), si KuroPurr le publie. */
function agendaLien(s) {
  if (!s.agenda || aniKind !== 'anime') return [];
  const url = new URL('agenda.ics', location.href).href;
  return [
    el(
      'p',
      { class: 'muted small agenda-lien' },
      '📅 ',
      el('a', { href: url.replace(/^https:/, 'webcal:'), rel: 'noopener' }, t('S’abonner à mon agenda des épisodes')),
      ' · ',
      el('a', { href: url, download: 'agenda.ics' }, t('télécharger (.ics)')),
    ),
  ];
}
export function brancherMediatheque() {
  $('aniSwitch').addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    aniKind = b.dataset.kind;
    aniFilter = 'all';
    renderAnime(status);
  });
}

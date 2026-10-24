// Page du profil : page Posts & Projets — posts (tags, fiche) et projets (filtres, fiche).
import { $, clock, colorOf, el, isToday, markdown } from './outils.js?v=0.28.1';
import { status } from './donnees.js?v=0.28.1';
import { openSheet, zoom } from './rendu.js?v=0.28.1';

let projectFilter = 'all',
  postTag = '';

/* ---------------- Posts ---------------- */
const POSTS_SHORT = 3;
const postDate = (iso) => {
  const t = Date.parse(iso);
  return isToday(iso)
    ? `aujourd’hui à ${clock.format(t)}`
    : new Date(t).toLocaleDateString('fr-FR', {
        day: 'numeric',
        month: 'long',
        year: new Date(t).getFullYear() === new Date().getFullYear() ? undefined : 'numeric',
      });
};
const excerpt = (md) =>
  String(md || '')
    .replace(/[#*_`>~\[\]]/g, '')
    .replace(/\(https?:[^)]*\)/g, '')
    .replace(/\s+/g, ' ')
    .trim();
function postCard(x) {
  return el(
    'button',
    { class: 'post', type: 'button', onclick: () => openPost(x) },
    el(
      'div',
      { class: 'ph' },
      el('span', {}, x.epingle ? el('span', { class: 'pin' }, '📌 ') : null, postDate(x.date)),
      x.tags.length
        ? el(
            'span',
            { class: 'tagrow' },
            x.tags.map((t) => el('span', {}, t)),
          )
        : null,
    ),
    x.images.length
      ? el('img', { class: 'cover', src: x.images[0], alt: '', loading: 'lazy', onerror: (e) => e.target.remove() })
      : null,
    x.titre ? el('strong', {}, x.titre) : null,
    x.texte ? el('p', {}, excerpt(x.texte)) : null,
  );
}
export function renderPosts(s) {
  const tags = s.tagsPosts.length ? s.tagsPosts : [...new Set(s.posts.flatMap((x) => x.tags))];
  $('ptags').replaceChildren(
    ...(tags.length
      ? [['', 'Tous'], ...tags.map((t) => [t, t])].map(([id, label]) =>
          el(
            'button',
            {
              class: `ptag ${postTag === id ? 'on' : ''}`,
              type: 'button',
              onclick: () => {
                postTag = id;
                renderPosts(status);
              },
            },
            label,
          ),
        )
      : []),
  );
  const list = postTag ? s.posts.filter((x) => x.tags.includes(postTag)) : s.posts;
  const preview = list.slice(0, POSTS_SHORT);
  $('posts').replaceChildren(
    ...(preview.length
      ? preview.map(postCard)
      : [el('p', { class: 'empty' }, s.posts.length ? 'Aucun post avec ce tag.' : 'Pas encore de post.')]),
  );
  const m = $('postsMore');
  m.hidden = list.length <= POSTS_SHORT;
  m.textContent = `Voir plus (${list.length - POSTS_SHORT})`;
  m.onclick = () =>
    openSheet(postTag ? `Posts · ${postTag}` : 'Tous les posts', [el('div', { class: 'posts' }, list.map(postCard))]);
}
function openPost(x) {
  const imgs = x.images.map((src) =>
    el('img', {
      class: x.images.length === 1 ? 'one' : '',
      src,
      alt: '',
      loading: 'lazy',
      onclick: () => zoom(src),
      onerror: (e) => e.target.remove(),
    }),
  );
  const body = $('modalBody');
  body.replaceChildren(
    ...[
      el(
        'div',
        {
          class: 'ph',
          style: 'display:flex;justify-content:space-between;gap:8px;font-size:12px;color:var(--muted)',
        },
        el('span', {}, x.epingle ? '📌 ' : '', postDate(x.date)),
        x.tags.length
          ? el(
              'span',
              { class: 'tagrow' },
              x.tags.map((t) => el('span', {}, t)),
            )
          : null,
      ),
      x.titre ? el('h1', { class: 'sheet-title', style: 'margin:6px 0 0' }, x.titre) : null,
      imgs.length ? el('div', { class: 'gallery' }, imgs) : null,
      el('div', { class: 'md' }),
    ].filter(Boolean),
  );
  // markdown() échappe tout avant balisage
  // nosemgrep
  body.querySelector('.md').innerHTML = markdown(x.texte);
  $('modal').hidden = false;
}

/* ---------------- Projets ---------------- */
const STATUS = { en_cours: 'En cours', planifie: 'Planifié', termine: 'Terminé' };
const picOf = (p, cls) =>
  el(
    'span',
    { class: cls },
    p.image
      ? el('img', {
          src: p.image,
          alt: '',
          loading: 'lazy',
          onerror: (e) => e.target.replaceWith(String(p.nom).charAt(0).toUpperCase()),
        })
      : String(p.nom).charAt(0).toUpperCase(),
  );
export function renderProjects(s) {
  const all = s.projets;
  const count = (st) => all.filter((p) => p.statut === st).length;
  const stats = [
    ['all', 'Projets', all.length],
    ['en_cours', 'En cours', count('en_cours')],
    ['planifie', 'Planifiés', count('planifie')],
    ['termine', 'Terminés', count('termine')],
  ];
  $('pstats').replaceChildren(
    ...stats.map(([id, label, n]) =>
      el(
        'button',
        {
          class: `pstat ${projectFilter === id ? 'on' : ''}`,
          type: 'button',
          onclick: () => {
            projectFilter = projectFilter === id ? 'all' : id;
            renderProjects(status);
          },
        },
        el('span', {}, label),
        el('b', {}, String(n)),
      ),
    ),
  );
  const filtered = projectFilter === 'all' ? all : all.filter((p) => p.statut === projectFilter);
  const featured = filtered.filter((p) => p.avant);
  const preview = (featured.length ? featured : filtered).slice(0, 3);
  const projectCard = (p) =>
    el(
      'button',
      { class: 'project', type: 'button', onclick: () => openProject(p) },
      picOf(p, 'pic'),
      el(
        'div',
        { class: 'pt' },
        el('strong', {}, p.nom),
        p.description ? el('p', {}, p.description) : null,
        el('span', {}, el('span', { class: `st ${p.statut}` }, STATUS[p.statut] || 'En cours')),
      ),
    );
  $('projects').replaceChildren(
    ...(preview.length
      ? preview.map(projectCard)
      : [el('p', { class: 'empty' }, all.length ? 'Aucun projet avec ce statut.' : 'Pas encore de projet.')]),
  );
  const m = $('projectsMore');
  m.hidden = filtered.length <= preview.length;
  m.textContent = `Voir plus (${filtered.length - preview.length})`;
  m.onclick = () =>
    openSheet(projectFilter === 'all' ? 'Tous les projets' : `Projets · ${STATUS[projectFilter]}`, [
      el('div', { class: 'projects' }, filtered.map(projectCard)),
    ]);
}
function openProject(p) {
  const links = (p.liens || []).map((l) =>
    el(
      'a',
      { class: 'chip', href: l.url, target: '_blank', rel: 'noopener', style: `--c:${colorOf(l.nom)}` },
      el('i'),
      l.nom,
    ),
  );
  const members = (p.membres || []).map((m) =>
    el(
      m.url ? 'a' : 'span',
      {
        class: 'member',
        href: m.url || null,
        target: m.url ? '_blank' : null,
        rel: 'noopener',
        title: m.url ? 'Voir le profil' : null,
      },
      m.avatar
        ? el('img', { src: m.avatar, alt: '' })
        : el('span', { class: 'ini' }, String(m.nom).charAt(0).toUpperCase()),
      m.nom,
    ),
  );
  const body = $('modalBody');
  body.replaceChildren(
    ...[
      el(
        'div',
        { class: 'modal-head' },
        picOf(p, 'pic'),
        el(
          'div',
          {},
          el('h1', {}, p.nom),
          el('p', { class: 'muted', style: 'margin:4px 0 6px' }, p.description || ''),
          el('span', { class: `st ${p.statut}` }, STATUS[p.statut] || 'En cours'),
        ),
      ),
      el('div', { class: 'md' }),
      links.length ? [el('h2', {}, 'Liens'), el('div', { class: 'chips' }, links)] : null,
      members.length
        ? [el('h2', { style: 'margin-top:16px' }, 'Collaborateurs'), el('div', { class: 'members' }, members)]
        : null,
    ]
      .flat(2)
      .filter(Boolean),
  );
  // markdown() échappe tout avant balisage
  // nosemgrep
  body.querySelector('.md').innerHTML = markdown(p.details);
  $('modal').hidden = false;
}

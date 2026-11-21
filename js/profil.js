// Page du profil : page Profil — activité en cours et dernières activités, liens, cartes « Bientôt » et « En ce moment ».
import {
  $,
  clock,
  colorOf,
  dateFmt,
  dur,
  el,
  fmtTime,
  ICONS,
  isToday,
  markdown,
  nombre,
  since,
  svg,
  when,
} from './outils.js?v=0.35.0';
import { openSheet } from './rendu.js?v=0.35.0';
import { locale, pl, t } from './i18n.js?v=0.35.0';
import { jeuxDiscord, placer } from './richpresence.js?v=0.35.0';

const HISTORY_SHORT = 3;
const HISTORY_DAYS = 7;
const LINKS_SHORT = 6;

/* ---------------- Activité ---------------- */
/** 0.31 · Chapitres d'une lecture de manga, dans la langue du visiteur (« chapitre 12 », « chapitres 3 à 7 »).
 * Sans nombres (ancienne version de KuroPurr) : le détail tel qu'il a été envoyé. */
export function chapitres(a) {
  const n = Number(a.chapitre),
    de = Number(a.chapitreDe);
  if (a.chapitre == null || !Number.isFinite(n)) return a.detail || '';
  if (a.chapitreDe != null && Number.isFinite(de) && de !== n) return t('chapitres {a} à {b}', { a: de, b: n });
  return t('chapitre {n}', { n });
}
const detailDe = (a) => (a.type === 'manga' ? chapitres(a) : a.detail);
const lien = (a) => (a.url ? el('a', { href: a.url, target: '_blank', rel: 'noopener' }, a.nom) : a.nom);
/** Nom de l'activité ; une lecture de manga terminée se lit « a lu Titre ». */
const entryName = (a) =>
  a.type === 'manga' && a.fin
    ? [el('span', { class: 'verbe' }, `${t('a lu')} `), lien(a)]
    : a.seulDiscord
      ? [el('span', { class: 'verbe' }, `${t('Joue à')} `), lien(a)]
      : lien(a);
const entryIcon = (a, cls) =>
  el(
    'span',
    { class: cls },
    a.image
      ? el('img', { src: a.image, alt: '', onerror: (e) => e.target.replaceWith(svg(ICONS[a.type] || ICONS.jeu)) })
      : svg(ICONS[a.type] || ICONS.jeu),
  );
/** 0.31 · Barre qui avance toute seule entre deux lectures de status.json (début et fin en heures
 * absolues) ; en pause, elle reste à sa position. */
function barre(debut, fin, pause) {
  const start = Date.parse(debut),
    end = Date.parse(fin);
  if (!(end > start)) return null;
  const attrs = { class: 'fill', 'data-start': start, 'data-end': end };
  if (pause != null) attrs['data-pause'] = pause;
  return [
    el('div', { class: 'bar' }, el('div', attrs)),
    el(
      'span',
      { class: 'times' },
      el('span', { class: 'pos' }, pause != null ? fmtTime(pause) : '0:00'),
      el('span', {}, fmtTime(end - start)),
    ),
  ];
}
/** 0.31 · Lignes du Rich Presence envoyé par le jeu à Discord (texte seulement, jamais de HTML). */
function lignesDiscord(d) {
  if (!d) return [];
  return [
    d.details ? el('span', { class: 'rp-ligne' }, d.details) : null,
    d.etat ? el('span', { class: 'rp-ligne' }, d.etat) : null,
    d.groupe
      ? el('span', { class: 'rp-ligne muted' }, t('groupe {n}/{max}', { n: d.groupe[0], max: d.groupe[1] }))
      : null,
  ];
}
function activityRow(a, main) {
  const live = !a.fin;
  const sub = [detailDe(a), a.source].filter(Boolean).join(' · ');
  const temps = !a.debut
    ? ''
    : live
      ? t('depuis {d}', { d: since(a.debut) })
      : `${when(a.debut)} · ${dur((Date.parse(a.fin) - Date.parse(a.debut)) / 1000)}`;
  const icone = entryIcon(a, 'ico');
  const d = a.discord;
  if (d && (d.imageTexte || d.petiteTexte)) icone.title = [d.imageTexte, d.petiteTexte].filter(Boolean).join(' · ');
  const kids = [
    icone,
    el(
      'div',
      { class: 'row-text' },
      el('strong', {}, entryName(a)),
      lignesDiscord(d),
      sub || temps ? el('span', { class: 'muted' }, `${sub}${sub && temps ? ' · ' : ''}${temps}`) : null,
    ),
  ];
  if (live && a.type === 'musique' && a.finPrevue) {
    const b = barre(a.debut, a.finPrevue);
    if (b) kids[1].append(...b);
  }
  // 0.31 · Épisode en cours : position dans l'épisode (barre de temps de l'extension)
  if (live && a.type === 'anime' && a.debutEp && a.finEp) {
    const b = barre(a.debutEp, a.finEp, a.pause ? Number(a.positionMs) || 0 : null);
    if (b) kids[1].append(...b);
  }
  return el('div', { class: `row ${main ? 'main' : ''}` }, kids);
}
export function renderActivity(s, online, lanyard) {
  const all = s.activites.filter((a) => a.debut).sort((a, b) => Date.parse(b.debut) - Date.parse(a.debut));
  // En cours : les sessions ouvertes (si KuroPurr est en ligne) ; la musique reçoit sa fin prévue
  let current = online ? all.filter((a) => !a.fin) : [];
  current = current.map((a) =>
    a.type === 'musique' && s.musique.actif && s.musique.titre === a.nom
      ? { ...a, finPrevue: s.musique.fin }
      : a.type === 'anime' && s.regarde && s.regarde.actif && s.regarde.titre === a.nom
        ? {
            ...a,
            debutEp: s.regarde.debutEp,
            finEp: s.regarde.finEp,
            pause: s.regarde.pause,
            positionMs: s.regarde.positionMs,
          }
        : a,
  );
  // 0.31 · Manga en cours de lecture (« lit … · chapitre N »), s'il est publié ; il remplace la session
  // de lecture ouverte de l'historique (même lecture, chapitre plus précis)
  if (online && s.lit && s.lit.actif && s.lit.titre) {
    const ouverte = current.find((a) => a.type === 'manga' && a.nom === s.lit.titre);
    current = current.filter((a) => a.type !== 'manga');
    current.push({
      type: 'manga',
      nom: s.lit.titre,
      url: s.lit.url,
      image: s.lit.image || (ouverte && ouverte.image) || '',
      chapitre: s.lit.chapitre,
      detail: '',
      source: 'anime-sama',
      debut: (ouverte && ouverte.debut) || s.lit.depuis || new Date().toISOString(),
      lit: true,
    });
  }
  // 0.31 · Détails des jeux depuis Discord (Lanyard) : rattachés au jeu que KuroPurr affiche déjà
  // (même nom), sinon une petite carte « Joue à … » ; rien si l'option est coupée ou l'activité masquée
  const { fusions, autres } = placer(current, jeuxDiscord(lanyard, s));
  current = current.map((a, i) =>
    fusions.has(i) ? { ...a, image: a.image || fusions.get(i).image, discord: fusions.get(i) } : a,
  );
  for (const j of autres)
    current.push({
      type: 'jeu',
      nom: j.nom,
      image: j.image,
      source: 'Discord',
      debut: j.debut ? new Date(j.debut).toISOString() : '',
      discord: j,
      seulDiscord: true,
    });
  const rank = { jeu: 0, anime: 1, manga: 2, musique: 3 };
  current.sort((a, b) => (rank[a.type] ?? 3) - (rank[b.type] ?? 3));
  const past = all.filter((a) => a.fin);
  const nowBox = $('now'),
    more = $('nowMore');
  $('nowAll').hidden = true;
  if (current.length) {
    $('nowTitle').textContent = t('Activité en cours');
    nowBox.replaceChildren(activityRow(current[0], true));
    more.hidden = current.length < 2;
    more.textContent = t('Voir toutes les activités en cours ({n})', { n: current.length });
    more.onclick = () =>
      openSheet(
        t('Activités en cours'),
        current.map((a) => activityRow(a, false)),
      );
  } else {
    $('nowTitle').textContent = t('Activité récente');
    nowBox.replaceChildren(
      past.length ? activityRow(past[0], true) : el('p', { class: 'empty' }, t('Rien pour l’instant.')),
    );
    more.hidden = true;
    if (past.length) past.shift(); // déjà affichée au-dessus
  }
  // Dernières activités : 3 ; la fenêtre montre les 7 derniers jours, par jour
  const limit = Date.now() - HISTORY_DAYS * 86400000;
  const week = past.filter((a) => Date.parse(a.fin) >= limit);
  const histItem = (a) =>
    el(
      'li',
      {},
      entryIcon(a, 'k'),
      el(
        'span',
        { class: 't' },
        entryName(a),
        el('span', {}, ` · ${[detailDe(a), a.source].filter(Boolean).join(' · ')}`),
      ),
      el(
        'time',
        { datetime: a.debut, title: new Date(a.debut).toLocaleString(locale()) },
        `${isToday(a.debut) ? clock.format(Date.parse(a.debut)) : dateFmt.format(Date.parse(a.debut))} · ${dur((Date.parse(a.fin) - Date.parse(a.debut)) / 1000)}`,
      ),
    );
  const shown = week.slice(0, HISTORY_SHORT);
  $('history').replaceChildren(
    ...(shown.length ? shown.map(histItem) : [el('li', { class: 'empty' }, t('Rien d’autre ces 7 derniers jours.'))]),
  );
  const hm = $('historyMore');
  hm.hidden = week.length <= HISTORY_SHORT;
  hm.textContent = t('Afficher plus ({n})', { n: week.length - HISTORY_SHORT });
  hm.onclick = () => {
    const days = [];
    for (const a of week) {
      const k = new Date(a.debut).toDateString();
      let d = days.find((x) => x.k === k);
      if (!d) {
        d = { k, label: dayLabel(a.debut), items: [] };
        days.push(d);
      }
      d.items.push(a);
    }
    openSheet(
      t('7 derniers jours'),
      days.map((d) =>
        el('div', { class: 'day' }, el('h2', {}, d.label), el('ul', { class: 'list' }, d.items.map(histItem))),
      ),
    );
  };
}
const dayLabel = (iso) => {
  const d = new Date(iso);
  const diff = Math.round((new Date().setHours(0, 0, 0, 0) - new Date(d).setHours(0, 0, 0, 0)) / 86400000);
  return diff === 0
    ? t('Aujourd’hui')
    : diff === 1
      ? t('Hier')
      : d.toLocaleDateString(locale(), { weekday: 'long', day: 'numeric', month: 'long' });
};
/** Aiguilles des barres (musique, épisode) : appelé chaque seconde. Une barre en pause ne bouge pas. */
export function progress() {
  for (const f of document.querySelectorAll('.fill[data-start]')) {
    const start = Number(f.dataset.start),
      end = Number(f.dataset.end);
    const total = Math.max(1, end - start);
    const pause = f.dataset.pause != null && f.dataset.pause !== '' ? Number(f.dataset.pause) : null;
    const pos = Math.min(total, Math.max(0, pause != null ? pause : Date.now() - start));
    f.style.width = `${(pos / total) * 100}%`;
    const p = f.parentElement.nextElementSibling && f.parentElement.nextElementSibling.querySelector('.pos');
    if (p) p.textContent = fmtTime(pos);
  }
}

/* ---------------- Liens ---------------- */
const linkTile = (l) =>
  el(
    'a',
    {
      class: 'lnk',
      href: l.url,
      target: '_blank',
      rel: 'noopener',
      style: `--c:${colorOf(l.nom)}`,
      title: l.description || l.url,
    },
    el(
      'span',
      { class: 'pic' },
      l.image ? el('img', { src: l.image, alt: '' }) : String(l.nom).charAt(0).toUpperCase(),
    ),
    el('strong', {}, l.nom),
    el('span', {}, l.description || String(l.url).replace(/^https:\/\/(www\.)?/, '')),
  );
export function renderLinks(s) {
  const shown = s.liens.slice(0, LINKS_SHORT);
  $('links').replaceChildren(
    ...(shown.length
      ? shown.map(linkTile)
      : [el('p', { class: 'empty', style: 'grid-column:1/-1' }, t('Aucun lien pour l’instant.'))]),
  );
  const m = $('linksMore');
  m.hidden = s.liens.length <= LINKS_SHORT;
  m.textContent = t('Afficher plus ({n})', { n: s.liens.length - LINKS_SHORT });
  m.onclick = () => openSheet(t('Tous les liens'), [el('div', { class: 'links' }, s.liens.map(linkTile))]);
}

/* ---------------- Organisation (KuroPurr 0.23) : bientôt, maintenant, habitudes ---------------- */
const soonLabel = (iso) => {
  const ts = Date.parse(iso),
    diff = ts - Date.now();
  if (new Date(ts).toDateString() === new Date().toDateString()) return t('aujourd’hui');
  if (diff <= 0) return t('passé');
  const h = Math.floor(diff / 3600000),
    d = Math.floor(h / 24);
  return d ? (h % 24 ? t('dans {d} j {h} h', { d, h: h % 24 }) : t('dans {d} j', { d })) : t('dans {h} h', { h });
};
function orgaCard(id, after) {
  let box = $(id);
  if (!box && after) {
    box = el('section', { class: 'box card', id });
    after.after(box);
  }
  return box;
}
export function renderOrga(s) {
  const activity = $('history') && $('history').closest('section');
  const soon = (Array.isArray(s.bientot) ? s.bientot : []).filter((c) => c && c.nom && c.date);
  const now = s.maintenant && typeof s.maintenant === 'object' && s.maintenant.texte ? s.maintenant : null;
  const soonBox = orgaCard('orgaSoon', activity);
  const nowBox = orgaCard('orgaNow', soonBox);
  if (nowBox) {
    nowBox.hidden = !now;
    if (now) {
      const md = el('div', { class: 'md' });
      // markdown() échappe tout avant balisage
      // nosemgrep
      md.innerHTML = markdown(now.texte);
      nowBox.replaceChildren(
        el('h2', {}, t('En ce moment dans ma vie')),
        md,
        now.maj
          ? el(
              'p',
              { class: 'muted small', style: 'margin:10px 0 0' },
              t('Mis à jour le {d}', {
                d: new Date(now.maj).toLocaleDateString(locale(), { day: 'numeric', month: 'long', year: 'numeric' }),
              }),
            )
          : null,
      );
    }
  }
  if (soonBox) {
    soonBox.hidden = !soon.length;
    soonBox.replaceChildren(
      el('h2', {}, t('Bientôt')),
      el(
        'ul',
        { class: 'list' },
        soon.map((c) =>
          el(
            'li',
            {},
            el('span', { class: 'k' }, c.emoji || '⏳'),
            el('span', { class: 't' }, c.nom),
            el(
              'time',
              {
                datetime: c.date,
                title: new Date(c.date).toLocaleString(locale(), {
                  weekday: 'long',
                  day: 'numeric',
                  month: 'long',
                  hour: '2-digit',
                  minute: '2-digit',
                }),
              },
              soonLabel(c.date),
            ),
          ),
        ),
      ),
    );
  }
}

/* ---------------- 0.31 · En ce moment : ce qui m'a le plus occupé ces 30 derniers jours ---------------- */
const vignette = (x, titre, sous, rond) =>
  el(
    x.url ? 'a' : 'div',
    {
      class: 'ecm-item',
      href: x.url || null,
      target: x.url ? '_blank' : null,
      rel: x.url ? 'noopener' : null,
      title: titre,
    },
    el(
      'span',
      { class: `ecm-pic ${rond ? 'round' : ''}` },
      String(titre || '?').charAt(0),
      x.image ? el('img', { src: x.image, alt: '', loading: 'lazy', onerror: (e) => e.target.remove() }) : null,
    ),
    el('span', { class: 'ecm-t' }, el('strong', {}, titre), el('span', { class: 'muted' }, sous)),
  );
const heures = (min) => (min >= 60 ? t('{n} h', { n: nombre(Math.round(min / 6) / 10) }) : t('{n} min', { n: min }));
export function renderEnCeMoment(s) {
  const box = $('encemoment');
  if (!box) return;
  const e = s.enCeMoment && typeof s.enCeMoment === 'object' ? s.enCeMoment : null;
  const liste = (k) => (e && Array.isArray(e[k]) ? e[k].filter((x) => x && (x.nom || x.titre)) : []);
  const groupes = [
    ['🎮', t('Jeux'), liste('jeux').map((x) => vignette(x, x.nom, heures(x.minutes)))],
    [
      '📺',
      t('Animés'),
      liste('animes').map((x) =>
        vignette(
          x,
          x.nom,
          x.episodes ? `${heures(x.minutes)} · ${pl(x.episodes, '{n} épisode', '{n} épisodes')}` : heures(x.minutes),
        ),
      ),
    ],
    ['🎤', t('Artistes'), liste('artistes').map((x) => vignette(x, x.nom, heures(x.minutes), true))],
    [
      '🎵',
      t('Titres'),
      liste('titres').map((x) =>
        vignette(x, x.titre, `${x.artiste ? `${x.artiste} · ` : ''}${pl(x.ecoutes, '{n} écoute', '{n} écoutes')}`),
      ),
    ],
    [
      '📖',
      t('Mangas'),
      liste('mangas').map((x) => vignette(x, x.nom, pl(x.chapitres, '{n} chapitre', '{n} chapitres'))),
    ],
  ].filter((g) => g[2].length);
  box.hidden = !groupes.length;
  if (!groupes.length) return;
  box.replaceChildren(
    el('h2', {}, t('En ce moment')),
    el(
      'p',
      { class: 'muted small ecm-sous' },
      t('Ce qui m’a le plus occupé ces {n} derniers jours.', { n: nombre(e.jours || 30) }),
    ),
    ...groupes.map(([ico, titre, items]) =>
      el('div', { class: 'ecm-groupe' }, el('h3', {}, `${ico} ${titre}`), el('div', { class: 'ecm-items' }, items)),
    ),
  );
}

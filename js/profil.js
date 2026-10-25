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
  since,
  svg,
  when,
} from './outils.js?v=0.30.0';
import { openSheet } from './rendu.js?v=0.30.0';

const HISTORY_SHORT = 3;
const HISTORY_DAYS = 7;
const LINKS_SHORT = 6;

/* ---------------- Activité ---------------- */
const entryName = (a) => (a.url ? el('a', { href: a.url, target: '_blank', rel: 'noopener' }, a.nom) : a.nom);
const entryIcon = (a, cls) =>
  el(
    'span',
    { class: cls },
    a.image
      ? el('img', { src: a.image, alt: '', onerror: (e) => e.target.replaceWith(svg(ICONS[a.type] || ICONS.jeu)) })
      : svg(ICONS[a.type] || ICONS.jeu),
  );
function activityRow(a, main) {
  const live = !a.fin;
  const sub = [a.detail, a.source].filter(Boolean).join(' · ');
  const kids = [
    entryIcon(a, 'ico'),
    el(
      'div',
      { class: 'row-text' },
      el('strong', {}, entryName(a)),
      el(
        'span',
        { class: 'muted' },
        `${sub}${sub ? ' · ' : ''}${live ? `depuis ${since(a.debut)}` : `${when(a.debut)} · ${dur((Date.parse(a.fin) - Date.parse(a.debut)) / 1000)}`}`,
      ),
    ),
  ];
  if (live && a.type === 'musique' && a.finPrevue) {
    kids[1].append(
      el(
        'div',
        { class: 'bar' },
        el('div', { class: 'fill', 'data-start': Date.parse(a.debut), 'data-end': Date.parse(a.finPrevue) }),
      ),
      el(
        'span',
        { class: 'times' },
        el('span', { class: 'pos' }, '0:00'),
        el('span', {}, fmtTime(Date.parse(a.finPrevue) - Date.parse(a.debut))),
      ),
    );
  }
  return el('div', { class: `row ${main ? 'main' : ''}` }, kids);
}
export function renderActivity(s, online) {
  const all = s.activites.filter((a) => a.debut).sort((a, b) => Date.parse(b.debut) - Date.parse(a.debut));
  // En cours : les sessions ouvertes (si KuroPurr est en ligne) ; la musique reçoit sa fin prévue
  let current = online ? all.filter((a) => !a.fin) : [];
  current = current.map((a) =>
    a.type === 'musique' && s.musique.actif && s.musique.titre === a.nom ? { ...a, finPrevue: s.musique.fin } : a,
  );
  const rank = { jeu: 0, anime: 1, musique: 2 };
  current.sort((a, b) => (rank[a.type] ?? 3) - (rank[b.type] ?? 3));
  const past = all.filter((a) => a.fin);
  const nowBox = $('now'),
    more = $('nowMore');
  $('nowAll').hidden = true;
  if (current.length) {
    $('nowTitle').textContent = 'Activité en cours';
    nowBox.replaceChildren(activityRow(current[0], true));
    more.hidden = current.length < 2;
    more.textContent = `Voir toutes les activités en cours (${current.length})`;
    more.onclick = () =>
      openSheet(
        'Activités en cours',
        current.map((a) => activityRow(a, false)),
      );
  } else {
    $('nowTitle').textContent = 'Activité récente';
    nowBox.replaceChildren(
      past.length ? activityRow(past[0], true) : el('p', { class: 'empty' }, 'Rien pour l’instant.'),
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
        el('span', {}, ` · ${[a.detail, a.source].filter(Boolean).join(' · ')}`),
      ),
      el(
        'time',
        { datetime: a.debut, title: new Date(a.debut).toLocaleString('fr-FR') },
        `${isToday(a.debut) ? clock.format(Date.parse(a.debut)) : dateFmt.format(Date.parse(a.debut))} · ${dur((Date.parse(a.fin) - Date.parse(a.debut)) / 1000)}`,
      ),
    );
  const shown = week.slice(0, HISTORY_SHORT);
  $('history').replaceChildren(
    ...(shown.length ? shown.map(histItem) : [el('li', { class: 'empty' }, 'Rien d’autre ces 7 derniers jours.')]),
  );
  const hm = $('historyMore');
  hm.hidden = week.length <= HISTORY_SHORT;
  hm.textContent = `Afficher plus (${week.length - HISTORY_SHORT})`;
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
      '7 derniers jours',
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
    ? 'Aujourd’hui'
    : diff === 1
      ? 'Hier'
      : d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
};
export function progress() {
  for (const f of document.querySelectorAll('.fill[data-start]')) {
    const start = Number(f.dataset.start),
      end = Number(f.dataset.end);
    const total = Math.max(1, end - start),
      pos = Math.min(total, Math.max(0, Date.now() - start));
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
      : [el('p', { class: 'empty', style: 'grid-column:1/-1' }, 'Aucun lien pour l’instant.')]),
  );
  const m = $('linksMore');
  m.hidden = s.liens.length <= LINKS_SHORT;
  m.textContent = `Afficher plus (${s.liens.length - LINKS_SHORT})`;
  m.onclick = () => openSheet('Tous les liens', [el('div', { class: 'links' }, s.liens.map(linkTile))]);
}

/* ---------------- Organisation (KuroPurr 0.23) : bientôt, maintenant, habitudes ---------------- */
const soonLabel = (iso) => {
  const t = Date.parse(iso),
    diff = t - Date.now();
  if (new Date(t).toDateString() === new Date().toDateString()) return 'aujourd’hui';
  if (diff <= 0) return 'passé';
  const h = Math.floor(diff / 3600000),
    d = Math.floor(h / 24);
  return d ? `dans ${d} j${h % 24 ? ` ${h % 24} h` : ''}` : `dans ${h} h`;
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
        el('h2', {}, 'En ce moment dans ma vie'),
        md,
        now.maj
          ? el(
              'p',
              { class: 'muted small', style: 'margin:10px 0 0' },
              `Mis à jour le ${new Date(now.maj).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}`,
            )
          : null,
      );
    }
  }
  if (soonBox) {
    soonBox.hidden = !soon.length;
    soonBox.replaceChildren(
      el('h2', {}, 'Bientôt'),
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
                title: new Date(c.date).toLocaleString('fr-FR', {
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

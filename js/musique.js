// Page du profil : page Musique — Spotify (écoutes, tops, playlists) et KuroPurr Musique.
import { $, dur, el, fmtTime, pad, when } from './outils.js?v=0.35.0';
import { status } from './donnees.js?v=0.35.0';
import { progress } from './profil.js?v=0.35.0';
import { applyTools, gprofile, scroller, stat, tools } from './bibliotheque.js?v=0.35.0';
import { pl, t } from './i18n.js?v=0.35.0';

let mus = 'spotify',
  musView = 'ecoutes';

/* ---------------- Musique : Spotify (écoutes vues par KuroPurr, playlists publiques) ---------------- */
const mins = (m) => (m >= 60 ? t('{h} h {m}', { h: Math.floor(m / 60), m: pad(m % 60) }) : t('{n} min', { n: m }));
const coverOf = (x, cls) =>
  el(
    'span',
    { class: cls },
    String(x.titre || x.nom || '?').charAt(0),
    x.image ? el('img', { src: x.image, alt: '', loading: 'lazy', onerror: (e) => e.target.remove() }) : null,
  );
const tr = t;
function trackCard(m) {
  const live = !m.fin;
  return el(
    'a',
    { class: 'gcard', href: m.url, target: '_blank', rel: 'noopener', title: `${m.titre} — ${m.artiste}` },
    el(
      'span',
      { class: 'cov sq' },
      String(m.titre).charAt(0),
      m.image ? el('img', { src: m.image, alt: '', loading: 'lazy', onerror: (e) => e.target.remove() }) : null,
      el('span', { class: 'nm' }, el('span', {}, m.titre)),
    ),
    el(
      'div',
      { class: 'gi' },
      el(
        'div',
        { class: 'nums' },
        el('span', {}, el('b', {}, live ? tr('en cours') : dur(m.duree))),
        el('span', {}, live ? '' : when(m.fin)),
      ),
      el('p', {}, [m.artiste, m.album].filter(Boolean).join(' · ')),
    ),
  );
}
const topRow = (x, i, max, main, sub, round) =>
  el(
    'a',
    { class: 'toprow', href: x.url, target: '_blank', rel: 'noopener' },
    el('span', { class: 'rank' }, String(i + 1)),
    coverOf(x, `tpic ${round ? 'round' : ''}`),
    el(
      'span',
      { class: 'tt' },
      el('strong', {}, main),
      el('span', { class: 'muted' }, sub),
      el(
        'span',
        { class: 'bar' },
        el('span', { class: 'fill', style: `width:${Math.max(3, (x.minutes / Math.max(1, max)) * 100)}%` }),
      ),
    ),
    el(
      'span',
      { class: 'tn' },
      el('b', {}, mins(x.minutes)),
      el('span', {}, pl(x.ecoutes, '{n} écoute', '{n} écoutes')),
    ),
  );
const playlistCard = (p) =>
  el(
    'a',
    { class: 'gcard', href: p.url, target: '_blank', rel: 'noopener', title: p.titre },
    el(
      'span',
      { class: 'cov sq' },
      String(p.titre).charAt(0),
      p.image ? el('img', { src: p.image, alt: '', loading: 'lazy', onerror: (e) => e.target.remove() }) : null,
      el('span', { class: 'nm' }, el('span', {}, p.titre)),
    ),
    el('div', { class: 'gi' }, el('p', {}, t('Ouvrir dans Spotify ↗'))),
  );
export function renderMusic(s) {
  for (const b of $('musSwitch').children) b.classList.toggle('on', b.dataset.mus === mus);
  const body = $('musBody');
  const active = document.activeElement && document.activeElement.classList.contains('gsearch');
  if (mus === 'kuropurr') {
    const kp = (s.spotify && s.spotify.kuropurr) || {};
    const cur = kp.enCours;
    const now = cur
      ? el(
          'div',
          { class: 'nowtrack' },
          coverOf(cur, 'tpic big'),
          el(
            'span',
            { class: 'tt' },
            el(
              'span',
              { class: 'rp-kind' },
              cur.radio ? t('● En ce moment · webradio') : t('● En ce moment · KuroPurr Musique'),
            ),
            el('strong', {}, cur.titre),
            el('span', { class: 'muted' }, [cur.artiste, cur.album].filter(Boolean).join(' · ')),
            cur.radio
              ? null
              : el(
                  'div',
                  { class: 'bar' },
                  el('div', { class: 'fill', 'data-start': Date.parse(cur.debut), 'data-end': Date.parse(cur.fin) }),
                ),
            cur.radio
              ? null
              : el(
                  'span',
                  { class: 'times' },
                  el('span', { class: 'pos' }, '0:00'),
                  el('span', {}, fmtTime(Date.parse(cur.fin) - Date.parse(cur.debut))),
                ),
          ),
        )
      : null;
    const list = (kp.ecoutes || []).map((m) => trackCard({ ...m, url: m.url || undefined }));
    const sub = [
      kp.heures30 ? t('{n} h sur 30 jours', { n: kp.heures30 }) : '',
      (kp.radios || []).length ? pl(kp.radios.length, '{n} radio écoutée', '{n} radios écoutées') : '',
    ]
      .filter(Boolean)
      .join(' · ');
    body.replaceChildren(
      ...[
        el(
          'p',
          { class: 'muted small' },
          `${t('Ce que j’écoute dans le lecteur de KuroPurr : ma musique à moi (hors ligne) et des webradios.')}${sub ? ' ' + sub + '.' : ''}`,
        ),
        now,
        (kp.radios || []).length
          ? el(
              'div',
              { class: 'ptags' },
              kp.radios.map((r) => el('span', { class: 'ptag on' }, '📻 ' + r)),
            )
          : null,
        scroller(list, t('Rien écouté dans KuroPurr Musique pour l’instant.')),
      ].filter(Boolean),
    );
    return;
  }
  const sp = s.spotify;
  if (!sp) {
    body.replaceChildren(el('p', { class: 'empty' }, t('Pas de musique pour l’instant.')));
    return;
  }
  const st = sp.stats || {};
  const prof = sp.profil || {};
  const sub = [
    st.heures30 ? t('{n} h d’écoute sur 30 jours', { n: st.heures30 }) : '',
    st.artistes30 ? t('{n} artistes', { n: st.artistes30 }) : '',
    sp.maj ? t('vu {quand}', { quand: when(sp.maj) }) : '',
  ]
    .filter(Boolean)
    .join(' · ');
  const now = sp.enCours
    ? el(
        'a',
        { class: 'nowtrack', href: sp.enCours.url, target: '_blank', rel: 'noopener' },
        coverOf(sp.enCours, 'tpic big'),
        el(
          'span',
          { class: 'tt' },
          el('span', { class: 'rp-kind', style: 'color:#1ed760 !important' }, t('● En ce moment sur Spotify')),
          el('strong', {}, sp.enCours.titre),
          el('span', { class: 'muted' }, [sp.enCours.artiste, sp.enCours.album].filter(Boolean).join(' · ')),
          el(
            'div',
            { class: 'bar' },
            el('div', {
              class: 'fill',
              'data-start': Date.parse(sp.enCours.debut),
              'data-end': Date.parse(sp.enCours.fin),
            }),
          ),
          el(
            'span',
            { class: 'times' },
            el('span', { class: 'pos' }, '0:00'),
            el('span', {}, fmtTime(Date.parse(sp.enCours.fin) - Date.parse(sp.enCours.debut))),
          ),
        ),
      )
    : null;
  const views = [
    ['ecoutes', t('Dernières écoutes')],
    ['artistes', t('Top artistes')],
    ['titres', t('Top titres')],
    ['playlists', t('Playlists')],
  ];
  const tabs = el(
    'div',
    { class: 'ptags' },
    views.map(([id, label]) =>
      el(
        'button',
        {
          class: `ptag ${musView === id ? 'on' : ''}`,
          type: 'button',
          onclick: () => {
            musView = id;
            renderMusic(status);
          },
        },
        label,
      ),
    ),
  );
  let main;
  if (musView === 'ecoutes') {
    const artists = [...new Set(sp.ecoutes.map((m) => m.artiste).filter(Boolean))].sort((a, b) => a.localeCompare(b));
    const list = applyTools(
      'spotify',
      sp.ecoutes.map((m) => ({ ...m, nom: m.titre, genres: [m.artiste] })),
      (m, k) =>
        k === 'name'
          ? String(m.titre)
          : k === 'artist'
            ? String(m.artiste)
            : k === 'duration'
              ? m.duree || 0
              : Date.parse(m.debut || 0),
    );
    main = [
      tools('spotify', artists, t('Tous les artistes')),
      scroller(
        list.map(trackCard),
        s.musique && s.musique.actif === false && !sp.ecoutes.length
          ? t('Rien écouté sur Spotify ces derniers temps.')
          : t('Rien ici.'),
      ),
    ];
  } else if (musView === 'artistes') {
    const max = Math.max(...sp.topArtistes.map((a) => a.minutes), 1);
    main = [
      el(
        'div',
        { class: 'scroller' },
        sp.topArtistes.length
          ? el(
              'div',
              { class: 'toplist' },
              sp.topArtistes.map((a, i) => topRow(a, i, max, a.nom, t('sur 30 jours'), true)),
            )
          : el('p', { class: 'empty' }, t('Pas encore assez d’écoutes.')),
      ),
    ];
  } else if (musView === 'titres') {
    const max = Math.max(...sp.topTitres.map((a) => a.minutes), 1);
    main = [
      el(
        'div',
        { class: 'scroller' },
        sp.topTitres.length
          ? el(
              'div',
              { class: 'toplist' },
              sp.topTitres.map((x, i) => topRow(x, i, max, x.titre, x.artiste, false)),
            )
          : el('p', { class: 'empty' }, t('Pas encore assez d’écoutes.')),
      ),
    ];
  } else {
    main = [scroller(sp.playlists.map(playlistCard), t('Pas de playlist publique pour l’instant.'))];
  }
  body.replaceChildren(
    gprofile({ nom: prof.pseudo || s.pseudo, avatar: prof.avatar || s.avatar, url: prof.url }, sub || null),
    el('hr'),
    el(
      'div',
      { class: 'pstats six' },
      stat(t('Écoutes · 7 j'), st.ecoutes7 || 0),
      stat(t('Heures · 7 j'), st.heures7 || 0),
      stat(t('Écoutes · 30 j'), st.ecoutes30 || 0),
      stat(t('Heures · 30 j'), st.heures30 || 0),
      stat(t('Artistes · 30 j'), st.artistes30 || 0),
      stat(t('Playlists'), st.playlists || 0),
    ),
    now,
    el('hr'),
    tabs,
    ...main,
    el(
      'p',
      { class: 'muted small', style: 'margin:10px 0 0' },
      t('Écoutes vues par KuroPurr sur Spotify ; pochettes via Deezer.'),
    ),
  );
  progress();
  if (active) {
    const q = body.querySelector('.gsearch');
    if (q) {
      q.focus();
      q.setSelectionRange(q.value.length, q.value.length);
    }
  }
}
export function brancherMusique() {
  $('musSwitch').addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    mus = b.dataset.mus;
    renderMusic(status);
  });
}

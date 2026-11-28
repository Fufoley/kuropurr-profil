// Page du profil : autres fiches de la page Divers — habitudes, records, récap, horaires, setup, collection, livre d'or, playlist, coucou, visiteurs.
import { $, ago, dateFmt, el, ICONS, svg } from './outils.js?v=0.35.0';
import { zoom } from './rendu.js?v=0.35.0';
import { stat } from './bibliotheque.js?v=0.35.0';
import { flag, hms, monthName, note, peakLabel } from './divers.js?v=0.35.0';
import { burst, gcEvent } from './amusements.js?v=0.35.0';
import { langue, locale, pl, t } from './i18n.js?v=0.35.0';

export function habitsView(x) {
  if (!x) return [note(t('Pas encore d’habitude suivie.'))];
  const today = x.aujourdhui || {};
  const list = Array.isArray(x.liste) ? x.liste : [];
  return [
    el(
      'div',
      { class: 'pstats' },
      stat(t('Série en cours'), t('{n} j', { n: x.serie })),
      stat(t('Record'), t('{n} j', { n: x.record })),
      stat(t('Aujourd’hui'), `${today.faites || 0}/${today.prevues || 0}`),
      stat(t('Tenues (30 j)'), x.taux30 == null ? '—' : `${x.taux30} %`),
    ),
    list.length ? el('hr') : null,
    list.length
      ? el(
          'ul',
          { class: 'list' },
          list.map((h) =>
            el(
              'li',
              {},
              el('span', { class: 'k' }, h.emoji || '✅'),
              el('span', { class: 't' }, h.nom),
              el('time', {}, `🔥 ${t('{n} j', { n: h.serie })} · ${t('record {n}', { n: h.record })}`),
            ),
          ),
        )
      : null,
    note(
      `${pl(x.actives, '{n} habitude suivie avec KuroPurr.', '{n} habitudes suivies avec KuroPurr.')} ${t('Une série compte les jours d’affilée où l’habitude prévue a été tenue.')}`,
    ),
  ];
}
export function recordsView(r) {
  if (!r) return [note(t('Pas encore de records.'))];
  const row = (ico, label, value, sub) =>
    value
      ? el(
          'div',
          { class: 'row' },
          el('span', { class: 'rico' }, ico),
          el(
            'div',
            { class: 'rt' },
            el('span', { class: 'muted small' }, label),
            el('strong', {}, value),
            sub ? el('span', { class: 'muted small' }, sub) : null,
          ),
        )
      : null;
  return [
    row(
      '⏱️',
      t('Plus longue session'),
      r.sessionMax && `${r.sessionMax.nom} · ${hms(r.sessionMax.secondes)}`,
      r.sessionMax && `${r.sessionMax.source} · ${new Date(r.sessionMax.date).toLocaleDateString(locale())}`,
    ),
    row(
      '🔁',
      t('Jeu le plus relancé (90 j)'),
      r.jeuRelance && `${r.jeuRelance.nom}`,
      r.jeuRelance && pl(r.jeuRelance.sessions, '{n} session', '{n} sessions'),
    ),
    row(
      '🎧',
      t('Titre le plus écouté (90 j)'),
      r.titreEcoute && `${r.titreEcoute.titre}`,
      r.titreEcoute && `${r.titreEcoute.artiste} · ${pl(r.titreEcoute.ecoutes, '{n} écoute', '{n} écoutes')}`,
    ),
    row(
      '🔥',
      t('Jours d’affilée'),
      r.serieJours && pl(r.serieJours.max, '{n} jour', '{n} jours'),
      r.serieJours && t('série en cours : {n}', { n: r.serieJours.actuelle }),
    ),
    row(
      '📅',
      t('Journée la plus chargée'),
      r.journeeMax && hms(r.journeeMax.secondes),
      r.journeeMax &&
        new Date(r.journeeMax.date).toLocaleDateString(locale(), { weekday: 'long', day: 'numeric', month: 'long' }),
    ),
    row(
      '🌙',
      t('Nuit la plus tardive'),
      r.nuitTardive && t('fin à {h}', { h: r.nuitTardive.heure }),
      r.nuitTardive && r.nuitTardive.nom,
    ),
    row('🧭', t('Jeux différents (90 j)'), r.jeuxDifferents ? String(r.jeuxDifferents) : null),
    row(
      '🎮',
      t('Total'),
      `${t('{n} h de jeu', { n: r.heuresJeu })} · ${t('{n} h de musique', { n: r.heuresMusique })}${r.heuresAnime ? ` · ${t('{n} h d’animé', { n: r.heuresAnime })}` : ''}`,
      t('{n} jours actifs', { n: r.joursActifs }),
    ),
    r.episodesAnime ? row('📺', t('Épisodes d’animé vus'), String(r.episodesAnime)) : null,
    r.heuresFocus ? row('🎯', t('Temps en mode focus'), t('{n} h', { n: r.heuresFocus })) : null,
  ];
}
export function recapView(recaps) {
  if (!recaps.length) return [note(t('Le premier récap arrive à la fin du mois.'))];
  return recaps.map((m) =>
    el(
      'div',
      { class: 'recap' },
      el(
        'h2',
        {},
        monthName(m.mois),
        m.enCours ? el('span', { class: 'st en_cours', style: 'margin-left:8px' }, t('en cours')) : null,
      ),
      el(
        'div',
        { class: 'pstats' },
        stat(t('Heures de jeu'), m.heuresJeu),
        stat(t('Heures de musique'), m.heuresMusique),
        stat(t('Jours actifs'), m.joursActifs),
        stat(t('Jeux différents'), m.jeuxDifferents),
      ),
      el(
        'div',
        { class: 'recap-rows' },
        m.jeu
          ? el('span', {}, `🎮 ${t('Jeu du mois :')} `, el('b', {}, m.jeu.nom), ` (${t('{n} h', { n: m.jeu.heures })})`)
          : null,
        m.artiste
          ? el(
              'span',
              {},
              `🎤 ${t('Artiste du mois :')} `,
              el('b', {}, m.artiste.nom),
              ` (${t('{n} min', { n: m.artiste.minutes })})`,
            )
          : null,
        m.titre
          ? el(
              'span',
              {},
              `🎵 ${t('Titre du mois :')} `,
              el('b', {}, m.titre.titre),
              ` — ${m.titre.artiste} (${pl(m.titre.ecoutes, '{n} écoute', '{n} écoutes')})`,
            )
          : null,
        m.anime
          ? el(
              'span',
              {},
              `📺 ${t('Animé du mois :')} `,
              el('b', {}, m.anime.nom),
              ` (${t('{n} h', { n: m.anime.heures })})`,
            )
          : null,
        m.heuresFocus
          ? el('span', {}, `🎯 ${t('Mode focus :')} `, el('b', {}, t('{n} h', { n: m.heuresFocus })))
          : null,
        m.nuit ? el('span', {}, `🌙 ${t('Nuit la plus tardive :')} `, el('b', {}, m.nuit)) : null,
      ),
    ),
  );
}
export function hoursView(a) {
  if (!a || !a.heures) return [note(t('Pas encore de données.'))];
  const h = a.heures;
  const max = Math.max(1, ...h);
  const now = new Date().getHours();
  return [
    el(
      'p',
      { class: 'muted small' },
      `${t('Heures de jeu sur les 30 derniers jours, heure par heure (heure de Paris).')} `,
      el('b', {}, peakLabel(h)),
      '.',
    ),
    el(
      'div',
      { class: 'hours' },
      h.map((v, i) =>
        el(
          'div',
          { class: `hbar ${i === now ? 'now' : ''}`, title: `${t('{n} h', { n: i })} : ${hms(v)}` },
          el('span', { style: `height:${Math.max(2, (v / max) * 100)}%` }),
          el('small', {}, i % 3 === 0 ? `${i}h` : ''),
        ),
      ),
    ),
    note(t('La barre claire est l’heure actuelle.')),
  ];
}
export function setupView(s) {
  if (!s) return [note(t('Rien à montrer.'))];
  const m = s.machine || {};
  const rows = [
    ['💻', t('Système'), m.systeme],
    ['⚙️', t('Processeur'), m.processeur],
    ['🧠', t('Mémoire'), m.memoire],
    ['🎨', t('Carte graphique'), m.graphique],
  ].filter((r) => r[2]);
  return [
    s.photo ? el('img', { class: 'setup-photo', src: s.photo, alt: '', onclick: () => zoom(s.photo) }) : null,
    rows.length
      ? el(
          'div',
          { class: 'kv' },
          rows.map(([i, k, v]) =>
            el('div', {}, el('span', { class: 'muted small' }, `${i} ${k}`), el('strong', {}, v)),
          ),
        )
      : null,
    (s.lignes || []).length
      ? el(
          'div',
          { class: 'kv' },
          s.lignes.map((l) => el('div', {}, el('span', { class: 'muted small' }, l.nom), el('strong', {}, l.valeur))),
        )
      : null,
    !rows.length && !(s.lignes || []).length ? note(t('Pas encore renseigné.')) : null,
  ];
}
export function collectionView(items) {
  if (!items.length) return [note(t('Pas encore de clips ni de captures.'))];
  return [
    el(
      'div',
      { class: 'gallery coll' },
      items.map((m) =>
        el(
          'figure',
          {},
          m.type === 'video'
            ? el('video', { src: m.url, controls: '', preload: 'metadata', playsinline: '' })
            : el('img', { src: m.url, alt: '', loading: 'lazy', onclick: () => zoom(m.url) }),
          el(
            'figcaption',
            {},
            el('strong', {}, m.titre || (m.type === 'video' ? t('Clip') : t('Capture'))),
            el('span', { class: 'muted small' }, new Date(m.date).toLocaleDateString(locale())),
          ),
        ),
      ),
    ),
  ];
}
function msgRows(list, empty) {
  return list.length
    ? el(
        'div',
        { class: 'msgs' },
        list.map((m) =>
          el(
            'div',
            { class: 'msg' },
            el('div', { class: 'mh' }, el('strong', {}, m.pseudo), el('span', { class: 'muted small' }, m.date)),
            el('p', {}, m.texte),
          ),
        ),
      )
    : el('p', { class: 'empty' }, empty);
}
export function guestbookView(g) {
  const form = g.formulaire;
  const gi = g.giscus;
  const how = el(
    'div',
    { class: 'howto' },
    el('h2', {}, t('Écrire un mot')),
    form
      ? el(
          'div',
          { class: 'opt' },
          el('strong', {}, t('1. Sans compte (le plus simple)')),
          el(
            'ol',
            {},
            el('li', {}, t('Clique sur « Ouvrir le formulaire » : il s’ouvre dans un nouvel onglet.')),
            el('li', {}, t('Mets ton pseudo, choisis « Livre d’or », écris ton message, envoie.')),
            el(
              'li',
              {},
              t('Le message arrive chez moi dans KuroPurr ; je le valide et il apparaît ici (quelques heures max).'),
            ),
          ),
          el('a', { class: 'btn', href: form, target: '_blank', rel: 'noopener' }, t('Ouvrir le formulaire ↗')),
        )
      : null,
    gi
      ? el(
          'div',
          { class: 'opt' },
          el('strong', {}, form ? t('2. Avec un compte GitHub') : t('Avec un compte GitHub')),
          el(
            'ol',
            {},
            el('li', {}, t('Dans le cadre ci-dessous, clique sur « Sign in with GitHub » et autorise giscus.')),
            el('li', {}, t('Écris ton message et clique sur « Comment ».')),
            el('li', {}, t('Il apparaît tout de suite dans le cadre (ta discussion est publique sur GitHub).')),
          ),
          el('div', { class: 'giscus-box', id: 'giscusBox' }),
        )
      : null,
    !form && !gi ? el('p', { class: 'muted small' }, t('Le livre d’or n’est pas encore ouvert à l’écriture.')) : null,
  );
  const nodes = [msgRows(g.messages || [], t('Personne n’a encore écrit. Sois le premier !')), el('hr'), how];
  if (gi) setTimeout(() => mountGiscus(gi), 0);
  return nodes;
}
function mountGiscus(gi) {
  const box = $('giscusBox');
  if (!box) return;
  const sc = document.createElement('script');
  const attrs = {
    src: 'https://giscus.app/client.js',
    'data-repo': gi.repo,
    'data-repo-id': gi.repoId,
    'data-category': gi.category,
    'data-category-id': gi.categoryId,
    'data-mapping': gi.mapping || 'specific',
    'data-term': gi.term || 'Livre d’or',
    'data-strict': '0',
    'data-reactions-enabled': '1',
    'data-emit-metadata': '0',
    'data-input-position': 'top',
    'data-theme': 'transparent_dark',
    'data-lang': langue,
    crossorigin: 'anonymous',
    async: '',
  };
  for (const [k, v] of Object.entries(attrs)) sc.setAttribute(k, v);
  box.replaceChildren(sc);
}
export function playlistView(p) {
  return [
    (p.coupsDeCoeur || []).length ? el('h2', {}, t('♥ Mes coups de cœur')) : null,
    (p.coupsDeCoeur || []).length
      ? el(
          'ul',
          { class: 'list picks' },
          p.coupsDeCoeur.map((x) =>
            el(
              'li',
              {},
              el(
                'span',
                { class: 'k' },
                x.image
                  ? el('img', { src: x.image, alt: '', onerror: (e) => e.target.replaceWith(svg(ICONS.musique)) })
                  : svg(ICONS.musique),
              ),
              el(
                'span',
                { class: 't' },
                x.url ? el('a', { href: x.url, target: '_blank', rel: 'noopener' }, x.titre) : x.titre,
                el('span', {}, ` · ${x.artiste}`),
              ),
              el('time', { datetime: x.date }, dateFmt.format(Date.parse(x.date))),
            ),
          ),
        )
      : null,
    (p.coupsDeCoeur || []).length ? el('hr') : null,
    el('h2', {}, t('Vos propositions')),
    el(
      'p',
      { class: 'muted small' },
      t('Les morceaux que vous me conseillez. Je les écoute, et ceux que je valide apparaissent ici.'),
    ),
    msgRows(p.propositions || [], t('Aucune proposition pour l’instant.')),
    el('hr'),
    el('h2', {}, t('Proposer un morceau')),
    p.formulaire
      ? el(
          'div',
          { class: 'opt' },
          el(
            'ol',
            {},
            el('li', {}, t('Ouvre le formulaire (nouvel onglet).')),
            el(
              'li',
              {},
              t(
                'Ton pseudo, le type « Proposition de musique », puis titre + artiste (un lien Spotify / YouTube, c’est encore mieux).',
              ),
            ),
            el('li', {}, t('Envoie : je reçois ça dans KuroPurr et je valide.')),
          ),
          el('a', { class: 'btn', href: p.formulaire, target: '_blank', rel: 'noopener' }, t('Ouvrir le formulaire ↗')),
        )
      : el('p', { class: 'muted small' }, t('Pas encore ouvert aux propositions.')),
  ];
}
export function pingView(d) {
  const n = (d.evenements || {}).ping || 0;
  const today = new Date().toDateString();
  let done = false;
  try {
    done = localStorage.getItem('kp-ping') === today;
  } catch {
    /* rien */
  }
  const btn = el(
    'button',
    { class: 'bigbtn', type: 'button', disabled: done || null },
    done ? t('Coucou envoyé aujourd’hui ✓') : t('👋 Faire coucou'),
  );
  const msg = el(
    'p',
    { class: 'muted small' },
    done
      ? t('Merci ! Tu pourras recommencer demain.')
      : `${t('Un clic, et je reçois une notification sur mon PC. Une fois par jour et par personne.')}${n ? ` ${pl(n, 'Déjà {n} coucou reçu.', 'Déjà {n} coucous reçus.')}` : ''}`,
  );
  btn.addEventListener('click', () => {
    gcEvent('ping', 'Coucou');
    try {
      localStorage.setItem('kp-ping', today);
    } catch {
      /* rien */
    }
    btn.disabled = true;
    btn.textContent = t('Coucou envoyé ✓');
    msg.textContent = t('Envoyé ! Il verra passer une notification « quelqu’un te fait coucou » sur son PC.');
    burst(btn, '👋');
  });
  return [el('div', { class: 'center' }, btn, msg)];
}
export function visitorsView(v) {
  if (!v) return [note(t('Compteur pas encore configuré.'))];
  const pays = v.pays || [];
  const max = Math.max(1, ...pays.map((p) => p.n));
  return [
    el(
      'div',
      { class: 'pstats three' },
      stat(t('Visiteurs'), (v.total || 0).toLocaleString(locale())),
      stat(t('Pays'), pays.length),
      stat(t('Mis à jour'), v.maj ? ago(v.maj) : '—'),
    ),
    el('hr'),
    pays.length && window.KP_EXTRAS ? el('div', { class: 'wmap' }, window.KP_EXTRAS.carte(pays, t, locale())) : null,
    pays.length
      ? el(
          'div',
          { class: 'toplist' },
          pays
            .slice(0, 30)
            .map((p, i) =>
              el(
                'div',
                { class: 'toprow' },
                el('span', { class: 'rank' }, String(i + 1)),
                el('span', { class: 'tpic round flagpic' }, flag(p.code)),
                el(
                  'span',
                  { class: 'tt' },
                  el('strong', {}, p.nom || p.code),
                  el(
                    'span',
                    { class: 'bar' },
                    el('span', { class: 'fill', style: `width:${Math.max(3, (p.n / max) * 100)}%` }),
                  ),
                ),
                el('span', { class: 'tn' }, el('b', {}, p.n.toLocaleString(locale()))),
              ),
            ),
        )
      : el('p', { class: 'empty' }, t('Pas encore de visiteurs comptés.')),
    note(t('Visiteurs uniques comptés par GoatCounter, sans cookie ni traçage : seul le pays est agrégé.')),
  ];
}

// Page du profil : page Jeux — Steam, Roblox et instances Minecraft.
import { $, dateFmt, el, when } from './outils.js?v=0.35.0';
import { status } from './donnees.js?v=0.35.0';
import { applyTools, critiquesBlock, gprofile, scroller, stat, tools } from './bibliotheque.js?v=0.35.0';
import { pl, t } from './i18n.js?v=0.35.0';

let lib = 'steam',
  steamFilter = 'all';

/* ---------------- Jeux ---------------- */
const hours = (h) =>
  h >= 1
    ? t('{n} h', { n: Math.round(h * 10) / 10 })
    : h > 0
      ? t('{n} min', { n: Math.round(h * 60) })
      : t('jamais lancé');
export function brancherJeux() {
  $('libSwitch').addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    lib = b.dataset.lib;
    renderGames(status);
  });
}
function steamCard(g, wish) {
  const tag = wish
    ? ['souhait', t('Souhait')]
    : g.installe
      ? ['installe', t('Installé')]
      : ['noninstalle', t('Non installé')];
  const img = el('img', {
    src: `https://cdn.cloudflare.steamstatic.com/steam/apps/${g.appid}/library_600x900.jpg`,
    alt: '',
    loading: 'lazy',
  });
  img.onerror = () => {
    if (!img.dataset.alt) {
      img.dataset.alt = '1';
      img.src = `https://cdn.cloudflare.steamstatic.com/steam/apps/${g.appid}/header.jpg`;
    } else img.remove();
  };
  return el(
    'a',
    {
      class: 'gcard',
      href: `https://store.steampowered.com/app/${g.appid}`,
      target: '_blank',
      rel: 'noopener',
      title: g.description || g.nom,
    },
    el('span', { class: 'cov' }, String(g.nom).charAt(0), img, el('span', { class: 'nm' }, el('span', {}, g.nom))),
    el(
      'div',
      { class: 'gi' },
      wish
        ? null
        : el(
            'div',
            { class: 'nums' },
            el('span', {}, el('b', {}, hours(g.heures))),
            el('span', {}, g.dernier ? `${dateFmt.format(Date.parse(g.dernier))}` : ''),
          ),
      g.description
        ? el('p', {}, g.description)
        : g.genres && g.genres.length
          ? el('p', {}, g.genres.join(' · '))
          : null,
      el('span', { class: `st ${tag[0]}` }, tag[1]),
    ),
  );
}
function robloxCard(g) {
  return el(
    g.url ? 'a' : 'div',
    { class: 'gcard', href: g.url || null, target: g.url ? '_blank' : null, rel: 'noopener', title: g.nom },
    el(
      'span',
      { class: 'cov sq' },
      String(g.nom).charAt(0),
      g.image ? el('img', { src: g.image, alt: '', loading: 'lazy', onerror: (e) => e.target.remove() }) : null,
      el('span', { class: 'nm' }, el('span', {}, g.nom)),
    ),
    el(
      'div',
      { class: 'gi' },
      el(
        'div',
        { class: 'nums' },
        el('span', {}, el('b', {}, hours(g.heures))),
        el('span', {}, pl(g.sessions, '{n} session', '{n} sessions')),
      ),
      el(
        'p',
        {},
        [g.genre, g.dernier ? t('dernière {quand}', { quand: when(g.dernier) }) : ''].filter(Boolean).join(' · '),
      ),
    ),
  );
}
export function renderGames(s) {
  for (const b of $('libSwitch').children) b.classList.toggle('on', b.dataset.lib === lib);
  const body = $('libBody');
  const active = document.activeElement && document.activeElement.classList.contains('gsearch');
  if (lib === 'minecraft') {
    const list = s.minecraft || [];
    const LOADERS = { vanilla: 'Vanilla', fabric: 'Fabric', quilt: 'Quilt', forge: 'Forge', neoforge: 'NeoForge' };
    const cards = list.map((i) =>
      el(
        'div',
        { class: 'gcard', title: i.nom },
        el('span', { class: 'cov sq' }, String(i.nom).charAt(0), el('span', { class: 'nm' }, el('span', {}, i.nom))),
        el(
          'div',
          { class: 'gi' },
          el(
            'div',
            { class: 'nums' },
            el('span', {}, el('b', {}, hours(i.heures))),
            el('span', {}, i.dernier ? dateFmt.format(Date.parse(i.dernier)) : ''),
          ),
          el(
            'p',
            {},
            `Minecraft ${i.version} · ${LOADERS[i.loader] || i.loader}${i.mods ? ` · ${pl(i.mods, '{n} mod', '{n} mods')}` : ''}`,
          ),
        ),
      ),
    );
    body.replaceChildren(
      el('p', { class: 'muted small' }, t('Mes instances dans le launcher de KuroPurr.')),
      scroller(cards, t('Pas d’instance Minecraft pour l’instant.')),
    );
    return;
  }
  if (lib === 'roblox') {
    const r = s.roblox;
    if (!r) {
      body.replaceChildren(el('p', { class: 'empty' }, t('Pas de bibliothèque Roblox pour l’instant.')));
      return;
    }
    const genres = [...new Set(r.jeux.map((g) => g.genre).filter(Boolean))].sort();
    const list = applyTools('roblox', r.jeux, (g, k) =>
      k === 'name'
        ? String(g.nom)
        : k === 'sessions'
          ? g.sessions
          : k === 'last'
            ? Date.parse(g.dernier || 0)
            : g.heures,
    );
    body.replaceChildren(
      gprofile(r.profil, r.profil && r.profil.pseudo ? `@${r.profil.pseudo}` : null),
      el('hr'),
      el(
        'div',
        { class: 'pstats' },
        stat(t('Jeux'), r.total),
        stat(t('Heures'), hours(r.heures)),
        stat(t('Sessions'), r.sessions || 0),
        stat(t('Dernière'), r.derniere ? when(r.derniere) : '—'),
      ),
      el('hr'),
      tools('roblox', genres),
      scroller(list.map(robloxCard), t('Rien vu pour l’instant.')),
      el(
        'p',
        { class: 'muted small', style: 'margin:10px 0 0' },
        t('Temps et sessions vus par KuroPurr (Roblox ne fournit pas le temps de jeu).'),
      ),
    );
  } else {
    const st = s.steam;
    if (!st) {
      body.replaceChildren(el('p', { class: 'empty' }, t('Pas de bibliothèque Steam pour l’instant.')));
      return;
    }
    const pick = (id) => {
      steamFilter = steamFilter === id ? 'all' : id;
      renderGames(status);
    };
    const wish = steamFilter === 'wish';
    const base = wish
      ? st.souhaits
      : st.jeux.filter((g) =>
          steamFilter === 'installed' ? g.installe : steamFilter === 'notinstalled' ? !g.installe : true,
        );
    const genres = [...new Set(base.flatMap((g) => g.genres || []))].sort();
    const list = applyTools('steam', base, (g, k) =>
      k === 'name'
        ? String(g.nom)
        : k === 'recent'
          ? g.heures2s || 0
          : k === 'last'
            ? Date.parse(g.dernier || 0)
            : g.heures || 0,
    );
    body.replaceChildren(
      gprofile(
        st.profil,
        `${t('{n} h de jeu au total', { n: st.heures })}${st.derniere ? ` · ${t('dernière session {quand}', { quand: when(st.derniere) })}` : ''}`,
      ),
      el('hr'),
      el(
        'div',
        { class: 'pstats' },
        stat(t('Total'), st.total, 'all', steamFilter === 'all', () => pick('all')),
        stat(t('Installés'), st.installes, 'installed', steamFilter === 'installed', () => pick('installed')),
        stat(t('Non installés'), st.total - st.installes, 'notinstalled', steamFilter === 'notinstalled', () =>
          pick('notinstalled'),
        ),
        stat(t('Souhaits'), st.souhaits.length, 'wish', steamFilter === 'wish', () => pick('wish')),
      ),
      el('hr'),
      tools('steam', genres),
      scroller(
        list.map((g) => steamCard(g, wish)),
        wish ? t('Liste de souhaits vide ou privée.') : t('Aucun jeu.'),
      ),
      ...critiquesBlock(s, 'jeu'),
    );
  }
  if (active) {
    const q = body.querySelector('.gsearch');
    if (q) {
      q.focus();
      q.setSelectionRange(q.value.length, q.value.length);
    }
  }
}

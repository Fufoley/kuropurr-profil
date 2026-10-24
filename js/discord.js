// Page du profil : carte Discord (Lanyard) — avatar, badges officiels et déclarés, Rich Presence.
import { $, dur, el, fmtTime, ICONS, svg } from './outils.js?v=0.29.0';
import { render } from './rendu.js?v=0.29.0';

const LANYARD_MS = 30000;
export let lanyard = null;

/* ---------------- Discord (Lanyard) ---------------- */
// Lanyard donne statut, badges, photo et activités d'un compte membre de discord.gg/lanyard.
let lanyardAt = 0;
export async function loadLanyard(id) {
  if (!/^\d{15,22}$/.test(id) || Date.now() - lanyardAt < LANYARD_MS) return;
  lanyardAt = Date.now();
  try {
    const r = await fetch(`https://api.lanyard.rest/v1/users/${id}`);
    const j = await r.json();
    if (j && j.success && j.data) {
      lanyard = j.data;
      render();
    }
  } catch {
    /* la page marche sans */
  }
}
export const discordAvatar = (u) =>
  u.avatar
    ? `https://cdn.discordapp.com/avatars/${u.id}/${u.avatar}.${String(u.avatar).startsWith('a_') ? 'gif' : 'png'}?size=128`
    : `https://cdn.discordapp.com/embed/avatars/${Number(BigInt(u.id) >> 22n) % 6}.png`;
// Badges : bit de public_flags → nom + icône officielle (CDN Discord)
const FLAGS = [
  [1, 'Staff Discord', '5e74e9b61934fc1f67c65515d1f7e60d'],
  [2, 'Partenaire', '3f9748e53446a137a052f3454e2de41e'],
  [4, 'HypeSquad Events', 'bf01d1073931f921909045f3a39fd264'],
  [8, 'Bug Hunter', '2717692c7dca7289b35297368a940dd0'],
  [64, 'HypeSquad Bravery', '8a88d63823d8a71cd5e390baa45efa02'],
  [128, 'HypeSquad Brilliance', '011940fd013da3f7fb926e4a1cd2e618'],
  [256, 'HypeSquad Balance', '3aa41de486fa12454c3761e8e223442e'],
  [512, 'Early Supporter', '7060786766c9c840eb3019e725d2b358'],
  [16384, 'Bug Hunter Gold', '848f79194d4be5ff5f81505cbd0ce1e6'],
  [131072, 'Développeur de bot vérifié', '6df5892e0f35b866c5edb2cd7a01ab16'],
  [262144, 'Modérateur certifié', 'fee1624003e2fee35cb398e125dc479b'],
  [4194304, 'Développeur actif', '6bdc42827a38498929a4920da12695d9'],
];
const NITRO = '2ba85e8026a8614b640c2837bcdfe21b';
const badge = (name, icon) =>
  el('img', {
    src: icon.startsWith('http') ? icon : `https://cdn.discordapp.com/badge-icons/${icon}.png`,
    alt: name,
    title: name,
    onerror: (e) => e.target.replaceWith(el('span', { class: 'txt', title: name }, name)),
  });
// Badges déclarés à la main (Discord ne les rend pas publics) : icônes officielles via le dépôt mezotv/discord-badges.
const BADGE_CDN = 'https://cdn.jsdelivr.net/gh/mezotv/discord-badges@main/assets/';
const TIERS = {
  nitroTier: [
    ['bronze', 'Nitro Bronze'],
    ['silver', 'Nitro Argent'],
    ['gold', 'Nitro Or'],
    ['platinum', 'Nitro Platine'],
    ['diamond', 'Nitro Diamant'],
    ['emerald', 'Nitro Émeraude'],
    ['ruby', 'Nitro Rubis'],
    ['opal', 'Nitro Opale'],
  ].map(([k, l]) => [k, l, `subscriptions/badges/${k}.png`]),
  boost: [
    ['1', '1 mois'],
    ['2', '2 mois'],
    ['3', '3 mois'],
    ['4', '6 mois'],
    ['5', '9 mois'],
    ['6', '1 an'],
    ['7', '1 an 3 mois'],
    ['8', '1 an 6 mois'],
    ['9', '2 ans'],
  ].map(([k, l]) => [k, `Boost de serveur · ${l}`, `boosts/discord-boost-${k}.svg`]),
  gifting: [
    ['patron', 'Mécène'],
    ['champion', 'Champion'],
    ['luminary', 'Luminaire'],
    ['icon', 'Icône'],
    ['hero', 'Héros'],
    ['legend', 'Légende'],
  ].map(([k, l]) => [k, `Cadeaux · ${l}`, `gifting/${k}.png`]),
  accountAge: [
    'seed',
    'sprout',
    'bud',
    'sapling',
    'blossom',
    'redwood',
    'sequoia',
    'bristlecone',
    'stromatolite',
    'primordial',
  ].map((k) => [k, `Ancienneté · ${k}`, `account-age/${k}.svg`]),
  streaming: [
    'newcomer',
    'fledgling',
    'breakout',
    'standout',
    'trendsetter',
    'headliner',
    'star',
    'sensation',
    'visionary',
    'phenomenon',
  ].map((k) => [k, `Streaming · ${k}`, `streaming/${k}.svg`]),
  gameTime: [
    'casual',
    'recreational',
    'dedicated',
    'committed',
    'serious',
    'devoted',
    'seasoned',
    'ironclad',
    'unshakeable',
    'eternal',
  ].map((k) => [k, `Temps de jeu · ${k}`, `game-time/${k}.svg`]),
  gameVariety: [
    'sampler',
    'dabbler',
    'enthusiast',
    'ranger',
    'explorer',
    'adventurer',
    'voyager',
    'maverick',
    'polymath',
    'universalist',
  ].map((k) => [k, `Variété de jeux · ${k}`, `game-variety/${k}.svg`]),
};
const SIMPLE = {
  nitro: ['Nitro', 'discord-nitro.svg'],
  nitroBasic: ['Nitro Basic', 'discord-nitro-basic.svg'],
  quest: ['Quête accomplie', 'quest.png'],
  orbs: ['Apprenti des Orbes', 'orb.svg'],
  legacyName: ['Ancien nom', 'username.png'],
  clown: ['Clown (édition limitée)', 'special/discord-lootbox.svg'],
  meadow: ['Last Meadow', 'last-meadow.png'],
  staff: ['Staff Discord', 'discord-staff.svg'],
  partner: ['Partenaire', 'discord-partner.svg'],
  events: ['HypeSquad Events', 'hype-squad-events.svg'],
  bravery: ['HypeSquad Bravery', 'hype-squad-bravery.svg'],
  brilliance: ['HypeSquad Brilliance', 'hype-squad-brilliance.svg'],
  balance: ['HypeSquad Balance', 'hype-squad-balance.svg'],
  early: ['Early Supporter', 'discord-early-supporter.svg'],
  bug1: ['Bug Hunter', 'discord-bug-hunter-green.svg'],
  bug2: ['Bug Hunter Gold', 'discord-bug-hunter-gold.svg'],
  botdev: ['Développeur de bot vérifié', 'discord-bot-dev.svg'],
  mod: ['Modérateur certifié', 'discord-mod.svg'],
  activedev: ['Développeur actif', 'active-developer.svg'],
};
function declaredBadges(keys, already) {
  const out = [];
  for (const key of keys) {
    const [group, val] = key.split(':');
    let name, asset;
    if (TIERS[group]) {
      const t = TIERS[group].find((x) => x[0] === val);
      if (!t) continue;
      [, name, asset] = t;
    } else if (SIMPLE[group]) [name, asset] = SIMPLE[group];
    else continue;
    if (already.has(name)) continue;
    already.add(name);
    out.push(badge(name, BADGE_CDN + asset));
  }
  return out;
}
export function renderDiscord(s) {
  const box = $('discord');
  box.hidden = !s.discordId;
  if (!s.discordId) return;
  const u = lanyard && lanyard.discord_user;
  if (!u) {
    $('dcName').textContent = '…';
    $('dcTag').textContent = 'Profil indisponible';
    $('dcBadges').replaceChildren();
    $('dcPresence').replaceChildren(el('p', { class: 'muted small' }, 'Statut Discord indisponible pour le moment.'));
    return;
  }
  const av = $('dcAvatar');
  const src = discordAvatar(u);
  if (av.dataset.src !== src) {
    av.dataset.src = src;
    av.src = src;
    av.onerror = () => {
      av.src = 'logo.png';
    };
  }
  const deco =
    u.avatar_decoration_data && u.avatar_decoration_data.asset
      ? `https://cdn.discordapp.com/avatar-decoration-presets/${u.avatar_decoration_data.asset}.png?size=128&passthrough=true`
      : '';
  $('dcDeco').hidden = !deco;
  if (deco && $('dcDeco').dataset.src !== deco) {
    $('dcDeco').dataset.src = deco;
    $('dcDeco').src = deco;
  }
  const st = lanyard.discord_status && lanyard.discord_status !== 'offline' ? lanyard.discord_status : '';
  $('dcRing').className = `ring ${st}`;
  const g = u.primary_guild;
  const clan =
    g && g.tag
      ? el(
          'span',
          { class: 'dc-clan' },
          g.badge && g.identity_guild_id
            ? el('img', {
                src: `https://cdn.discordapp.com/clan-badges/${g.identity_guild_id}/${g.badge}.png?size=16`,
                alt: '',
              })
            : null,
          g.tag,
        )
      : null;
  const nameEl = $('dcName');
  nameEl.replaceChildren(el('span', { class: 'dc-dn' }, u.global_name || u.username), clan);
  // Couleur du nom d'affichage (Nitro) et plaque de nom (collectible)
  const dns = u.display_name_styles;
  const col =
    dns && Array.isArray(dns.colors) && dns.colors.length
      ? dns.colors.map((c) => `#${Number(c).toString(16).padStart(6, '0')}`)
      : null;
  nameEl.querySelector('.dc-dn').style.cssText = col
    ? col.length > 1
      ? `background:linear-gradient(90deg,${col.join(',')});-webkit-background-clip:text;background-clip:text;color:transparent`
      : `color:${col[0]}`
    : '';
  const plate =
    u.collectibles && u.collectibles.nameplate && u.collectibles.nameplate.asset
      ? `https://cdn.discordapp.com/assets/collectibles/${u.collectibles.nameplate.asset}static.png`
      : '';
  const head = $('discord').querySelector('.dc-head');
  head.style.backgroundImage = plate
    ? `linear-gradient(90deg, rgba(14,17,16,.9) 35%, rgba(14,17,16,.2)), url(${plate})`
    : '';
  head.classList.toggle('plated', !!plate);
  const custom = (lanyard.activities || []).find((a) => a.type === 4);
  $('dcTag').replaceChildren(
    `@${u.username} · ${{ online: 'en ligne', idle: 'absent', dnd: 'ne pas déranger' }[st] || 'hors ligne'}`,
    custom && (custom.state || (custom.emoji && custom.emoji.name))
      ? el(
          'span',
          { class: 'dc-custom' },
          custom.emoji && custom.emoji.id
            ? el('img', {
                src: `https://cdn.discordapp.com/emojis/${custom.emoji.id}.${custom.emoji.animated ? 'gif' : 'png'}?size=20`,
                alt: '',
              })
            : custom.emoji && custom.emoji.name
              ? custom.emoji.name + ' '
              : '',
          custom.state || '',
        )
      : null,
  );
  const auto = FLAGS.filter(([bit]) => Number(u.public_flags || 0) & bit);
  const already = new Set(auto.map(([, name]) => name));
  const badges = auto.map(([, name, icon]) => badge(name, icon));
  if (u.premium_type) {
    badges.push(badge('Nitro', NITRO));
    already.add('Nitro');
  }
  $('dcBadges').replaceChildren(...badges, ...declaredBadges(s.badgesDiscord, already));
  // Rich Presence : Spotify, sinon le premier jeu / activité
  const pres = $('dcPresence');
  const acts = Array.isArray(lanyard.activities) ? lanyard.activities.filter((a) => a.type !== 4) : [];
  if (lanyard.listening_to_spotify && lanyard.spotify) {
    const sp = lanyard.spotify,
      t = sp.timestamps || {};
    pres.replaceChildren(
      el(
        'div',
        { class: 'rp' },
        el(
          'div',
          { class: 'rp-img' },
          sp.album_art_url
            ? el('img', { src: sp.album_art_url, alt: '' })
            : el('span', { class: 'ph' }, svg(ICONS.musique)),
        ),
        el(
          'div',
          { class: 'rp-text' },
          el('span', { class: 'rp-kind' }, 'Écoute Spotify'),
          el('strong', {}, sp.song),
          el('span', {}, sp.artist || ''),
          sp.album ? el('span', {}, sp.album) : null,
          t.start && t.end
            ? [
                el('div', { class: 'bar' }, el('div', { class: 'fill', 'data-start': t.start, 'data-end': t.end })),
                el(
                  'span',
                  { class: 'times' },
                  el('span', { class: 'pos' }, '0:00'),
                  el('span', {}, fmtTime(t.end - t.start)),
                ),
              ]
            : null,
        ),
      ),
    );
  } else if (acts.length) {
    const a = acts.find((x) => x.type === 0) || acts[0];
    const asset = (key) => {
      const v = a.assets && a.assets[key];
      if (!v) return '';
      return String(v).startsWith('mp:')
        ? `https://media.discordapp.net/${String(v).slice(3)}`
        : `https://cdn.discordapp.com/app-assets/${a.application_id}/${v}.png`;
    };
    const big = asset('large_image'),
      small = asset('small_image');
    pres.replaceChildren(
      el(
        'div',
        { class: 'rp' },
        el(
          'div',
          { class: 'rp-img' },
          big
            ? el('img', {
                src: big,
                alt: '',
                title: (a.assets && a.assets.large_text) || '',
                onerror: (e) => e.target.replaceWith(el('span', { class: 'ph' }, svg(ICONS.jeu))),
              })
            : el('span', { class: 'ph' }, svg(ICONS.jeu)),
          small
            ? el('img', { class: 'mini', src: small, alt: '', title: (a.assets && a.assets.small_text) || '' })
            : null,
        ),
        el(
          'div',
          { class: 'rp-text' },
          el('strong', {}, a.name),
          a.details ? el('span', {}, a.details) : null,
          a.state ? el('span', {}, a.state) : null,
          a.timestamps && a.timestamps.start
            ? el('span', {}, `depuis ${dur((Date.now() - a.timestamps.start) / 1000)}`)
            : null,
        ),
      ),
    );
  } else {
    pres.replaceChildren(
      el('p', { class: 'muted small' }, st ? 'Aucune activité en ce moment.' : 'Hors ligne sur Discord.'),
    );
  }
}

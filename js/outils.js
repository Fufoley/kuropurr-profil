// Page du profil : outils communs (DOM, adresses sûres, dates et durées, icônes, couleurs des réseaux, markdown).
import { status } from './donnees.js?v=0.29.4';

export const $ = (id) => document.getElementById(id);
/** Adresse sans schéma dangereux (javascript:, vbscript:, data: hors images) : les liens viennent parfois d'autres sites. */
export const safeUrl = (u) => {
  const s = String(u)
    .replace(/[\u0000-\u0020]/g, '')
    .toLowerCase();
  return /^(javascript|vbscript):/.test(s) || (s.startsWith('data:') && !s.startsWith('data:image/')) ? '#' : u;
};
export const el = (tag, attrs = {}, ...kids) => {
  const n = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v == null || v === false) continue;
    if (k === 'class') n.className = v;
    else if (k.startsWith('on')) n.addEventListener(k.slice(2), v);
    else n.setAttribute(k, k === 'href' || k === 'src' || k === 'poster' ? safeUrl(v) : v);
  }
  n.append(...kids.flat(2).filter((k) => k != null && k !== false));
  return n;
};

/* ---------------- Outils ---------------- */
export const pad = (n) => String(n).padStart(2, '0');
export const fmtTime = (ms) => {
  const s = Math.max(0, Math.floor(ms / 1000));
  return `${Math.floor(s / 60)}:${pad(s % 60)}`;
};
export const dur = (sec) => {
  const m = Math.round(sec / 60);
  return m < 1
    ? '< 1 min'
    : m < 60
      ? `${m} min`
      : m < 1440
        ? `${Math.floor(m / 60)} h ${pad(m % 60)}`
        : `${Math.floor(m / 1440)} j ${Math.floor((m % 1440) / 60)} h`;
};
export const since = (iso) => dur((Date.now() - Date.parse(iso)) / 1000);
export const clock = new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit' });
export const dateFmt = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short' });
export const isToday = (iso) => new Date(iso).toDateString() === new Date().toDateString();
export const ago = (iso) => {
  const m = Math.round((Date.now() - Date.parse(iso)) / 60000);
  return m < 1
    ? 'à l’instant'
    : m < 60
      ? `il y a ${m} min`
      : m < 1440
        ? `il y a ${Math.floor(m / 60)} h`
        : m < 43200
          ? `il y a ${Math.floor(m / 1440)} j`
          : when(iso);
};
export const when = (iso) => {
  const t = Date.parse(iso);
  return isToday(iso) ? `aujourd’hui à ${clock.format(t)}` : `le ${dateFmt.format(t)} à ${clock.format(t)}`;
};
export const isVideo = (u) => /\.(mp4|webm)(\?|$)/i.test(u);
export const svg = (d) => {
  const s = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  s.setAttribute('viewBox', '0 0 24 24');
  s.setAttribute('class', 'i');
  // icônes SVG constantes
  // nosemgrep
  s.innerHTML = d;
  return s;
};
export const ICONS = {
  jeu: '<path d="M7.5 8h9a4.5 4.5 0 0 1 4.4 5.5l-.8 3.5a2.2 2.2 0 0 1-3.8 1l-2-2.2h-4.6l-2 2.2a2.2 2.2 0 0 1-3.8-1l-.8-3.5A4.5 4.5 0 0 1 7.5 8z"/>',
  musique: '<path d="M9 17.5V5.5l10-2v12"/><circle cx="6.5" cy="17.5" r="2.5"/><circle cx="16.5" cy="15.5" r="2.5"/>',
  anime: '<rect x="3" y="5" width="18" height="13" rx="2"/><path d="m10 9 5 2.5-5 2.5z"/><path d="M8 21h8"/>',
};
const SOCIAL = {
  discord: '#5865f2',
  twitch: '#9146ff',
  youtube: '#ff2d2d',
  github: '#8b949e',
  x: '#cfd3d8',
  twitter: '#1d9bf0',
  instagram: '#e1306c',
  tiktok: '#69c9d0',
  steam: '#66c0f4',
  spotify: '#1db954',
  roblox: '#e2231a',
  reddit: '#ff4500',
  kick: '#53fc18',
  myanimelist: '#2e51a2',
  anilist: '#3db4f2',
  bluesky: '#0085ff',
  mastodon: '#6364ff',
  linkedin: '#0a66c2',
  patreon: '#ff424d',
  kofi: '#ff5e5b',
  deezer: '#a238ff',
  soundcloud: '#ff5500',
  snapchat: '#fffc00',
  telegram: '#26a5e4',
  site: '#a9c59b',
  mail: '#a9c59b',
};
export const colorOf = (name) =>
  SOCIAL[
    String(name)
      .toLowerCase()
      .replace(/[^a-z]/g, '')
  ] ||
  (status && status.accent) ||
  '#a9c59b';

/** Markdown minimal et sûr (tout est échappé avant balisage). */
export function markdown(src) {
  const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const inline = (s) =>
    esc(s)
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      .replace(/__([^_]+)__/g, '<u>$1</u>')
      .replace(/(^|[^*])\*([^*\n]+)\*(?!\*)/g, '$1<em>$2</em>')
      .replace(/~~([^~]+)~~/g, '<s>$1</s>')
      .replace(/!\[([^\]]*)\]\((https:\/\/[^)\s]+)\)/g, '<img src="$2" alt="$1" loading="lazy">')
      .replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
  const lines = String(src || '')
    .replace(/\r/g, '')
    .split('\n');
  const out = [];
  let i = 0,
    para = [],
    list = null;
  const flushP = () => {
    if (para.length) {
      out.push(`<p>${para.map(inline).join('<br>')}</p>`);
      para = [];
    }
  };
  const flushL = () => {
    if (list) {
      out.push(`<${list.tag}>${list.items.map((x) => `<li>${inline(x)}</li>`).join('')}</${list.tag}>`);
      list = null;
    }
  };
  while (i < lines.length) {
    const l = lines[i];
    if (/^```/.test(l)) {
      flushP();
      flushL();
      const code = [];
      i++;
      while (i < lines.length && !/^```/.test(lines[i])) code.push(lines[i++]);
      out.push(`<pre><code>${esc(code.join('\n'))}</code></pre>`);
      i++;
      continue;
    }
    const h = l.match(/^(#{1,3})\s+(.*)/);
    if (h) {
      flushP();
      flushL();
      out.push(`<h${h[1].length}>${inline(h[2])}</h${h[1].length}>`);
      i++;
      continue;
    }
    const li = l.match(/^\s*([-*•]|\d+[.)])\s+(.*)/);
    if (li) {
      flushP();
      const tag = /\d/.test(li[1]) ? 'ol' : 'ul';
      if (!list || list.tag !== tag) {
        flushL();
        list = { tag, items: [] };
      }
      list.items.push(li[2]);
      i++;
      continue;
    }
    const q = l.match(/^>\s?(.*)/);
    if (q) {
      flushP();
      flushL();
      out.push(`<blockquote>${inline(q[1])}</blockquote>`);
      i++;
      continue;
    }
    if (!l.trim()) {
      flushP();
      flushL();
      i++;
      continue;
    }
    flushL();
    para.push(l);
    i++;
  }
  flushP();
  flushL();
  return out.join('');
}

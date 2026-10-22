// Page du profil : petits extras (KuroPurr 0.23).
// - Carte du monde des visiteurs (tuile Divers « Visiteurs ») : terres en pointillés et un point par pays.
//   Données dérivées de Natural Earth (domaine public, naturalearthdata.com) : terres 1:110m réduites à une
//   grille de 2,5° et points d'étiquette des pays 1:50m, arrondis au degré.
// - Thèmes de saison discrets : Halloween (20 oct. – 2 nov.), Noël (décembre), Nouvel An (1er janvier).
(function () {
  'use strict';
  const NS = 'http://www.w3.org/2000/svg';
  // Grille des terres : 144 colonnes × 56 lignes de 2,5°, de 82,5° N à 57,5° S, bits en hexadécimal
  const LAND = {
    cols: 144,
    rows: 56,
    step: 2.5,
    top: 82.5,
    bits: '000000003fffffffc0000030000600000000000000013fdfffff00070000000380000000000001e9df8fffff00020001c00ff801c000000003c4be807fff0000000600fffe20000000e0037ceff03ffe000030041fffffffff0087fffffefb783ffc0003ff07fffffffffffff7fffffffe3e1fc1c007ffffffffffffffff01ffffffff5c1f00c01ffffffffffffffffe03ffffffc0700e00003efffffffffffffffc01e0ffffe07e0000003e7fffffffffffe48001801ffff87f00000214fffffffffffe038000000ffffeff80000f3fffffffffffff8300000007ffffffc0000bffffffffffffffc000000003fffffce00003ffffffffffffff4000000003ffffff000001fffffffffffffe0000000003fffff8000007fbe0fffffffffcc000000003fffff000000f97fffffffffff08000000001ffffc000000f02fffffffffe208000000001ffffc0000006f81fffffffffb30000000000ffff80000007f003ffffffff0e00000000007fff0000000ffeffffffffff8000000000003fc10000001fffffefffffff8000000000000f810000003ffffdf1ffffff00000000000007800000003ffffdfe1ffffe8000000000000388c000007ffffeff0fe7f800000000000003f81000007ffffefe07c7f080000000000000fc0000007fffff780783e0800000000000001e0000007fffffe00301f080000000000000063800003fffffb80301600000000000000001ff00001ffffff000810060000000000000007fc0000ffffff000808200000000000000007ff000000fffe00001c60000000000000000fff000000fffc00001cec000000000000000fffc00001fff800000ce8400000000000000ffff80000fff0000006497c8000000000000ffffc00007ff0000003801e2000000000000ffffc00007ff0000000c01900000000000007fff800007ff0000000000000000000000007fff800007ff100000000ec00000000000003fff80000fff300000007ec00000000000000fff000007fc300000007fe00000000000000fff000007fc60000003fff00000000000000ffc000003fc60000007fff80000000000001ff8000003f800000007fff80000000000001ff0000003f800000003fffc0000000000001ff0000001f000000003fff80000000000001fe0000001e000000003c3f80000000000001f80000000000000000000f00000000000003f80000000000000000000600200000000003e00000000000000000000200400000000003c000000000000000000000018000000000038000000000000000000000010000000000038000000000000000000000000000000000038800000000000000000000000000000000018000000000000000000000000000000000000000000000000000000000000',
  };
  // Pays : code ISO + longitude,latitude
  const CENTRES =
    'AD2,43;AE55,23;AF66,34;AG-62,17;AI-63,18;AL20,41;AM45,40;AO18,-12;AQ36,-80;AR-64,-34;AS-171,-14;AT14,48;AU134,-24;AW-70,13;AX20,60;AZ47,40;BA18,44;BB-60,13;BD90,24;BE5,51;BF-1,13;BG25,43;BH51,26;BI30,-3;BJ2,10;BL-63,18;BM-65,32;BN115,4;BO-65,-17;BR-50,-12;BS-77,26;BT90,28;BW24,-22;BY28,54;BZ-89,17;CA-102,60;CD23,-2;CF21,7;CG16,0;CH7,47;CI-6,7;CK-160,-21;CL-72,-38;CM12,5;CN106,32;CO-73,3;CR-84,10;CU-78,21;CV-24,15;CW-69,12;CY33,35;CZ15,50;DE10,51;DJ42,12;DK9,56;DM-61,15;DO-71,19;DZ3,27;EC-78,-1;EE26,59;EG29,26;EH-13,24;ER38,16;ES-3,40;ET39,8;FI27,63;FJ178,-18;FK-59,-52;FM158,7;FO-7,62;FR3,47;GA12,0;GB-2,54;GD-62,12;GE44,42;GG-3,49;GH-1,8;GL-39,74;GM-15,14;GN-10,11;GQ9,2;GR22,39;GS-31,-56;GT-90,15;GU145,13;GW-15,12;GY-59,5;HK114,22;HM74,-53;HN-87,15;HR16,46;HT-72,19;HU19,47;ID102,-1;IE-8,53;IL35,31;IM-5,54;IN79,23;IO71,-6;IQ43,33;IR55,32;IS-19,65;IT11,45;JE-2,49;JM-77,18;JO36,31;JP138,36;KE38,1;KG75,42;KH105,13;KI-157,2;KM43,-12;KN-63,17;KP126,40;KR128,36;KW47,29;KY-81,19;KZ69,49;LA103,19;LB36,34;LC-61,14;LI10,47;LK81,8;LR-9,6;LS28,-29;LT24,55;LU6,50;LV25,57;LY18,27;MA-7,32;MC7,44;MD28,47;ME19,43;MF-63,18;MG47,-19;MH171,7;MK22,42;ML-2,19;MM96,22;MN104,46;MO114,22;MP146,15;MR-10,20;MS-62,17;MT14,36;MU58,-20;MV74,4;MW34,-13;MX-102,24;MY114,3;MZ38,-14;NA17,-21;NC165,-21;NE10,17;NF168,-29;NG8,9;NI-85,13;NL6,52;NO10,61;NP84,28;NR167,-1;NU-170,-19;NZ173,-40;OM57,22;PA-80,9;PE-73,-13;PF-149,-18;PG144,-6;PH122,11;PK69,29;PL19,52;PM-56,47;PN-128,-24;PR-66,18;PS35,32;PT-8,40;PW135,8;PY-60,-22;QA51,25;RO25,46;RS21,44;RU45,58;RW30,-2;SA45,24;SB159,-8;SC55,-5;SD29,16;SE19,66;SG104,1;SH-6,-16;SI15,46;SK19,49;SL-12,9;SM12,44;SN-15,15;SO45,4;SR-56,4;SS30,7;ST7,1;SV-89,14;SX-63,18;SY38,35;SZ31,-27;TC-72,22;TD19,15;TF69,-49;TG1,9;TH101,15;TJ73,38;TL126,-9;TM59,40;TN9,34;TO-175,-21;TR35,39;TT-61,11;TV179,-9;TW121,24;TZ35,-6;UA32,50;UG33,2;US-97,40;UY-56,-33;UZ64,42;VA12,42;VC-61,13;VE-65,7;VG-65,18;VI-65,18;VN105,22;VU167,-15;WF-178,-14;WS-172,-14;XK21,43;YE46,15;ZA24,-30;ZM26,-15;ZW30,-19';
  let centres = null;
  const centre = (code) => {
    if (!centres) {
      centres = {};
      for (const e of CENTRES.split(';')) {
        const [lon, lat] = e.slice(2).split(',');
        centres[e.slice(0, 2)] = [Number(lon), Number(lat)];
      }
    }
    return (
      centres[
        String(code || '')
          .slice(0, 2)
          .toUpperCase()
      ] || null
    );
  };
  const node = (tag, attrs) => {
    const n = document.createElementNS(NS, tag);
    for (const [k, v] of Object.entries(attrs || {})) n.setAttribute(k, v);
    return n;
  };
  let landPath = '';
  function land() {
    if (landPath) return landPath;
    const { cols, rows, step, bits } = LAND;
    const parts = [];
    for (let i = 0; i < cols * rows; i++) {
      if (!((parseInt(bits[i >> 2], 16) >> (3 - (i & 3))) & 1)) continue;
      const x = (i % cols) * step + step / 2,
        y = Math.floor(i / cols) * step + step / 2;
      parts.push(`M${x - 0.8} ${y}a.8 .8 0 1 0 1.6 0a.8 .8 0 1 0-1.6 0`);
    }
    return (landPath = parts.join(''));
  }

  /** Carte SVG : `pays` = [{ code, nom, n }]. Taille du point selon le nombre de visiteurs. */
  function carte(pays) {
    const W = LAND.cols * LAND.step,
      H = LAND.rows * LAND.step;
    const svg = node('svg', {
      viewBox: `0 0 ${W} ${H}`,
      class: 'wmap-svg',
      role: 'img',
      'aria-label': 'Carte des pays des visiteurs',
    });
    svg.append(node('path', { d: land(), class: 'wmap-land' }));
    const list = (pays || [])
      .map((p) => ({ ...p, c: centre(p.code) }))
      .filter((p) => p.c && p.n > 0)
      .sort((a, b) => b.n - a.n);
    const max = Math.max(1, ...list.map((p) => p.n));
    for (const p of list) {
      const x = p.c[0] + 180,
        y = Math.min(H - 1, Math.max(1, LAND.top - p.c[1]));
      const r = 1.8 + 5 * Math.sqrt(p.n / max);
      const g = node('g', { class: 'wmap-pt' });
      g.append(
        node('circle', { cx: x, cy: y, r: r + 2.2, class: 'wmap-halo' }),
        node('circle', { cx: x, cy: y, r, class: 'wmap-dot' }),
      );
      const t = node('title');
      t.textContent = `${p.nom || p.code} · ${Number(p.n).toLocaleString('fr-FR')} visiteur${p.n > 1 ? 's' : ''}`;
      g.append(t);
      svg.append(g);
    }
    return svg;
  }

  /** Saison du moment (date locale), ou ''. */
  function saison(d) {
    const m = d.getMonth() + 1,
      j = d.getDate();
    if ((m === 10 && j >= 20) || (m === 11 && j <= 2)) return 'halloween';
    if (m === 12) return 'noel';
    if (m === 1 && j === 1) return 'nouvelan';
    return '';
  }
  const ACCENTS = { halloween: '#f28c38', noel: '#e0565b', nouvelan: '#e6c25a' };
  const LABELS = { halloween: '🎃', noel: '🎄', nouvelan: '✨ Bonne année' };
  let applied = null;
  /** Applique (ou retire) le thème de saison : classe sur <body>, accent, petite décoration. */
  function appliquerSaison(on, date) {
    const s = on ? saison(date || new Date()) : '';
    if (s) document.documentElement.style.setProperty('--accent', ACCENTS[s]);
    if (s === applied) return s;
    applied = s;
    document.body.classList.remove('saison-halloween', 'saison-noel', 'saison-nouvelan');
    document.getElementById('saisonDeco')?.remove();
    document.getElementById('saisonTag')?.remove();
    if (!s) return s;
    document.body.classList.add(`saison-${s}`);
    const deco = document.createElement('div');
    deco.id = 'saisonDeco';
    deco.className = 'saison-deco';
    deco.setAttribute('aria-hidden', 'true');
    if (s === 'noel')
      for (let i = 0; i < 14; i++) {
        const f = document.createElement('i');
        f.style.cssText = `left:${(i * 7.3 + 3) % 100}%;--d:${9 + (i % 5) * 2.3}s;--w:${i % 3 ? 3 : 5}px;animation-delay:-${(i * 1.7) % 9}s`;
        deco.append(f);
      }
    else if (s === 'halloween') {
      const sp = document.createElement('span');
      sp.className = 'spider';
      deco.append(sp);
    } else {
      for (let i = 0; i < 10; i++) {
        const f = document.createElement('i');
        f.style.cssText = `left:${(i * 11 + 4) % 100}%;top:${(i * 23) % 60}px;animation-delay:-${i * 0.4}s`;
        deco.append(f);
      }
    }
    document.body.append(deco);
    const tag = document.createElement('span');
    tag.id = 'saisonTag';
    tag.className = 'saison-tag';
    tag.textContent = LABELS[s];
    document.getElementById('statusText')?.after(tag);
    return s;
  }

  /** Chapeau de Cat.exe pour la saison en cours (sorcière, bonnet de Noël, chapeau de fête), ou null. */
  function chapeau() {
    const s = applied;
    if (!s) return null;
    const svg = node('svg', { viewBox: '0 0 40 36', class: `cat-hat hat-${s}`, 'aria-hidden': 'true' });
    if (s === 'halloween') {
      svg.append(
        node('path', { d: 'M4 30c8-3 24-3 32 0l-1 3c-8-2-22-2-30 0z', fill: '#2a1d3a' }),
        node('path', { d: 'M11 29 21 3c2 2 3 6 2 9l-2 3 7 14z', fill: '#3b2752' }),
        node('path', { d: 'M12 26c6-1.5 10-1.5 15 0l.8 2.4c-5-1.4-10-1.4-16.6 0z', fill: '#f28c38' }),
      );
    } else if (s === 'noel') {
      svg.append(
        node('path', { d: 'M8 28C10 14 18 6 27 7c4 1 6 6 7 10l-4 2c-1-3-2-5-4-5-4 1-7 7-8 14z', fill: '#d6403f' }),
        node('rect', { x: 5, y: 26, width: 24, height: 7, rx: 3.5, fill: '#f4f4f0' }),
        node('circle', { cx: 33, cy: 20, r: 4, fill: '#f4f4f0' }),
      );
    } else {
      svg.append(
        node('path', { d: 'M10 32 20 3l10 29z', fill: '#e6c25a' }),
        node('path', { d: 'M14 21h12M12 27h16M17 12h6', stroke: '#c0457a', 'stroke-width': 2.4 }),
        node('circle', { cx: 20, cy: 3, r: 3, fill: '#c0457a' }),
      );
    }
    return svg;
  }

  window.KP_EXTRAS = { carte, saison, appliquerSaison, chapeau };
})();

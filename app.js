/* ===== Stage: scale the fixed 1440x1174 artboard to fit any screen ===== */
const W = 1440, H = 1174, $ = (s, r = document) => r.querySelector(s);
const stage = $('#stage');
const fit = () => stage.style.setProperty('--s', Math.min(innerWidth / W, innerHeight / H));
addEventListener('resize', fit); fit();

/* ===== Config & helpers ===== */
const LFM = { user: 'muditchand', key: '6ad480bc2478da65a9142be7916d8024' };   // Last.fm (read-only key)
const SIZES = ['w', 'n', 'f', 'h', 'h'];                                      // repeating tile pattern
const u = p => encodeURI(p);                                                  // lets file names contain spaces
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const isVid = p => /\.(mp4|webm|mov|m4v)$/i.test(p);
let CATS = [], PLUG = [], tok = 0, book = null, mdBase = '';
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.12.313/pdf.worker.min.js';

/* ===== Markdown: **bold** *italic* ==highlight== images, videos, YouTube links ===== */
marked.use({ renderer: { image(h, t, a) {
  const yt = h.match(/(?:youtu\.be\/|[?&]v=)([\w-]{11})/);
  if (yt) return `<iframe src="https://www.youtube.com/embed/${yt[1]}" allowfullscreen></iframe>`;
  const s = /^https?:/.test(h) ? h : u(mdBase + h);
  return isVid(h) ? `<video src="${s}" controls></video>` : `<img src="${s}" alt="${esc(a)}">`;
} } });
const md = t => DOMPurify.sanitize(
  marked.parse(t.replace(/^---[\s\S]*?\r?\n---\r?\n?/, '').replace(/==(.+?)==/g, '<mark>$1</mark>')),
  { ADD_TAGS: ['iframe'], ADD_ATTR: ['allowfullscreen', 'controls'] });
const getText = async url => { const r = await fetch(url); if (!r.ok) throw 0; return r.text(); };

/* ===== Startup ===== */
(async () => {
  try { CATS = (await (await fetch('content/manifest.json')).json()).cats; } catch { CATS = []; }
  route(); nowPlaying(); setInterval(nowPlaying, 30000);
})();

/* ===== Router: #/  #/projects/<cat>  #/projects/<cat>/<project>  #/plugins/<n>  #/about ===== */
addEventListener('hashchange', route);
function route() {
  const p = location.hash.replace(/^#\/?/, '').split('/');
  let v = 'home', back = '#/';
  if (p[0] === 'projects') {
    const c = CATS.find(c => c.slug === p[1]) || CATS[0];
    const i = c ? c.projects.findIndex(x => x.slug === p[2]) : -1;
    if (i > -1) { v = 'detail'; back = '#/projects/' + c.slug; detail(c, i); }
    else { v = 'projects'; projects(c); }
  } else if (p[0] === 'plugins') { v = 'plugins'; back = '#/projects'; plugin(+p[1] || 0); }
  else if (p[0] === 'about') v = 'about';
  if (v !== 'detail') book = null;
  document.querySelectorAll('.view').forEach(e => e.classList.toggle('active', e.id === v));
  const x = $('#' + v + ' .x'); if (x) x.href = back;
  stage.dataset.v = v;
}

/* ===== Projects grid ===== */
const io = new IntersectionObserver(es => es.forEach(e => {
  if (e.isIntersecting) { io.unobserve(e.target); pdfCover(e.target); }
}), { rootMargin: '200px' });

async function pdfCover(c) {            // no cover image? draw page 1 of the PDF
  try {
    const pg = await (await pdfjsLib.getDocument(u(c.dataset.pdf)).promise).getPage(1);
    const v = pg.getViewport({ scale: 600 / pg.getViewport({ scale: 1 }).width });
    c.width = v.width; c.height = v.height;
    await pg.render({ canvasContext: c.getContext('2d'), viewport: v }).promise;
  } catch {}
}

function projects(c) {
  $('#tabs').innerHTML = CATS.map(k => `<a href="#/projects/${k.slug}" class="${k === c ? 'on' : ''}">${esc(k.label)}</a>`).join('')
    + '<a href="#/plugins">Plugins</a>';
  const g = $('#grid');
  if (!c || !c.projects.length) {
    g.innerHTML = '<p style="grid-column:1/-1;font-size:20px;font-weight:300">Nothing here yet. Add files under content/ and run: node tools/build-manifest.mjs</p>';
    return;
  }
  g.innerHTML = c.projects.map((p, i) =>
    `<a class="tile ${p.size || SIZES[i % 5]}" href="#/projects/${c.slug}/${p.slug}"><div class="im">`
    + (p.cover ? `<img src="${u(p.cover)}" alt="">` : p.pdf ? `<canvas data-pdf="${esc(p.pdf)}"></canvas>` : '')
    + `<span>${esc(p.title)}</span></div></a>`).join('');
  g.querySelectorAll('canvas').forEach(cv => io.observe(cv));
  $('.grid-wrap').scrollTop = 0;
}

/* ===== Project detail: PDF/image flipbook, media gallery, or text only ===== */
async function detail(c, i) {
  const t = ++tok, items = c.projects, n = items.length, x = items[i], main = $('#d-main'), side = $('#d-side');
  $('#d-title').textContent = x.title; main.innerHTML = side.innerHTML = ''; book = null;
  $('#d-prev').onclick = () => location.hash = `#/projects/${c.slug}/${items[(i + n - 1) % n].slug}`;
  $('#d-next').onclick = () => location.hash = `#/projects/${c.slug}/${items[(i + 1) % n].slug}`;
  let text = '';
  if (x.md) { try { mdBase = x.md.replace(/[^/]*$/, ''); text = md(await getText(u(x.md))); } catch {} }
  if (t !== tok) return;
  const head = `<div class="head">${x.icon ? `<img src="${u(x.icon)}" alt="">` : ''}<h2>${esc(x.title)}</h2></div>`;
  const pages = x.pdf || (x.book && x.book.length), media = x.media && x.media.length;
  if (pages || media) {
    side.innerHTML = head + `<div class="md">${text}</div>`;
    if (pages) openBook(main, x, t);
    else main.innerHTML = '<div class="gal">' + x.media.map(m => isVid(m)
      ? `<video src="${u(m)}" controls preload="metadata"></video>` : `<img src="${u(m)}" alt="" loading="lazy">`).join('') + '</div>';
  } else { main.innerHTML = `<div class="pad md">${text}</div>`; side.innerHTML = head; }
}

async function openBook(host, x, t) {
  host.innerHTML = '<div class="wrap"><p>Loading…</p></div>';
  const wrap = host.firstChild, cv = [], done = new Set();
  let pdf, n, r;
  try {
    if (x.pdf) { pdf = await pdfjsLib.getDocument(u(x.pdf)).promise; n = pdf.numPages; const v = (await pdf.getPage(1)).getViewport({ scale: 1 }); r = v.width / v.height; }
    else { n = x.book.length; const im = new Image(); im.src = u(x.book[0]); await im.decode(); r = im.naturalWidth / im.naturalHeight; }
  } catch { wrap.innerHTML = '<p>Could not load this file.</p>'; return; }
  if (t !== tok) return;
 const dbl = r < 1;

const availableW = host.clientWidth - 64;
const availableH = host.clientHeight - 110;

const pw = Math.min(
    dbl ? availableW / 2 : availableW,
    availableH * r
);

const ph = pw / r;  // double spread for portrait-ish, single for wide slides
  wrap.innerHTML = '';
  const fb = document.createElement('div'); fb.id = 'fb'; wrap.append(fb);
  for (let k = 0; k < n; k++) {
    const d = document.createElement('div');
    if (pdf) { const c = document.createElement('canvas'); cv.push(c); d.append(c); }
    else d.style.background = `#fff url("${u(x.book[k])}") center/cover`;
    fb.append(d);
  }
  const controls = document.createElement('div');
controls.className = 'book-controls';

controls.innerHTML = `
    <button class="book-prev" aria-label="Previous page">
        Previous
    </button>

    <span class="pgno" aria-live="polite"></span>

    <button class="book-next" aria-label="Next page">
        Next
    </button>
`;

wrap.append(controls);

const no = controls.querySelector('.pgno');

controls.querySelector('.book-prev').onclick = () =>
    $(fb).turn('previous');

controls.querySelector('.book-next').onclick = () =>
    $(fb).turn('next');
  const draw = async k => {
    const pg = await pdf.getPage(k), b = pg.getViewport({ scale: 1 }), v = pg.getViewport({ scale: pw * 1.5 / b.width }), c = cv[k - 1];
    c.width = v.width; c.height = v.height; await pg.render({ canvasContext: c.getContext('2d'), viewport: v }).promise;
  };
  const ensure = v => {
    if (!pdf) return;

    const visible = v.filter(k => k >= 1 && k <= n);
    if (!visible.length) return;

    const a = Math.max(1, Math.min(...visible) - 1);
    const z = Math.min(n, Math.max(...visible) + 2);

    for (let k = a; k <= z; k++) {
        draw(k);
    }
};
  $(fb).turn({
    width: dbl ? pw * 2 : pw, height: ph, display: dbl ? 'double' : 'single', gradients: true, acceleration: true, duration: 900,
    when: { turning: (e, pg, v) => ensure(v), turned: (e, pg) => no.textContent = `${pg} / ${n}` }
  });
  ensure([1, 2]); no.textContent = `1 / ${n}`; book = $(fb);
}

/* ===== Plugins & snippets: auto-built from content/plugins.txt + the GitHub API ===== */
async function gh(p) {
  const k = 'gh:' + p, c = sessionStorage.getItem(k); if (c) return JSON.parse(c);
  try { const r = await fetch('https://api.github.com/' + p); if (!r.ok) return null; const j = await r.json(); sessionStorage.setItem(k, JSON.stringify(j)); return j; } catch { return null; }
}
async function plugin(i) {
  if (!PLUG.length) {
    try {
      PLUG = (await getText('content/plugins.txt')).split(/\r?\n/).map(l => l.trim()).filter(l => l && l[0] !== '#').map(l => {
        const [url, title, icon] = l.split('|').map(s => s.trim()), m = url.match(/github\.com\/([^/]+)\/([^/\s#?]+)/);
        return m && { o: m[1], r: m[2].replace(/\.git$/, ''), title: title || m[2], icon };
      }).filter(Boolean);
    } catch {}
  }
  const n = PLUG.length, card = $('#p-card'), rd = $('#p-readme'), t = ++tok;
  if (!n) { card.innerHTML = '<p>Add GitHub repo links to content/plugins.txt, one per line.</p>'; rd.innerHTML = ''; return; }
  i = ((i % n) + n) % n; const x = PLUG[i];
  $('#p-prev').onclick = () => location.hash = `#/plugins/${(i + n - 1) % n}`;
  $('#p-next').onclick = () => location.hash = `#/plugins/${(i + 1) % n}`;
  card.innerHTML = `<div class="head">${x.icon ? `<img src="assets/icons/${u(x.icon)}" alt="">` : '<div class="icon"></div>'}</div>
    <h2 class="side-title">${esc(x.title)}</h2><p id="pd">Loading…</p><a class="dl" href="https://github.com/${x.o}/${x.r}">Download</a>`;
  rd.innerHTML = '<p>Loading README…</p>';
  const info = await gh(`repos/${x.o}/${x.r}`), rel = await gh(`repos/${x.o}/${x.r}/releases/latest`);
  if (t !== tok) return;
  $('#pd').textContent = info?.description || '';
  const z = rel?.assets?.find(a => /\.zip$/i.test(a.name));
  $('.dl', card).href = z ? z.browser_download_url : rel?.html_url || `https://github.com/${x.o}/${x.r}/archive/HEAD.zip`;
  try {
    mdBase = `https://raw.githubusercontent.com/${x.o}/${x.r}/HEAD/`;
    const h = md(await getText(mdBase + 'README.md')); if (t === tok) rd.innerHTML = `<div class="md">${h}</div>`;
  } catch { if (t === tok) rd.innerHTML = '<h2>README not found</h2><p>This repository has no README.md yet.</p>'; }
}

/* ===== Last.fm now playing (cobalt duotone art) ===== */
async function nowPlaying() {
  if (document.hidden) return;
  try {
    const j = await (await fetch(`https://ws.audioscrobbler.com/2.0/?method=user.getrecenttracks&user=${LFM.user}&api_key=${LFM.key}&format=json&limit=1`)).json();
    let t = j.recenttracks.track; t = Array.isArray(t) ? t[0] : t; if (!t) return;
    const live = t['@attr']?.nowplaying === 'true', img = (t.image || []).slice(-1)[0]?.['#text'] || '', el = $('#np');
    el.hidden = false; el.classList.toggle('live', live);
    $('small', el).textContent = live ? 'Now playing' : 'Last played';
    $('b', el).textContent = `${t.name} — ${t.artist['#text']}`;
    $('.art', el).innerHTML = img && !/2a96cbd8b46e/.test(img) ? `<img src="${img}" alt="">` : '';
  } catch {}
}

/* ===== Moth: any click on the projects page makes her flutter ===== */
const moth = $('#moth');
$('#projects').addEventListener('click', () => { moth.classList.remove('flap'); void moth.offsetWidth; moth.classList.add('flap'); });

/* ===== Keyboard: Esc closes; arrows flip a book, else switch project ===== */
addEventListener('keydown', e => {
  const v = $('.view.active'); if (!v) return;
  const L = e.key === 'ArrowLeft', R = e.key === 'ArrowRight';
  if (e.key === 'Escape') $('.x', v)?.click();
  if ((L || R) && v.id === 'detail' && book) { book.turn(L ? 'previous' : 'next'); return; }
  if (L) $('.arrow:not(.r)', v)?.click();
  if (R) $('.arrow.r', v)?.click();
});
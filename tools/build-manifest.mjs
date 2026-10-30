// Scans content/ and writes content/manifest.json.  Run from the repo root:  node tools/build-manifest.mjs
import fs from 'node:fs';
const ROOT = 'content';
const IMG = /\.(png|jpe?g|webp|gif|avif)$/i, VID = /\.(mp4|webm|mov|m4v)$/i;
const nat = (a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });
const strip = n => n.replace(/^\d+[-_. ]+/, '');                 // "01 Chair" shows as "Chair"; the number only sets the order
const stem = n => n.replace(/\.[^.]+$/, '');
const slug = t => t.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const ls = d => fs.readdirSync(d, { withFileTypes: true }).filter(e => !e.name.startsWith('.')).sort((a, b) => nat(a.name, b.name));
const front = f => {                                              // tiny "key: value" header between --- lines
  const m = fs.readFileSync(f, 'utf8').match(/^---\r?\n([\s\S]*?)\r?\n---/), o = {};
  (m ? m[1] : '').split(/\r?\n/).forEach(l => { const i = l.indexOf(':'); if (i > 0) o[l.slice(0, i).trim().toLowerCase()] = l.slice(i + 1).trim(); });
  return o;
};
const icon = v => !v ? undefined : /^https?:|\//.test(v) ? v : 'assets/icons/' + v;

const cats = [];
for (const c of ls(ROOT).filter(e => e.isDirectory() && !e.name.startsWith('_'))) {
  const dir = `${ROOT}/${c.name}`, all = ls(dir), names = all.map(e => e.name), projects = [];
  for (const e of all) {
    const p = `${dir}/${e.name}`; let o;
    if (e.isFile() && /\.pdf$/i.test(e.name)) {                   // Name.pdf  (+ optional Name.md, Name.png)
      const s = stem(e.name), mdn = names.find(x => x === s + '.md'), img = names.find(x => IMG.test(x) && stem(x) === s);
      const m = mdn ? front(`${dir}/${mdn}`) : {};
      o = { m, title: m.title || strip(s).replace(/_/g, ' '), pdf: p, md: mdn && `${dir}/${mdn}`, cover: m.cover ? `${dir}/${m.cover}` : img && `${dir}/${img}` };
    } else if (e.isFile() && /\.md$/i.test(e.name) && !names.includes(stem(e.name) + '.pdf')) {   // Name.md on its own = text project
      const m = front(p);
      o = { m, title: m.title || strip(stem(e.name)).replace(/_/g, ' '), md: p, cover: m.cover && `${dir}/${m.cover}` };
    } else if (e.isDirectory()) {                                 // Folder = text + media (+ pdf or image book)
      const f = ls(p).filter(x => x.isFile()).map(x => x.name), q = n => `${p}/${n}`, find = re => f.find(x => re.test(x));
      const mdn = find(/^(index|readme)\.md$/i), m = mdn ? front(q(mdn)) : {};
      const media = f.filter(x => (IMG.test(x) || VID.test(x)) && !/^(cover|icon|book_front|book_back|paper)\./i.test(x)).map(q);
      const fr = find(/^book_front\./i), bk = find(/^book_back\./i), cv = find(/^cover\./i), pdf = find(/\.pdf$/i), ic = find(/^icon\./i);
      const pages = m.book === 'true' ? [fr, ...f.filter(x => /^\d+\./.test(x) && IMG.test(x)), bk].filter(Boolean).map(q) : undefined;
      o = { m, title: m.title || strip(e.name).replace(/_/g, ' '), pdf: pdf && q(pdf), md: mdn && q(mdn), book: pages, media: media.length ? media : undefined,
        cover: m.cover ? q(m.cover) : cv ? q(cv) : pages ? pages[0] : media.find(x => IMG.test(x)), icon: ic && q(ic) };
    } else continue;
    projects.push({ title: o.title, slug: slug(o.title), pdf: o.pdf, md: o.md, cover: o.cover, icon: icon(o.m.icon) || o.icon, size: o.m.size, book: o.book, media: o.media });
  }
  const lab = strip(c.name);
  cats.push({ slug: slug(lab), label: /[A-Z]/.test(lab) ? lab : lab.replace(/\b\w/g, x => x.toUpperCase()), projects });
}
fs.writeFileSync(`${ROOT}/manifest.json`, JSON.stringify({ cats }, null, 1));
console.log(cats.map(c => `${c.label}: ${c.projects.length} project(s)`).join('\n') || 'No category folders found in content/');

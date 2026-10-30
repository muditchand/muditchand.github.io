
import fs from "node:fs";

const ROOT = "content";
const IMAGE = /\.(png|jpe?g|webp|gif|avif)$/i;
const VIDEO = /\.(mp4|webm|mov|m4v)$/i;

const naturalSort = (a, b) =>
  a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" });
const stripOrder = name => name.replace(/^\d+[-_. ]+/, "");
const stem = name => name.replace(/\.[^.]+$/, "");
const slug = text => text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const humanize = text => {
  const value = stripOrder(text).replace(/_/g, " ").trim();
  return value ? value[0].toUpperCase() + value.slice(1) : value;
};
const list = directory => fs.readdirSync(directory, { withFileTypes: true })
  .filter(entry => !entry.name.startsWith("."))
  .sort((a, b) => naturalSort(a.name, b.name));

function readFrontmatter(file) {
  const source = fs.readFileSync(file, "utf8");
  const match = source.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/);
  const metadata = {};
  if (!match) return metadata;

  for (const line of match[1].split(/\r?\n/)) {
    const separator = line.indexOf(":");
    if (separator <= 0) continue;
    const key = line.slice(0, separator).trim().toLowerCase();
    const value = line.slice(separator + 1).trim().replace(/^["']|["']$/g, "");
    metadata[key] = value;
  }
  return metadata;
}

const iconPath = value => {
  if (!value) return undefined;
  return /^https?:\/\//i.test(value) || value.includes("/")
    ? value
    : `assets/icons/${value}`;
};

if (!fs.existsSync(ROOT)) {
  throw new Error(`Missing ${ROOT}/ directory. Run this script from the repository root.`);
}

const categories = [];

for (const categoryEntry of list(ROOT).filter(entry =>
  entry.isDirectory() && !entry.name.startsWith("_")
)) {
  const categoryPath = `${ROOT}/${categoryEntry.name}`;
  const entries = list(categoryPath);
  const names = entries.map(entry => entry.name);
  const projects = [];

  for (const entry of entries) {
    const entryPath = `${categoryPath}/${entry.name}`;
    let project;

    if (entry.isFile() && /\.pdf$/i.test(entry.name)) {
      const base = stem(entry.name);
      const markdownName = names.find(name => name.toLowerCase() === `${base}.md`.toLowerCase());
      const coverName = names.find(name => IMAGE.test(name) && stem(name) === base);
      const metadata = markdownName ? readFrontmatter(`${categoryPath}/${markdownName}`) : {};

      project = {
        metadata,
        title: metadata.title || humanize(base),
        pdf: entryPath,
        md: markdownName ? `${categoryPath}/${markdownName}` : undefined,
        cover: metadata.cover ? `${categoryPath}/${metadata.cover}` :
          coverName ? `${categoryPath}/${coverName}` : undefined
      };
    } else if (entry.isFile() && /\.md$/i.test(entry.name) &&
      !names.some(name => name.toLowerCase() === `${stem(entry.name)}.pdf`.toLowerCase())) {
      const metadata = readFrontmatter(entryPath);
      project = {
        metadata,
        title: metadata.title || humanize(stem(entry.name)),
        md: entryPath,
        cover: metadata.cover ? `${categoryPath}/${metadata.cover}` : undefined
      };
    } else if (entry.isDirectory()) {
      const folderPath = entryPath;
      const files = list(folderPath)
        .filter(child => child.isFile())
        .map(child => child.name);
      const pathFor = name => `${folderPath}/${name}`;
      const find = expression => files.find(name => expression.test(name));
      const markdownName = find(/^(index|readme)\.md$/i);
      const metadata = markdownName ? readFrontmatter(pathFor(markdownName)) : {};
      const frontCover = find(/^book_front\./i);
      const backCover = find(/^book_back\./i);
      const explicitCover = find(/^cover\./i);
      const pdfName = find(/\.pdf$/i);
      const iconName = find(/^icon\./i);
      const numberedPages = files.filter(name =>
        /^\d+\.(png|jpe?g|webp|avif)$/i.test(name)
      );

      
      const isBook = metadata.book !== "false" && numberedPages.length > 0 &&
        (metadata.book === "true" || (frontCover && backCover));
      const bookPages = isBook
        ? [frontCover, ...numberedPages, backCover].filter(Boolean).map(pathFor)
        : undefined;

      const media = files
        .filter(name => (IMAGE.test(name) || VIDEO.test(name)) &&
          !/^(cover|icon|book_front|book_back|paper)\./i.test(name) &&
          !(isBook && numberedPages.includes(name)))
        .map(pathFor);

      project = {
        metadata,
        title: metadata.title || humanize(entry.name),
        pdf: pdfName ? pathFor(pdfName) : undefined,
        md: markdownName ? pathFor(markdownName) : undefined,
        book: bookPages,
        media: media.length ? media : undefined,
        cover: metadata.cover ? pathFor(metadata.cover) :
          explicitCover ? pathFor(explicitCover) :
          bookPages ? bookPages[0] :
          media.find(path => IMAGE.test(path)),
        icon: iconName ? pathFor(iconName) : undefined
      };
    } else {
      continue;
    }

    projects.push({
      title: project.title,
      slug: slug(project.title),
      pdf: project.pdf,
      md: project.md,
      cover: project.cover,
      icon: iconPath(project.metadata.icon) || project.icon,
      size: project.metadata.size,
      book: project.book,
      media: project.media
    });
  }

  const label = categoryEntry.name;
  categories.push({
    slug: slug(label),
    label,
    projects
  });
}

fs.writeFileSync(`${ROOT}/manifest.json`, JSON.stringify({ cats: categories }, null, 2) + "\n");
console.log(categories.map(category =>
  `${category.label}: ${category.projects.length} project(s)`
).join("\n") || `No category folders found in ${ROOT}/`);

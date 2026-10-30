
const W = 1440, H = 1174;
const $ = (selector, root = document) => root.querySelector(selector);
const stage = $("#stage");
const fitStage = () => stage.style.setProperty("--s", Math.min(innerWidth / W, innerHeight / H));
addEventListener("resize", fitStage);
fitStage();

const LFM = { user: "muditchand", key: "6ad480bc2478da65a9142be7916d8024" };
const SIZES = ["w", "n", "f", "h", "h"];
const esc = value => String(value ?? "").replace(/[&<>"]/g, c => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;"
}[c]));
const url = path => encodeURI(path);
const isVideo = path => /\.(mp4|webm|mov|m4v)$/i.test(path);

let CATS = [];
let REPOS = null;
let requestToken = 0;
let activeBook = null;
let zoomBook = null;
let zoomOverlay = null;
let zoomContext = null;
let markdownBase = "";
let turnInteractionStage = null;
let turnMouseDownInStage = false;


 
if (window.jQuery && jQuery.event && !jQuery.event.__portfolioTurnScaleFix) {
  const originalFix = jQuery.event.fix;
  jQuery.event.fix = function (originalEvent) {
    const fixed = originalFix.call(this, originalEvent);
    const type = originalEvent?.type || fixed.type;
    const mouseEvent = /^(mouse|click)/.test(type);
    const stageElement = turnInteractionStage;

    if (mouseEvent && stageElement) {
      const targetInside = stageElement.contains(originalEvent.target);
      if (type === "mousedown" && targetInside) turnMouseDownInStage = true;

      if (targetInside || turnMouseDownInStage) {
        const rect = stageElement.getBoundingClientRect();
        const portfolioScale = stage?.getBoundingClientRect().width / (stage?.offsetWidth || W) || 1;
        const scale = portfolioScale > 0 ? portfolioScale : 1;
        const originX = rect.left + window.scrollX;
        const originY = rect.top + window.scrollY;

        if (Number.isFinite(fixed.pageX)) fixed.pageX = originX + (fixed.pageX - originX) / scale;
        if (Number.isFinite(fixed.pageY)) fixed.pageY = originY + (fixed.pageY - originY) / scale;
      }

      if (type === "mouseup") turnMouseDownInStage = false;
    }
    return fixed;
  };
  jQuery.event.__portfolioTurnScaleFix = true;
}

if (window.pdfjsLib) {
  pdfjsLib.GlobalWorkerOptions.workerSrc =
    "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.12.313/pdf.worker.min.js";
}

/* Markdown renderer: relative images/videos, YouTube embeds, basic formatting. */
if (window.marked && window.DOMPurify) {
  marked.use({
    renderer: {
      image(href, title, alt) {
        const youtube = href.match(/(?:youtu\.be\/|[?&]v=)([\w-]{11})/);
        if (youtube) {
          return `<iframe src="https://www.youtube.com/embed/${youtube[1]}" title="YouTube video" allowfullscreen></iframe>`;
        }
        const src = /^https?:\/\//i.test(href) ? href : url(markdownBase + href);
        return isVideo(href)
          ? `<video src="${src}" controls preload="metadata"></video>`
          : `<img src="${src}" alt="${esc(alt)}">`;
      }
    }
  });
}

function renderMarkdown(source) {
  if (!window.marked || !window.DOMPurify) return `<p>${esc(source)}</p>`;
  const cleanSource = source
    .replace(/^---[\s\S]*?\r?\n---\r?\n?/, "")
    .replace(/==(.+?)==/g, "<mark>$1</mark>");
  return DOMPurify.sanitize(marked.parse(cleanSource), {
    ADD_TAGS: ["iframe"],
    ADD_ATTR: ["allowfullscreen", "controls", "title"]
  });
}

async function fetchText(path) {
  const response = await fetch(path);
  if (!response.ok) throw new Error(`Could not load ${path}: ${response.status}`);
  return response.text();
}

async function loadManifest() {
  try {
    const response = await fetch("content/manifest.json", { cache: "no-store" });
    if (!response.ok) throw new Error(`Manifest returned ${response.status}`);
    const data = await response.json();
    CATS = Array.isArray(data.cats) ? data.cats : [];
  } catch (error) {
    console.error("Portfolio manifest could not be loaded:", error);
    CATS = [];
  }
  route();
}

loadManifest();
nowPlaying();
setInterval(nowPlaying, 30000);
addEventListener("hashchange", route);

/* Hash router. */
function route() {
  const parts = location.hash.replace(/^#\/?/, "").split("/");
  let view = "home";
  let back = "#/";

  if (parts[0] === "projects") {
    const category = CATS.find(item => item.slug === parts[1]) || CATS[0];
    const projectIndex = category
      ? category.projects.findIndex(item => item.slug === parts[2])
      : -1;

    if (projectIndex >= 0) {
      view = "detail";
      back = `#/projects/${category.slug}`;
      showProject(category, projectIndex);
    } else {
      view = "projects";
      showProjects(category);
    }
  } else if (parts[0] === "other-work") {
    if (parts[1] !== undefined && /^\d+$/.test(parts[1])) {
      view = "other-work-detail";
      back = "#/other-work";
      showRepository(Number(parts[1]));
    } else {
      view = "other-work";
      showOtherWork();
    }
  } else if (parts[0] === "about") {
    view = "about";
  }

  if (view !== "detail") activeBook = null;

  document.querySelectorAll(".view").forEach(element => {
    element.classList.toggle("active", element.id === view);
  });

  const close = $(`#${view} .x`);
  if (close) close.href = back;
  stage.dataset.v = view;
}


const coverObserver = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (!entry.isIntersecting) return;
    coverObserver.unobserve(entry.target);
    drawPdfCover(entry.target);
  });
}, { rootMargin: "200px" });

async function drawPdfCover(canvas) {
  if (!window.pdfjsLib) return;
  try {
    const pdf = await pdfjsLib.getDocument({ url: url(canvas.dataset.pdf) }).promise;
    const page = await pdf.getPage(1);
    const base = page.getViewport({ scale: 1 });
    const viewport = page.getViewport({ scale: 600 / base.width });
    canvas.width = Math.ceil(viewport.width);
    canvas.height = Math.ceil(viewport.height);
    await page.render({ canvasContext: canvas.getContext("2d"), viewport }).promise;
  } catch (error) {
    console.error("Could not render PDF thumbnail:", canvas.dataset.pdf, error);
  }
}

function showProjects(category) {
  const tabs = $("#tabs");
  tabs.innerHTML = CATS.map(item =>
    `<a href="#/projects/${item.slug}" class="${item === category ? "on" : ""}">${esc(item.label)}</a>`
  ).join("") + `<a href="#/other-work">Other Work</a>`;

  const grid = $("#grid");
  if (!category || !category.projects?.length) {
    grid.innerHTML = '<p class="empty-state">Nothing here yet. Add files under content/ and run <code>node tools/build-manifest.mjs</code>.</p>';
    return;
  }

  grid.innerHTML = category.projects.map((project, index) => {
    const visual = project.cover
      ? `<img src="${url(project.cover)}" alt="" loading="lazy">`
      : project.pdf
        ? `<canvas data-pdf="${esc(project.pdf)}"></canvas>`
        : "";
    return `<a class="tile ${project.size || SIZES[index % SIZES.length]}" href="#/projects/${category.slug}/${project.slug}">
      <div class="im">${visual}<span>${esc(project.title)}</span></div>
    </a>`;
  }).join("");

  grid.querySelectorAll("canvas[data-pdf]").forEach(canvas => coverObserver.observe(canvas));
  $(".grid-wrap").scrollTop = 0;
}

/* -------------------------------------------------*/
async function showProject(category, index) {
  closeNavigationPending = false;
  const token = ++requestToken;
  const projects = category.projects;
  const project = projects[index];
  const main = $("#d-main");
  const side = $("#d-side");

  try { activeBook?.turn("destroy"); } catch {}
  activeBook = null;
  turnInteractionStage = null;
  turnMouseDownInStage = false;

  $("#d-title").textContent = project.title;
  main.innerHTML = '<div class="loading-state">Loading project…</div>';
  side.innerHTML = "";
  const oldControls = $("#book-controls");
  if (oldControls) {
    oldControls.hidden = true;
    oldControls.innerHTML = "";
  }
  activeBook = null;

  $("#d-prev").onclick = () => {
    location.hash = `#/projects/${category.slug}/${projects[(index + projects.length - 1) % projects.length].slug}`;
  };
  $("#d-next").onclick = () => {
    location.hash = `#/projects/${category.slug}/${projects[(index + 1) % projects.length].slug}`;
  };

  let markdown = "";
  if (project.md) {
    try {
      markdownBase = project.md.replace(/[^/]*$/, "");
      markdown = renderMarkdown(await fetchText(url(project.md)));
    } catch (error) {
      console.error("Project Markdown could not be loaded:", error);
    }
  }
  if (token !== requestToken) return;

  const heading = `<div class="head">${project.icon ? `<img src="${url(project.icon)}" alt="">` : ""}<h2>${esc(project.title)}</h2></div>`;
  const hasBook = Boolean(project.pdf || project.book?.length);

  if (hasBook) {
    side.innerHTML = `${heading}<div class="md">${markdown}</div>`;
    await openBook(main, project, token);
  } else if (project.media?.length) {
    side.innerHTML = `${heading}<div class="md">${markdown}</div>`;
    main.innerHTML = `<div class="gal">${project.media.map(media => isVideo(media)
      ? `<video src="${url(media)}" controls preload="metadata"></video>`
      : `<img src="${url(media)}" alt="" loading="lazy">`).join("")}</div>`;
  } else {
    main.innerHTML = `<div class="pad md">${markdown}</div>`;
    side.innerHTML = heading;
  }
}

/* -------------------------------s */
async function openBook(host, project, token, options = {}) {
  const controls = options.controlsElement || $("#book-controls");
  host.innerHTML = '<div class="wrap"><p class="loading-state">Preparing book…</p></div>';
  if (controls) {
    controls.innerHTML = "";
    controls.hidden = true;
  }
  const wrap = host.firstElementChild;
  let pdf = null;
  let pageCount = 0;
  let pageRatio = 1;

  try {
    if (project.pdf) {
      if (!window.pdfjsLib) throw new Error("PDF.js did not load. Check the PDF.js script in index.html.");
      pdf = await pdfjsLib.getDocument({ url: url(project.pdf) }).promise;
      pageCount = pdf.numPages;
      const firstPage = await pdf.getPage(1);
      const viewport = firstPage.getViewport({ scale: 1 });
      pageRatio = viewport.width / viewport.height;
    } else {
      pageCount = project.book.length;
      const firstImage = new Image();
      firstImage.src = url(project.book[0]);
      await firstImage.decode();
      pageRatio = firstImage.naturalWidth / firstImage.naturalHeight;
    }
  } catch (error) {
    console.error("Book source could not be loaded:", error);
    wrap.innerHTML = `<p class="loading-state">Could not load this document. ${esc(error.message || "")}</p>`;
    return null;
  }

  if (token !== requestToken && !options.zoom) return null;

  if (!window.jQuery || !jQuery.fn.turn) {
    wrap.innerHTML = '<p class="loading-state">Turn.js did not load. Check the jQuery and Turn.js paths in index.html.</p>';
    console.error("Turn.js is unavailable. Expected jQuery plugin $.fn.turn.");
    return null;
  }

  const isPortrait = pageRatio < 1;
  const availableWidth = Math.max(240, host.clientWidth - 40);
  const availableHeight = Math.max(240, host.clientHeight - 40);
  const pageWidth = Math.floor(Math.min(
    isPortrait ? availableWidth / 2 : availableWidth,
    availableHeight * pageRatio
  ));
  const pageHeight = Math.floor(pageWidth / pageRatio);
  const bookWidth = isPortrait ? pageWidth * 2 : pageWidth;

  wrap.innerHTML = "";
  wrap.classList.add("book-enter");

  
  const turnStage = document.createElement("div");
  turnStage.className = "turn-stage";
  turnStage.style.width = `${bookWidth}px`;
  turnStage.style.height = `${pageHeight}px`;
  wrap.appendChild(turnStage);
  turnInteractionStage = turnStage;
  turnMouseDownInStage = false;

  const flipbook = document.createElement("div");
  flipbook.className = "turn-book";
  flipbook.style.touchAction = "none";
  flipbook.style.cursor = "grab";
  flipbook.style.width = `${bookWidth}px`;
  flipbook.style.height = `${pageHeight}px`;
  turnStage.appendChild(flipbook);

  const canvases = [];
  for (let pageNumber = 1; pageNumber <= pageCount; pageNumber++) {
    const pageElement = document.createElement("div");
    pageElement.className = "book-page";

    if (pdf) {
      const canvas = document.createElement("canvas");
      canvas.setAttribute("aria-label", `PDF page ${pageNumber}`);
      canvases[pageNumber - 1] = canvas;
      pageElement.appendChild(canvas);
    } else {
      const image = document.createElement("img");
      image.src = url(project.book[pageNumber - 1]);
      image.alt = `Book page ${pageNumber}`;
      image.draggable = false;
      pageElement.appendChild(image);
    }
    flipbook.appendChild(pageElement);
  }

  const turnBook = jQuery(flipbook);
  const counter = document.createElement("span");
  counter.className = "pgno";
  counter.setAttribute("aria-live", "polite");

  const renderPage = async pageNumber => {
    if (!pdf || pageNumber < 1 || pageNumber > pageCount) return;
    const canvas = canvases[pageNumber - 1];
    if (!canvas || canvas.dataset.rendered === "true" || canvas.dataset.rendering === "true") return;

    canvas.dataset.rendering = "true";
    try {
      const page = await pdf.getPage(pageNumber);
      const base = page.getViewport({ scale: 1 });
      const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
      const viewport = page.getViewport({ scale: (pageWidth / base.width) * pixelRatio });
      canvas.width = Math.ceil(viewport.width);
      canvas.height = Math.ceil(viewport.height);
      await page.render({ canvasContext: canvas.getContext("2d"), viewport }).promise;
      canvas.dataset.rendered = "true";
    } catch (error) {
      console.error(`PDF page ${pageNumber} failed to render:`, error);
    } finally {
      delete canvas.dataset.rendering;
    }
  };

  const renderNearby = visiblePages => {
    if (!pdf || !Array.isArray(visiblePages)) return;
    const pages = visiblePages.filter(number => number >= 1 && number <= pageCount);
    if (!pages.length) return;
    const first = Math.max(1, Math.min(...pages) - 1);
    const last = Math.min(pageCount, Math.max(...pages) + 2);
    for (let number = first; number <= last; number++) renderPage(number);
  };

  const updateCounter = page => {
    counter.textContent = `${page} / ${pageCount}`;
    renderNearby(turnBook.turn("view"));
  };

  try {
    turnBook.turn({
      width: bookWidth,
      height: pageHeight,
      display: isPortrait ? "double" : "single",
      autoCenter: true,
      gradients: true,
      acceleration: true,
      duration: 900,
      turnCorners: "bl,br,tl,tr",
      when: {
        turning: (event, page, view) => renderNearby(view),
        turned: (event, page) => updateCounter(page)
      }
    });

 
    const cornerSize = Math.max(96, Math.min(124, Math.round(Math.min(pageWidth, pageHeight) * 0.20)));
    turnBook.find(".book-page").each(function () {
      try { jQuery(this).flip("options", { cornerSize }); } catch (error) {
        console.warn("Could not apply the page corner activation size:", error);
      }
    });
    turnBook.turn("disable", false);
  } catch (error) {
    console.error("Turn.js could not initialise the book:", error);
    wrap.innerHTML = '<p class="loading-state">The book reader could not initialise. Check the Turn.js version and browser console.</p>';
    return null;
  }

  const controlsNode = document.createElement("div");
  controlsNode.className = "book-controls";
  controlsNode.innerHTML = `
    <button type="button" class="book-prev" aria-label="Last page">Last Page</button>
    <span class="pgno" aria-live="polite"></span>
    <button type="button" class="book-next" aria-label="Next page">Next Page</button>
  `;
  controlsNode.querySelector(".pgno").replaceWith(counter);

  const previous = controlsNode.querySelector(".book-prev");
  const next = controlsNode.querySelector(".book-next");
  previous.addEventListener("click", event => {
    event.preventDefault();
    event.stopPropagation();
    turnBook.turn("previous");
  });
  next.addEventListener("click", event => {
    event.preventDefault();
    event.stopPropagation();
    turnBook.turn("next");
  });

  if (controls) {
    controls.replaceWith(controlsNode);
    controlsNode.id = options.zoom ? "zoom-book-controls" : "book-controls";
    controlsNode.hidden = false;
  } else {
    wrap.appendChild(controlsNode);
  }

  const initialPage = Math.max(1, Math.min(options.initialPage || 1, pageCount));
  if (initialPage > 1) turnBook.turn("page", initialPage);
  renderNearby(turnBook.turn("view"));
  updateCounter(initialPage);

  if (!options.zoom) {
    activeBook = turnBook;

    
    const hint = document.createElement("button");
    hint.type = "button";
    hint.className = "zoom-hint";
    hint.innerHTML = "<span></span><small>Click to enlarge</small>";
    hint.setAttribute("aria-label", "Open this document in a larger viewer");
    wrap.appendChild(hint);
    hint.addEventListener("click", event => {
      event.preventDefault();
      event.stopPropagation();
      openBookZoom(project, turnBook.turn("page"));
    });
    window.setTimeout(() => hint.classList.add("is-fading"), 1000);
    window.setTimeout(() => hint.remove(), 1350);

    flipbook.addEventListener("click", event => {
      if (!event.target.closest(".book-page")) return;
      const bounds = flipbook.getBoundingClientRect();
      const x = (event.clientX - bounds.left) / bounds.width;
      const y = (event.clientY - bounds.top) / bounds.height;
      const edgeZone = x < 0.20 || x > 0.80 || y < 0.16 || y > 0.84;
      if (edgeZone) return;
      if (!zoomOverlay && document.contains(flipbook)) {
        openBookZoom(project, turnBook.turn("page"));
      }
    });
  }

  return turnBook;
}

async function openBookZoom(project, pageNumber) {
  if (zoomOverlay) return;

  const detailView = $("#detail");
  const mainHost = $("#d-main");
  const currentPage = Math.max(1, Number(pageNumber) || 1);
  zoomContext = { project, pageNumber: currentPage, token: requestToken };


  try { activeBook?.turn("destroy"); } catch (error) {
    console.warn("Could not suspend the compact book before zooming:", error);
  }
  activeBook = null;
  turnInteractionStage = null;
  turnMouseDownInStage = false;
  detailView.classList.add("zooming");

  zoomOverlay = document.createElement("div");
  zoomOverlay.className = "book-zoom-overlay is-entering";
  zoomOverlay.innerHTML = `
    <div class="book-zoom-host"></div>
    <button class="book-zoom-close" type="button" aria-label="Close enlarged document"></button>
  `;
  stage.appendChild(zoomOverlay);
  requestAnimationFrame(() => zoomOverlay?.classList.add("is-open"));

  const overlayAtOpen = zoomOverlay;
  const close = () => {
    if (zoomOverlay !== overlayAtOpen || overlayAtOpen.classList.contains("is-closing")) return;
    overlayAtOpen.classList.remove("is-open");
    overlayAtOpen.classList.add("is-closing");

    window.setTimeout(async () => {
      try { zoomBook?.turn("destroy"); } catch {}
      zoomBook = null;
      turnInteractionStage = null;
      turnMouseDownInStage = false;
      overlayAtOpen.remove();
      if (zoomOverlay === overlayAtOpen) zoomOverlay = null;
      
      detailView.classList.remove("zooming");

      
      if (zoomContext && zoomContext.token === requestToken && document.contains(mainHost)) {
        const restore = zoomContext;
        await openBook(mainHost, restore.project, restore.token, { initialPage: restore.pageNumber });
      }
      zoomContext = null;
    }, 520);
  };

  overlayAtOpen.querySelector(".book-zoom-close").addEventListener("click", close);
  const host = overlayAtOpen.querySelector(".book-zoom-host");
  const controls = document.createElement("div");
  controls.className = "book-controls";
  controls.id = "zoom-book-controls";
  overlayAtOpen.appendChild(controls);

  zoomBook = await openBook(host, project, requestToken, {
    zoom: true,
    initialPage: currentPage,
    controlsElement: controls
  });
}


async function loadRepositories() {
  if (REPOS) return REPOS;
  try {
    const source = await fetchText("content/plugins.txt");
    REPOS = source.split(/\r?\n/).map(line => line.trim())
      .filter(line => line && !line.startsWith("#"))
      .map(line => {
        const [repoUrl, title, icon] = line.split("|").map(value => value.trim());
        const match = repoUrl.match(/github\.com\/([^/]+)\/([^/?#]+)/i);
        if (!match) return null;
        return {
          owner: match[1],
          repo: match[2].replace(/\.git$/, ""),
          title: title || match[2].replace(/\.git$/, ""),
          icon: icon || ""
        };
      }).filter(Boolean);
  } catch (error) {
    console.error("Could not read content/plugins.txt:", error);
    REPOS = [];
  }
  return REPOS;
}

async function githubApi(path) {
  const cacheKey = `portfolio-github:${path}`;
  try {
    const cached = sessionStorage.getItem(cacheKey);
    if (cached) return JSON.parse(cached);
  } catch {}
  try {
    const response = await fetch(`https://api.github.com/${path}`);
    if (!response.ok) return null;
    const data = await response.json();
    try { sessionStorage.setItem(cacheKey, JSON.stringify(data)); } catch {}
    return data;
  } catch {
    return null;
  }
}

async function showOtherWork() {
  const grid = $("#other-grid");
  grid.innerHTML = '<p class="loading-state">Loading repositories…</p>';
  const repos = await loadRepositories();
  if (!repos.length) {
    grid.innerHTML = '<p class="empty-state">Add GitHub repository links to content/plugins.txt, one per line.</p>';
    return;
  }
  grid.innerHTML = repos.map((repo, index) => `
    <a class="tile ${SIZES[index % SIZES.length]}" href="#/other-work/${index}">
      <div class="im">
        ${repo.icon ? `<img src="assets/icons/${url(repo.icon)}" alt="">` : ""}
        <span>${esc(repo.title)}</span>
      </div>
    </a>
  `).join("");
}

async function showRepository(index) {
  const token = ++requestToken;
  const repos = await loadRepositories();
  const readme = $("#ow-readme");
  const card = $("#ow-card");

  if (!repos.length || index < 0 || index >= repos.length) {
    readme.innerHTML = '<p class="empty-state">This repository is not listed in content/plugins.txt.</p>';
    card.innerHTML = "";
    return;
  }

  const repo = repos[index];
  const next = (index + 1) % repos.length;
  const previous = (index + repos.length - 1) % repos.length;

  $("#ow-title").textContent = repo.title;
  $("#ow-prev").onclick = () => location.hash = `#/other-work/${previous}`;
  $("#ow-next").onclick = () => location.hash = `#/other-work/${next}`;
  readme.innerHTML = '<p class="loading-state">Loading README…</p>';
  card.innerHTML = `<div class="head">${repo.icon ? `<img src="assets/icons/${url(repo.icon)}" alt="">` : '<div class="icon"></div>'}<h2>${esc(repo.title)}</h2></div><p>Loading repository details…</p>`;

  const repoPath = `repos/${repo.owner}/${repo.repo}`;
  const info = await githubApi(repoPath);
  if (token !== requestToken) return;

  const branch = info?.default_branch || "main";
  const description = info?.description || "GitHub repository";
  const release = await githubApi(`${repoPath}/releases/latest`);
  if (token !== requestToken) return;

  const downloadUrl = release?.assets?.find(asset => /\.zip$/i.test(asset.name))?.browser_download_url
    || release?.html_url
    || `https://github.com/${repo.owner}/${repo.repo}/archive/refs/heads/${branch}.zip`;

  card.innerHTML = `
    <div class="head">${repo.icon ? `<img src="assets/icons/${url(repo.icon)}" alt="">` : '<div class="icon"></div>'}<h2>${esc(repo.title)}</h2></div>
    <p class="repo-description">${esc(description)}</p>
    <div class="repo-actions">
      <a class="repo-button" href="https://github.com/${repo.owner}/${repo.repo}" target="_blank" rel="noopener">View on GitHub</a>
      <a class="repo-button primary" href="${esc(downloadUrl)}" target="_blank" rel="noopener">Download</a>
    </div>
  `;

  markdownBase = `https://raw.githubusercontent.com/${repo.owner}/${repo.repo}/${branch}/`;
  try {
    const markdown = await fetchText(`${markdownBase}README.md`);
    if (token === requestToken) readme.innerHTML = `<div class="md">${renderMarkdown(markdown)}</div>`;
  } catch (error) {
    if (token === requestToken) {
      readme.innerHTML = `<div class="empty-state"><h2>README unavailable</h2><p>${esc(error.message || "This repository does not expose a README.md.")}</p><p><a href="https://github.com/${repo.owner}/${repo.repo}" target="_blank" rel="noopener">Open repository on GitHub</a></p></div>`;
    }
  }
}

/* Last.fm now-playing pill. */
async function nowPlaying() {
  if (document.hidden) return;
  try {
    const endpoint = `https://ws.audioscrobbler.com/2.0/?method=user.getrecenttracks&user=${encodeURIComponent(LFM.user)}&api_key=${LFM.key}&format=json&limit=1`;
    const response = await fetch(endpoint);
    if (!response.ok) return;
    const data = await response.json();
    let track = data.recenttracks?.track;
    track = Array.isArray(track) ? track[0] : track;
    if (!track) return;

    const live = track["@attr"]?.nowplaying === "true";
    const image = track.image?.slice(-1)[0]?.["#text"] || "";
    const pill = $("#np");
    pill.hidden = false;
    pill.classList.toggle("live", live);
    $("small", pill).textContent = live ? "Now playing" : "Last played";
    $("b", pill).textContent = `${track.name} — ${track.artist?.["#text"] || track.artist || ""}`;
    $(".art", pill).innerHTML = image && !/2a96cbd8b46e/i.test(image)
      ? `<img src="${esc(image)}" alt="">`
      : "";
  } catch (error) {
    console.warn("Last.fm status could not be refreshed:", error);
  }
}


let closeNavigationPending = false;
function closeBookAndNavigate(destination) {
  if (closeNavigationPending) return;
  const wrap = $("#d-main .wrap");
  if (!wrap) {
    location.hash = destination || "#/";
    return;
  }

  closeNavigationPending = true;
  wrap.classList.remove("book-enter", "book-closing");
  try {
    if (activeBook) activeBook.turn("page", 1);
  } catch (error) {
    console.warn("Could not return the book to its first page before closing:", error);
  }

  
  window.setTimeout(() => {
    wrap.classList.add("book-closing");
    window.setTimeout(() => {
      try { activeBook?.turn("destroy"); } catch {}
      activeBook = null;
      turnInteractionStage = null;
      turnMouseDownInStage = false;
      closeNavigationPending = false;
      location.hash = destination || "#/";
    }, 620);
  }, 520);
}

document.addEventListener("click", event => {
  const closeLink = event.target.closest("#detail .x");
  if (!closeLink || !$("#d-main .wrap")) return;
  event.preventDefault();
  closeBookAndNavigate(closeLink.getAttribute("href"));
});

/* Moth interaction and keyboard controls. */
const moth = $("#moth");
$("#projects").addEventListener("click", () => {
  if (!moth) return;
  moth.classList.remove("flap");
  void moth.offsetWidth;
  moth.classList.add("flap");
});

addEventListener("keydown", event => {
  const activeView = $(".view.active");
  if (!activeView) return;
  const left = event.key === "ArrowLeft";
  const right = event.key === "ArrowRight";

  if (event.key === "Escape") {
    if (zoomOverlay) {
      zoomOverlay.querySelector(".book-zoom-close")?.click();
      return;
    }
    if (activeView.id === "detail" && $("#d-main .wrap")) {
      closeBookAndNavigate($(".x", activeView)?.getAttribute("href") || "#/");
      return;
    }
    $(".x", activeView)?.click();
    return;
  }
  if (left || right) {
    if (activeView.id === "detail" && (zoomBook || activeBook)) {
      (zoomBook || activeBook).turn(left ? "previous" : "next");
      return;
    }
    if (activeView.id === "other-work-detail") {
      (left ? $("#ow-prev") : $("#ow-next")).click();
      return;
    }
    if (left) $(".arrow:not(.r)", activeView)?.click();
    if (right) $(".arrow.r", activeView)?.click();
  }
});

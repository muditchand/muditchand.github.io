(() => {
  const W = 1440, H = 1174;
  const stage = document.getElementById("stage");
  const canvas = document.getElementById("ink");
  const ctx = canvas.getContext("2d");
  const reduce = matchMedia("(prefers-reduced-motion: reduce)");
  const INK = { life: 2200, dotLife: 4200, light: "#ffffff", dark: "#00087D", faceX: 900 };
  const K = Math.min(2, window.devicePixelRatio || 1);

  canvas.width = W * K;
  canvas.height = H * K;
  ctx.setTransform(K, 0, 0, K, 0, 0);
  ctx.lineCap = "round";

  let segs = [], dots = [], last = null, raf = 0;

  const active = () => stage.dataset.v === "home" && !reduce.matches;

  const toStage = e => {
    const r = stage.getBoundingClientRect();
    return {
      x: (e.clientX - r.left) / r.width * W,
      y: (e.clientY - r.top) / r.height * H
    };
  };

  const colour = x => (x > INK.faceX ? INK.dark : INK.light);
  const jit = () => (Math.random() - .5) * 1.4;

  function frame(now) {
    ctx.clearRect(0, 0, W, H);

    segs = segs.filter(s => now - s.t < INK.life);
    dots = dots.filter(d => now - d.t < INK.dotLife);

    for (const s of segs) {
      const a = 1 - (now - s.t) / INK.life;
      ctx.globalAlpha = a * a * .95;
      ctx.strokeStyle = colour(s.x2);
      ctx.lineWidth = s.w;
      ctx.beginPath();
      ctx.moveTo(s.x1, s.y1);
      ctx.lineTo(s.x2, s.y2);
      ctx.stroke();

      ctx.lineWidth = s.w * .5;
      ctx.beginPath();
      ctx.moveTo(s.x1 + s.o[0], s.y1 + s.o[1]);
      ctx.lineTo(s.x2 + s.o[2], s.y2 + s.o[3]);
      ctx.stroke();
    }

    for (const d of dots) {
      const a = 1 - (now - d.t) / INK.dotLife;
      ctx.globalAlpha = a * .9;
      ctx.fillStyle = colour(d.x);

      for (const p of d.pts) {
        ctx.beginPath();
        ctx.arc(d.x + p.dx, d.y + p.dy, p.r, 0, 6.283);
        ctx.fill();
      }
    }

    ctx.globalAlpha = 1;
    raf = segs.length || dots.length ? requestAnimationFrame(frame) : 0;

    if (!raf) ctx.clearRect(0, 0, W, H);
  }

  const kick = () => {
    if (!raf) raf = requestAnimationFrame(frame);
  };

  addEventListener("pointermove", e => {
    if (!active()) {
      last = null;
      return;
    }

    const p = toStage(e);

    if (p.x < 0 || p.y < 0 || p.x > W || p.y > H) {
      last = null;
      return;
    }

    p.t = performance.now();

    if (last) {
      const d = Math.hypot(p.x - last.x, p.y - last.y);
      if (d < 3) return;

      segs.push({
        x1: last.x,
        y1: last.y,
        x2: p.x,
        y2: p.y,
        t: p.t,
        w: Math.max(.6, 2.2 - d * .04),
        o: [jit(), jit(), jit(), jit()]
      });

      if (segs.length > 700) segs.shift();
    }

    last = p;
    kick();
  });

  addEventListener("pointerdown", e => {
    if (!active()) return;

    const p = toStage(e);

    const pts = Array.from({ length: 16 }, () => {
      const a = Math.random() * 6.283;
      const d = Math.random() * 6;

      return {
        dx: Math.cos(a) * d,
        dy: Math.sin(a) * d,
        r: .5 + Math.random() * 1.3
      };
    });

    dots.push({
      x: p.x,
      y: p.y,
      t: performance.now(),
      pts
    });

    kick();
  });

  addEventListener("hashchange", () => {
    segs = [];
    dots = [];
    last = null;
    kick();
  });

  /* Moth: follows the cursor on a loose spring and keeps fluttering. */
  function initMoth() {
    const moth = document.getElementById("hero-moth");
    if (!moth) return;

    const SPRING = 2.2;
    const DAMP = 2.8;
    const OFFSET = { x: 70, y: 50 };
    const HALF = 75;

    let x = 180, y = 760, vx = 0, vy = 0;
    let tx = x, ty = y, seen = false, burst = 0, wing = 0;
    let previousTime = performance.now();

    addEventListener("pointermove", event => {
      const point = toStage(event);
      tx = point.x + OFFSET.x;
      ty = point.y + OFFSET.y;
      seen = true;
    });

    addEventListener("pointerdown", () => {
      if (stage.dataset.v === "home") {
        burst = performance.now() + 700;
      }
    });

    const tick = now => {
      const dt = Math.min(.05, (now - previousTime) / 1000);
      previousTime = now;

      if (stage.dataset.v === "home" && !document.hidden) {
        const seconds = now / 1000;

        const goalX = seen
          ? tx
          : 180 + Math.sin(seconds * .5) * 60;

        const goalY = seen
          ? ty
          : 760 + Math.cos(seconds * .4) * 40;

        vx += ((goalX - x) * SPRING - vx * DAMP) * dt;
        vy += ((goalY - y) * SPRING - vy * DAMP) * dt;

        x = Math.max(HALF, Math.min(W - HALF, x + vx * dt));
        y = Math.max(HALF, Math.min(H - HALF, y + vy * dt));

        moth.style.transform =
          `translate3d(${x - HALF}px,${y - HALF}px,0) rotate(${Math.max(-25, Math.min(25, vx * .04))}deg)`;

        const speed = Math.hypot(vx, vy);

        const wingDuration =
          now < burst ? .09 :
          speed > 120 ? .13 :
          speed > 30 ? .22 : .42;

        if (wingDuration !== wing) {
          wing = wingDuration;
          moth.style.setProperty("--wing", `${wingDuration}s`);
        }
      }

      requestAnimationFrame(tick);
    };

    requestAnimationFrame(tick);
  }

  /* Eye positions are measured in the original 1389x1132 background-image coordinates. */
  function initEyes() {
    const home = document.getElementById("home");
    if (!home) return;

    const SCALE_X = W / 1389;
    const SCALE_Y = H / 1132;
    const RADIUS = 17;
    const SHIFT = 7;

    const eyes = [
      { x: 1031 * SCALE_X, y: 376 * SCALE_Y },
      { x: 1383 * SCALE_X, y: 419 * SCALE_Y }
    ];

    const elements = eyes.map(point => {
      const element = document.createElement("div");
      element.className = "eye";

      element.style.cssText =
        `left:${point.x - RADIUS}px;top:${point.y - RADIUS}px;width:${RADIUS * 2}px;height:${RADIUS * 2}px`;

      home.appendChild(element);
      return element;
    });

    addEventListener("pointermove", event => {
      if (stage.dataset.v !== "home") return;

      const point = toStage(event);

      eyes.forEach((eye, index) => {
        const dx = point.x - eye.x;
        const dy = point.y - eye.y;
        const distance = Math.hypot(dx, dy) || 1;
        const movement = Math.min(SHIFT, distance * .04);

        elements[index].style.transform =
          `translate(${dx / distance * movement}px,${dy / distance * movement}px)`;
      });
    });
  }

  initMoth();
  // initEyes(); uncomment this if you want eyes back thanks
})();
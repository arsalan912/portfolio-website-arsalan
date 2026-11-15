(function () {
  const D = window.PORTFOLIO;
  const $ = (s) => document.querySelector(s);
  const fa = (n) => Number(n).toLocaleString("fa-IR", { useGrouping: false });
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;

  const catById = Object.fromEntries(D.categories.map((c) => [c.id, c]));
  const counters = {};
  D.projects.forEach((p) => {
    counters[p.category] = (counters[p.category] || 0) + 1;
    p.code = catById[p.category].code + "-" + String(counters[p.category]).padStart(2, "0");
  });
  // Only categories that have projects appear in the scroll strip
  const cats = D.categories.filter((c) => D.projects.some((p) => p.category === c.id));
  const inCat = (id) => D.projects.filter((p) => p.category === id).sort((a, b) => b.year - a.year);

  const el = (tag, cls, text) => {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  };

  /* ---------- header / hero / footer ---------- */
  const d = D.designer;
  $("#name").textContent = d.name;
  $("#role").textContent = d.title;
  $("#bio").textContent = d.bio;
  $("#logo").textContent = d.name;
  $("#topCount").textContent = fa(D.projects.length) + " پروژه در " + fa(cats.length) + " دسته";
  [[d.email && "mailto:" + d.email, d.email], [d.instagram, "Instagram"], [d.behance, "Behance"]].forEach(([h, t]) => {
    if (!h) return;
    const a = el("a", null, t); a.href = h;
    if (!h.startsWith("mailto")) { a.target = "_blank"; a.rel = "noopener"; }
    $("#links").appendChild(a);
  });

  /* ---------- 3D drum ---------- */
  const drum = $("#drum");
  const n = cats.length;
  const step = 360 / n;
  const panels = cats.map((c, i) => {
    const b = el("button", "panel");
    b.type = "button";
    const top = el("div", "p-top");
    top.append(el("span", null, String(i + 1).padStart(2, "0")), el("span", null, c.code));
    const big = el("div", "big", c.code);
    const bot = el("div", "p-bot");
    const meta = el("div", "meta");
    meta.append(el("span", null, fa(inCat(c.id).length) + " پروژه"), el("span", "open", "مشاهده‌ی پروژه‌ها"));
    bot.append(el("h3", null, c.title), meta);
    b.append(top, big, bot);
    b.onclick = () => {
      if (b.classList.contains("is-front")) openCat(c.id, true);
      else goTo(i);
    };
    drum.appendChild(b);
    return b;
  });

  const track = $("#track");
  let vh = innerHeight, W = 340, H = 400, R = 500, maxScroll = 1;
  function measure() {
    vh = innerHeight;
    W = Math.min(720, innerWidth * 0.9);
    H = Math.max(420, Math.min(vh * 0.8, 800));
    R = (H / 2) / Math.tan(Math.PI / n) * 1.25;
    track.style.setProperty("--w", W + "px");
    track.style.setProperty("--h", H + "px");
    track.style.height = (n - 1) * vh * 0.9 + vh + "px";
    panels.forEach((p, i) => {
      // next category arrives from the left (RTL reading order)
      p.style.transform = "rotateX(" + -i * step + "deg) translateZ(" + R + "px)";
    });
    update();
  }
  function progress() {
    maxScroll = track.offsetHeight - vh;
    return Math.min(1, Math.max(0, -track.getBoundingClientRect().top / maxScroll));
  }
  function update() {
    const p = progress();
    const angle = p * (n - 1) * step;
    drum.style.transform = "translateZ(" + -R + "px) rotateX(" + angle + "deg)";
    $("#pbar").style.width = p * 100 + "%";
    let active = 0, best = 1e9;
    panels.forEach((el_, i) => {
      const diff = Math.abs(i * step - angle);
      const k = Math.min(1, diff / 110);
      el_.style.opacity = reduce ? 1 : (1 - k * 0.75).toFixed(3);
      if (diff < best) { best = diff; active = i; }
    });
    panels.forEach((el_, i) => {
      const front = i === active && best < step * 0.35;
      el_.classList.toggle("is-front", front);
      el_.tabIndex = 0;
      el_.setAttribute("aria-label", cats[i].title + (front ? " — باز کردن" : " — چرخاندن به این دسته"));
    });
    $("#pnum").textContent = fa(active + 1) + " / " + fa(n);
  }
  function goTo(i) {
    const top = track.getBoundingClientRect().top + scrollY;
    scrollTo({ top: top + (i / (n - 1)) * maxScroll, behavior: reduce ? "auto" : "smooth" });
  }
  let tick = false, snapT;
  addEventListener("scroll", () => {
    if (!tick) { tick = true; requestAnimationFrame(() => { tick = false; update(); }); }
    clearTimeout(snapT);
    snapT = setTimeout(() => {
      const r = track.getBoundingClientRect();
      if (reduce || view.classList.contains("on") || r.top > 0 || r.bottom < vh) return;
      const i = Math.round(progress() * (n - 1));
      const target = (r.top + scrollY) + (i / (n - 1)) * maxScroll;
      if (Math.abs(target - scrollY) > 4) scrollTo({ top: target, behavior: "smooth" });
    }, 160);
  }, { passive: true });
  addEventListener("resize", measure);
  addEventListener("keydown", (e) => {
    if (view.classList.contains("on") || $("#dlg").open) return;
    const r = track.getBoundingClientRect();
    if (r.top > 0 || r.bottom < vh) return;
    const cur = Math.round(progress() * (n - 1));
    if (e.key === "ArrowLeft") { e.preventDefault(); goTo(Math.min(n - 1, cur + 1)); }
    if (e.key === "ArrowRight") { e.preventDefault(); goTo(Math.max(0, cur - 1)); }
  });
  document.fonts && document.fonts.ready.then(measure);

  const view = $("#view");
  measure();

  /* ---------- category view ---------- */
  let savedY = 0, current = null;

  function thumb(p, src) {
    const t = el("div", "thumb");
    const s = src || p.image;
    if (s) { const img = el("img"); img.src = s; img.alt = p.title; img.loading = "lazy"; t.appendChild(img); }
    else t.appendChild(el("span", "ph", catById[p.category].code));
    return t;
  }

  function fill(id) {
    const c = catById[id];
    current = id;
    $("#vcode").textContent = c.code;
    $("#vtitle").textContent = c.title;
    const list = inCat(id);
    $("#vcount").textContent = fa(list.length) + " پروژه";
    const g = $("#grid"); g.innerHTML = "";
    list.forEach((p, i) => {
      const b = el("button", "card");
      b.type = "button";
      b.style.animationDelay = 0.25 + i * 0.07 + "s";
      const m = el("div", "cmeta");
      m.append(el("h3", null, p.title), el("span", "id", p.code));
      b.append(thumb(p), m, el("p", "sub", p.summary + " · " + fa(p.year)));
      b.onclick = () => openProject(p);
      g.appendChild(b);
    });
    const chips = $("#chips"); chips.innerHTML = "";
    cats.forEach((x) => {
      const ch = el("button", "chip", x.title);
      ch.type = "button";
      ch.setAttribute("aria-pressed", String(x.id === id));
      ch.onclick = () => { fill(x.id); history.replaceState(null, "", "#" + x.id); view.scrollTop = 0; };
      chips.appendChild(ch);
    });
  }

  function openCat(id, push) {
    if (!catById[id]) return;
    if (!view.classList.contains("on")) savedY = scrollY;
    fill(id);
    view.scrollTop = 0;
    view.classList.add("on");
    view.setAttribute("aria-hidden", "false");
    document.body.classList.add("lock");
    if (push) history.pushState(null, "", "#" + id);
    setTimeout(() => $("#back").focus({ preventScroll: true }), 50);
  }
  function closeCat(push) {
    view.classList.remove("on");
    view.setAttribute("aria-hidden", "true");
    document.body.classList.remove("lock");
    window.scrollTo(0, savedY);
    if (push && location.hash) history.pushState(null, "", location.pathname);
  }
  $("#back").onclick = () => { if (location.hash) history.back(); else closeCat(false); };
  addEventListener("popstate", () => {
    const id = location.hash.slice(1);
    if (id && catById[id]) openCat(id, false); else closeCat(false);
  });
  addEventListener("keydown", (e) => {
    if (e.key === "Escape" && view.classList.contains("on") && !$("#dlg").open) $("#back").click();
  });
  $("#logo").onclick = (e) => { e.preventDefault(); if (view.classList.contains("on")) $("#back").click(); else scrollTo({ top: 0, behavior: reduce ? "auto" : "smooth" }); };

  /* ---------- project dialog ---------- */
  const dlg = $("#dlg");
  function openProject(p) {
    const body = $("#dbody"); body.innerHTML = "";
    const media = el("div", "d-media");
    (p.images && p.images.length ? p.images : [p.image]).forEach((s) => media.appendChild(thumb(p, s)));
    const info = el("div", "d-info");
    info.append(el("div", "id", p.code), el("h3", null, p.title), el("p", null, p.description || p.summary));
    const dl = el("dl");
    [["دسته", catById[p.category].title], ["سال", fa(p.year)], ["نقش", p.role], ["ابزار", p.tools]].forEach(([k, v]) => {
      if (!v) return;
      const row = el("div"); row.append(el("dt", null, k), el("dd", null, v)); dl.appendChild(row);
    });
    info.appendChild(dl);
    body.append(media, info);
    dlg.showModal();
  }
  $("#close").onclick = () => dlg.close();
  dlg.addEventListener("click", (e) => { if (e.target === dlg) dlg.close(); });

  // open directly from a link like #bottle
  const h = location.hash.slice(1);
  if (h && catById[h]) openCat(h, false);
})();

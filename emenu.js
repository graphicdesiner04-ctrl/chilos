/* منيو إلكتروني مستقل — عرض فقط (بدون سلة أو روابط للموقع). البيانات من menu.js */
(() => {
  "use strict";
  const $ = s => document.querySelector(s);
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const norm = s => s.replace(/[أإآ]/g, "ا").replace(/ة/g, "ه").replace(/ى/g, "ي");
  const AI = typeof PHOTOS_ILLUSTRATIVE !== "undefined" && PHOTOS_ILLUSTRATIVE;

  /* بيانات التواصل */
  $("#call").href = `tel:${CONFIG.phoneMobile}`; $("#callNum").textContent = CONFIG.phoneMobile;
  $("#call2").href = `tel:${CONFIG.phoneMobile}`; $("#call2").textContent = CONFIG.phoneMobile;
  $("#land").href = `tel:${CONFIG.phoneLandline}`; $("#land").textContent = CONFIG.phoneLandline;
  $("#wa").href = `https://wa.me/${CONFIG.waNumber}`; $("#wa").textContent = CONFIG.waDisplay;
  $("#addr").textContent = "📍 " + CONFIG.address;
  $("#aiNote").hidden = !AI;

  /* رسم الأصناف */
  const groupsOf = c => c.groups || [{ items: c.items }];
  const prices = (it, sizes) => {
    const p = it.p || [];
    if (!p.length) return "";
    const single = sizes.length === 1;
    return `<div class="pr">${sizes.map((s, i) => p[i] == null
      ? `<span class="off"><small>${esc(s)}</small><b>–</b></span>`
      : `<span>${single && (s === "سعر" || s === "حجم واحد") ? "" : `<small>${esc(s)}</small>`}<b>${p[i]}</b></span>`).join("")}</div>`;
  };
  const item = (it, sizes) => `
    <article class="it${it.star ? " it--star" : ""}" data-q="${esc(norm(it.n + " " + (it.d || "")))}">
      <h3>${esc(it.n)}${it.new ? '<span class="badge">جديد</span>' : ""}${it.star ? '<span class="badge badge--star">الأشهر</span>' : ""}</h3>
      ${prices(it, it.s || sizes)}
      ${it.d ? `<p>${esc(it.d)}</p>` : ""}
    </article>`;

  const head = c => c.img
    ? `<div class="sec__head"><img src="assets/${esc(c.img)}" alt="" width="800" height="600" loading="lazy" decoding="async">${AI ? '<span class="ai">صورة توضيحية</span>' : ""}<h2 id="t-${c.id}">${c.emoji} ${esc(c.t)}</h2></div>`
    : `<div class="sec__head sec__head--plain"><h2 id="t-${c.id}">${c.emoji} ${esc(c.t)}</h2></div>`;

  $("#list").innerHTML = MENU.map(c => `
    <section class="sec" id="c-${c.id}" aria-labelledby="t-${c.id}">
      ${head(c)}
      ${c.note ? `<p class="sec__note">${esc(c.note)}</p>` : ""}
      ${c.info ? '<p class="sec__note">المشروبات متاحة في الفرع — اسأل عن الأسعار.</p>' : ""}
      ${groupsOf(c).map(g => `
        ${g.t ? `<span class="grp">${esc(g.t)}</span>` : ""}
        <div class="items${c.info ? " drinks" : ""}">${g.items.map(it => item(it, g.s || c.s || [])).join("")}</div>`).join("")}
    </section>`).join("");

  /* شريط الأقسام */
  const tabs = $("#tabs");
  tabs.innerHTML = MENU.map((c, i) => `<button class="tab" type="button" data-c="${c.id}" aria-current="${i === 0}">${c.emoji} ${esc(c.t)}</button>`).join("");
  const bar = document.querySelector(".bar");
  let lock = 0;
  function mark(id) {
    tabs.querySelectorAll(".tab").forEach(t => t.setAttribute("aria-current", String(t.dataset.c === id)));
    const t = tabs.querySelector(`[data-c="${id}"]`); if (!t) return;
    const a = t.getBoundingClientRect(), b = tabs.getBoundingClientRect();
    tabs.scrollBy({ left: (a.left + a.width / 2) - (b.left + b.width / 2), behavior: "smooth" });
  }
  tabs.addEventListener("click", e => {
    const t = e.target.closest(".tab"); if (!t) return;
    if (q.value) { q.value = ""; filter(); }
    const sec = document.getElementById("c-" + t.dataset.c);
    lock = Date.now() + 600; mark(t.dataset.c);
    // قفز فوري: الـ smooth بيتقطع في القوايم الطويلة على بعض الموبايلات
    window.scrollTo({ top: sec.getBoundingClientRect().top + window.scrollY - bar.offsetHeight + 4, behavior: "instant" });
  });
  if ("IntersectionObserver" in window) {
    const io = new IntersectionObserver(es => es.forEach(e => {
      if (e.isIntersecting && Date.now() > lock && !q.value) mark(e.target.id.slice(2));
    }), { rootMargin: "-80px 0px -65% 0px" });
    document.querySelectorAll(".sec").forEach(s => io.observe(s));
  }

  /* البحث */
  const q = $("#q"), qWrap = $("#qWrap"), sBtn = $("#searchBtn");
  sBtn.addEventListener("click", () => {
    const open = qWrap.hidden;
    qWrap.hidden = !open; sBtn.setAttribute("aria-expanded", String(open));
    if (open) q.focus(); else if (q.value) { q.value = ""; filter(); }
  });
  function filter() {
    const t = norm(q.value.trim());
    let hits = 0;
    document.querySelectorAll(".sec").forEach(sec => {
      let n = 0;
      sec.querySelectorAll(".it").forEach(it => { const ok = !t || it.dataset.q.includes(t); it.hidden = !ok; if (ok) n++; });
      sec.querySelectorAll(".items").forEach(box => (box.hidden = !box.querySelector(".it:not([hidden])")));
      sec.querySelectorAll(".grp").forEach(g => (g.hidden = !!t));
      sec.hidden = !n; hits += n;
    });
    const nr = $("#nores");
    nr.hidden = hits > 0; nr.textContent = `مفيش أصناف بالاسم ده: "${q.value.trim()}"`;
    if (t) window.scrollTo({ top: $("#list").offsetTop - bar.offsetHeight, behavior: "instant" });
  }
  q.addEventListener("input", filter);
})();

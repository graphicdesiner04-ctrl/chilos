(() => {
  "use strict";
  const $ = (s, r = document) => r.querySelector(s);
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const money = n => n.toLocaleString("en-US");
  const store = {
    get(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} }
  };

  /* ---------- contact links ---------- */
  const waBase = `https://wa.me/${CONFIG.waNumber}`;
  const waHello = `${waBase}?text=${encodeURIComponent("السلام عليكم، عايز أطلب من تشيلوس")}`;
  const set = (sel, fn) => { const el = $(sel); if (el) fn(el); };
  ["#heroWa", "#fab", "#hdrWa"].forEach(s => set(s, el => (el.href = waHello)));
  set("#tAddr", el => (el.textContent = CONFIG.address));
  set("#tWa", el => { el.textContent = CONFIG.waDisplay; el.href = waHello; });
  set("#tMobile", el => { el.textContent = CONFIG.phoneMobile; el.href = `tel:${CONFIG.phoneMobile}`; });
  set("#tLand", el => { el.textContent = CONFIG.phoneLandline; el.href = `tel:${CONFIG.phoneLandline}`; });
  set("#callBtn", el => (el.href = `tel:${CONFIG.phoneMobile}`));
  set("#mapBtn", el => (el.href = CONFIG.mapsUrl));
  set("#fbBtn", el => (el.href = CONFIG.facebookUrl));
  set("#yr", el => (el.textContent = new Date().getFullYear()));

  /* ---------- normalize menu (assign ids) ---------- */
  const byId = {};
  MENU.forEach(cat => {
    if (!cat.groups) cat.groups = [{ items: cat.items }];
    cat.groups.forEach((g, gi) => g.items.forEach((it, ii) => {
      it.p = it.p || [];   // أصناف المعلومات (المشروبات) من غير أسعار
      it.id = `${cat.id}.${gi}.${ii}`;
      it.sizes = it.s || g.s || cat.s || [];
      it.cat = cat.id;
      byId[it.id] = it;
    }));
  });

  /* ---------- cart ---------- */
  // cart: { "itemId|sizeIdx": qty }
  let cart = store.get("chilos_cart", {});
  const parseKey = k => { const [id, si] = k.split("|"); const it = byId[id]; return it ? { it, si: +si } : null; };
  // drop stale keys (menu may change between visits)
  Object.keys(cart).forEach(k => { const p = parseKey(k); if (!p || p.it.p[p.si] == null) delete cart[k]; });

  const lines = () => Object.entries(cart).map(([k, qty]) => {
    const { it, si } = parseKey(k);
    return { k, it, size: it.sizes[si], price: it.p[si], qty };
  });
  const totals = () => lines().reduce((a, l) => ({ n: a.n + l.qty, sum: a.sum + l.qty * l.price }), { n: 0, sum: 0 });
  const save = () => store.set("chilos_cart", cart);

  function add(key) {
    cart[key] = (cart[key] || 0) + 1;
    save(); renderCart();
    const { it, si } = parseKey(key);
    toast(`✓ أضفنا ${it.n}${it.sizes.length > 1 ? " (" + it.sizes[si] + ")" : ""}`);
    const b = $("#cartCount"); b.classList.remove("bump"); void b.offsetWidth; b.classList.add("bump");
  }
  function change(key, d) {
    cart[key] = (cart[key] || 0) + d;
    if (cart[key] <= 0) delete cart[key];
    save(); renderCart();
  }

  function renderCart() {
    const ls = lines(), t = totals();
    const list = $("#cartList");
    list.innerHTML = ls.map(l => `
      <div class="line">
        <div><b>${esc(l.it.n)}</b>${l.it.sizes.length > 1 ? ` <small>· ${esc(l.size)}</small>` : ""}
          <div class="qty">
            <button type="button" data-d="-1" data-k="${esc(l.k)}" aria-label="تقليل">−</button>
            <span>${l.qty}</span>
            <button type="button" data-d="1" data-k="${esc(l.k)}" aria-label="زيادة">+</button>
          </div></div>
        <div class="lp">${money(l.qty * l.price)} ج</div>
      </div>`).join("");
    $("#cartEmpty").hidden = ls.length > 0;
    $("#cartTotal").textContent = money(t.sum);
    $("#sendWa").disabled = ls.length === 0;
    $("#clearCart").hidden = ls.length === 0;
    const c = $("#cartCount"); c.hidden = t.n === 0; c.textContent = t.n;
    $("#barCount").textContent = t.n; $("#barTotal").textContent = money(t.sum);
    $("#cartBar").hidden = t.n === 0 || drawer.classList.contains("on");
  }

  /* ---------- drawer ---------- */
  const drawer = $("#drawer"), overlay = $("#overlay");
  let lastFocus = null;
  function openCart() {
    lastFocus = document.activeElement; drawer.inert = false;
    overlay.hidden = false; requestAnimationFrame(() => overlay.classList.add("on"));
    drawer.classList.add("on"); drawer.setAttribute("aria-hidden", "false");
    $("#cartBar").hidden = true; document.body.style.overflow = "hidden";
    $("#closeCart").focus();
  }
  function closeCart() {
    overlay.classList.remove("on"); setTimeout(() => (overlay.hidden = true), 250);
    drawer.classList.remove("on"); drawer.setAttribute("aria-hidden", "true");
    drawer.inert = true; document.body.style.overflow = ""; renderCart();
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }
  $("#openCart").onclick = openCart; $("#cartBar").onclick = openCart;
  $("#closeCart").onclick = closeCart; overlay.onclick = closeCart;
  document.addEventListener("keydown", e => { if (e.key === "Escape" && drawer.classList.contains("on")) closeCart(); });
  $("#cartList").addEventListener("click", e => {
    const b = e.target.closest("button[data-k]"); if (b) change(b.dataset.k, +b.dataset.d);
  });
  $("#clearCart").onclick = () => { if (confirm("تفريغ السلة؟")) { cart = {}; save(); renderCart(); } };

  /* ---------- order form / whatsapp ---------- */
  const form = $("#orderForm");
  const saved = store.get("chilos_customer", {});
  ["name", "phone", "address"].forEach(n => { if (saved[n]) form.elements[n].value = saved[n]; });
  function syncMode() {
    const delivery = form.elements.mode.value === "delivery";
    $("#addrField").hidden = !delivery;
    $("#deliveryHint").hidden = !delivery;
  }
  form.addEventListener("change", syncMode); syncMode();

  function showErr(msg, field) {
    const e = $("#formErr"); e.textContent = msg; e.hidden = !msg;
    form.querySelectorAll(".bad").forEach(x => x.classList.remove("bad"));
    if (field) { field.classList.add("bad"); field.focus(); }
  }

  $("#sendWa").onclick = () => {
    const ls = lines(); if (!ls.length) return;
    const f = form.elements, mode = f.mode.value;
    const name = f.name.value.trim(), phone = f.phone.value.trim(), address = f.address.value.trim(), notes = f.notes.value.trim();
    if (!name) return showErr("اكتب اسمك من فضلك", f.name);
    if (!/^[0-9٠-٩+\s-]{8,16}$/.test(phone)) return showErr("اكتب رقم موبايل صحيح", f.phone);
    if (mode === "delivery" && !address) return showErr("اكتب عنوان التوصيل", f.address);
    showErr("");
    store.set("chilos_customer", { name, phone, address });

    const t = totals();
    const rows = ls.map((l, i) => {
      const sz = l.it.sizes.length > 1 ? ` (${l.size})` : "";
      return `${i + 1}) ${l.it.n}${sz} × ${l.qty} = ${l.qty * l.price} ${CONFIG.currency}`;
    });
    const msg = [
      `*طلب جديد — ${CONFIG.name} ${CONFIG.nameEn}* 🍕`,
      "",
      ...rows,
      "",
      `*إجمالي الأصناف: ${t.sum} ${CONFIG.currency}*` + (mode === "delivery" ? " (+ رسوم التوصيل)" : ""),
      "",
      `نوع الطلب: ${mode === "delivery" ? "توصيل 🛵" : "استلام من الفرع 🏪"}`,
      `الاسم: ${name}`,
      `الموبايل: ${phone}`,
      ...(mode === "delivery" ? [`العنوان: ${address}`] : []),
      ...(notes ? [`ملاحظات: ${notes}`] : [])
    ].join("\n");
    window.open(`${waBase}?text=${encodeURIComponent(msg)}`, "_blank", "noopener");
  };

  /* ---------- toast ---------- */
  let tt;
  function toast(m) {
    const el = $("#toast"); el.textContent = m; el.classList.add("on");
    clearTimeout(tt); tt = setTimeout(() => el.classList.remove("on"), 1400);
  }

  /* ---------- photos ---------- */
  const AI = typeof PHOTOS_ILLUSTRATIVE !== "undefined" && PHOTOS_ILLUSTRATIVE;
  const photo = (src, alt, cls, eager) =>
    `<span class="ph ${cls}${AI ? " ph--ai" : ""}"><img src="assets/${esc(src)}" alt="${esc(alt)}" width="800" height="600" ${eager ? "" : 'loading="lazy" '}decoding="async"></span>`;

  /* ---------- menu rendering ---------- */
  const priceBtns = it => it.p.map((p, i) => {
    if (p == null) return "";
    const label = it.sizes.length > 1 || (it.sizes[0] && it.sizes[0] !== "سعر") ? `<em>${esc(it.sizes[i])}</em>` : "";
    return `<button class="price" type="button" data-k="${esc(it.id)}|${i}" aria-label="أضف ${esc(it.n)} ${esc(it.sizes[i] || "")} بسعر ${p}">${label}<b>${p}</b><i>+</i></button>`;
  }).join("");

  const itemHtml = it => `
    <article class="item">
      ${it.img ? photo(it.img, it.n, "item__img") : ""}
      <h4>${esc(it.n)}${it.new ? '<span class="tag">جديد</span>' : ""}${it.star ? '<span class="tag tag--star">الأشهر</span>' : ""}</h4>
      ${it.d ? `<p>${esc(it.d)}</p>` : ""}
      <div class="prices">${priceBtns(it)}</div>
    </article>`;

  function catHtml(cat) {
    if (cat.info) {
      return `<div class="cnote">المشروبات متاحة في الفرع — اكتب اللي عايزه في خانة الملاحظات وإحنا نضيفه على أوردرك.</div>
        <div class="drinks">${cat.groups[0].items.map(i => `<div class="drink"><h4>${esc(i.n)}</h4><p>${esc(i.d)}</p></div>`).join("")}</div>`;
    }
    return (cat.img ? photo(cat.img, cat.t, "banner") : "") +
      (cat.note ? `<div class="cnote">${esc(cat.note)}</div>` : "") +
      cat.groups.map(g => `${g.t ? `<h3 class="gtitle">${esc(g.t)}</h3>` : ""}<div class="grid">${g.items.map(itemHtml).join("")}</div>`).join("");
  }

  let active = MENU[0].id;
  const chips = $("#chips"), out = $("#menuOut"), q = $("#q");
  chips.innerHTML = MENU.map(c => `<button class="chip" type="button" data-c="${c.id}" aria-pressed="${c.id === active}">${c.emoji} ${esc(c.t)}</button>`).join("");

  function renderMenu() {
    const term = q.value.trim();
    if (term) {
      const t = term.replace(/[أإآ]/g, "ا").replace(/ة/g, "ه").replace(/ى/g, "ي");
      const norm = s => s.replace(/[أإآ]/g, "ا").replace(/ة/g, "ه").replace(/ى/g, "ي");
      const hits = Object.values(byId).filter(it => it.p.some(x => x != null) && norm(it.n + " " + (it.d || "")).includes(t));
      out.innerHTML = hits.length ? `<div class="grid">${hits.map(itemHtml).join("")}</div>` : `<div class="nores">مفيش نتايج لـ "${esc(term)}" 🤔</div>`;
      chips.querySelectorAll(".chip").forEach(c => c.setAttribute("aria-pressed", "false"));
      return;
    }
    chips.querySelectorAll(".chip").forEach(c => c.setAttribute("aria-pressed", String(c.dataset.c === active)));
    out.innerHTML = catHtml(MENU.find(c => c.id === active));
  }
  // يحرّك شريط الأقسام أفقيًا بس (scrollIntoView كان بيلغي سكرول الصفحة)
  function centerChip(id, smooth) {
    const chip = chips.querySelector(`[data-c="${id}"]`); if (!chip) return;
    const c = chip.getBoundingClientRect(), w = chips.getBoundingClientRect();
    chips.scrollBy({ left: (c.left + c.width / 2) - (w.left + w.width / 2), behavior: smooth ? "smooth" : "auto" });
  }
  function setCat(id, scroll) {
    active = id; q.value = ""; renderMenu();
    centerChip(id, true);
    if (scroll) $("#menu").scrollIntoView({ behavior: "smooth" });
  }
  chips.addEventListener("click", e => { const c = e.target.closest(".chip"); if (c) setCat(c.dataset.c, false); });
  q.addEventListener("input", renderMenu);
  document.querySelectorAll("[data-go]").forEach(b => b.onclick = () => setCat(b.dataset.go, true));

  const flash = btn => { btn.classList.add("added"); setTimeout(() => btn.classList.remove("added"), 700); };
  document.addEventListener("click", e => {
    const b = e.target.closest(".price[data-k]"); if (!b) return;
    add(b.dataset.k); flash(b);
  });

  /* ---------- signature section ---------- */
  const sig = Object.values(byId).filter(i => i.star);
  if ($("#sigGrid")) $("#sigGrid").innerHTML = sig.map(it => `
    <article class="sigcard">${(() => { const src = it.img || (MENU.find(c => c.id === it.cat) || {}).img; return src ? photo(src, it.n, "sig__img") : ""; })()}<h3>${esc(it.n)}</h3>${it.d ? `<p>${esc(it.d)}</p>` : "<p></p>"}<div class="prices">${priceBtns(it)}</div></article>`).join("");

  if (typeof GALLERY !== "undefined" && GALLERY.length && $("#gallery")) {
    $("#galleryGrid").innerHTML = GALLERY.map(g => `<figure>${photo(g.src, g.alt || "", "")}<figcaption>${esc(g.alt || "")}</figcaption></figure>`).join("");
    $("#galleryNote").hidden = !AI;
    $("#gallery").hidden = false;
  }

  // صور كروت الأقسام في أول الصفحة
  document.querySelectorAll(".cat[data-go]").forEach(b => {
    const c = MENU.find(m => m.id === b.dataset.go);
    if (c && c.img) { b.insertAdjacentHTML("afterbegin", photo(c.img, "", "cat__img")); b.classList.add("cat--photo"); }
  });

  renderMenu(); renderCart();
})();

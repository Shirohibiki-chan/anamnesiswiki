// The published site's JavaScript (Phase 1.5).
//
// **Everything works without it.** Tabs run down the page under their own
// headings, the tree is `<details>` the browser opens on its own, and every
// link is a real link. What this adds: switching tabs in place, the sidebar
// on a phone, and search. The `html.js` class is the switch — the stylesheet
// only hides tab sections once it is there, so a reader with scripts off sees
// everything rather than only the first tab.
//
// **The search index is a second script rather than a fetched file**, because
// a folder opened straight from disk is `file://`, and browsers refuse
// `fetch` there. A `<script>` tag loads fine from anywhere, so the site works
// double-clicked as well as hosted.
//
// The search library is Fuse.js, bundled into `site.js` at publish time by the
// planner — see `site-plan.ts`, which prepends it. Nothing here assumes more
// than `window.Fuse`.

export const SITE_SCRIPT = `
(function () {
  var root = document.documentElement;
  root.classList.add("js");
  var here = document.currentScript && document.currentScript.getAttribute("data-root") || "";

  // ---- Tabs
  var buttons = document.querySelectorAll(".tab-button");
  function showTab(id) {
    var tabs = document.querySelectorAll(".tab");
    for (var i = 0; i < tabs.length; i++) tabs[i].classList.toggle("is-active", tabs[i].id === id);
    for (var j = 0; j < buttons.length; j++) buttons[j].classList.toggle("is-active", buttons[j].getAttribute("data-tab") === id);
  }
  for (var b = 0; b < buttons.length; b++) {
    buttons[b].addEventListener("click", function (event) {
      var id = event.currentTarget.getAttribute("data-tab");
      showTab(id);
      if (history.replaceState) history.replaceState(null, "", "#" + id);
    });
  }
  // A link to a heading inside a tab that is not showing has to open that tab
  // first, or the reader lands on nothing.
  function revealHash() {
    if (!location.hash) return;
    var target = document.getElementById(decodeURIComponent(location.hash.slice(1)));
    if (!target) return;
    var tab = target.closest ? target.closest(".tab") : null;
    if (tab && !tab.classList.contains("is-active")) showTab(tab.id);
    if (target !== tab) target.scrollIntoView();
  }
  revealHash();
  window.addEventListener("hashchange", revealHash);

  // ---- Sidebar on a phone
  var toggle = document.querySelector(".menu-toggle");
  var sidebar = document.querySelector(".sidebar");
  if (toggle && sidebar) {
    toggle.addEventListener("click", function () { sidebar.classList.toggle("is-open"); });
    document.addEventListener("click", function (event) {
      if (sidebar.classList.contains("is-open") && !sidebar.contains(event.target) && event.target !== toggle) sidebar.classList.remove("is-open");
    });
  }

  // ---- Search
  var input = document.querySelector(".search input");
  var results = document.querySelector(".search-results");
  var index = window.ANAMNESIS_INDEX;
  if (!input || !results || !index || typeof window.Fuse !== "function") return;

  var fuse = new window.Fuse(index, {
    keys: [{ name: "t", weight: 3 }, { name: "a", weight: 2 }, { name: "g", weight: 1 }, { name: "x", weight: 1 }],
    threshold: 0.35,
    ignoreLocation: true,
    minMatchCharLength: 2
  });
  var active = -1;

  function escape(text) {
    return String(text).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }
  function snippet(entry, query) {
    var text = entry.x || "";
    var at = text.toLowerCase().indexOf(query.toLowerCase());
    var start = at > 40 ? at - 40 : 0;
    var piece = text.slice(start, start + 120);
    return (start > 0 ? "…" : "") + piece + (start + 120 < text.length ? "…" : "");
  }
  function render(query) {
    active = -1;
    if (!query.trim()) { results.classList.remove("is-open"); results.innerHTML = ""; return; }
    var hits = fuse.search(query, { limit: 12 });
    if (hits.length === 0) {
      results.innerHTML = '<div class="result-empty">Nothing matches.</div>';
    } else {
      results.innerHTML = hits.map(function (hit) {
        var entry = hit.item;
        return '<a href="' + escape(here + entry.u) + '">' + escape(entry.t) +
          (entry.p ? '<span class="result-path">' + escape(entry.p) + '</span>' : '') +
          '<span class="result-snippet">' + escape(snippet(entry, query)) + '</span></a>';
      }).join("");
    }
    results.classList.add("is-open");
  }
  input.addEventListener("input", function () { render(input.value); });
  input.addEventListener("focus", function () { if (input.value.trim()) results.classList.add("is-open"); });
  input.addEventListener("keydown", function (event) {
    var links = results.querySelectorAll("a");
    if (event.key === "Escape") { results.classList.remove("is-open"); input.blur(); return; }
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      if (links.length === 0) return;
      event.preventDefault();
      active = event.key === "ArrowDown" ? (active + 1) % links.length : (active - 1 + links.length) % links.length;
      for (var i = 0; i < links.length; i++) links[i].classList.toggle("is-active", i === active);
      return;
    }
    if (event.key === "Enter" && active >= 0 && links[active]) { location.href = links[active].getAttribute("href"); }
  });
  document.addEventListener("click", function (event) {
    if (!results.contains(event.target) && event.target !== input) results.classList.remove("is-open");
  });
  document.addEventListener("keydown", function (event) {
    if (event.key === "/" && document.activeElement !== input && !/INPUT|TEXTAREA/.test(document.activeElement.tagName)) {
      event.preventDefault();
      input.focus();
    }
  });
})();
`;

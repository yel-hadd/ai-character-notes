/* AI Character Notes funnel: 2-step quiz -> matched MakeInfluencer page (same language), GA4 + OpenAI pixel events.
   Each page defines window.FUNNEL = {lang, t:{title, plan, price, go}} before loading this file. */
(function () {
  var F = window.FUNNEL || {};
  var REF = "AIMARKETING";
  var DEST = { ugc: "/ai-ugc-creator", persona: "/ai-influencer", video: "/ai-movie-maker" };
  var PREFIX = F.lang === "fr" ? "/fr" : F.lang === "ar" ? "/ar" : "";
  var state = { make: null, freq: null };

  function link(make) {
    // Only the affiliate ref: no UTM or campaign parameters on outbound links.
    // /fr and /ar ai-movie-maker return 404: Movie Maker only exists without a locale prefix.
    return "https://www.makeinfluencer.ai" + (make === "video" ? "" : PREFIX) + DEST[make] + "?ref=" + REF;
  }
  window.aicnLink = link;

  // One hook for every event: GA4 (gtag) + OpenAI pixel (oaiq) when present.
  function track(name, props) {
    props = props || {};
    props.lang = F.lang;
    try { if (window.gtag) window.gtag("event", name, props); } catch (e) {}
    try { if (window.oaiq) window.oaiq("track", name, props); } catch (e) {}
  }
  window.aicnTrack = track;

  function press(group, btn) {
    document.querySelectorAll('[data-q="' + group + '"]').forEach(function (b) { b.setAttribute("aria-pressed", "false"); });
    btn.setAttribute("aria-pressed", "true");
  }

  function render() {
    var step2 = document.getElementById("step2"), result = document.getElementById("result");
    if (state.make && step2) step2.hidden = false;
    if (!state.make || !state.freq || !result) return;
    var t = F.t, planKey = state.make === "video" ? "video" : state.freq;
    var tier = state.make === "video" || state.freq === "weekly" ? "pro" : "creator";
    document.getElementById("r-title").textContent = t.title[state.make];
    document.getElementById("r-body").textContent = t.plan[planKey];
    document.getElementById("r-price").textContent = t.price[tier];
    var a = document.getElementById("r-cta");
    a.href = link(state.make);
    a.textContent = t.go[state.make];
    a.setAttribute("data-cta", "quiz-" + state.make + "-" + state.freq);
    result.hidden = false;
    track("quiz_complete", { make: state.make, freq: state.freq, tier: tier });
  }

  document.querySelectorAll("[data-q]").forEach(function (b) {
    b.addEventListener("click", function () {
      var q = b.getAttribute("data-q");
      press(q, b);
      state[q] = b.getAttribute("data-v");
      if (q === "make") track("quiz_step1", { make: state.make });
      render();
      var next = q === "make" && !state.freq ? document.getElementById("step2") : document.getElementById("result");
      if (next && !next.hidden) next.scrollIntoView({ behavior: "smooth", block: "nearest" });
    });
  });

  // Static affiliate links (skip / final CTA) get their URL from link() so locale + UTM stay consistent.
  document.querySelectorAll("a[data-hop]").forEach(function (a) { a.setAttribute("rel", "sponsored noopener noreferrer"); a.setAttribute("referrerpolicy", "no-referrer"); });
  document.querySelectorAll("a[data-make]").forEach(function (a) {
    a.href = link(a.getAttribute("data-make"));
  });

  document.addEventListener("click", function (e) {
    var a = e.target.closest && e.target.closest("a[data-hop]");
    if (a) track("outbound_click", { cta: a.getAttribute("data-cta") || a.id, make: state.make || a.getAttribute("data-make") || "", freq: state.freq || "" });
  });

  // Scroll depth (25/50/75/100) for engagement insight
  var marks = [25, 50, 75, 100], sent = {};
  window.addEventListener("scroll", function () {
    var h = document.documentElement, p = (h.scrollTop + h.clientHeight) / h.scrollHeight * 100;
    marks.forEach(function (m) { if (p >= m && !sent[m]) { sent[m] = 1; track("scroll_depth", { percent: m }); } });
  }, { passive: true });

  // VSL: autoplay muted (browsers only allow that), big "turn on sound" overlay; tapping restarts with sound.
  var vsl = document.getElementById("vsl"), unmute = document.getElementById("unmute");
  if (vsl && unmute) {
    var p = vsl.play && vsl.play();
    if (p && p.catch) p.catch(function () {});
    unmute.addEventListener("click", function () {
      vsl.muted = false; vsl.currentTime = 0; vsl.controls = true;
      var q = vsl.play(); if (q && q.catch) q.catch(function () {});
      unmute.hidden = true;
      track("video_unmute", { video: "vsl-" + F.lang });
    });
    var marks2 = [25, 50, 75, 95], sent2 = {};
    vsl.addEventListener("timeupdate", function () {
      if (vsl.muted || !vsl.duration) return;
      var pc = vsl.currentTime / vsl.duration * 100;
      marks2.forEach(function (m) { if (pc >= m && !sent2[m]) { sent2[m] = 1; track("video_progress", { percent: m }); } });
    });
  }
  document.querySelectorAll("video:not(#vsl)").forEach(function (v) {
    v.addEventListener("play", function () { track("video_play", { video: v.getAttribute("data-name") || "demo" }); }, { once: true });
  });

  // Sticky CTA on phones once the quiz has scrolled out of view.
  var sticky = document.getElementById("sticky"), quiz = document.querySelector(".quiz");
  if (sticky && quiz && "IntersectionObserver" in window) {
    // Show after the quiz has scrolled away; hide while any in-page CTA or the final block is visible (no duplicate buttons).
    var pastQuiz = false, visible = new Set();
    var update = function () { sticky.classList.toggle("show", pastQuiz && visible.size === 0); };
    new IntersectionObserver(function (es) {
      es.forEach(function (e) { pastQuiz = !e.isIntersecting && e.boundingClientRect.top < 0; }); update();
    }).observe(quiz);
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) visible.add(e.target); else visible.delete(e.target); }); update();
    });
    document.querySelectorAll("main .cta, .final").forEach(function (el) { io.observe(el); });
  }
})();

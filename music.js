// Profiler on the web: the music files are played by the browser (<audio> elements, decoded on the browser's audio
// thread), not by the single-threaded engine, whose streamed Ogg stuttered on phones. scripts/audio/web_bed.gd drives
// this through JavaScriptBridge. Each element runs through its own gain (the game's fades) into a master gain (the
// game's Master bus volume and mute). Elements pause while the page is hidden and (re)start on the next tap if the
// browser blocked them. Loaded by every build's shell page from the site root (tools/publish_web.sh). Ported from
// Insomnia's web/shell.html.
window.__profMusic = (function () {
  let ctx = null, master = null;
  const tracks = [];
  const ok = !!document.createElement("audio").canPlayType('audio/ogg; codecs="vorbis"');
  function ensure() {
    if (ctx) return;
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    master = ctx.createGain();
    master.connect(ctx.destination);
  }
  function go(t) { if (t && t.want && t.el.paused && !document.hidden) t.el.play().catch(() => {}); }
  function wake() {
    if (ctx && ctx.state !== "running" && ctx.state !== "closed") ctx.resume().catch(() => {});
    for (const t of tracks) go(t);
  }
  ["touchend", "pointerup", "mousedown", "click", "keydown"].forEach((e) => document.addEventListener(e, wake, { capture: true, passive: true }));
  document.addEventListener("visibilitychange", () => {
    for (const t of tracks) { if (t && t.want) { if (document.hidden) t.el.pause(); else go(t); } }
    if (!document.hidden) wake();
  });
  return {
    ok: () => ok,
    create(url, loop) {
      ensure();
      const el = new Audio();
      el.preload = "auto";
      el.loop = !!loop;
      el.src = url;
      const g = ctx.createGain();
      g.gain.value = 0;
      ctx.createMediaElementSource(el).connect(g).connect(master);
      tracks.push({ el, g, want: false });
      return tracks.length - 1;
    },
    play(i, from) {
      const t = tracks[i];
      if (!t) return;
      try { t.el.currentTime = from || 0; } catch (e) { /* not loaded yet */ }
      t.want = true;
      wake();
      go(t);
    },
    stop(i) { const t = tracks[i]; if (t) { t.want = false; t.el.pause(); } },
    gain(i, v) { const t = tracks[i]; if (t) t.g.gain.value = v; },
    ended(i) { const t = tracks[i]; return t ? t.el.ended : true; },
    release(i) {
      const t = tracks[i];
      if (!t) return;
      t.want = false;
      t.el.pause();
      t.el.removeAttribute("src");
      t.el.load();
      t.g.disconnect();
      tracks[i] = null;
    },
    master(v) { ensure(); master.gain.value = v; },
  };
})();

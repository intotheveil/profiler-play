// Profiler on Android: install the web build as a home-screen app (fullscreen, landscape, offline) until the Google
// Play release. Loaded by every build's shell page from the site root, so one edit here reaches every build.
//
// LAUNCH DAY: set PLAY_URL to the Play Store listing and republish. The banner then sends Android players to Google Play
// instead of offering the web install.
const PLAY_URL = "";

(function () {
  const root = new URL("./", document.currentScript.src);   // pwa.js sits at the site root
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register(new URL("sw.js", root), { scope: root.pathname }).catch(() => {});
  }
  const android = /Android/i.test(navigator.userAgent);
  const installed = matchMedia("(display-mode: fullscreen), (display-mode: standalone)").matches;
  if (!android || installed) return;
  let dismissed = false;
  try { dismissed = localStorage.getItem("profiler.banner") === "closed"; } catch (e) {}
  if (dismissed) return;

  let prompt = null;
  addEventListener("beforeinstallprompt", (e) => { e.preventDefault(); prompt = e; });

  function show() {
    const bar = document.createElement("div");
    bar.setAttribute("role", "dialog");
    bar.style.cssText = "position:fixed;left:0;right:0;bottom:0;z-index:2147483647;display:flex;align-items:center;" +
      "gap:12px;padding:10px 14px;background:#1b1815ee;color:#d8cfc2;font:15px/1.3 system-ui,sans-serif;" +
      "border-top:1px solid #3a322b;box-sizing:border-box";
    const icon = document.createElement("img");
    icon.src = new URL("icon-192.png", root).href;
    icon.alt = "";
    icon.style.cssText = "width:40px;height:40px;border-radius:8px;flex:none";
    const text = document.createElement("div");
    text.style.cssText = "flex:1;min-width:0";
    const go = document.createElement("button");
    go.style.cssText = "flex:none;padding:9px 14px;border:0;border-radius:4px;background:#b5543c;color:#fff;font:600 15px system-ui,sans-serif";
    const close = document.createElement("button");
    close.textContent = "×";
    close.setAttribute("aria-label", "Close");
    close.style.cssText = "flex:none;background:none;border:0;color:#8d8478;font:22px system-ui,sans-serif;padding:4px 8px";
    if (PLAY_URL) {
      text.innerHTML = "<b>Profiler</b> is on Google Play.";
      go.textContent = "Get it";
      go.onclick = () => { location.href = PLAY_URL; };
    } else {
      text.innerHTML = "<b>Play Profiler as an app</b><br><span style='color:#8d8478'>Fullscreen, landscape, works offline.</span>";
      go.textContent = "Install";
      go.onclick = async () => {
        if (prompt) {
          prompt.prompt();
          const r = await prompt.userChoice.catch(() => null);
          if (r && r.outcome === "accepted") bar.remove();
          prompt = null;
        } else {
          text.innerHTML = "In your browser menu (<b>⋮</b>), choose <b>Add to Home screen</b> or <b>Install app</b>.";
          go.remove();
        }
      };
    }
    close.onclick = () => {
      bar.remove();
      try { localStorage.setItem("profiler.banner", "closed"); } catch (e) {}
    };
    bar.append(icon, text, go, close);
    document.body.appendChild(bar);
  }
  if (document.body) show(); else addEventListener("DOMContentLoaded", show);
})();

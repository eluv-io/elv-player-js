/*
 * Test page for HLS-JS with Fairplay
 *
 */

const $ = id => document.getElementById(id);
const fields = ["playlist", "license", "certUrl", "certB64", "token"];

fields.forEach(id => {
  try { $(id).value = localStorage.getItem(`fp-${id}`) || $(id).value; } catch(e) {}
  $(id).addEventListener("input", () => {
    try { localStorage.setItem(`fp-${id}`, $(id).value); } catch(e) {}
  });
});

const log = (...args) => {
  const line = args.map(a => (a instanceof Error ? `${a.name}: ${a.message}` : typeof a === "object" ? JSON.stringify(a) : a)).join(" ");
  $("log").textContent += `${new Date().toISOString().slice(11, 23)} ${line}\n`;
  $("log").scrollTop = $("log").scrollHeight;
  // eslint-disable-next-line no-console
  console.log(...args);
};
window.addEventListener("error", e => log("window error:", e.message));
window.addEventListener("unhandledrejection", e => log("unhandled rejection:", e.reason));

const ParseCert = text => Uint8Array.from(atob(text.trim()), c => c.charCodeAt(0));

const GetCert = async () => {
  const pasted = $("certB64").value.trim();
  if(pasted) { return ParseCert(pasted); }

  const certUrl = $("certUrl").value.trim();
  if(!certUrl) { throw Error("Provide a certificate URL or cert bytes"); }

  const response = await fetch(certUrl);
  if(!response.ok) { throw Error(`Certificate fetch failed: ${response.status}`); }
  return new Uint8Array(await response.arrayBuffer());
};

let hls;
const Stop = () => {
  if(hls) { hls.destroy(); hls = undefined; }
  const video = $("video");
  video.pause();
  video.removeAttribute("src");
  video.load();
};

const GetToken = playlist => $("token").value.trim() || new URL(playlist).searchParams.get("authorization") || "";

const PlayHLSJS = async ({playlist, license, cert, token}) => {
  const Hls = (await import("hls.js")).default;
  if(!Hls.isSupported()) { throw Error("hls.js not supported in this browser"); }

  // hls.js only accepts a certificate URL so we need to serve the bytes from a blob
  const certUrl = URL.createObjectURL(new Blob([cert]));

  hls = new Hls({
    debug: false,
    emeEnabled: true,
    drmSystems: {
      "com.apple.fps": {
        serverCertificateUrl: certUrl,
        licenseUrl: license
      }
    },
    licenseXhrSetup: (xhr, url) => {
      xhr.open("POST", url, true);
      if(token) { xhr.setRequestHeader("Authorization", `Bearer ${token}`); }
    }
  });

  Object.values(Hls.Events).forEach(event => {
    if(["hlsError", "hlsKeyLoading", "hlsKeyLoaded", "hlsManifestParsed", "hlsMediaAttached", "hlsLevelLoaded"].includes(event)) {
      hls.on(event, (_, data) => log(`hls.js ${event}:`, event === "hlsError" ? {type: data.type, details: data.details, fatal: data.fatal, err: data.error && data.error.message} : ""));
    }
  });

  const url = new URL(playlist);
  url.searchParams.delete("authorization");
  hls.loadSource(url.toString());
  hls.attachMedia($("video"));
};

$("play").addEventListener("click", async () => {
  try {
    Stop();
    $("log").textContent = "";

    const playlist = $("playlist").value.trim();
    const license = $("license").value.trim();
    if(!playlist || !license) { throw Error("Playlist and license URL are required"); }

    const cert = await GetCert();
    log(`Certificate: ${cert.length} bytes`);

    const params = {playlist, license, cert, token: GetToken(playlist)};

    const video = $("video");
    ["error", "loadedmetadata", "playing", "waiting", "stalled"].forEach(e =>
      video.addEventListener(e, () => log(`video ${e}`, e === "error" && video.error ? {code: video.error.code, message: video.error.message} : ""), {once: true})
    );

    await PlayHLSJS(params);

    video.play().catch(error => log("play() rejected:", error));
  } catch(error) {
    log("ERROR:", error);
  }
});

$("stop").addEventListener("click", Stop);

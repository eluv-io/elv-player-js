/*
 * Test page for HLS-JS with Fairplay
 *
 */

const $ = id => document.getElementById(id);
const fields = ["playlist", "license", "certUrl", "certB64"];

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

const ParseCert = text => Uint8Array.from(atob(text
  .replace(/-----BEGIN CERTIFICATE-----|-----END CERTIFICATE-----/g, "")
  .replace(/\s/g, "")), c => c.charCodeAt(0));
const Bytes = buffer => ArrayBuffer.isView(buffer) ?
  new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength) : new Uint8Array(buffer);
const Hex = buffer => Array.from(Bytes(buffer), b => b.toString(16).padStart(2, "0")).join("");

// Trace raw EME calls 
if(window.MediaKeySession && !MediaKeySession.prototype.__traced) {
  MediaKeySession.prototype.__traced = true;

  const generateRequest = MediaKeySession.prototype.generateRequest;
  MediaKeySession.prototype.generateRequest = function(type, data) {
    log(`EME session.generateRequest("${type}", ${data.byteLength} bytes)`);
    if(type === "sinf") {
      // Safari supplies JSON containing base64 protection boxes. Keep the exact
      // payload visible so a rejected stream can be compared with a working one.
      log("EME sinf init data:", new TextDecoder().decode(Bytes(data)));
    }
    const pending = setTimeout(() => log("EME generateRequest still PENDING after 5s"), 5000);
    const result = generateRequest.call(this, type, data);
    result.then(() => log("EME generateRequest resolved")).catch(error => log("EME generateRequest REJECTED:", error)).finally(() => clearTimeout(pending));
    this.addEventListener("keystatuseschange", () => {
      const statuses = [];
      this.keyStatuses.forEach((status, keyId) => statuses.push({keyId: Hex(keyId), status}));
      log("EME keystatuseschange:", statuses);
    });
    const update = this.update;
    this.update = function(response) {
      log(`EME session.update(${response.byteLength} bytes)`);
      const updateResult = update.call(this, response);
      updateResult.then(() => log("EME update resolved")).catch(error => log("EME update REJECTED:", error));
      return updateResult;
    };
    this.addEventListener("message", event => log(`EME session message: ${event.messageType}, ${event.message.byteLength} bytes`));
    return result;
  };

  const setServerCertificate = window.MediaKeys.prototype.setServerCertificate;
  window.MediaKeys.prototype.setServerCertificate = function(cert) {
    log(`EME setServerCertificate (${cert.byteLength} bytes)`);
    const result = setServerCertificate.call(this, cert);
    result.then(ok => log("EME setServerCertificate resolved:", ok)).catch(error => log("EME setServerCertificate REJECTED:", error));
    return result;
  };
}

const GetCert = async () => {
  const pasted = $("certB64").value.trim();
  if(pasted) { return ParseCert(pasted); }

  const certUrl = $("certUrl").value.trim();
  if(!certUrl) { throw Error("Provide a certificate URL or cert bytes"); }

  const response = await fetch(certUrl);
  if(!response.ok) { throw Error(`Certificate fetch failed: ${response.status}`); }
  const bytes = new Uint8Array(await response.arrayBuffer());
  // DER certificates begin with an ASN.1 SEQUENCE (0x30). Fabric's drm.cert
  // endpoint returns base64 text, which must be decoded before use with EME.
  if(bytes[0] === 0x30) { return bytes; }
  return ParseCert(new TextDecoder().decode(bytes));
};

let hls;
const Stop = () => {
  if(hls) { hls.destroy(); hls = undefined; }
  const video = $("video");
  video.pause();
  video.removeAttribute("src");
  video.load();
};

// The token is taken from the "authorization" parameter of the playlist URL
const GetToken = playlist => new URL(playlist).searchParams.get("authorization") || "";

const PlayHLSJS = async ({playlist, license, cert, token}) => {
  const Hls = (await import("hls.js")).default;
  if(!Hls.isSupported()) { throw Error("hls.js not supported in this browser"); }
  log("Playback environment:", {hlsVersion: Hls.version, userAgent: navigator.userAgent});

  // hls.js only accepts a certificate URL so we need to serve the bytes from a blob
  const certUrl = URL.createObjectURL(new Blob([cert]));

  hls = new Hls({
    debug: true,
    emeEnabled: true,
    drmSystems: {
      "com.apple.fps": {
        serverCertificateUrl: certUrl,
        licenseUrl: license,
        generateRequest: (initDataType, initData, context) => {
          const key = context.decryptdata;
          log("FairPlay request context:", {
            initDataType,
            method: key.method,
            keyFormat: key.keyFormat,
            keyId: key.keyId ? Hex(key.keyId) : null
          });
          return {initDataType, initData};
        }
      }
    },
    // Playlist / segment requests (the main player does the same)
    xhrSetup: xhr => {
      if(token) { xhr.setRequestHeader("Authorization", `Bearer ${token}`); }
    },
    // Eluvio FPS license request: POST JSON {spc: base64 SPC, assetId}, response is <ckc>base64 CKC</ckc>
    // SPC carries the 16 byte key ID from the "sinf" init data - which is the hls.js default)
    licenseXhrSetup: (xhr, url, keyContext, licenseChallenge) => {
      xhr.open("POST", url, true);
      xhr.setRequestHeader("Content-Type", "application/json");
      if(token) { xhr.setRequestHeader("Authorization", `Bearer ${token}`); }

      const skdUri = keyContext.decryptdata.uri;
      // The skd:// host is the Eluvio asset ID (drm_...); the server matches the key ID in the SPC against it
      const assetId = skdUri.replace(/^skd:\/\//, "").split(/[/?#]/)[0];
      log("License request:", {skdUri, assetId, spcBytes: licenseChallenge.length});

      let spc = "";
      licenseChallenge.forEach(b => spc += String.fromCharCode(b));

      return new TextEncoder().encode(JSON.stringify({spc: btoa(spc), assetId}));
    },
    licenseResponseCallback: xhr => {
      let text = new TextDecoder().decode(xhr.response).trim();
      if(text.startsWith("<ckc>") && text.endsWith("</ckc>")) { text = text.slice(5, -6); }
      return Uint8Array.from(atob(text), c => c.charCodeAt(0)).buffer;
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

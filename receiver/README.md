# Eluvio Cast Receiver

`index.html` is a Google Cast Web Receiver (CAF v3) for `@eluvio/elv-player-js`. It is needed for
casting DRM content: Google's default media receiver plays clear DASH only and has no way to take a
license server URL.

The player's cast sender (`lib/player/Cast.js`) loads the DASH playout URL and, for Widevine content,
adds the license server to the load request's `customData`. This receiver copies it into its
`PlaybackConfig` before the media loads. Clear content carries no `customData` and plays with the
framework defaults, so the same receiver serves both.

## Hosting

The receiver must be served over HTTPS from a host the TV can reach. Any static host works (GitHub
Pages, S3 + CloudFront, the fabric's own file serving). A self-signed certificate on a LAN server will
not work, as the Cast runtime will not trust it. For development, a tunnel with a real certificate
in front of `npm run serve` is the quickest route, for example
`cloudflared tunnel --url http://localhost:8089`, which gives
`https://<name>.trycloudflare.com/receiver/index.html` with no account. (ngrok's free tier puts an
interstitial page in front of browser requests, which breaks the receiver load.) Vite refuses requests
for hostnames it does not know, so add the tunnel's domain to `server.allowedHosts` in
`vite.config.mjs`, for example `allowedHosts: [".trycloudflare.com"]`, while testing. The dev server
only serves the test page, the receiver and their dependencies; everything else in the project tree
is refused.

The media itself must also be reachable from the TV over HTTPS with CORS headers: the receiver fetches
the manifest, segments and license directly, so `localhost` URLs on the sender's machine never work.

## Registration

1. In the [Cast developer console](https://cast.google.com/publish/) add a new application of type
   **Custom Receiver**, with the hosted URL of `index.html`. Note the application ID.
2. Until the application is published, it only launches on registered test devices. Add each
   device's serial number under **Cast Receiver Devices**. On an Android TV or Google TV the serial is
   under Settings → System → About, and Settings → Privacy → Usage & diagnostics must be on (some
   builds have the equivalent toggle in the Chromecast built-in system app instead). Power-cycle the
   device after registering; the console can take up to 15 minutes to apply.
3. Point the sender at it:

   ```javascript
   playerOptions: {
     castReceiverApplicationId: "<application ID>"
   }
   ```

   The sender page itself must be served over HTTPS for the Cast button to appear in Chrome, which
   the tunnel takes care of during development.

**Note.** In `test/index.js`, `castReceiverApplicationId` is commented out, but it is required for
Widevine. Without it the sender launches Google's default media receiver, which plays clear DASH
only and has no way to take a license server, so protected content fails on the TV. A custom
receiver (this `index.html`) reads the license URL from the load request and configures the TV's
player with it. It is identified by the application ID the Cast developer console assigns at
registration, and that ID is specific to the account that registered it: while unpublished it only
launches on that account's test devices, and its URL is whatever that account registered. So each
developer registers their own and sets the ID in `test/index.js`; for production, register one under
an official account at a fixed URL, publish it, and make it the default in
`lib/player/PlayerParameters.js`.

## Debugging

- After changing the Receiver Application URL in the console, the device keeps using the old URL
  until it refreshes its copy of the catalogue, which can take a while and several power cycles. A
  launch that is `USER_ALLOWED` and then fails with `SYSTEM_ERROR` while `curl` of the new URL
  returns 200 is this. A fixed receiver URL (named tunnel or static host) avoids it entirely.
- A launch that fails with `NOT_FOUND` means the device does not know the application: it is not
  published and the device is not a registered test device on the owning account.

- Add `?debug=1` to the receiver URL registered in the console to turn on the Cast debug overlay on
  the TV, which shows the load request, the license URL and any playback error.
- While the receiver is running, open `chrome://inspect` in Chrome, add the TV's IP with port 9222
  under **Configure**, and inspect the receiver page. Console entries are tagged `[elv-receiver]`.
- The default Cast error for a failed license request is `detailedErrorCode` 6xx (for example 621
  for a license server error). A CORS failure on the manifest or segments shows as a `MANIFEST`
  or `SEGMENT` network error instead.

## Test content

The Shaka Player demo assets used by `test/index.js` (`publicSource = "PUBLIC_WIDEVINE"`) work with
this receiver unchanged: the manifest is on Google Cloud Storage with open CORS, and the license server
is `https://proxy.uat.widevine.com/proxy`, which needs no token.

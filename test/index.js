import "./test.scss";

/* Build import
import "../dist/elv-player-js.css";
import EluvioPlayer, {EluvioPlayerParameters} from "../dist/elv-player-js.es.js";
*/

import {ElvClient} from "@eluvio/elv-client-js";
import {InitializeEluvioPlayer, EluvioPlayerParameters} from "../lib";



const Initialize = async () => {
  let network = "MAIN";
  let objectId, versionHash, authorizationToken, mediaCatalogId, mediaCollectionId;
  const ticketCode = "BkiWYk";

  // Clear
  //versionHash = "hq__CcdV4wnCNq9wv6jXpYeCQ2GE4FLQBFtVSSSt2XKfBJMrH89DFDGsfkpWWvBy16QBGGYeF5mLGo";
  //authorizationToken = "";

  // Flash
  // versionHash = "hq__2C97Ma85zRS1pwD1dLk5PEzvuujK7y65hzZbjA2wiVQSL5EjfmGePCRAGv2dPr9rNbokvQit9d"; // clear
  //versionHash = "hq__2YAGWTsaw6FDv9S6QPwQ1VHTDVgctwDKXkC5qD4pCgJjJAidifpZ3ccxcGp7XLeyzmHxEakfXq"; // widevine
  //authorizationToken = "acspjc27Y8gfK8Rm2Tbkm38sYE8ZZFwMumFmc5Kke7CdpkfyWCYZKC2dE82vmK4yVeHRtHiGc2EPB7wp2WoXePGCyK5bfvbvuH48YYegtvrYVCtiw5ULBgj5e47AbJUVSSruKc3zgsHZ3J2bgzaLRP1Xv3oQqkYxWxVVue4PUeDPNz5bPGygj6Kt68FR9X8r5WAqV2XxS45atYi7XR7SmfiMhcWb6m338znTp4UE7BtwhPgFexnZHtLQg39XJ6wKuU5bJEaGVZakyySD4PAL3ABgemMUR6LyfYrtciewxzae5vw";

  // Collection
  network = "DEMO";
  //mediaCatalogId = "iq__3LKLFvsujiwnMbiH9sGZVVWe4Ro2";
  //mediaCollectionId = "JN8ecVA5Jt5cK2PjHXz12A";
  // First item in collection
  ///versionHash = "hq__8f7LgwsG7qBtTNSPKkv3Ano4UPoNh4rzF3iPJ4dUbVv2bDBbVzk516q2E4Vg4bkHaEHuPxXFiD";
  //objectId = "iq__3ZiTAEQarHZL7P1qSQ5W3a3gSPKj";
  //versionHash = "hq__H2m1AYkgLsg3k7LBL2TVdBXxpinFDddmQ8DQi2QSTcYmfJHCvzE2yLdsbvtqE58Bmfz4rRZDDz"
  //authorizationToken = "acssjc3UoVUoTtuNJeT7ByfjEfJBjQLhuFPmBibHqEndNiwfjZF9aEEohQB7A9YwfPQB4sjXL3FxvxuzK8ooE6M9Qd7dy2bYC3mLEpn1AFCGD3E4J5wGeaZwsgASgqW22aPixx6K93cmdhCz4UyW1wXUrURrpk4PWwHFnj3kSGGPJ3UnznM7kYtbpN4qKDcoHZ8AhBBFaWo9v6CYUeN5jt35padYWaqiRGuFRtohvPEaeyQ1E92TuahyaKKtuGX63XQfcENXK9JDt9EbUHAHzJHEcmibdhfb3C5wc2QUPZKKhq4dMQU51VDdRyC1ECub3QLa5Bo3ASeQqjGAAtmmfV2d8iykGu5P9w3c61X5sHj9F9QwPDHy8dBFXrE6DfcHvw3RQgojgMkVL9P3tna36sarFu45SNaSfU5yHHtpZ9pY7p";

  // Ticket content
  //network = "DEMO";
  //versionHash = "hq__i8Sf43pUfsmmgd7iu5m4Mp27ct3eqUJ5rYCenUh6HxBW6du1Ets3fBVg1spWCNkpaMa94LrP2"
  //network = "MAIN";
  //objectId = "iq__3TrvvPrt9Xa2nHhaNsL5sjNSMCdn";

  // PlayReady
  // network = "DEMO_LOCAL";
  // versionHash = "hq__s5J7DRGyi4CMMS8Sqb7CfhbskZcyMDK2Cv1BbLbuENafE271gW2q1ddAp6koTVx8roDKJPhpo";

  network = "MAIN";
  objectId = "iq__3RQQAxm2sx6CtBv33DTwzqj8f3n7";
  authorizationToken = "ascsj_fNNobrNVZiFNLwEJ27fdn1sWia9JUYGgcKJkWqRXWMHi7SL9DgxUrAfAf2jJVwPWFtzX6o8AyZDCQuxz2sc3eJqgV8wvfRjpmUyBi5jmwXwQN2xRPEzAFhMUYmvLxGPmHaWDaDw8x62Nyhh7qGNtA7yf7f9Gh3uTdWvQakUxeSjQnyZkEMkUu2CkF6xyXNHpK1k1Cxw4zgAeJkjsrxaX22VEULUjnS2EGMRDUQTza2uPSv7tHENENxQBTj1oBD1ygK6q5uFFYx8iysabsTtqsTcYaXf5RbDBzMBCmeVsSJkLnoKQyQ4EsLAKdY7VY13Ey3yeHpkWY7bNLWk2KfFHkBoGY5baqotqWtP4rCm2uGXJ3oEoyXDoaxECxD8GboiikPJZ7RK3E9y8WeBi1VJ2X9eq6vXP3DLh4UGLNhPjqDG4wpRNbqgbMEwToAXXeuxS2YKv4XdqvXLSvscJmFia3NVtgVCSrZFDRpKEr1CgCQEK3CpB7Wu…akj8YmRz7Dgr2yaBnhPcXmUmziPeu2c2K2B6BzYCy4Xp3TNDBknAivPWdLQGjpeNxZxn31PirbTokCcDfVETG4XLTc4hKKB9vui2LF1MED9hqF6rm7ggyk5nBTzhQexbok7sTDW6zMnVQENCEEZLZWP9txG9k74uRyzw7wozpQy6aZzGquw9G8NPLx6MDKWrU1gcmjftNbqKgBDqQBuv1TQqtNBEnvL1htQTCUU9QDNkjyZSJPssR2D8fx4q6PAcnBMAmKHDoEJnDbVjdhQtifXWjkEqG7uSHzhzncragsSHvvNbSHkESdFswwrU9upRroFpowMDrhyMD72rXqPphyJk9mTiUcU1sqY8d8sLg6BdQa72UhfFp4hMZo4Sag.RVMyNTZLX1BDQVNMb1hEQlB4cGFUZXF5M29tQ3I2Wm5GR3RDMVV0NHZSckZHTnU1c2c3NzhkSmVxekVaeWVySll3ZGQyODlZbXVuRmdLSHlrODMza3l3NzNaZWlraWty";
  const audioTrackLabel = "Japanese (stereo)";

  window.player = await InitializeEluvioPlayer(
    document.getElementById("player-target"),
    {
      clientOptions: {
        network: EluvioPlayerParameters.networks[network],
        //promptTicket: true,
        tenantId: "iten4TXq2en3qtu3JREnE5tSLRf9zLod",
        ntpId: "QOTPLznozufnUVC",
        //ticketCode: "BkiWYk"
      },
      sourceOptions: {
        //protocols: ["dash"],
        //drms: ["clear"],
        playoutParameters: {
          objectId,
          versionHash,
          authorizationToken,
          audioTrackLabel,
          //offering: "default",
          //offerings: ["none", "some"]
        },
        contentInfo: {
          title: "My Big Title",
          subtitle: "My subtitle",
          description: "My big description",
          headers: ["pg-13"],
          image: "/public/display_image",
          //type: EluvioPlayerParameters.type.LIVE,
          //posterImage: "https://demov3.net955210.contentfabric.io/s/demov3/q/hq__8f7LgwsG7qBtTNSPKkv3Ano4UPoNh4rzF3iPJ4dUbVv2bDBbVzk516q2E4Vg4bkHaEHuPxXFiD/meta/public/display_image"
        }
      },
      playerOptions: {
        //posterUrl: "https://miro.medium.com/v2/resize:fit:1099/1*5PeT0-Dch_KhFwjYwUWiDA.png",
        //ui: EluvioPlayerParameters.ui.TV,
        muted: EluvioPlayerParameters.muted.ON,
        backgroundColor: "black",
        //controls: EluvioPlayerParameters.controls.ON,
        controls: EluvioPlayerParameters.controls.AUTO_HIDE,
        watermark: EluvioPlayerParameters.watermark.ON,
        autoplay: EluvioPlayerParameters.autoplay.OFF,
        title: EluvioPlayerParameters.title.FULLSCREEN_ONLY,
        keyboardControls: EluvioPlayerParameters.keyboardControls.ON,
        maxBitrate: 50000,
        debugLogging: true,
        //startTime: 60,
        startProgress: 0.75,
        verifyContent: EluvioPlayerParameters.verifyContent.ON,
        hlsjsOptions: {
          //maxBufferLength: 1,
          //maxBufferSize: 0.5 * 1000 * 1000
        }
      }
    }
  );
};


Initialize();

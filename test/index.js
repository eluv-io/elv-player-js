import "./test.scss";

/* Build import
import "../dist/elv-player-js.css";
import EluvioPlayer, {EluvioPlayerParameters} from "../dist/elv-player-js.es.js";
*/

import {ElvClient} from "@eluvio/elv-client-js";
import {InitializeEluvioPlayer, EluvioPlayerParameters} from "../lib";



const Initialize = async () => {
  const client = await ElvClient.FromConfigurationUrl({
    configUrl: "https://main.net955305.contentfabric.io/config"
  });

  const versionHash = await client.LatestVersionHash({versionHash: "hq__CcdV4wnCNq9wv6jXpYeCQ2GE4FLQBFtVSSSt2XKfBJMrH89DFDGsfkpWWvBy16QBGGYeF5mLGo"});
  const authorizationToken = "";
  //const versionHash = "hq__2YAGWTsaw6FDv9S6QPwQ1VHTDVgctwDKXkC5qD4pCgJjJAidifpZ3ccxcGp7XLeyzmHxEakfXq";
  //const authorizationToken = "acspjcNbtdyye6xKaWZNQ8cjwiUtSUw41PiVe13vtRJpXDMH1VC4df6stQAntXJpiWERGExKtRdrBwiBzULxTtPDEsFyUFP7iWCEkXyE5e8jFhsfdhKtAzB4eJmHPVWFgDCMYqPYHkiNB9jSVo6r8cwcAegb46yNPzozR3rPpXXbMY9LG2txJY7iAu8doNCsekSxjMoBjwZfQ2RjcPYm9tqPWCZ9P8ueFQMkx7dCJMcP9cqXJYZSdta76oQk9RaeyGpphGuzEHUbL139xeiPx33A8bmX84vpqpjDX9JKoqF34i";

  window.player = await InitializeEluvioPlayer(
    document.getElementById("player-target"),
    {
      clientOptions: {
        network: EluvioPlayerParameters.networks.MAIN,
      },
      sourceOptions: {
        //protocols: ["dash"],
        //drms: ["clear"],
        playoutParameters: {
          versionHash,
          authorizationToken
        }
      },
      playerOptions: {
        //posterUrl: "https://miro.medium.com/v2/resize:fit:1099/1*5PeT0-Dch_KhFwjYwUWiDA.png",
        ui: EluvioPlayerParameters.ui.WEB,
        muted: EluvioPlayerParameters.muted.ON,
        backgroundColor: "black",
        controls: EluvioPlayerParameters.controls.ON,
        watermark: EluvioPlayerParameters.watermark.OFF,
        autoplay: EluvioPlayerParameters.autoplay.OFF,
        maxBitrate: 50000,
        debugLogging: true,
        hlsjsOptions: {
          maxBufferLength: 1,
          maxBufferSize: 0.5 * 1000 * 1000
        }
      }
    }
  );
};


Initialize();

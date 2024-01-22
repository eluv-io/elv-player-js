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
  //const versionHash = "hq__2YAGWTsaw6FDv9S6QPwQ1VHTDVgctwDKXkC5qD4pCgJjJAidifpZ3ccxcGp7XLeyzmHxEakfXq";
  //const authorizationToken = "acspjcEFQEjRDhi91C3cduPUpZp7mgL1DhDo2eXPu8WCrya8jQ2TcXHtc36idmi8rW8u1GG2KXKRo7QEmmRorzUmPud79RobBqJPbjJefu2CvY4bKWvn6E3GF7uz1dJZV6eqnyeQa8WpT1r3pffoKcBtBzWkyCs5kJYuPjyWh7ULLFrdvAfaJbSHyGbbbYegET9GnG33upnJGjNKExF2yddJpEHa4jorQ9EcsHfRtJasz66XxhBS2stLAUju3sFAUkf6f1cLAnK8qn95vQdCSyxeL1ogmzjHzu8ZpnxiLGcLzZnP";

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
          //authorizationToken
        }
      },
      playerOptions: {
        //posterUrl: "https://miro.medium.com/v2/resize:fit:1099/1*5PeT0-Dch_KhFwjYwUWiDA.png",
        muted: EluvioPlayerParameters.muted.ON,
        backgroundColor: "black",
        controls: EluvioPlayerParameters.controls.ON,
        watermark: EluvioPlayerParameters.watermark.OFF,
        autoplay: EluvioPlayerParameters.autoplay.ON,
        //maxBitrate: 50000,
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

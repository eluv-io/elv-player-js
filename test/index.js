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

  let network = "MAIN";

  let versionHash, authorizationToken, mediaCatalogId, mediaCollectionId;


  // Clear
  /*
  versionHash = await client.LatestVersionHash({versionHash: "hq__CcdV4wnCNq9wv6jXpYeCQ2GE4FLQBFtVSSSt2XKfBJMrH89DFDGsfkpWWvBy16QBGGYeF5mLGo"});
  authorizationToken = "";

   */

  // Flash
  /*
  versionHash = "hq__2C97Ma85zRS1pwD1dLk5PEzvuujK7y65hzZbjA2wiVQSL5EjfmGePCRAGv2dPr9rNbokvQit9d";
  authorizationToken = "acspjc3iD2i4Cs6We2wJVfTq88tjHvbovyinfGy1ntKCKA4pTBnJuMdj9ciWxqR53e9HGhmFXo1mNBaKkrnoG1fU21T5Gnct8BAQR2fTvhGb7KcuBTbzADx96A6dTwBG81Sak8ycGZ91A4cRp4fnW82KnTd3cLY9mAXmnEMucxyM8Jng7mj4RCC3bsxWZaH6yJrrot3E61RZUFuauuKLHHGr6tM3ZEZWdpRF3FVqRpLL8WYdkfzCFJkXVtRne5PqyFLvwRDKzJRzjLVUTC56dirA2peH9mnrtoyCn2s54Kc7K34";

   */

  // Collection
  network = "DEMO";
  mediaCatalogId = "iq__3LKLFvsujiwnMbiH9sGZVVWe4Ro2";
  mediaCollectionId = "JN8ecVA5Jt5cK2PjHXz12A";




  window.player = await InitializeEluvioPlayer(
    document.getElementById("player-target"),
    {
      clientOptions: {
        network: EluvioPlayerParameters.networks[network],
      },
      sourceOptions: {
        //protocols: ["dash"],
        //drms: ["clear"],
        playoutParameters: {
          versionHash,
          authorizationToken
        },
        mediaCollectionOptions: {
          mediaCatalogObjectId: mediaCatalogId,
          collectionId: mediaCollectionId
        },
      },
      playerOptions: {
        //posterUrl: "https://miro.medium.com/v2/resize:fit:1099/1*5PeT0-Dch_KhFwjYwUWiDA.png",
        ui: EluvioPlayerParameters.ui.WEB,
        muted: EluvioPlayerParameters.muted.ON,
        backgroundColor: "black",
        controls: EluvioPlayerParameters.controls.AUTO_HIDE,
        watermark: EluvioPlayerParameters.watermark.ON,
        autoplay: EluvioPlayerParameters.autoplay.OFF,
        title: EluvioPlayerParameters.title.ON,
        keyboardControls: EluvioPlayerParameters.keyboardControls.OFF,
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

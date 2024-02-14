import "./test.scss";

/* Build import
import "../dist/elv-player-js.css";
import EluvioPlayer, {EluvioPlayerParameters} from "../dist/elv-player-js.es.js";
*/

import {ElvClient} from "@eluvio/elv-client-js";
import {InitializeEluvioPlayer, EluvioPlayerParameters} from "../lib";



const Initialize = async () => {
  /*
  const client = await ElvClient.FromConfigurationUrl({
    configUrl: "https://main.net955305.contentfabric.io/config"
  });

   */

  let network = "MAIN";

  let versionHash, authorizationToken, mediaCatalogId, mediaCollectionId;
  const ticketCode = "BkiWYk";


  // Clear

  versionHash = "hq__CcdV4wnCNq9wv6jXpYeCQ2GE4FLQBFtVSSSt2XKfBJMrH89DFDGsfkpWWvBy16QBGGYeF5mLGo";
  //authorizationToken = "";

  // Flash
  // versionHash = "hq__2C97Ma85zRS1pwD1dLk5PEzvuujK7y65hzZbjA2wiVQSL5EjfmGePCRAGv2dPr9rNbokvQit9d"; // clear
  //versionHash = "hq__2YAGWTsaw6FDv9S6QPwQ1VHTDVgctwDKXkC5qD4pCgJjJAidifpZ3ccxcGp7XLeyzmHxEakfXq"; // widevine
  //authorizationToken = "acspjc27Y8gfK8Rm2Tbkm38sYE8ZZFwMumFmc5Kke7CdpkfyWCYZKC2dE82vmK4yVeHRtHiGc2EPB7wp2WoXePGCyK5bfvbvuH48YYegtvrYVCtiw5ULBgj5e47AbJUVSSruKc3zgsHZ3J2bgzaLRP1Xv3oQqkYxWxVVue4PUeDPNz5bPGygj6Kt68FR9X8r5WAqV2XxS45atYi7XR7SmfiMhcWb6m338znTp4UE7BtwhPgFexnZHtLQg39XJ6wKuU5bJEaGVZakyySD4PAL3ABgemMUR6LyfYrtciewxzae5vw";


  // Collection
  network = "DEMO";
  mediaCatalogId = "iq__3LKLFvsujiwnMbiH9sGZVVWe4Ro2";
  mediaCollectionId = "JN8ecVA5Jt5cK2PjHXz12A";
  // First item in collection
  //versionHash = "hq__8f7LgwsG7qBtTNSPKkv3Ano4UPoNh4rzF3iPJ4dUbVv2bDBbVzk516q2E4Vg4bkHaEHuPxXFiD";

  // Ticket content
  //network = "DEMO";
  //versionHash = "hq__i8Sf43pUfsmmgd7iu5m4Mp27ct3eqUJ5rYCenUh6HxBW6du1Ets3fBVg1spWCNkpaMa94LrP2"


  await InitializeEluvioPlayer(
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
          versionHash,
          authorizationToken
        },
        mediaCollectionOptions: {
          mediaCatalogObjectId: mediaCatalogId,
          collectionId: mediaCollectionId
        },
        contentInfo: {
          //title: "My Big Title",
          description: "My big description",
          headers: ["pg-13"],
          image: "/public/display_image",
          //posterImage: "https://demov3.net955210.contentfabric.io/s/demov3/q/hq__8f7LgwsG7qBtTNSPKkv3Ano4UPoNh4rzF3iPJ4dUbVv2bDBbVzk516q2E4Vg4bkHaEHuPxXFiD/meta/public/display_image"
        }
      },
      playerOptions: {
        //posterUrl: "https://miro.medium.com/v2/resize:fit:1099/1*5PeT0-Dch_KhFwjYwUWiDA.png",
        //ui: EluvioPlayerParameters.ui.TV,
        muted: EluvioPlayerParameters.muted.ON,
        backgroundColor: "black",
        controls: EluvioPlayerParameters.controls.AUTO_HIDE,
        //controls: EluvioPlayerParameters.controls.ON,
        watermark: EluvioPlayerParameters.watermark.ON,
        autoplay: EluvioPlayerParameters.autoplay.OFF,
        title: EluvioPlayerParameters.title.ON,
        keyboardControls: EluvioPlayerParameters.keyboardControls.ON,
        //maxBitrate: 50000,
        debugLogging: true,
        hlsjsOptions: {
          //maxBufferLength: 1,
          //maxBufferSize: 0.5 * 1000 * 1000
        }
      }
    }
  );
};


Initialize();

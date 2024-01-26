//import "./static/stylesheets/player.scss";

import MergeWith from "lodash/mergeWith";

import EluvioPlayerParameters from "./PlayerParameters.js";
import {InitializeFairPlayStream} from "./FairPlay.js";

import {Utils} from "@eluvio/elv-client-js";
import PlayerControls from "./Controls.js";

const PlayerProfiles = {
  default: {
    label: "Default",
    hlsSettings: Utils.HLSJSSettings({profile: "default"}),
  },
  low_latency: {
    label: "Low Latency Live",
    hlsSettings: Utils.HLSJSSettings({profile: "ll"})
  },
  ultra_low_latency: {
    label: "Ultra Low Latency Live",
    hlsSettings: Utils.HLSJSSettings({profile: "ull"})
  },
  custom: {
    label: "Custom",
    hlsSettings: {}
  }
};

export class EluvioPlayer {
  constructor({target, video, parameters, SetErrorMessage}) {
    try {
      // If custom HLS parameters are specified, set profile to custom
      if(
        parameters.playerOptions.hlsjsOptions &&
        Object.keys(parameters.playerOptions.hlsjsOptions).length > 0
      ) {
        this.customHLSOptions = parameters.playerOptions.hlsjsOptions;
        parameters.playerOptions.playerProfile = EluvioPlayerParameters.playerProfile.CUSTOM;
      }
    } catch (error) {
      this.Log(error, true);
    }

    this.target = target;
    this.video = video;
    this.originalParameters = parameters;
    this.SetErrorMessage = SetErrorMessage;
    this.controls = new PlayerControls({player: this});
    this.__settingsListeners = [];

    this.Initialize(parameters);
  }

  async Client() {
    if(this.clientPromise) {
      await this.clientPromise;
    }

    // Always initialize new client if ticket is used
    if(!this.clientOptions.client) {
      this.clientPromise = new Promise(async resolve => {
        const {ElvClient} = await import("@eluvio/elv-client-js");
        this.clientOptions.client = await ElvClient.FromConfigurationUrl({
          configUrl: this.clientOptions.network
        });

        this.clientOptions.client.SetStaticToken({
          token:
            this.clientOptions.staticToken ||
            this.clientOptions.client.utils.B64(JSON.stringify({qspace_id: await this.clientOptions.client.ContentSpaceId()}))
        });

        resolve(this.clientOptions.client);
      });

      await this.clientPromise;
    }

    return this.clientOptions.client;
  }

  async RedeemCode(code) {
    if(!this.clientOptions.tenantId || !this.clientOptions.ntpId) {
      throw { displayMessage: "Tenant ID and NTP ID must be provided if ticket code is specified." };
    }

    code = code || this.clientOptions.ticketCode;
    let subject = this.clientOptions.ticketSubject;
    if(code.includes(":")) {
      subject = code.split(":")[0];
      code = code.split(":")[1];
    }

    await (await this.Client()).RedeemCode({
      tenantId: this.clientOptions.tenantId,
      ntpId: this.clientOptions.ntpId,
      code,
      email: subject
    });

    this.ticketInitialized = true;
    this.clientOptions.ticketCode = code;
    this.originalParameters.clientOptions.ticketCode = code;
  }

  async PlayoutOptions() {
    const client = await this.Client();

    if(this.collectionInfo) {
      const activeMedia = this.collectionInfo.content[this.collectionInfo.mediaIndex];
      this.sourceOptions.playoutParameters.versionHash = activeMedia.mediaHash;
    }

    let offeringURI, options = {};
    if(this.sourceOptions.playoutParameters.clipStart || this.sourceOptions.playoutParameters.clipEnd) {
      options.clip_start = parseFloat(this.sourceOptions.playoutParameters.clipStart || 0);

      if(this.sourceOptions.playoutParameters.clipEnd) {
        options.clip_end = parseFloat(this.sourceOptions.playoutParameters.clipEnd);
      }
    }

    options.ignore_trimming = this.sourceOptions.playoutParameters.ignoreTrimming;
    options.resolve = this.sourceOptions.playoutParameters.resolve;

    if(this.sourceOptions.playoutParameters.directLink) {
      const availableOfferings = await client.AvailableOfferings({
        objectId: this.sourceOptions.playoutParameters.objectId,
        versionHash: this.sourceOptions.playoutParameters.versionHash,
        writeToken: this.sourceOptions.playoutParameters.writeToken,
        linkPath: this.sourceOptions.playoutParameters.linkPath,
        directLink: true,
        resolveIncludeSource: true,
        authorizationToken: this.sourceOptions.playoutParameters.authorizationToken
      });

      const offeringId = Object.keys(availableOfferings || {})[0];

      if(!offeringId) { return; }

      offeringURI = availableOfferings[offeringId].uri;

      if(!this.sourceOptions.playoutOptions) {
        this.sourceOptions.playoutOptions = await client.PlayoutOptions({
          offeringURI,
          options
        });
      }
    } else {
      if(!this.sourceOptions.playoutOptions) {
        this.sourceOptions.playoutOptions = await client.PlayoutOptions({
          ...this.sourceOptions.playoutParameters,
          options
        });
      }
    }

    let availableDRMs = (await client.AvailableDRMs()).filter(drm => (this.sourceOptions.drms || []).includes(drm));
    let availableProtocols = this.sourceOptions.protocols;

    let protocol, drm;
    while(!(protocol && drm)) {
      protocol = availableProtocols.find(protocol => this.sourceOptions.playoutOptions[protocol]);
      drm = this.sourceOptions.drms.find(drm => availableDRMs.includes(drm) && this.sourceOptions.playoutOptions[protocol].playoutMethods[drm]);

      if(!drm) {
        availableProtocols = availableProtocols.filter(p => p !== protocol);

        if(availableProtocols.length === 0) {
          throw Error("No valid protocol / DRM combination available");
        }
      }
    }

    const { playoutUrl, drms } = this.sourceOptions.playoutOptions[protocol].playoutMethods[drm];

    return {
      protocol,
      drm,
      playoutUrl,
      drms,
      availableDRMs,
      offeringURI,
      sessionId: this.sourceOptions.playoutOptions.sessionId,
      multiviewOptions: {
        enabled: this.sourceOptions.playoutOptions.multiview,
        AvailableViews: this.sourceOptions.playoutOptions.AvailableViews,
        SwitchView: this.sourceOptions.playoutOptions.SwitchView
      }
    };
  }

  __CollectionPlay({mediaIndex, mediaId}) {
    if(mediaId) {
      mediaIndex = this.collectionInfo.content.find(media => media.id === mediaId);
    }

    this.collectionInfo.mediaIndex = mediaIndex;
    this.Initialize(
      this.originalParameters,
      !this.video ? null :
        {
          muted: this.video.muted,
          volume: this.video.volume,
          playing: !this.video.paused
        }
    );
  }

  async LoadCollection() {
    if(this.collectionInfo) { return; }

    let {mediaCatalogObjectId, mediaCatalogVersionHash, collectionId} = (this.sourceOptions?.mediaCollectionOptions || {});

    if(!collectionId) { return; }

    if(!mediaCatalogObjectId && !mediaCatalogVersionHash) {
      throw { displayMessage: "Invalid collection options: Media catalog not specified" };
    }

    const client = await this.Client();

    try {
      const authorizationToken = this.sourceOptions.playoutParameters.authorizationToken;

      mediaCatalogVersionHash = mediaCatalogVersionHash || await client.LatestVersionHash({objectId: mediaCatalogObjectId});
      const collections = (await client.ContentObjectMetadata({
        versionHash: mediaCatalogVersionHash,
        metadataSubtree: "public/asset_metadata/info/collections",
        authorizationToken
      })) || [];

      const collectionInfo = collections.find(collection => collection.id === collectionId);

      if(!collectionInfo) {
        throw { displayMessage: `No collection with ID ${collectionId} found for media catalog ${mediaCatalogObjectId || mediaCatalogVersionHash}` };
      }

      collectionInfo.content = collectionInfo.content
        .filter(content => content.media)
        .map(content => ({
          ...content,
          mediaHash: content.media?.["/"]?.split("/").find(segment => segment.startsWith("hq__"))
        }));

      this.collectionInfo = {
        ...collectionInfo,
        isPlaylist: true || collectionInfo.type === "playlist",
        mediaIndex: 0,
        mediaLength: collectionInfo.content.length
      };
    } catch (error) {
      this.Log("Failed to load collection:");
      throw error;
    }
  }

  async Initialize(parameters, restartParameters) {
    if(this.__destroyed) { return; }

    this.__Reset();

    this.initTime = Date.now();

    if(parameters) {
      this.originalParameters = MergeWith({}, parameters);

      this.clientOptions = parameters.clientOptions;
      this.sourceOptions = parameters.sourceOptions;
      this.playerOptions = parameters.playerOptions;

      // If ticket redemption required, ensure new client is used unless specified
      if(
        this.clientOptions.promptTicket &&
        !this.ticketInitialized &&
        !this.clientOptions.allowClientTicketRedemption
      ) {
        this.clientOptions.client = undefined;
      }
    }

    this.errors = 0;

    // Start client loading
    this.Client();

    /* TODO: Move ticket prompt to UI
    // Handle ticket authorization
    if(this.clientOptions.promptTicket && !this.ticketInitialized) {
      if(!this.clientOptions.tenantId || !this.clientOptions.ntpId) {
        throw { displayMessage: "Tenant ID and NTP ID must be provided if ticket code is needed." };
      }

      InitializeTicketPrompt(
        this.target,
        this.clientOptions.ticketCode,
        async code => {
          await this.RedeemCode(code);

          this.Initialize(parameters);
        }
      );

      return;
    }

     */

    try {
      // Load collection info, if present
      await this.LoadCollection();

      if(this.playerOptions.controls === EluvioPlayerParameters.controls.AUTO_HIDE) {
        //this.target.classList.add("eluvio-player-autohide");
      }

      if(this.playerOptions.className) {
        //this.target.classList.add(this.playerOptions.className);
      }

      /* TODO: Deal with title/description
      if(this.playerOptions.title !== false && this.playerOptions.controls !== EluvioPlayerParameters.controls.DEFAULT) {
        if(this.ActiveCollectionMedia()) {
          const {title, description} = this.ActiveCollectionMedia();

          this.controls.InitializeContentTitle({title, description});
        } else if(this.sourceOptions.contentOptions.title) {
          this.controls.InitializeContentTitle({
            title: this.sourceOptions.contentOptions.title,
            description: this.sourceOptions.contentOptions.description
          });
        }
      }

       */

      if(restartParameters) {
        this.video.addEventListener("loadedmetadata", async () => {
          this.video.volume = restartParameters.volume;
          this.video.muted = restartParameters.muted;

          if(restartParameters.currentTime) {
            this.video.currentTime = restartParameters.currentTime;
          }

          if(restartParameters.playing) {
            this.controls.Play();
          }
        });
      }

      // Detect live video
      this.video.addEventListener("durationchange", () => {
        if(this.video.duration && this.videoDuration > 0 && this.video.duration !== this.videoDuration) {
          this.isLive = true;
        }

        this.videoDuration = this.video.duration;
      });

      if(this.collectionInfo && this.collectionInfo.isPlaylist && this.collectionInfo.mediaIndex < this.collectionInfo.mediaLength - 1) {
        this.video.addEventListener("ended", () => this.controls && this.controls.CollectionPlayNext());
      }

      let { protocol, drm, playoutUrl, drms, multiviewOptions } = await this.PlayoutOptions();

      //multiviewOptions.target = this.target;

      playoutUrl = new URL(playoutUrl);
      const authorizationToken =
        this.sourceOptions.playoutParameters.authorizationToken ||
        playoutUrl.searchParams.get("authorization");

      if(this.__destroyed) { return; }

      if(protocol === "hls") {
        await this.InitializeHLS({playoutUrl, authorizationToken, drm, drms, multiviewOptions});
      } else {
        await this.InitializeDash({playoutUrl, authorizationToken, drm, drms, multiviewOptions});
      }

      if(this.playerOptions.collectVideoAnalytics) {
        import("./Analytics.js")
          .then(({InitializeMuxMonitoring}) => InitializeMuxMonitoring({
            appName: this.playerOptions.appName || "elv-player-js",
            elvPlayer: this,
            playoutUrl,
            authorizationToken,
            disableCookies: this.playerOptions.collectVideoAnalytics === EluvioPlayerParameters.collectVideoAnalytics.DISABLE_COOKIES
          }));
      }

      if(this.playerOptions.playerCallback) {
        this.playerOptions.playerCallback({
          player: this,
          videoElement: this.video,
          hlsPlayer: this.hlsPlayer,
          dashPlayer: this.dashPlayer,
          posterUrl: this.posterUrl
        });
      }

      if(this.playerOptions.autoplay === EluvioPlayerParameters.autoplay.ON) {
        this.controls.Play();

        setTimeout(async () => {
          if(this.playerOptions.muted === EluvioPlayerParameters.muted.OFF_IF_POSSIBLE && this.video.paused && !this.video.muted) {
            this.video.muted = true;
            this.controls.Play();
          }
        }, 250);
      }

      /* TODO: Account watermark
      if(this.controls && this.playerOptions.accountWatermark) {
        // Watermark
        this.controls.InitializeAccountWatermark(
          (await this.Client()).CurrentAccountAddress()
        );
      }

       */

      if(this.__destroyed) {
        // If Destroy was called during the initialization process, ensure that the player is properly destroyed
        this.__DestroyPlayer();
      }
    } catch (error) {
      // If playout failed due to a permission issue, check the content to see if there is a message to display
      let permissionErrorMessage;
      if(error && [401, 403].includes(error.status) || [401, 403].includes(error.code)) {
        try {
          const client = await this.Client();

          const targetHash =
            this.sourceOptions.playoutParameters.linkPath ?
              await client.LinkTarget({...this.sourceOptions.playoutParameters}) :
              this.sourceOptions.playoutParameters.versionHash ||
              await client.LatestVersionHash({objectId: this.sourceOptions.playoutParameters.objectId});

          permissionErrorMessage = await client.ContentObjectMetadata({
            versionHash: targetHash,
            metadataSubtree: "public/asset_metadata/permission_message",
            authorizationToken: this.sourceOptions.playoutParameters.authorizationToken
          });

          if(permissionErrorMessage) {
            error.permission_message = permissionErrorMessage;
            this.SetErrorMessage(permissionErrorMessage);

            if(typeof error === "object") {
              error.permission_message = permissionErrorMessage;
            } else {
              this.Log(permissionErrorMessage, true);
            }
          } else {
            this.SetErrorMessage(error.displayMessage || "Insufficient permissions");
          }
        // eslint-disable-next-line no-empty
        } catch (error) {
          this.SetErrorMessage(error.displayMessage || "Insufficient permissions");
        }
      } else if(error.status === 500) {
        this.HardReload(error, 10000);
      } else {
        this.SetErrorMessage(error.displayMessage || "Something went wrong");
      }

      if(this.playerOptions.errorCallback) {
        this.playerOptions.errorCallback(error, this);
      }
    }
  }

  async InitializeHLS({playoutUrl, authorizationToken, drm, multiviewOptions}) {
    this.HLS = (await import("hls.js")).default;

    if(["fairplay", "sample-aes"].includes(drm) || !this.HLS.isSupported()) {
      // HLS JS NOT SUPPORTED - Handle native player
      this.nativeHLS = true;

      if(drm === "fairplay") {
        InitializeFairPlayStream({playoutOptions: this.sourceOptions.playoutOptions, video: this.video});
      } else {
        this.video.src = playoutUrl.toString();
      }

      if(multiviewOptions.enabled) {
        const Switch = multiviewOptions.SwitchView;

        multiviewOptions.SwitchView = async (view) => {
          await Switch(view);
        };

        /* TODO: Init multiview
        if(this.controls) {
          this.controls.InitializeMultiViewControls(multiviewOptions);
        }

         */
      }

      /*
      const UpdateAudioTracks = () => {
        if(!this.video.audioTracks || this.video.audioTracks.length <= 1) { return; }

        this.controls.SetAudioTrackControls({
          GetAudioTracks: () => {
            const tracks = Array.from(this.video.audioTracks).map(track => ({
              index: track.id,
              label: track.label || track.language,
              active: track.enabled,
              activeLabel: `Audio: ${track.label || track.language}`
            }));

            return {label: "Audio Track", options: tracks};
          },
          SetAudioTrack: index => {
            Array.from(this.video.audioTracks).forEach(track =>
              track.enabled = index.toString() === track.id
            );
          }
        });
      };

       */
    } else {
      // HLS JS
      playoutUrl.searchParams.delete("authorization");

      const profileSettings = (PlayerProfiles[this.playerOptions.playerProfile] || {}).hlsSettings || {};
      const customProfileSettings = this.playerOptions.playerProfile === EluvioPlayerParameters.playerProfile.CUSTOM ? this.customHLSOptions : {};

      this.hlsOptions = {
        capLevelToPlayerSize: this.playerOptions.capLevelToPlayerSize,
        ...profileSettings,
        ...customProfileSettings
      };

      const hlsPlayer = new this.HLS({
        xhrSetup: xhr => {
          xhr.setRequestHeader("Authorization", `Bearer ${authorizationToken}`);

          if((this.playerOptions.hlsjsOptions || {}).xhrSetup) {
            this.playerOptions.hlsjsOptions.xhrSetup(xhr);
          }

          return xhr;
        },
        ...this.hlsOptions
      });

      // Limit playback to maximum bitrate, if specified
      if(this.playerOptions.maxBitrate) {
        hlsPlayer.on(this.HLS.Events.MANIFEST_PARSED, (_, {levels, firstLevel}) => {
          let levelsToRemove = levels
            .map((level, i) => level.bitrate > this.playerOptions.maxBitrate ? i : undefined)
            .filter(i => typeof i !== "undefined")
            // Note: Remove levels from highest to lowest index
            .reverse();

          if(levelsToRemove.length === levels.length) {
            this.Log(`Warning: Max bitrate '${this.playerOptions.maxBitrate}bps' is less than all available levels for this content.`);
            // Keep first level
            levelsToRemove = levelsToRemove.filter(i => i > 0);
          }

          this.Log("Removing the following levels due to maxBitrate setting:");
          this.Log(levelsToRemove.map(i => [levels[i].width, "x", levels[i].height, ` (${(levels[i].bitrate / 1000 / 1000).toFixed(1)}Mbps)`].join("")).join(", "));

          if(levelsToRemove.find(i => firstLevel === i)) {
            // Player will start on level that is being removed - switch to highest level that will not be removed
            hlsPlayer.startLevel = levels.map((_, i) => i).filter(i => !levelsToRemove.includes(i)).reverse()[0];
          }

          levelsToRemove.map(i => hlsPlayer.removeLevel(i));
        });
      }

      hlsPlayer.loadSource(playoutUrl.toString());
      hlsPlayer.attachMedia(this.video);

      if(this.controls && multiviewOptions.enabled) {
        const Switch = multiviewOptions.SwitchView;

        multiviewOptions.SwitchView = async (view) => {
          await Switch(view);
          hlsPlayer.nextLevel = hlsPlayer.currentLevel;
        };

        this.controls.InitializeMultiViewControls(multiviewOptions);
      }

      // Keep track of relevant settings updates so the UI can react
      [
        this.HLS.Events.SUBTITLE_TRACKS_UPDATED,
        this.HLS.Events.SUBTITLE_TRACK_SWITCH,
        this.HLS.Events.LEVEL_UPDATED,
        this.HLS.Events.LEVEL_SWITCHED,
        this.HLS.Events.AUDIO_TRACKS_UPDATED,
        this.HLS.Events.AUDIO_TRACK_SWITCHED,
        this.HLS.Events.MANIFEST_LOADED
      ]
        .map(event => hlsPlayer.on(event, () => this.__SettingsUpdate()));

      // TODO: Refactor this somewhere else
      this.SetPlayerProfile = async ({profile, customHLSOptions={}}) => {
        this.videoDuration = undefined;
        this.playerOptions.playerProfile = profile;
        this.customHLSOptions = customHLSOptions;

        const playing = !this.video.paused;
        const currentTime = this.video.currentTime;

        this.hlsPlayer.destroy();
        await this.InitializeHLS({
          playoutUrl,
          authorizationToken,
          drm,
          multiviewOptions
        });

        playing ? this.video.play() : this.video.pause();

        if(!this.isLive) {
          this.video.currentTime = currentTime;
        }
      };

      // Error handling
      hlsPlayer.on(this.HLS.Events.FRAG_LOADED, () =>
        this.errors = 0
      );

      hlsPlayer.on(this.HLS.Events.ERROR, async (event, error) => {
        this.errors += 1;

        this.Log(`Encountered ${error.details}`, true);
        this.Log(error, true);

        if(error.response && error.response.code === 403) {
          // Not allowed to access
          this.SetErrorMessage("Insufficient permissions");
        } else if(this.errors < 5) {
          if(error.fatal) {
            if(error.data && error.data.type === this.HLS.ErrorTypes.MEDIA_ERROR) {
              this.Log("Attempting to recover using hlsPlayer.recoverMediaError");
              hlsPlayer.recoverMediaError();
            } else {
              this.HardReload(error);
            }
          }
        } else {
          this.HardReload(error);
        }
      });

      this.hlsPlayer = hlsPlayer;
      this.player = hlsPlayer;
    }
  }

  async InitializeDash({playoutUrl, authorizationToken, drm, drms, multiviewOptions}) {
    this.Dash = (await import("dashjs")).default;
    const dashPlayer = this.Dash.MediaPlayer().create();

    const customDashOptions = this.playerOptions.dashjsOptions || {};
    dashPlayer.updateSettings({
      ...customDashOptions,
      "streaming": {
        "buffer": {
          "fastSwitchEnabled": true,
          "flushBufferAtTrackSwitch": true,
          ...((customDashOptions.streaming || {}).buffer || {})
        },
        "text": {
          "defaultEnabled": false,
          ...((customDashOptions.streaming || {}).text || {})
        },
        ...(customDashOptions.streaming || {})
      }
    });

    if(this.playerOptions.capLevelToPlayerSize) {
      dashPlayer.updateSettings({
        "streaming": {
          "abr": {
            "limitBitrateByPortal": true
          }
        }
      });
    }

    if(this.playerOptions.maxBitrate) {
      dashPlayer.updateSettings({
        "streaming": {
          "abr": {
            "maxBitrate": { "video": this.playerOptions.maxBitrate / 1000 }
          }
        }
      });
    }

    playoutUrl.searchParams.delete("authorization");
    dashPlayer.extend("RequestModifier", function () {
      return {
        modifyRequestHeader: xhr => {
          xhr.setRequestHeader("Authorization", `Bearer ${authorizationToken}`);

          return xhr;
        },
        modifyRequestURL: url => url
      };
    });

    // Widevine
    if(drm === EluvioPlayerParameters.drms.WIDEVINE) {
      const widevineUrl = drms.widevine.licenseServers[0];

      dashPlayer.setProtectionData({
        "com.widevine.alpha": {
          "serverURL": widevineUrl
        }
      });
    }

    dashPlayer.initialize(
      this.video,
      playoutUrl.toString(),
      this.playerOptions.autoplay === EluvioPlayerParameters.autoplay.ON
    );

    /*
    if(this.controls && multiviewOptions.enabled) {
      this.controls.InitializeMultiViewControls(multiviewOptions);
    }

     */

    // Keep track of relevant settings updates so the UI can react
    [
      this.Dash.MediaPlayer.events.TRACK_CHANGE_RENDERED,
      this.Dash.MediaPlayer.events.QUALITY_CHANGE_RENDERED,
      this.Dash.MediaPlayer.events.REPRESENTATION_SWITCH,
      this.Dash.MediaPlayer.events.TEXT_TRACKS_ADDED,
      this.Dash.MediaPlayer.events.TEXT_TRACK_ADDED,
      this.Dash.MediaPlayer.events.MANIFEST_LOADED,
      this.Dash.MediaPlayer.events.CAN_PLAY
    ]
      .map(event => dashPlayer.on(event, () => this.__SettingsUpdate()));

    this.player = dashPlayer;
    this.dashPlayer = dashPlayer;
  }

  __AddSettingsListener(listener) {
    this.__settingsListeners.push(listener);
  }

  __RemoveSettingsListener(listener) {
    this.__settingsListeners = this.__settingsListeners.filter(l => l !== listener);
  }

  __SettingsUpdate() {
    console.log("SETTINGS UPDATE", this.__settingsListeners.length);
    this.__settingsListeners.forEach(listener => {
      try {
        listener();
      } catch (error) {
        this.Log("Failed to call settings listener", true);
        this.Log(error, true);
      }
    });
  }

  __DestroyPlayer() {
    this.__destroyed = true;
    this.__Reset();
  }

  __Reset() {
    if(!this.player) { return; }

    this.Log("Destroying player");

    if(this.video) {
      this.video.pause();
    }

    if(this.hlsPlayer) {
      this.hlsPlayer.destroy();
    } else if(this.dashPlayer) {
      this.dashPlayer.destroy();
    }

    this.nativeHLS = false;
    this.hlsPlayer = undefined;
    this.dashPlayer = undefined;
    this.player = undefined;
  }

  async HardReload(error, delay=6000) {
    if(this.reloading) { return; }

    this.reloading = true;

    /*
    if(this.reloads.filter(reload => Date.now() - reload < 60 * 1000).length > 3) {
      this.Log("Too many reloads, destroying player", true);
      this.Destroy();
      return;
    }

    this.reloads.push(Date.now());

     */
    try {
      if(error && this.playerOptions.restartCallback) {
        try {
          const abort = await this.playerOptions.restartCallback(error);

          if(abort && typeof abort === "boolean") {
            this.Destroy();
            return;
          }
        } catch (error) {
          this.Log("Restart callback failed:");
          this.Log(error);
        }
      }

      this.SetErrorMessage(error.displayMessage || "Something went wrong, reloading player...");
      await new Promise(resolve => setTimeout(resolve, delay));

      if(this.__destroyed) { return; }

      this.Log("Reloading stream");

      // Recall config to get new nodes
      const client = await this.Client();
      if(client) {
        await client.ResetRegion();
      }

      this.restarted = true;
      this.SetErrorMessage(undefined);
      this.Initialize(
        this.originalParameters,
        !this.video ? null :
          {
            muted: this.video.muted,
            volume: this.video.volume,
            currentTime: this.video.currentTime,
            playing: !this.video.paused
          }
      );
    } finally {
      this.reloading = false;
    }
  }

  Log(message, error=false) {
    if(error) {
      // eslint-disable-next-line no-console
      console.error("ELUVIO PLAYER:", message);
    } else {
      if(this.playerOptions.debugLogging) {
        // eslint-disable-next-line no-console
        console.warn("ELUVIO PLAYER:", message);
      }
    }
  }
}

// TODO: deal with default/named export
EluvioPlayer.EluvioPlayerParameters = EluvioPlayerParameters;
EluvioPlayer.EluvioPlayer = EluvioPlayer;

export default EluvioPlayer;


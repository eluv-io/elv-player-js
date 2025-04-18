/* eslint-disable no-undef */

class Cast {
  constructor({player, onReady, onUpdate}) {
    this.player = player;
    this.ready = false;
    this.onReady = onReady;
    this.connected = false;
    this.playbackRate = 1;
    this.__listeners = [];
    this.onUpdate = onUpdate;

    if(window.__chromecastAvailable || (window.chrome && window.chrome.cast)) {
      // Chromecast already initialized
      this.Initialize();
    } else {
      // Initialize chromecast script
      window["__onGCastApiAvailable"] = isAvailable => {
        if(isAvailable) {
          window.__chromecastAvailable = true;
          this.Initialize();
        }
      };

      this.LoadScript();
    }
  }

  LoadScript() {
    const tag = document.createElement("script");
    tag.src = "https://www.gstatic.com/cv/js/sender/v1/cast_sender.js?loadCastFramework=1";
    document.querySelector("head").appendChild(tag);
  }

  Initialize() {
    cast.framework.CastContext.getInstance().setOptions({
      receiverApplicationId: chrome.cast.media.DEFAULT_MEDIA_RECEIVER_APP_ID,
      autoJoinPolicy: chrome.cast.AutoJoinPolicy.ORIGIN_SCOPED
    });

    this.remotePlayer = new cast.framework.RemotePlayer();
    this.remotePlayerController = new cast.framework.RemotePlayerController(this.remotePlayer);

    const SessionCallback = event => {
      switch (event.sessionState) {
        case cast.framework.SessionState.SESSION_STARTED:
          this.Start();
          break;
        case cast.framework.SessionState.SESSION_RESUMED:
          break;
        case cast.framework.SessionState.SESSION_ENDED:
          this.Disconnect(true);
          // Update locally as necessary
          break;
      }
    };

    const context = cast.framework.CastContext.getInstance();
    context.addEventListener(
      cast.framework.CastContextEventType.SESSION_STATE_CHANGED,
      SessionCallback
    );

    this.DisposeSessionListener = () => {
      context.removeEventListener(
        cast.framework.CastContextEventType.SESSION_STATE_CHANGED,
        SessionCallback
      );
    };

    this.ready = true;

    if(this.playoutUrl) {
      this.onReady && this.onReady();
    }
  }

  async SetMedia({playoutOptions, playoutParameters}) {
    // Get dash options
    let dashOptions = ((playoutOptions || {}).dash || {}).playoutMethods || {};
    let options = dashOptions.clear;

    if(!options) {
      // Dash options might be available under the default_dash offering
      try {
        playoutOptions = await (await this.player.__Client()).PlayoutOptions({
          ...playoutParameters,
          offering: "default_dash"
        });

        dashOptions = ((playoutOptions || {}).dash || {}).playoutMethods || {};
        options = dashOptions.clear || {};
      } catch(error) {
        this.player.Log("Unable to find dash playout options for chromecast");
      }
    }

    this.playoutUrl = (options || {}).playoutUrl;

    if(this.playoutUrl && this.ready) {
      this.onReady && this.onReady();
    }
  }

  async Start() {
    this.player && this.player.__SetCasting(true);

    try {
      const castSession = cast.framework.CastContext.getInstance().getCurrentSession();
      const mediaInfo = new chrome.cast.media.MediaInfo(this.playoutUrl, "application/dash+xml");

      mediaInfo.contentUrl = this.playoutUrl;
      mediaInfo.metadata = new chrome.cast.media.GenericMediaMetadata();
      mediaInfo.metadata.metadataType = chrome.cast.media.MetadataType.GENERIC;

      let { title, subtitle, image, headers } = (this.player.controls.GetContentInfo() || {});
      mediaInfo.metadata.title = title || "Eluvio";

      if(!subtitle && headers && headers.length > 0) {
        subtitle = headers.join("‎ ‎ ‎ ‎ ");
      }

      mediaInfo.metadata.subtitle = subtitle || "";

      if(image) {
        mediaInfo.metadata.images = [
          new chrome.cast.Image(image)
        ];
      }

      // Player state listener

      const UpdateCallback = this.Update.bind(this);
      this.remotePlayerController.addEventListener(
        cast.framework.RemotePlayerEventType.ANY_CHANGE,
        UpdateCallback
      );

      this.DisposePlayerStateListener = () => {
        this.remotePlayerController.removeEventListener(
          cast.framework.RemotePlayerEventType.ANY_CHANGE,
          UpdateCallback
        );
      };

      const request = new chrome.cast.media.LoadRequest(mediaInfo);
      await castSession.loadMedia(request);

      this.connected = true;
    } catch(error) {
      this.player.Log("Failed to start chromecast stream:", true);
      this.player.Log(error, true);
      this.Disconnect(true);
    }
  }

  /* Controls */
  IsPlaying() {
    return !this.remotePlayer.isPaused;
  }

  TogglePlay() {
    this.remotePlayerController.playOrPause();
  }

  GetCurrentTime() {
    return this.remotePlayer.currentTime;
  }

  GetDuration() {
    return this.remotePlayer.duration || this.player.video.duration;
  }

  Play() {
    this.remotePlayer.isPaused && this.remotePlayerController.playOrPause();
  }

  Pause() {
    !this.remotePlayer.isPaused && this.remotePlayerController.playOrPause();
  }

  Stop() {
    this.remotePlayerController.stop();
  }

  IsMuted() {
    return this.remotePlayer.isMuted;
  }

  Mute() {
    !this.remotePlayer.isMuted && this.remotePlayerController.muteOrUnmute();
  }

  Unmute() {
    this.remotePlayer.isMuted && this.remotePlayerController.muteOrUnmute();
  }

  ToggleMuted() {
    this.remotePlayerController.muteOrUnmute();
  }

  GetVolume() {
    return this.remotePlayer.volumeLevel;
  }

  SetVolume({fraction, relativeFraction}) {
    let volume;
    if(relativeFraction) {
      volume = Math.min(1, Math.max(0, this.remotePlayer.volume + relativeFraction));
    } else {
      volume = fraction;
    }

    if(this.player.video.volume > 0) {
      this.remotePlayer.isMuted && this.remotePlayerController.muteOrUnmute();
    }

    this.remotePlayer.volumeLevel = volume;
    this.remotePlayerController.setVolumeLevel();

    return volume;
  }

  Seek({fraction, time, relativeSeconds}) {
    const originalTime = this.remotePlayer.currentTime;

    if(relativeSeconds) {
      time = Math.max(
        0,
        Math.min(
          this.remotePlayer.duration,
          this.remotePlayer.currentTime + relativeSeconds
        )
      );
    } else if(typeof fraction !== "undefined") {
      time = this.remotePlayer.duration * fraction;
    }

    this.remotePlayer.currentTime = time;
    this.remotePlayerController.seek();

    return originalTime <= this.player.video.currentTime;
  }

  GetPlaybackRate() {
    return this.playbackRate || 1;
  }

  SetPlaybackRate({index, rate}) {
    if(typeof index !== "undefined") {
      const option = this.player.controls.GetPlaybackRates().options[index];

      if(option) {
        rate = option.rate || 1;
      }
    }

    const castSession = cast.framework.CastContext.getInstance().getCurrentSession();
    const media = castSession.getMediaSession();
    castSession.sendMessage("urn:x-cast:com.google.cast.media",{
      type: "SET_PLAYBACK_RATE",
      playbackRate: rate,
      mediaSessionId: media.mediaSessionId,
      requestId: 2
    })
      .then(() => this.playbackRate = rate);
  }

  Disconnect(force) {
    (this.connected || force) && cast.framework.CastContext.getInstance().endCurrentSession();
    this.connected = false;
    this.DisposePlayerStateListener && this.DisposePlayerStateListener();
    this.player && this.player.__SetCasting(false);
  }

  Destroy() {
    this.DisposePlayerStateListener && this.DisposePlayerStateListener();
    this.DisposeSessionListener && this.DisposeSessionListener();
  }

  // Register a listener that will be called any time the video settings have changed
  RegisterListener(listener) {
    this.__listeners.push(listener);

    return () => this.__listeners = this.__listeners.filter(l => l !== listener);
  }

  // Indicate to controls that the settings have updated
  Update(event) {
    try {
      this.onUpdate && this.onUpdate(event);
    } catch(error) {
      this.player.Log("Failed to call update listener", true);
      this.player.Log(error, true);
    }

    this.__listeners.forEach(listener => {
      try {
        listener(event);
      } catch (error) {
        this.player.Log("Failed to call cast listener", true);
        this.player.Log(error, true);
      }
    });
  }
}

export default Cast;

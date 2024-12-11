class Cast {
  constructor({onReady}) {
    this.ready = false;
    this.onReady = onReady;

    window["__onGCastApiAvailable"] = isAvailable =>
      isAvailable && this.Initialize();

    window.CastController = this;

    this.LoadScript();
  }

  LoadScript() {
    const tag = document.createElement("script");
    tag.src = "https://www.gstatic.com/cv/js/sender/v1/cast_sender.js?loadCastFramework=1";
    document.querySelector("head").appendChild(tag);
  }

  Initialize() {
    cast.framework.CastContext.getInstance().setOptions({
      receiverApplicationId: chrome.cast.media.DEFAULT_MEDIA_RECEIVER_APP_ID,
      //receiverApplicationId: "8E2BD113",
      autoJoinPolicy: chrome.cast.AutoJoinPolicy.ORIGIN_SCOPED
    });

    this.ready = true;

    this.remotePlayer = new cast.framework.RemotePlayer();
    this.remotePlayerController = new cast.framework.RemotePlayerController(this.remotePlayer);


    Object.keys(cast.framework.RemotePlayerEventType).forEach(key => {
      this.remotePlayerController.addEventListener(key, event => console.log("REMOTEP PLAYER", key, event));
    });


    this.remotePlayerController.addEventListener(
      cast.framework.RemotePlayerEventType.ANY_CHANGE,
      function(event) {
        console.log(event);
      }
    );

    const context = cast.framework.CastContext.getInstance();
    context.addEventListener(
      cast.framework.CastContextEventType.SESSION_STATE_CHANGED,
      event => {
        console.log("SESSION", event);
        switch (event.sessionState) {
          case cast.framework.SessionState.SESSION_STARTED:
            this.Start();
            break;
          case cast.framework.SessionState.SESSION_RESUMED:
            break;
          case cast.framework.SessionState.SESSION_ENDED:
            console.log("CastContext: CastSession disconnected");
            // Update locally as necessary
            break;
        }
      });

    this.onReady && this.onReady();
  }

  async SetMedia({playoutUrl}) {
    this.playoutUrl = playoutUrl;
  }

  async Start() {
    console.log("START MEDIA reload");
    try {
      const castSession = cast.framework.CastContext.getInstance().getCurrentSession();

      Object.keys(cast.framework.SessionEventType).forEach(key => {
        castSession.addEventListener(key, event => console.log("CAST SESSION", key, event));
      });
      // MP4
      //this.playoutUrl = "https://host-76-74-28-235.contentfabric.io/qlibs/ilib3Drbefo7VPfWvY1NVup4VZFzDJ68/q/iq__33aasCButcoYPfkkgaS92rzwNCtP/files/./agent-327-operation-barbershop.mp4%20MEZ%20%281270x540%29%2800-00-00-00%20-%2000-03-51-09%29.mp4?authorization=eyJxc3BhY2VfaWQiOiJpc3BjM0FOb1ZTek5BM1A2dDdhYkxSNjlobzVZUFBaVSIsImFkZHIiOiIweDU1NTdmODBkMDUzN2U3YmI0MzlkOTE5ODQxZTBlYjllZDQ0OWU2YmIiLCJxbGliX2lkIjoiaWxpYjNEcmJlZm83VlBmV3ZZMU5WdXA0VlpGekRKNjgifQ%3D%3D.RVMyNTZLX0dSbkhHZ1JqNUpxUW1XMXk2UkgxN1FtQlZvVmdMSzlFd2RaQVZDdXo0dXBHOUVLcUZDU3RYRlVwVDJTZXNpWlpySzdZQm9Malh3QWVYTUQ3dTdCa2pQNmNC";
      // HLS
      //this.playoutUrl = "https://demo.unified-streaming.com/k8s/features/stable/video/tears-of-steel/tears-of-steel.ism/.m3u8";

      console.log(this.playoutUrl);

      const mediaInfo = new chrome.cast.media.MediaInfo(this.playoutUrl, "application/x-mpegURL");
      //const mediaInfo = new chrome.cast.media.MediaInfo(this.playoutUrl, "video/mp4");

      mediaInfo.contentUrl = this.playoutUrl;
      //mediaInfo.hlsSegmentFormat = "FMP4";
      //mediaInfo.hlsVideoSegmentFormat = "FMP4";
      //mediaInfo.streamType = "BUFFERED";

      mediaInfo.metadata = new chrome.cast.media.GenericMediaMetadata();
      mediaInfo.metadata.metadataType = chrome.cast.media.MetadataType.GENERIC;
      mediaInfo.metadata.title = "Test Chromecast";
      /*

        mediaInfo.metadata.images = [
          {"url": MEDIA_SOURCE_ROOT + this.mediaContents[mediaIndex]["thumb"]}];


       */
      console.log(mediaInfo);

      const request = new chrome.cast.media.LoadRequest(mediaInfo);
      //console.log(request, await castSession.loadMedia(request));
      console.log("LOADING MEDIA");
      castSession.loadMedia(request).then(
        function () {
            console.log("Load succeed");
        },
        function (errorCode) {
            console.log("Error code: " + errorCode);
        },
    );
    } catch(error) {
      console.log(error);
    }
  }

  /* Controls */
  Play() {
    this.remotePlayer.isPaused && this.remotePlayerController.playOrPause();
  }

  Pause(){
    !this.remotePlayer.isPaused && this.remotePlayerController.playOrPause();
  }

  Stop() {
    this.remotePlayerController.stop();
  }

  SetVolume(fraction) {
    this.remotePlayer.volumeLevel = fraction;
    this.remotePlayerController.setVolumeLevel();
  }

  Mute() {
    !this.remotePlayer.isMuted && this.remotePlayerController.muteOrUnmute();
  }

  Unmute() {
    this.remotePlayer.isMuted && this.remotePlayerController.muteOrUnmute();
  }

  Seek(time) {
    this.remotePlayer.currentTime = time;
    this.remotePlayerController.seek();
  }
}

export default Cast;

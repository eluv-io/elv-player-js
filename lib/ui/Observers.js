// Observe player size for reactive UI
import ResizeObserver from "resize-observer-polyfill";
import EluvioPlayerParameters from "../player/PlayerParameters.js";

export const RegisterModal = ({element, Hide}) => {
  if(!element) { return; }

  const onClickOutside = event => {
    if(!element.contains(event.target)) {
      Hide();
    }
  };

  document.body.addEventListener("click", onClickOutside);

  const onEscape = event => {
    if(event && (event.key || "").toLowerCase() === "escape") {
      Hide();
    }
  };

  document.body.addEventListener("keydown", onEscape);

  return () => {
    document.body.removeEventListener("click", onClickOutside);
    document.body.removeEventListener("keydown", onEscape);
  };
};

export const ObserveVideo = ({target, video, setVideoState}) => {
  const UpdateVideoState = function () {
    const buffer = video.buffered;
    let end = 0;
    for(let i = 0; i < buffer.length; i++) {
      if(buffer.start(i) > video.currentTime) { continue; }

      if(buffer.end(i) > end) {
        end = buffer.end(i);
      }
    }

    setVideoState({
      playing: !video.paused,
      duration: video.duration,
      volume: video.volume,
      muted: video.muted,
      rate: video.playbackRate,
      fullscreen: !!(document.fullscreenElement || document.mozFullScreenElement || document.webkitFullscreenElement || document.msFullscreenElement)
    });
  };

  const events = [
    "play",
    "pause",
    "volumechange",
    "seeked",
    "durationchange",
    "ratechange"
  ];

  events.map(event => video.addEventListener(event, UpdateVideoState));
  target.addEventListener("fullscreenchange", UpdateVideoState);

  return () => {
    events.map(event => video.removeEventListener(event, UpdateVideoState));
    target.removeEventListener("fullscreenchange", UpdateVideoState);
  };
};

export const ObserveVideoBuffer = ({video, setBufferFraction}) => {
  const UpdateBufferState = () => {
    const buffer = video.buffered;
    let end = 0;
    for(let i = 0; i < buffer.length; i++) {
      if(buffer.start(i) > video.currentTime) { continue; }

      if(buffer.end(i) > end) {
        end = buffer.end(i);
      }
    }

    setBufferFraction(1 - (video.duration - end) / video.duration);
  };

  video.addEventListener("progress", UpdateBufferState);

  return () => video.removeEventListener("progress", UpdateBufferState);
};

export const ObserveVideoTime = ({video, rate=10, setCurrentTime}) => {
  // Current time doesn't update quickly enough from events for smooth movement - use interval instead
  const currentTimeInterval = setInterval(() => {
    setCurrentTime(video.currentTime);
  }, 1000 / rate);

  return () => {
    clearInterval(currentTimeInterval);
  };
};

export const ObserveResize = ({target, setSize, setOrientation, setDimensions}) => {
  let dimensionsUpdateTimeout;
  const observer = new ResizeObserver(entries => {
    clearTimeout(dimensionsUpdateTimeout);

    const dimensions = entries[0].contentRect;

    let size = "sm";
    let orientation = "landscape";
    // Use actual player size instead of media queries
    if(dimensions.width > 1400) {
      size = "xl";
    } else if(dimensions.width > 750) {
      size = "lg";
    } else if(dimensions.width > 500) {
      size = "md";
    }

    if(dimensions.width < dimensions.height) {
      orientation = "portrait";
    }

    setSize(size);
    setOrientation(orientation);

    dimensionsUpdateTimeout = setTimeout(() => {
      setDimensions({width: dimensions.width, height: dimensions.height});
    }, 500);
  });

  observer.observe(target);

  return () => observer.disconnect();
};

// For 'when visible' options (autoplay, muted), handle when the video moves in and out of user visibility
export const ObserveVisibility = ({player}) => {
  const video = player.video;
  const autoplay = player.playerOptions.autoplay === EluvioPlayerParameters.autoplay.WHEN_VISIBLE;
  const automute = player.playerOptions.muted === EluvioPlayerParameters.muted.WHEN_NOT_VISIBLE;

  if(!autoplay && !automute) { return; }

  let lastPlayPauseAction, lastMuteAction;
  const Callback = async ([bodyElement]) => {
    // Play / pause when entering / leaving viewport
    if(autoplay) {
      if(lastPlayPauseAction !== "play" && bodyElement.isIntersecting && video.paused) {
        // TODO - Change to wrapped actions
        video.play();
        lastPlayPauseAction = "play";
      } else if(lastPlayPauseAction !== "pause" && !bodyElement.isIntersecting && !video.paused) {
        video.pause();
        lastPlayPauseAction = "pause";
      }
    }

    // Mute / unmute when entering / leaving viewport
    if(automute) {
      if(lastMuteAction !== "unmute" && bodyElement.isIntersecting && video.muted) {
        video.muted = false;
        lastMuteAction = "unmute";
      } else if(lastMuteAction !== "mute" && !bodyElement.isIntersecting && !video.muted) {
        video.muted = true;
        lastMuteAction = "mute";
      }
    }
  };

  const intersectionObserver = new window.IntersectionObserver(Callback, { threshold: 0.1 }).observe(video);

  return () => intersectionObserver.disconnect();
};

export const ObserveInteraction = ({player, inactivityPeriod=3000, onSleep, onWake}) => {
  let autohideTimeout;
  const Wake = () => {
    clearTimeout(autohideTimeout);
    onWake && onWake();

    autohideTimeout = setTimeout(() => {
      onSleep && onSleep();
    }, inactivityPeriod);
  };

  const videoEvents = [
    "play",
    "pause",
    "volumechange",
    "seeking"
  ];

  videoEvents.forEach(event => player.video.addEventListener(event, Wake));

  const targetEvents = [
    "mousemove",
    "touchmove",
    "blur"
  ];

  targetEvents.forEach(event => player.target.addEventListener(event, Wake));

  return () => {
    videoEvents.map(event => player.video.removeEventListener(event, Wake));
    targetEvents.map(event => player.target.removeEventListener(event, Wake));
  };
};

export const ObserveKeydown = ({player}) => {
  if(player.playerOptions.keyboardControls === EluvioPlayerParameters.keyboardControls.OFF) {
    return;
  }

  const disableArrowControls = player.playerOptions.keyboardControls === EluvioPlayerParameters.keyboardControls.ARROW_KEYS_DISABLED;

  const onKeydown = event => {
    if(
      !(player.target === event.target || player.target.contains(event.target)) ||
      ["button", "input"].includes(document.activeElement && document.activeElement.tagName.toLowerCase())
    ) {
      return;
    }

    switch (event.key) {
      case " ":
      case "k":
        player.controls.TogglePlay();
        break;
      case "f":
        player.controls.ToggleFullscreen();
        break;
      case "m":
        player.controls.ToggleMuted();
        break;
      case "ArrowDown":
        if(!disableArrowControls) {
          player.controls.SetVolume({relativeFraction: -0.1});
        }
        break;
      case "ArrowUp":
        if(!disableArrowControls) {
          player.controls.SetVolume({relativeFraction: 0.1});
        }
        break;
      case ",":
        if(player.video.paused) {
          player.controls.Seek({
            relativeSeconds: -1 / 60
          });
        }
        break;
      case ".":
        if(player.video.paused) {
          player.controls.Seek({
            relativeSeconds: 1 / 60
          });
        }
        break;
      case "ArrowLeft":
        if(!disableArrowControls) {
          player.controls.Seek({relativeSeconds: -5});
        }
        break;
      case "ArrowRight":
        if(!disableArrowControls) {
          player.controls.Seek({relativeSeconds: 5});
        }
        break;
      case "j":
        player.controls.Seek({relativeSeconds: -10});
        break;
      case "l":
        player.controls.Seek({relativeSeconds: 10});
        break;
      case "<":
      case ">":
        const playbackRates = player.controls.GetPlaybackRates();

        if(!playbackRates.active) {
          player.controls.SetPlaybackRate({rate: 1});
        } else {
          player.controls.SetPlaybackRate({
            index: playbackRates.active.index + (event.key === "<" ? -1 : 1)
          });
        }
        break;
      case "c":
        player.controls.ToggleTextTrack();
        break;
      case "P":
        player.controls.CollectionPlayPrevious();
        break;
      case "N":
        player.controls.CollectionPlayNext();
        break;
      case "Home":
        player.controls.Seek({fraction: 0});
        break;
      case "End":
        player.controls.Seek({fraction: 1});
        break;
      case "0":
      case "1":
      case "2":
      case "3":
      case "4":
      case "5":
      case "6":
      case "7":
      case "8":
      case "9":
        player.controls.Seek({fraction: parseFloat(event.key) * 0.1});
        break;
    }
  };

  document.addEventListener("keydown", onKeydown);

  return () => document.removeEventListener("keydown", onKeydown);
};

export const ObserveMediaSession = ({player}) => {
  if("mediaSession" in navigator) {
    const mediaSessionEvents = [
      "play",
      "pause",
      "stop",
      "seekbackward",
      "seekforward",
      "seekto",
      "previoustrack",
      "nexttrack"
    ];

    // Media button handling
    mediaSessionEvents.forEach(event => {
      navigator.mediaSession.setActionHandler(event, args => {
        switch (event) {
          case "play":
            player.controls.Play();
            break;
          case "pause":
            player.controls.Pause();
            break;
          case "stop":
            player.controls.Stop();
            break;
          case "seekbackward":
            player.controls.Seek({relativeSeconds: (args && args.seekOffset) || -10});
            break;
          case "seekforward":
            player.controls.Seek({relativeSeconds: (args && args.seekOffset) || 10});
            break;
          case "seekto":
            args && typeof args.seekTime !== "undefined" && player.controls.Seek({time: args.seekTime});
            break;
          case "previoustrack":
            player.controls.CollectionPlayPrevious();
            break;
          case "nexttrack":
            player.controls.CollectionPlayNext();
            break;
        }
      });
    });


    // Video playback information
    let positionInterval = setInterval(() => {
      navigator.mediaSession.playbackState = player.video.paused ? "paused" : "playing";
      navigator.mediaSession.setPositionState({
        duration: player.video.duration || 0,
        playbackRate: player.video.playbackRate,
        position: player.video.currentTime
      });
    }, 1000);

    // Video metadata
    const UpdateMetadata = () => {
      const {title} = player.controls.GetContentTitle() || {};

      if(!navigator.mediaSession.metadata || navigator.mediaSession.metadata.title !== title) {
        navigator.mediaSession.metadata = new MediaMetadata({title});
      }
    };

    player.__AddSettingsListener(UpdateMetadata);


    return () => {
      player.__RemoveSettingsListener();
      clearInterval(positionInterval);

      navigator.mediaSession.metadata = null;
      mediaSessionEvents.forEach(event => {
        navigator.mediaSession.setActionHandler(event, null);
      });
    };
  }
};


// Observe player size for reactive UI
import ResizeObserver from "resize-observer-polyfill";
import EluvioPlayerParameters, { ElvPlayerControlIds } from "../player/PlayerParameters.js";
import { ACTIONS, SeekSliderKeyDown } from "./Common.js";
import PlayerControls from "../player/Controls";

export const RegisterModal = ({element, Hide}) => {
  if(!element) { return; }

  const onEscape = event => {
    if(event && (event.key || "").toLowerCase() === "escape") {
      Hide();
    }
  };

  /*
  const onFocusOut = () => {
    // Without timeout, document.activeElement is always body
    setTimeout(() => {
      if(!element.contains(document.activeElement)) {
        setTimeout(() => {
          if(!element.contains(document.activeElement)) {
            Hide();
          }
        }, 250);
      }
    });
  };

   */

  const onClickOut = event => {
    if(!element.contains(event.target)) {
      Hide();
    }
  };

  // Wrap handlers in timeout so that the click that spawned the modal does not cause it to close
  let registerTimeout = setTimeout(() => {
    document.body.addEventListener("keydown", onEscape);
    document.body.addEventListener("click", onClickOut, true);
    //element.addEventListener("focusout", onFocusOut);
  }, 0);

  return () => {
    clearTimeout(registerTimeout);
    document.body.removeEventListener("keydown", onEscape);
    document.body.removeEventListener("click", onClickOut, true);
    //element.removeEventListener("focusout", onFocusOut);
  };
};

export const ObserveVideo = ({player, setVideoState}) => {
  const UpdateVideoState = function () {
    if(!player || !player.controls) { return; }

    const buffer = player.video.buffered;
    let end = 0;
    for(let i = 0; i < buffer.length; i++) {
      if(buffer.start(i) > player.controls.GetCurrentTime()) { continue; }

      if(buffer.end(i) > end) {
        end = buffer.end(i);
      }
    }

    setVideoState({
      playing: player.controls.IsPlaying(),
      duration: player.controls.GetDuration(),
      volume: player.controls.GetVolume(),
      muted: player.controls.IsMuted(),
      rate: player.controls.GetPlaybackRate(),
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

  events.map(event => player.video.addEventListener(event, UpdateVideoState));
  player.target.addEventListener("fullscreenchange", UpdateVideoState);

  const castListenerDisposer = player.castHandler && player.castHandler.RegisterListener(UpdateVideoState);

  return () => {
    events.map(event => player.video.removeEventListener(event, UpdateVideoState));
    player.target.removeEventListener("fullscreenchange", UpdateVideoState);
    castListenerDisposer && castListenerDisposer();
  };
};

export const ObserveVideoBuffer = ({video, setBufferFraction}) => {
  const UpdateBufferState = () => {
    if(!isFinite(video.duration)) {
      return 1;
    }

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

export const ObserveVideoTime = ({player, rate = 10, setCurrentTime}) => {
  // Current time doesn't update quickly enough from events for smooth movement - use interval instead
  const currentTimeInterval = setInterval(() => {
    if(!player.controls) { return; }

    setCurrentTime(player.controls.GetCurrentTime());
  }, 1000 / rate);

  return () => {
    clearInterval(currentTimeInterval);
  };
};

export const ObserveResize = ({target, setSize, setOrientation, setDimensions}) => {
  let dimensionsUpdateTimeout;

  const ResizeUpdate = () => {
    clearTimeout(dimensionsUpdateTimeout);

    const dimensions = target.getBoundingClientRect();

    let size = "sm";
    let orientation = "landscape";
    // Use actual player size instead of media queries
    if(dimensions.width > 1400 && dimensions.height > 600) {
      size = "xl";
    } else if(dimensions.width > 1000 && dimensions.height > 400) {
      size = "lg";
    } else if(dimensions.width > 650 && dimensions.height > 300) {
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
  };

  ResizeUpdate();

  const observer = new ResizeObserver(ResizeUpdate);
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
        player.controls.Play();
        lastPlayPauseAction = "play";
      } else if(lastPlayPauseAction !== "pause" && !bodyElement.isIntersecting && !video.paused) {
        player.controls.Pause();
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

  return () => intersectionObserver && intersectionObserver.disconnect();
};

export const ObserveInteraction = ({player, inactivityPeriod=3000, onSleep, onWake}) => {
  let autohideTimeout;
  const Wake = event => {
    clearTimeout(autohideTimeout);
    onWake && onWake();

    autohideTimeout = setTimeout(() => {
      onSleep && onSleep();
    }, event.type === "mouseout" ? 500 : inactivityPeriod);
  };

  const videoEvents = [
    "play",
    "pause",
    "volumechange",
    "seeking"
  ];

  videoEvents.forEach(event => player.video.addEventListener(event, Wake));

  const targetEvents = [
    "click",
    "dblclick",
    "keydown",
    "mousemove",
    "touchmove",
    "blur",
    "mouseout",
    "fullscreenchange"
  ];

  targetEvents.forEach(event => player.target.addEventListener(event, Wake));

  return () => {
    videoEvents.map(event => player.video.removeEventListener(event, Wake));
    targetEvents.map(event => player.target.removeEventListener(event, Wake));
  };
};

const DefaultKeydownHandler = ({player, event, setRecentUserAction, SeekHandler}) => {
  let result;
  switch (event.key) {
    case " ":
    case "k":
      result = player.controls.TogglePlay();
      setRecentUserAction({action: result ? ACTIONS.PLAY : ACTIONS.PAUSE});
      return true;
    case "f":
      player.controls.ToggleFullscreen();
      return true;
    case "m":
      result = player.controls.ToggleMuted();
      setRecentUserAction({action: result ? ACTIONS.MUTE : ACTIONS.UNMUTE});
      return true;
    case "ArrowDown":
      result = player.controls.SetVolume({relativeFraction: -0.1});
      setRecentUserAction({
        action: result === 0 ? ACTIONS.MUTE : ACTIONS.VOLUME_DOWN,
        text: (result * 100).toFixed(0) + "%"
      });
      return true;
    case "ArrowUp":
      result = player.controls.SetVolume({relativeFraction: 0.1});
      setRecentUserAction({
        action: ACTIONS.VOLUME_UP,
        text: (result * 100).toFixed(0) + "%"
      });
      return true;
    case ",":
      if(player.video.paused) {
        player.controls.Seek({
          relativeSeconds: -1 / 60
        });
        setRecentUserAction({action: ACTIONS.SEEK_BACK});
      }
      return true;
    case ".":
      if(player.video.paused) {
        player.controls.Seek({
          relativeSeconds: 1 / 60
        });
        setRecentUserAction({action: ACTIONS.SEEK_FORWARD});
      }
      return true;
    case "ArrowLeft":
    case "ArrowRight":
      SeekHandler(event);
      return true;
    case "j":
      player.controls.Seek({relativeSeconds: -10});
      setRecentUserAction({action: ACTIONS.SEEK_BACK, text: "10 seconds"});
      return true;
    case "l":
      player.controls.Seek({relativeSeconds: 10});
      setRecentUserAction({action: ACTIONS.SEEK_FORWARD, text: "10 seconds"});
      return true;
    case "<":
    case ">":
      // eslint-disable-next-line no-case-declarations
      const playbackRates = player.controls.GetPlaybackRates();

      if(!playbackRates.active) {
        result = player.controls.SetPlaybackRate({rate: 1});
      } else {
        result = player.controls.SetPlaybackRate({
          index: playbackRates.active.index + (event.key === "<" ? -1 : 1)
        });
      }

      if(result) {
        setRecentUserAction({
          action: result.increase ? ACTIONS.PLAYBACK_RATE_UP : ACTIONS.PLAYBACK_RATE_DOWN,
          text: `${result.rate.toFixed(2)}x`
        });
      }
      return true;
    case "c":
      result = player.controls.ToggleTextTrack();
      setRecentUserAction({action: result ? ACTIONS.SUBTITLES_ON : ACTIONS.SUBTITLES_OFF});
      return true;
    case "P":
      player.controls.CollectionPlayPrevious();
      setRecentUserAction({action: ACTIONS.PLAY_PREVIOUS});
      return true;
    case "N":
      player.controls.CollectionPlayNext();
      setRecentUserAction({action: ACTIONS.PLAY_NEXT});
      return true;
    case "Home":
      player.controls.Seek({fraction: 0});
      setRecentUserAction({action: ACTIONS.SEEK_BACK});
      return true;
    case "End":
      player.controls.Seek({fraction: 1});
      setRecentUserAction({action: ACTIONS.SEEK_FORWARD});
      return true;
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
      result = player.controls.Seek({fraction: parseFloat(event.key) * 0.1});
      setRecentUserAction({action: result ? ACTIONS.SEEK_FORWARD : ACTIONS.SEEK_BACK});
      return true;
    default:
      return false;
  }
};

const NoArrowsKeydownHandler = ({player, event, setRecentUserAction, SeekHandler}) => {
  switch (event.key) {
    case "ArrowUp":
    case "ArrowDown":
    case "ArrowLeft":
    case "ArrowRight":
      return false;
    default:
      return DefaultKeydownHandler({player, event, setRecentUserAction, SeekHandler});
  }
};

/**
 * Get the first container we expect to find focusable elements in.
 * This assumes that bottom-controls and info-box are mutually exclusive.
 * Can return null if neither is visible.
 */
const getControlContainer = () => {
  return document.querySelector("[class*='bottom-controls_'], [class*='info-box-container']");
};

/** Thanks, GPT */
const getFocusableElements = () => {
  return Array.from(
    getControlContainer()
      ?.querySelectorAll("button, [href], input, select, textarea, [tabindex]:not([tabindex=\"-1\"])")
  ).filter((el) => !el.hasAttribute("disabled") && el.offsetParent !== null);
};

/**
 * +1 for forward, -1 for backward.
 * @param direction
 */
const moveFocus = (direction) => {
  const focusableElements = getFocusableElements();
  const activeIndex = focusableElements.indexOf(document.activeElement);
  const nextIndex = (activeIndex + direction);
  if(nextIndex >= 0 || nextIndex < focusableElements.length) {
    focusableElements[nextIndex]?.focus();
  }
};

const SpatialNavKeydownHandler = ({player, event, setRecentUserAction, SeekHandler}) => {
  const currentFocus = document.activeElement;
  const controlsRowHasFocus = getControlContainer()?.contains(currentFocus);
  switch (event.key) {
    case "ArrowUp":
      if(player.controls.IsMenuVisible()) {
        moveFocus(-1);
        return true;
      } else if(controlsRowHasFocus) {
        player.controls.GetPlayerControl(ElvPlayerControlIds.seekbar)?.focus();
        return true;
      }
      return false;
    case "ArrowDown":
      if(player.controls.IsMenuVisible()) {
        moveFocus(+1);
        return true;
      } else if(!controlsRowHasFocus) {
        player.controls.GetPlayerControl(ElvPlayerControlIds.play_pause)?.focus();
        return true;
      }
      return false;
    case "ArrowLeft":
      if(!player.controls.IsMenuVisible() && controlsRowHasFocus) {
        moveFocus(-1);
        return true;
      }
      return false;
    case "ArrowRight":
      if(player.controls.IsMenuVisible()) {
        currentFocus?.click();
      } else if(controlsRowHasFocus) {
        moveFocus(+1);
        return true;
      }
      return false;
    default:
      return DefaultKeydownHandler({player, event, setRecentUserAction, SeekHandler});
  }
};

export const ObserveKeydown = ({player, setRecentUserAction}) => {
  if(player.playerOptions.keyboardControls === EluvioPlayerParameters.keyboardControls.OFF) {
    return;
  }

  const handleSpatialNav = player.playerOptions.ui === EluvioPlayerParameters.ui.TV && player.playerOptions.keyboardControls === EluvioPlayerParameters.keyboardControls.SPATIAL_NAVIGATION;
  const disableArrowControls = player.playerOptions.keyboardControls === EluvioPlayerParameters.keyboardControls.ARROW_KEYS_DISABLED;
  const SeekHandler = SeekSliderKeyDown(player, setRecentUserAction)();

  const onKeydown = event => {
    if(
      // In spatial-nav mode, we always handle key events.
      !handleSpatialNav && (
        // Keyboard controls should only fire if the player is in focus
        !(player.target === event.target || player.target.contains(event.target)) ||
        // Ignore keyboard controls if actively focused on a button or input
        ["button", "input"].includes(document.activeElement && document.activeElement.tagName.toLowerCase()) ||
        // Or if the player profile form is visible
        player.__showPlayerProfileForm)
    ) {
      return;
    }

    let result;
    if(handleSpatialNav) {
      result = SpatialNavKeydownHandler({player, event, setRecentUserAction, SeekHandler});
    } else if(disableArrowControls) {
      result = NoArrowsKeydownHandler({player, event, setRecentUserAction, SeekHandler});
    } else {
      result = DefaultKeydownHandler({player, event, setRecentUserAction, SeekHandler});
    }

    if(result) {
      event.preventDefault();
    }
    return result;
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
        duration: isFinite(player.video.duration) ? player.video.duration || 0 : player.video.currentTime + 1,
        playbackRate: player.video.playbackRate,
        position: player.video.currentTime
      });
    }, 1000);

    // Video metadata
    const disposePlayerSettingsListener = player.controls.RegisterSettingsListener(() => {
      const {title} = player.controls.GetContentInfo() || {};

      if(!navigator.mediaSession.metadata || navigator.mediaSession.metadata.title !== title) {
        navigator.mediaSession.metadata = new MediaMetadata({title});
      }
    });

    return () => {
      clearInterval(positionInterval);

      disposePlayerSettingsListener && disposePlayerSettingsListener();

      navigator.mediaSession.metadata = null;
      mediaSessionEvents.forEach(event => {
        navigator.mediaSession.setActionHandler(event, null);
      });
    };
  }
};


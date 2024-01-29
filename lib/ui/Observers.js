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

export const ObserveResize = ({target, setSize, setOrientation}) => {
  const observer = new ResizeObserver(entries => {
    const dimensions = entries[0].contentRect;

    /*
    // TODO: Multiview controls
    if(this.controls) {
      this.controls.HandleResize(dimensions);
    }

     */

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

  /*
    Controls should stay visible if:
      - Video hasn't started yet
      - Settings menu is open
      - Currently hovering over controls
      - Currently keyboard-selecting controls

  const ControlsShouldShow = () => (
    (!this.played && this.video.paused) ||
    (this.settingsMenu && this.settingsMenu.dataset.mode !== "hidden") ||
    (this.controls && !!Array.from(document.querySelectorAll(":hover")).find(element => this.controls.contains(element))) ||
    (this.controls && this.controls.contains(document.activeElement) && document.activeElement.classList.contains("focus-visible"))
  );

  const PlayerMove = () => {
    this.FadeIn({
      key: "controls",
      elements: titleOnly ? [this.titleContainer] : [controls, this.settingsMenu, this.toolTip, this.titleContainer],
      callback: () => {
        this.target.classList.remove("-elv-no-cursor");
      }
    });
    this.FadeOut({
      key: "controls",
      elements: titleOnly ? [this.titleContainer] : [controls, this.settingsMenu, this.toolTip, this.titleContainer],
      delay: 3000,
      unless: () => ControlsShouldShow(),
      callback: () => {
        this.target.classList.add("-elv-no-cursor");
      }
    });

    this.target.style.cursor = "unset";
  };

  // Play / Pause / Volume / Seek events
  this.video.addEventListener("play", PlayerMove);
  this.video.addEventListener("pause", PlayerMove);
  this.video.addEventListener("volumechange", PlayerMove);
  this.video.addEventListener("seeking", PlayerMove);

  // Mouse events
  this.target.addEventListener("mousemove", PlayerMove);


  // Touch events
  this.target.addEventListener("touchmove", PlayerMove);

  // Keyboard events
  this.target.addEventListener("blur", () => setTimeout(() => {
    if(!this.target.contains(document.activeElement)) {
      PlayerMove();
    }
  }), 2000);

  window.addEventListener("blur", PlayerMove);

  Array.from(this.target.querySelectorAll("button, input")).forEach(button => {
    button.addEventListener("focus", PlayerMove);
  });

  PlayerMove();

   */
};








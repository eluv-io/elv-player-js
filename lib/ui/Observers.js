// Observe player size for reactive UI
import ResizeObserver from "resize-observer-polyfill";
import EluvioPlayerParameters from "../player/PlayerParameters.js";

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

export const InitializeResizeObserver = ({target, setDimensions}) => {
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

    setDimensions({size, orientation});
  });

  observer.observe(target);

  return observer;
};

// For 'when visible' options (autoplay, muted), handle when the video moves in and out of user visibility
export const RegisterVisibilityCallback = ({player}) => {
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

  new window.IntersectionObserver(Callback, { threshold: 0.1 }).observe(video);
};

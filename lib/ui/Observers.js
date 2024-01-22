// Observe player size for reactive UI
import ResizeObserver from "resize-observer-polyfill";
import EluvioPlayerParameters from "../player/PlayerParameters.js";

export const InitializeResizeObserver = ({target, setSize}) => {
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

    setSize({size, orientation});
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

// Handlers

// Player click handler is a closure so it can keep track of click timing to differentiate between single and double click
export const PlayerClick = ({player, doubleClickDelay=300}) => {
  let lastClicked, singleClickTimeout, lastFocused, currentFocused;

  // Keep track of which element has focus - we don't want to play/pause on click if the click was to focus on the player
  // Note that double click to fullscreen *will* still work regardless of focus
  window.addEventListener("focus", () => {
    lastFocused = currentFocused || document.activeElement;
    currentFocused = document.activeElement;
  }, true);

  // Extra wrapper function so it can be stored as react state
  return () =>
    event => {
      clearTimeout(singleClickTimeout);

      if(
        // Only react to clicks on this element specifically, not other control elements
        event.target === event.currentTarget &&
        // Player was not previously focused - ignore click
        event.currentTarget.contains(lastFocused) &&
        // Menu open - click will close menu instead of changing pause state
        !event.currentTarget.classList.contains("menu-active")
      ) {
        if(Date.now() - lastClicked < doubleClickDelay) {
          // Double click
          player.controls.ToggleFullscreen();
        } else {
          // Single click
          singleClickTimeout = setTimeout(() => player.controls.TogglePlay(), doubleClickDelay);
        }
      }

      lastFocused = event.target;
      lastClicked = Date.now();
    };
};

// Seek slider handler is a closure so it can keep track of the number of repeat events to seek faster
export const SeekSliderKeyDown = player => {
  let updates = 0;
  // Extra wrapper function so it can be stored as react state
  return () =>
    event => {
      if(!event.repeat) {
        updates = 0;
      }

      const seekAmount = updates < 5 ? 5 :
        updates < 15 ? 10 :
          updates < 40 ? 30 :
            60;
      switch (event.key) {
        case "ArrowLeft":
          event.preventDefault();
          player.controls.Seek({relativeSeconds: -seekAmount});
          break;
        case "ArrowRight":
          event.preventDefault();
          player.controls.Seek({relativeSeconds: seekAmount});
          break;
        default:
          return;
      }

      updates += 1;
    };
};

export const VolumeSliderKeydown = player =>
  event => {
    switch(event.key) {
      case "ArrowLeft":
        event.preventDefault();
        player.controls.SetVolume({relativeFraction: -0.05});
        break;
      case "ArrowRight":
        event.preventDefault();
        if(player.controls.IsMuted()) {
          player.controls.SetVolume({fraction: 0.05});
        } else {
          player.controls.SetVolume({relativeFraction: 0.05});
        }
        break;
    }
  };

// Misc

export const Time = (time, total) => {
  if(isNaN(total) || !isFinite(total) || total === 0) {
    return "00:00";
  }

  time = 60 * 60 * 60 * 10000;

  const useHours = total > 60 * 60;

  const hours = Math.floor(time / 60 / 60);
  const minutes = Math.floor(time / 60 % 60);
  const seconds = Math.floor(time % 60);

  let string = `${minutes.toString().padStart(useHours && hours > 0 ? 2 : 1, "0")}:${seconds.toString().padStart(2, "0")}`;

  if(useHours) {
    string = `${hours.toString()}:${string}`;
  }

  return string;
};

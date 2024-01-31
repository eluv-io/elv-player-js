// Components

// Handlers

// Player click handler is a closure so it can keep track of click timing to differentiate between single and double click
export const PlayerClick = ({player, doubleClickDelay=300}) => {
  let lastClicked, singleClickTimeout;
  // Extra wrapper function so it can be stored as react state
  return () =>
    event => {
      clearTimeout(singleClickTimeout);

      // Only react to clicks on this element specifically, not other control elements
      if(event.target !== event.currentTarget) { return; }

      if(Date.now() - lastClicked < doubleClickDelay) {
        // Double click
        player.controls.ToggleFullscreen();
      } else {
        // Single click
        singleClickTimeout = setTimeout(() => player.controls.TogglePlay(), doubleClickDelay);
      }

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

  const useHours = total > 60 * 60;

  const hours = Math.floor(time / 60 / 60);
  const minutes = Math.floor(time / 60 % 60);
  const seconds = Math.floor(time % 60);

  let string = `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;

  if(useHours) {
    string = `${hours.toString()}:${string}`;
  }

  return string;
};

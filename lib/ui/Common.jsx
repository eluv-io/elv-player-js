// Components

// Handlers

// Seek slider handler is a closure so it can keep track of the number of repeat events to seek faster
export const SeekSliderKeyDown = player => {
  let updates = 0;
  // Extra wrapper function is so it can be stored as react state
  return () =>
    event => {
      if(!event.repeat) {
        updates = 0;
      }

      const seekAmount = updates < 5 ? 5 :
        updates < 10 ? 10 :
          updates < 20 ? 30 :
            60;
      switch(event.key) {
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
        player.controls.SetVolume(Math.max(0, player.controls.GetVolume() - 0.05));
        break;
      case "ArrowRight":
        event.preventDefault();
        if(player.controls.IsMuted()) {
          player.controls.SetVolume(0.05);
        } else {
          player.controls.SetVolume(Math.min(1, player.controls.GetVolume() + 0.05));
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

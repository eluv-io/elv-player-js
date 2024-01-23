import React, {useEffect, useState} from "react";
import ControlStyles from "../static/stylesheets/controls-web.module.scss";
import * as Icons from "../static/icons/Icons.js";
import {ObserveVideo} from "./Observers.js";
import "focus-visible";

// TODO: Move stuff to general components class
const IconButton = ({icon, ...props}) => {
  return (
    <button dangerouslySetInnerHTML={{__html: icon}} {...props} />
  );
};

const Time = (time, total) => {
  if(isNaN(total) || !isFinite(total) || total === 0) { return "00:00"; }

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

const WebControls = ({player, dimensions, className=""}) => {
  const [videoState, setVideoState] = useState(undefined);
  const [currentTime, setCurrentTime] = useState(player.video.currentTime);

  useEffect(() => {
    const RemoveObserver = ObserveVideo({target: player.target, video: player.video, setVideoState, setCurrentTime});

    return () => RemoveObserver();
  }, []);

  if(!videoState) { return null; }

  return (
    <div className={`${className} ${ControlStyles["container"]} ${ControlStyles[`size-${dimensions.size}`]} ${ControlStyles[`orientation-${dimensions.orientation}`]}`}>
      <div className={ControlStyles["progress-container"]}>
        <progress
          max={1}
          value={videoState.bufferFraction}
          className={ControlStyles["progress-buffer"]}
        />
        <progress
          max={1}
          value={currentTime / videoState.duration || 0}
          className={ControlStyles["progress-playhead"]}
        />
        <input
          aria-label="Seek slider"
          type="range"
          min={0}
          max={1}
          step={0.00001}
          value={currentTime / videoState.duration || 0}
          onChange={event => player.controls.Seek({fraction: event.currentTarget.value})}
          className={ControlStyles["progress-input"]}
        />
      </div>
      <div className={ControlStyles["controls"]}>
        <IconButton
          aria-label={videoState.playing ? "Pause" : "Play"}
          icon={videoState.playing ? Icons.PauseIcon : Icons.PlayIcon}
          onClick={() => videoState.playing ? player.controls.Pause() : player.controls.Play()}
          className={ControlStyles["play-pause-button"]}
        />
        <div className={ControlStyles["volume-controls"]}>
          <IconButton
            aria-label={videoState.muted ? "Unmute" : "Mute"}
            icon={videoState.muted ? Icons.MutedIcon : videoState.volume < 0.5 ? Icons.VolumeLowIcon : Icons.VolumeHighIcon}
            onClick={() => player.controls.ToggleMuted(!player.video.muted)}
            className={ControlStyles["volume-button"]}
          />
          <div className={ControlStyles["volume-slider"]}>
            <progress
              max={1}
              value={videoState.volume}
              className={ControlStyles["volume-progress"]}
            />
            <input
              aria-label="Volume slider"
              type="range"
              min={0}
              max={1}
              step={0.001}
              value={videoState.volume}
              onChange={event => player.controls.SetVolume(event.currentTarget.value)}
              className={ControlStyles["volume-input"]}
            />
          </div>
        </div>
        <div className={ControlStyles["time"]}>
          { Time(currentTime, videoState.duration) } / { Time(videoState.duration, videoState.duration) }
        </div>
        <div className={ControlStyles["spacer"]} />
        <IconButton
          aria-label={videoState.fullscreen ? "Exit Fullscreen" : "Fullscreen"}
          icon={videoState.fullscreen ? Icons.ExitFullscreenIcon : Icons.FullscreenIcon}
          onClick={() => videoState.fullscreen ? player.controls.ExitFullscreen() : player.controls.Fullscreen()}
        />
      </div>
    </div>
  );
};

export default WebControls;

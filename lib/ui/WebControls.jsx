import React, {createRef, useEffect, useRef, useState} from "react";
import ControlStyles from "../static/stylesheets/controls-web.module.scss";
import * as Icons from "../static/icons/Icons.js";
import {ObserveVideo, ObserveVideoBuffer, ObserveVideoTime} from "./Observers.js";
import "focus-visible";

// TODO: Move stuff to general components class
const IconButton = ({icon, ...props}) => {
  return (
    <button dangerouslySetInnerHTML={{__html: icon}} {...props} className={`${ControlStyles["icon-button"]} ${props.className || ""}`} />
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

const SeekBar = ({player, videoState}) => {
  const [currentTime, setCurrentTime] = useState(player.video.currentTime);
  const [bufferFraction, setBufferFraction] = useState(0);

  useEffect(() => {
    const RemoveTimeObserver = ObserveVideoTime({video: player.video, setCurrentTime, rate: 60});
    const RemoveBufferObserver = ObserveVideoBuffer({video: player.video, setBufferFraction});

    return () => {
      RemoveTimeObserver();
      RemoveBufferObserver();
    };
  }, []);

  return (
    <div className={ControlStyles["progress-container"]}>
      <progress
        max={1}
        value={bufferFraction}
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
  );
};

const TimeIndicator = ({player, videoState}) => {
  const [currentTime, setCurrentTime] = useState(player.video.currentTime);

  useEffect(() => {
    const RemoveObserver = ObserveVideoTime({video: player.video, setCurrentTime, rate: 10});

    return () => RemoveObserver();
  }, []);

  return (
    <div className={ControlStyles["time"]}>
      { Time(currentTime, videoState.duration) } / { Time(videoState.duration, videoState.duration) }
    </div>
  );
};

const SettingsMenu = ({player, Hide}) => {
  const [activeMenu, setActiveMenu] = useState(undefined);
  const [options, setOptions] = useState(undefined);
  const menuRef = createRef();

  useEffect(() => {
    const UpdateSettings = () => setOptions({
      quality: player.controls.GetQualityLevels(),
      audio: player.controls.GetAudioTracks(),
      text: player.controls.GetTextTracks(),
      profile: player.controls.GetPlayerProfiles(),
      rate: player.controls.GetPlaybackRates()
    });

    UpdateSettings();

    player.__AddSettingsListener(UpdateSettings);

    return () => player.__RemoveSettingsListener(UpdateSettings);
  }, []);

  useEffect(() => {
    if(!menuRef || !menuRef.current) { return; }

    const menu = menuRef.current;
    const onClickOutside = event => {
      if(!menu.contains(event.target)) {
        Hide();
      }
    };

    document.body.addEventListener("click", onClickOutside);

    return () => {
      document.body.removeEventListener("click", onClickOutside);
    };
  }, [menuRef, menuRef?.current]);

  if(!options) { return null; }

  // Delay firing of submenu change until after click outside handler has been called
  const SetSubmenu = setting => setTimeout(() => setActiveMenu(setting));

  const settings = {
    quality: {
      label: "Quality",
      Update: index => player.controls.SetQualityLevel(index)
    },
    audio: {
      label: "Audio",
      Update: index => player.controls.SetAudioTrack(index)
    },
    text: {
      label: "Subtitles",
      Update: index => player.controls.SetTextTrack(index)
    },
    profile: {
      label: "Player Profile",
      Update: index => player.controls.SetPlayerProfile(index)
    },
    rate: {
      label: "Playback Rate",
      Update: index => player.controls.SetPlaybackRate(index)
    }
  };

  if(activeMenu) {
    return (
      <div className={`${ControlStyles["menu"]} ${ControlStyles["settings-menu"]}`} ref={menuRef}>
        <button
          onClick={() => SetSubmenu(undefined)}
          className={`${ControlStyles["menu-option"]} ${ControlStyles["menu-option-back"]}`}
        >
          <div dangerouslySetInnerHTML={{__html: Icons.LeftArrowIcon}} className={ControlStyles["menu-option-back-icon"]} />
          <div>{ settings[activeMenu].label }</div>
        </button>
        {
          options[activeMenu].options.map(option =>
            <button
              key={`option-${option.index}`}
              onClick={() => {
                settings[activeMenu].Update(option.index);
                SetSubmenu(undefined);
              }}
              className={`${ControlStyles["menu-option"]} ${option.active ? ControlStyles["menu-option-active"] : ""}`}
            >
              { option.label || "" }
            </button>
          )
        }
      </div>
    );
  }

  return (
    <div className={`${ControlStyles["menu"]} ${ControlStyles["settings-menu"]}`} ref={menuRef}>
      <button onClick={() => SetSubmenu("quality")} className={ControlStyles["menu-option"]}>
        { `${settings.quality.label}: ${options.quality.active?.activeLabel || ""}` }
      </button>
      {
        options.audio.options.length <= 1 ? null :
          <button onClick={() => SetSubmenu("audio")} className={ControlStyles["menu-option"]}>
            { `${settings.audio.label}: ${options.audio.active?.label || ""}` }
          </button>
      }
      {
        options.text.options.length <= 1 ? null :
          <button onClick={() => SetSubmenu("text")} className={ControlStyles["menu-option"]}>
            { `${settings.text.label}: ${options.text.active?.label || ""}` }
          </button>
      }
      {
        options.profile.options.length === 0 ? null :
          <button onClick={() => SetSubmenu("profile")} className={ControlStyles["menu-option"]}>
            { `${settings.profile.label}: ${options.profile.active?.label || ""}` }
          </button>
      }
      <button onClick={() => SetSubmenu("rate")} className={ControlStyles["menu-option"]}>
        { `${settings.rate.label}: ${options.rate.active?.label || "" }` }
      </button>
    </div>
  );
};

const WebControls = ({player, dimensions, className=""}) => {
  const [videoState, setVideoState] = useState(undefined);
  const [showSettingsMenu, setShowSettingsMenu] = useState(false);

  useEffect(() => {
    const RemoveObserver = ObserveVideo({target: player.target, video: player.video, setVideoState});

    return () => RemoveObserver();
  }, []);

  if(!videoState) { return null; }

  console.log("render")
  return (
    <div className={`${className} ${ControlStyles["container"]} ${ControlStyles[`size-${dimensions.size}`] || ""} ${ControlStyles[`orientation-${dimensions.orientation}`] || ""}`}>
      <SeekBar player={player} videoState={videoState} />
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
        <TimeIndicator player={player} videoState={videoState} />
        <div className={ControlStyles["spacer"]} />
        <div className={ControlStyles["menu-control-container"]}>
          <IconButton
            aria-label={showSettingsMenu ? "Hide Settings Menu" : "Settings"}
            icon={Icons.SettingsIcon}
            onClick={() => setShowSettingsMenu(!showSettingsMenu)}
          />
          {
            !showSettingsMenu ? null :
              <SettingsMenu player={player} Hide={() => setShowSettingsMenu(false)} />
          }
        </div>
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

import React, {createRef, useEffect, useState} from "react";
import ControlStyles from "../static/stylesheets/controls-web.module.scss";
import * as Icons from "../static/icons/Icons.js";
import {ObserveVideo, ObserveVideoBuffer, ObserveVideoTime, RegisterModal} from "./Observers.js";
import "focus-visible";
import {SeekSliderKeyDown, Time, VolumeSliderKeydown} from "./Common.jsx";

export const IconButton = ({icon, ...props}) => {
  return (
    <button {...props} className={`${ControlStyles["icon-button"]} ${props.className || ""}`} dangerouslySetInnerHTML={{__html: icon}} />
  );
};

const SeekBar = ({player, videoState}) => {
  const [currentTime, setCurrentTime] = useState(player.video.currentTime);
  const [bufferFraction, setBufferFraction] = useState(0);
  const [seekKeydownHandler, setSeekKeydownHandler] = useState(undefined);

  useEffect(() => {
    setSeekKeydownHandler(SeekSliderKeyDown(player));

    const RemoveTimeObserver = ObserveVideoTime({video: player.video, setCurrentTime, rate: 60});
    const RemoveBufferObserver = ObserveVideoBuffer({video: player.video, setBufferFraction});

    return () => {
      RemoveTimeObserver();
      RemoveBufferObserver();
    };
  }, []);

  return (
    <div className={ControlStyles["seek-container"]}>
      <progress
        max={1}
        value={bufferFraction}
        className={ControlStyles["seek-buffer"]}
      />
      <progress
        max={1}
        value={currentTime / videoState.duration || 0}
        className={ControlStyles["seek-playhead"]}
      />
      <input
        aria-label="Seek slider"
        type="range"
        min={0}
        max={1}
        step={0.00001}
        value={currentTime / videoState.duration || 0}
        onInput={event => player.controls.Seek({fraction: event.currentTarget.value})}
        onKeyDown={seekKeydownHandler}
        className={ControlStyles["seek-input"]}
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

    const RemoveMenuListener = RegisterModal({element: menuRef.current, Hide});

    return () => RemoveMenuListener();
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
      <div key="submenu" className={`${ControlStyles["menu"]} ${ControlStyles["settings-menu"]}`} ref={menuRef}>
        <button
          onClick={() => SetSubmenu(undefined)}
          className={`${ControlStyles["menu-option"]} ${ControlStyles["menu-option-back"]}`}
        >
          <div dangerouslySetInnerHTML={{__html: Icons.LeftArrowIcon}} className={ControlStyles["menu-option-back-icon"]} />
          <div>{ settings[activeMenu].label }</div>
        </button>
        {
          options[activeMenu].options.map((option, index) =>
            <button
              key={`option-${option.index}`}
              autoFocus={index === 0}
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
    <div key="menu" className={`${ControlStyles["menu"]} ${ControlStyles["settings-menu"]}`} ref={menuRef}>
      <button autoFocus onClick={() => SetSubmenu("quality")} className={ControlStyles["menu-option"]}>
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

const CollectionControls = ({player}) => {
  const collectionInfo = player.controls.GetCollectionInfo();

  if(!collectionInfo || collectionInfo.mediaLength === 0) { return null; }

  const previousMedia = collectionInfo.content[collectionInfo.mediaIndex - 1];
  const nextMedia = collectionInfo.content[collectionInfo.mediaIndex + 1];

  const playerReady = player.controls.IsReady();
  return (
      <>
        {
          !previousMedia ? null :
            <div
              key={`media-previous-${collectionInfo.mediaIndex}`}
              aria-label={`Play Previous: ${previousMedia.title}`}
              className={`${ControlStyles["collection-button-container"]} ${!playerReady ? ControlStyles["collection-button-container--loading"] : ""}`}
            >
              <IconButton disabled={!playerReady} icon={Icons.PreviousTrackIcon} onClick={() => player.controls.CollectionPlayPrevious()} />
              <div className={ControlStyles["collection-button-text"]}>{ previousMedia.title }</div>
            </div>
        }
        {
          !nextMedia ? null :
            <div
              key={`media-next-${collectionInfo.mediaIndex}`}
              aria-label={`Play Next: ${nextMedia.title}`}
              className={`${ControlStyles["collection-button-container"]} ${!playerReady ? ControlStyles["collection-button-container--loading"] : ""}`}
            >
              <IconButton disabled={!playerReady} icon={Icons.NextTrackIcon} onClick={() => player.controls.CollectionPlayNext()} />
              <div className={ControlStyles["collection-button-text"]}>{ nextMedia.title }</div>
            </div>
        }
      </>
  );
};

const WebControls = ({player, dimensions, playbackStarted, className=""}) => {
  const [videoState, setVideoState] = useState(undefined);
  const [settingsKey, setSettingsKey] = useState(Math.random());
  const [showSettingsMenu, setShowSettingsMenu] = useState(false);

  useEffect(() => {
    const RemoveObserver = ObserveVideo({target: player.target, video: player.video, setVideoState});

    const onSettingsUpdate = () => setSettingsKey(Math.random());
    player.__AddSettingsListener(onSettingsUpdate);

    return () => {
      RemoveObserver();
      player.__RemoveSettingsListener(onSettingsUpdate);
    };
  }, []);

  if(!videoState) { return null; }

  const { title, description } = (player.controls.GetContentTitle() || {});

  console.log("render")
  return (
    <div className={`${className} ${ControlStyles["container"]} ${ControlStyles[`size-${dimensions.size}`] || ""} ${ControlStyles[`orientation-${dimensions.orientation}`] || ""}`}>
      {
        !title ? null :
          <div key={`title-${settingsKey}`} className={ControlStyles["title-container"]}>
            <div className={ControlStyles["title"]}>{title}</div>
            <div className={ControlStyles["description"]}>{description}</div>
          </div>
      }
      <div className={ControlStyles["controls-container"]}>
        <SeekBar player={player} videoState={videoState}/>
        <div className={ControlStyles["controls"]}>
          <IconButton
            aria-label={videoState.playing ? "Pause" : "Play"}
            icon={videoState.playing ? Icons.PauseIcon : Icons.PlayIcon}
            onClick={() => videoState.playing ? player.controls.Pause() : player.controls.Play()}
            className={ControlStyles["play-pause-button"]}
          />
          <CollectionControls player={player} key={`collection-controls-${settingsKey}`} />
          <div className={ControlStyles["volume-controls"]}>
            <IconButton
              key="mute-button"
              aria-label={videoState.muted ? "Unmute" : "Mute"}
              icon={videoState.muted || videoState.volume === 0 ? Icons.MutedIcon : videoState.volume < 0.5 ? Icons.VolumeLowIcon : Icons.VolumeHighIcon}
              onClick={() => player.controls.ToggleMuted(!player.video.muted)}
              className={ControlStyles["volume-button"]}
            />
            <div className={ControlStyles["volume-slider"]}>
              <progress
                max={1}
                value={videoState.muted ? 0 : videoState.volume}
                className={ControlStyles["volume-progress"]}
              />
              <input
                aria-label="Volume slider"
                type="range"
                min={0}
                max={1}
                step={0.001}
                value={videoState.muted ? 0 : videoState.volume}
                onInput={event => player.controls.SetVolume(event.currentTarget.value)}
                onKeyDown={VolumeSliderKeydown(player)}
                className={ControlStyles["volume-input"]}
              />
            </div>
          </div>
          <TimeIndicator player={player} videoState={videoState}/>
          <div className={ControlStyles["spacer"]}/>
          <div className={ControlStyles["menu-control-container"]}>
            <IconButton
              aria-label={showSettingsMenu ? "Hide Settings Menu" : "Settings"}
              icon={Icons.SettingsIcon}
              onClick={() => setShowSettingsMenu(!showSettingsMenu)}
              className={showSettingsMenu ? ControlStyles["icon-button-active"] : ""}
            />
            {
              !showSettingsMenu ? null :
                <SettingsMenu player={player} Hide={() => setShowSettingsMenu(false)}/>
            }
          </div>
          <IconButton
            aria-label={videoState.fullscreen ? "Exit Fullscreen" : "Fullscreen"}
            icon={videoState.fullscreen ? Icons.ExitFullscreenIcon : Icons.FullscreenIcon}
            onClick={() => videoState.fullscreen ? player.controls.ExitFullscreen() : player.controls.Fullscreen()}
          />
        </div>
      </div>
    </div>
  );
};

export default WebControls;

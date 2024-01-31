import React, {createRef, useEffect, useState} from "react";
import ControlStyles from "../static/stylesheets/controls-web.module.scss";
import * as Icons from "../static/icons/Icons.js";
import {ObserveVideo, ObserveVideoBuffer, ObserveVideoTime, RegisterModal} from "./Observers.js";
import "focus-visible";
import {PlayerClick, SeekSliderKeyDown, Time, VolumeSliderKeydown} from "./Common.jsx";
import EluvioPlayerParameters from "../player/PlayerParameters.js";

import EluvioLogo from "../static/images/Logo.png";

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

    return () => RemoveMenuListener && RemoveMenuListener();
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
      Update: index => player.controls.SetPlaybackRate({index})
    }
  };

  if(activeMenu) {
    return (
      <div key="submenu" role="menu" className={`${ControlStyles["menu"]} ${ControlStyles["submenu"]} ${ControlStyles["settings-menu"]}`} ref={menuRef}>
        <button
          onClick={() => SetSubmenu(undefined)}
          aria-label="Back to settings menu"
          className={`${ControlStyles["menu-option"]} ${ControlStyles["menu-option-back"]}`}
        >
          <div dangerouslySetInnerHTML={{__html: Icons.LeftArrowIcon}} className={ControlStyles["menu-option-back-icon"]} />
          <div>{ settings[activeMenu].label }</div>
        </button>
        {
          options[activeMenu].options.map((option, index) =>
            <button
              key={`option-${option.index}`}
              role="menuitemradio"
              aria-checked={option.active}
              autoFocus={index === 0}
              aria-label={`${settings[activeMenu].label}: ${option.label || ""}`}
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
    <div key="menu" role="menu" className={`${ControlStyles["menu"]} ${ControlStyles["settings-menu"]}`} ref={menuRef}>
      <button autoFocus role="menuitem" onClick={() => SetSubmenu("quality")} className={ControlStyles["menu-option"]}>
        { `${settings.quality.label}: ${options.quality.active?.activeLabel || ""}` }
      </button>
      {
        options.audio.options.length <= 1 ? null :
          <button role="menuitem" onClick={() => SetSubmenu("audio")} className={ControlStyles["menu-option"]}>
            { `${settings.audio.label}: ${options.audio.active?.label || ""}` }
          </button>
      }
      {
        options.text.options.length <= 1 ? null :
          <button role="menuitem" onClick={() => SetSubmenu("text")} className={ControlStyles["menu-option"]}>
            { `${settings.text.label}: ${options.text.active?.label || ""}` }
          </button>
      }
      {
        options.profile.options.length === 0 ? null :
          <button role="menuitem" onClick={() => SetSubmenu("profile")} className={ControlStyles["menu-option"]}>
            { `${settings.profile.label}: ${options.profile.active?.label || ""}` }
          </button>
      }
      <button role="menuitem" onClick={() => SetSubmenu("rate")} className={ControlStyles["menu-option"]}>
        { `${settings.rate.label}: ${options.rate.active?.label || "" }` }
      </button>
    </div>
  );
};

const CollectionMenu = ({player, Hide}) => {
  const menuRef = createRef();
  const [collectionInfo, setCollectionInfo] = useState(undefined);

  useEffect(() => {
    const UpdateCollectionInfo = () => setCollectionInfo(player.controls.GetCollectionInfo());

    UpdateCollectionInfo();

    player.__AddSettingsListener(UpdateCollectionInfo);

    return () => player.__RemoveSettingsListener(UpdateCollectionInfo);
  }, []);

  useEffect(() => {
    if(!menuRef || !menuRef.current) { return; }

    const RemoveMenuListener = RegisterModal({element: menuRef.current, Hide});

    return () => RemoveMenuListener && RemoveMenuListener();
  }, [menuRef, menuRef?.current]);

  if(!collectionInfo) { return null; }

  const Select = mediaIndex => {
    player.controls.CollectionPlay({mediaIndex});
    Hide();
  };

  return (
    <div key="menu" role="menu" className={`${ControlStyles["menu"]} ${ControlStyles["collection-menu"]}`} ref={menuRef}>
      <div className={`${ControlStyles["menu-option"]} ${ControlStyles["menu-header"]}`}>
        { collectionInfo.title }
      </div>
      {
        collectionInfo.content.map(((item, index) =>
          <button
            key={`collection-item-${item.mediaId}`}
            aria-label={`${item.title || item.mediaId} ${item.active ? "(active)" : ""}`}
            role="menuitemradio"
            aria-checked={item.active}
            autoFocus={index === 0}
            onClick={() => Select(item.mediaIndex)}
            className={`${ControlStyles["menu-option"]} ${item.active ? ControlStyles["menu-option-active"] : ""}`}
          >
            { item.title || item.mediaId }
          </button>
        ))
      }
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

const WebControls = ({player, dimensions, playbackStarted, recentlyInteracted, className=""}) => {
  const [videoState, setVideoState] = useState(undefined);
  const [settingsKey, setSettingsKey] = useState(Math.random());
  const [playerClickHandler, setPlayerClickHandler] = useState(undefined);
  const [showSettingsMenu, setShowSettingsMenu] = useState(false);
  const [showCollectionMenu, setShowCollectionMenu] = useState(false);

  useEffect(() => {
    setPlayerClickHandler(PlayerClick({player}));

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
  const collectionInfo = player.controls.GetCollectionInfo();

  return (
    <div
      onClick={playerClickHandler}
      className={[
        className,
        ControlStyles["container"],
        ControlStyles[`size-${dimensions.size}`] || "",
        ControlStyles[`orientation-${dimensions.orientation}`] || "",
        recentlyInteracted || !playbackStarted || showSettingsMenu || showCollectionMenu ? "" : ControlStyles["autohide"],
        player.playerOptions.controls !== EluvioPlayerParameters.controls.DEFAULT ? "" : ControlStyles["container--default-controls"]
      ].join(" ")}
    >
      {
        // Title and description
        !title || player.playerOptions.title === EluvioPlayerParameters.title.OFF ? null :
          <div key={`title-${settingsKey}`} className={ControlStyles["title-container"]}>
            <div className={ControlStyles["title"]}>{title}</div>
            <div className={ControlStyles["description"]}>{description}</div>
          </div>
      }
      {
        // Main bottom control bar
        [
          EluvioPlayerParameters.controls.DEFAULT,
          EluvioPlayerParameters.controls.OFF,
          EluvioPlayerParameters.controls.OFF_WITH_VOLUME_TOGGLE
        ].includes(player.playerOptions.controls) ? null :
          <>
            <IconButton
              aria-label="Play"
              tabIndex={playbackStarted ? -1 : 0}
              icon={Icons.PlayCircleIcon}
              onClick={() => player.controls.Play()}
              className={`${ControlStyles["center-play-button"]} ${!playbackStarted ? "" : ControlStyles["center-play-button--hidden"]}`}
            />
            <div className={`${ControlStyles["bottom-controls-container"]} ${player.playerOptions.controls === EluvioPlayerParameters.controls.AUTO_HIDE ? ControlStyles["bottom-controls-container--autohide"] : ""}`}>
              <SeekBar player={player} videoState={videoState}/>
              <div className={ControlStyles["controls"]}>
                <IconButton
                  aria-label={videoState.playing ? "Pause" : "Play"}
                  icon={videoState.playing ? Icons.PauseIcon : Icons.PlayIcon}
                  onClick={() => player.controls.TogglePlay()}
                  className={ControlStyles["play-pause-button"]}
                />
                <CollectionControls player={player} key={`collection-controls-${settingsKey}`} />
                <div className={ControlStyles["volume-controls"]}>
                  <IconButton
                    key="mute-button"
                    aria-label={videoState.muted ? "Unmute" : "Mute"}
                    icon={videoState.muted || videoState.volume === 0 ? Icons.MutedIcon : videoState.volume < 0.5 ? Icons.VolumeLowIcon : Icons.VolumeHighIcon}
                    onClick={() => player.controls.ToggleMuted()}
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
                      onInput={event => player.controls.SetVolume({fraction: event.currentTarget.value})}
                      onKeyDown={VolumeSliderKeydown(player)}
                      className={ControlStyles["volume-input"]}
                    />
                  </div>
                </div>
                <TimeIndicator player={player} videoState={videoState}/>
                <div className={ControlStyles["spacer"]}/>
                {
                  !collectionInfo ? null :
                    <div className={ControlStyles["menu-control-container"]}>
                      <IconButton
                        aria-label={showCollectionMenu ? "Hide Collection Menu" : "Collection Menu"}
                        aria-haspopup
                        icon={Icons.CollectionIcon}
                        onClick={() => setShowCollectionMenu(!showCollectionMenu)}
                        className={showCollectionMenu ? ControlStyles["icon-button-active"] : ""}
                      />
                      {
                        !showCollectionMenu ? null :
                          <CollectionMenu player={player} Hide={() => setShowCollectionMenu(false)} />
                      }
                    </div>
                }
                <div className={ControlStyles["menu-control-container"]}>
                  <IconButton
                    aria-label={showSettingsMenu ? "Hide Settings Menu" : "Settings"}
                    aria-haspopup
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
                  onClick={() => player.controls.ToggleFullscreen()}
                />
              </div>
            </div>
          </>
      }
      {
        // Floating volume control for 'off with volume toggle' setting
        player.playerOptions.controls !== EluvioPlayerParameters.controls.OFF_WITH_VOLUME_TOGGLE ? null :
          <div className={ControlStyles["floating-volume-toggle"]}>
            <IconButton
              key="mute-button"
              aria-label={videoState.muted ? "Unmute" : "Mute"}
              icon={videoState.muted || videoState.volume === 0 ? Icons.MutedIcon : Icons.VolumeHighIcon}
              onClick={() => player.controls.ToggleMuted()}
              className={ControlStyles["volume-button"]}
            />
          </div>
      }
      {
        // Watermark
        player.playerOptions.watermark === EluvioPlayerParameters.watermark.OFF ? null :
          <div className={ControlStyles["watermark"]}>
            <img src={EluvioLogo} alt="Eluvio" />
          </div>
      }
    </div>
  );
};

export default WebControls;

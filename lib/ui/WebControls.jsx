import ControlStyles from "../static/stylesheets/controls-web.module.scss";

// eslint-disable-next-line no-unused-vars
import React, {useEffect, useState} from "react";
import * as Icons from "../static/icons/Icons.js";
import {ObserveVideo, ObserveVideoTime} from "./Observers.js";
import "focus-visible";
import {PlayerClick, Time, VolumeSliderKeydown} from "./Common.js";
import EluvioPlayerParameters from "../player/PlayerParameters.js";

import EluvioLogo from "../static/images/Logo.png";
import {CollectionMenu, SeekBar, SettingsMenu} from "./Components.jsx";

export const IconButton = ({icon, ...props}) => {
  return (
    <button {...props} className={`${ControlStyles["icon-button"]} ${props.className || ""}`} dangerouslySetInnerHTML={{__html: icon}} />
  );
};

const TimeIndicator = ({player, videoState}) => {
  const [currentTime, setCurrentTime] = useState(player.video.currentTime);

  useEffect(() => {
    const disposeVideoTimeObserver = ObserveVideoTime({video: player.video, setCurrentTime, rate: 10});

    return () => disposeVideoTimeObserver && disposeVideoTimeObserver();
  }, []);

  return (
    <div className={ControlStyles["time"]}>
      { Time(currentTime, videoState.duration) } / { Time(videoState.duration, videoState.duration) }
    </div>
  );
};

const CollectionControls = ({player}) => {
  const collectionInfo = player.controls.GetCollectionInfo();

  if(!collectionInfo || collectionInfo.mediaLength === 0 || !collectionInfo.isPlaylist) { return null; }

  const previousMedia = collectionInfo.content[collectionInfo.mediaIndex - 1];
  const nextMedia = collectionInfo.content[collectionInfo.mediaIndex + 1];

  const playerReady = player.controls.IsReady();
  return (
      <>
        {
          !previousMedia ? null :
            <div
              key={`media-previous-${collectionInfo.mediaIndex}`}
              className={`${ControlStyles["collection-button-container"]} ${!playerReady ? ControlStyles["collection-button-container--loading"] : ""}`}
            >
              <IconButton aria-label={`Play Previous: ${previousMedia.title}`} disabled={!playerReady} icon={Icons.PreviousTrackIcon} onClick={() => player.controls.CollectionPlayPrevious()} />
              <div className={ControlStyles["collection-button-text"]}>{ previousMedia.title }</div>
            </div>
        }
        {
          !nextMedia ? null :
            <div
              key={`media-next-${collectionInfo.mediaIndex}`}
              className={`${ControlStyles["collection-button-container"]} ${!playerReady ? ControlStyles["collection-button-container--loading"] : ""}`}
            >
              <IconButton aria-label={`Play Next: ${nextMedia.title}`} disabled={!playerReady} icon={Icons.NextTrackIcon} onClick={() => player.controls.CollectionPlayNext()} />
              <div className={ControlStyles["collection-button-text"]}>{ nextMedia.title }</div>
            </div>
        }
      </>
  );
};

const MenuButton = ({label, icon, player, setMenuActive, MenuComponent}) => {
  const [show, setShow] = useState(false);

  return (
    <div className={ControlStyles["menu-control-container"]}>
      <IconButton
        aria-label={show ? `Hide ${label} Menu` : label}
        aria-haspopup
        icon={icon}
        onClick={() => {
          setMenuActive(!show);
          setShow(!show);
        }}
        className={show ? ControlStyles["icon-button-active"] : ""}
      />
      {
        !show ? null :
          <MenuComponent
            player={player}
            Hide={() => {
              setShow(false);
              setMenuActive(false);
            }}
          />
      }
    </div>
  );
};

const VolumeControls = ({player, videoState}) => {
  return (
    <div className={ControlStyles["volume-controls"]}>
      <IconButton
        key="mute-button"
        aria-label={videoState.muted ? "Unmute" : "Mute"}
        icon={
          videoState.muted || videoState.volume === 0 ? Icons.MutedIcon :
            videoState.volume < 0.4 ? Icons.VolumeLowIcon :
              videoState.volume < 0.8 ? Icons.VolumeMediumIcon :
                Icons.VolumeHighIcon
        }
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
  );
};

const WebControls = ({player, playbackStarted, recentlyInteracted, setRecentUserAction, className=""}) => {
  const [videoState, setVideoState] = useState(undefined);
  const [playerClickHandler, setPlayerClickHandler] = useState(undefined);
  const [activeMenus, setActiveMenus] = useState(0);

  useEffect(() => {
    setPlayerClickHandler(PlayerClick({player, setRecentUserAction}));

    const disposeVideoObserver = ObserveVideo({target: player.target, video: player.video, setVideoState});

    return () => disposeVideoObserver && disposeVideoObserver();
  }, []);

  if(!videoState) { return null; }

  const { title, description } = (player.controls.GetContentTitle() || {});
  const collectionInfo = player.controls.GetCollectionInfo();
  const menuActive = activeMenus > 0;
  const setMenuActive = active => setActiveMenus(active ? activeMenus + 1 : Math.max(0, activeMenus - 1));

  return (
    <div
      onClick={playerClickHandler}
      className={[
        className,
        ControlStyles["container"],
        recentlyInteracted || !playbackStarted || menuActive ? "" : ControlStyles["autohide"],
        player.playerOptions.controls !== EluvioPlayerParameters.controls.DEFAULT ? "" : ControlStyles["container--default-controls"],
        menuActive ? "menu-active" : ""
      ].join(" ")}
    >
      {
        // Title and description
        !title || player.playerOptions.title === EluvioPlayerParameters.title.OFF ? null :
          <div className={ControlStyles["title-container"]}>
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
              icon={Icons.CenterPlayCircleIcon}
              onClick={() => {
                player.controls.Play();
                // Take focus off of this button because it should no longer be selectable after playback starts
                player.target.firstChild.focus();
              }}
              className={`${ControlStyles["center-play-button"]} ${!playbackStarted ? "" : ControlStyles["center-play-button--hidden"]}`}
            />
            <div className={`${ControlStyles["bottom-controls-container"]} ${player.playerOptions.controls === EluvioPlayerParameters.controls.AUTO_HIDE ? ControlStyles["bottom-controls-container--autohide"] : ""}`}>
              <div className={ControlStyles["bottom-controls-gradient"]} />
              <SeekBar player={player} videoState={videoState} className={ControlStyles["seek"]} />
              <div className={ControlStyles["controls"]}>
                <IconButton
                  aria-label={videoState.playing ? "Pause" : "Play"}
                  icon={videoState.playing ? Icons.PauseCircleIcon : Icons.PlayCircleIcon}
                  onClick={() => player.controls.TogglePlay()}
                  className={ControlStyles["play-pause-button"]}
                />
                <CollectionControls player={player} />
                <VolumeControls player={player} videoState={videoState} />
                <TimeIndicator player={player} videoState={videoState}/>

                <div className={ControlStyles["spacer"]}/>

                {
                  !collectionInfo ? null :
                    <MenuButton
                      label="Collection Menu"
                      icon={Icons.CollectionIcon}
                      player={player}
                      setMenuActive={setMenuActive}
                      MenuComponent={CollectionMenu}
                    />
                }
                <MenuButton
                  label="Settings Menu"
                  icon={Icons.SettingsIcon}
                  player={player}
                  setMenuActive={setMenuActive}
                  MenuComponent={SettingsMenu}
                />
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

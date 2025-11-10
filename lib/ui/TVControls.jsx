import ControlStyles from "../static/stylesheets/controls-tv.module.scss";

// eslint-disable-next-line no-unused-vars
import React, {useEffect, useRef, useState} from "react";
import * as Icons from "../static/icons/Icons.js";
import {ObserveVideo, ObserveVideoTime} from "./Observers.js";
import "focus-visible";
import {ImageUrl, PlayerClick, Time} from "./Common.js";
import EluvioPlayerParameters, { ElvPlayerControlIds } from "../player/PlayerParameters.js";

import EluvioLogo from "../static/images/Logo.png";
import {
  CollectionMenu,
  ContentVerificationMenu,
  LiveIndicator,
  SeekBar,
  SettingsMenu,
  SVG
} from "./Components.jsx";

export const IconButton = ({icon, ...props}) => {
  return (
    <button {...props} className={`${ControlStyles["icon-button"]} ${props.className || ""}`} dangerouslySetInnerHTML={{__html: icon}} />
  );
};

const TimeIndicator = ({player, videoState}) => {
  const [currentTime, setCurrentTime] = useState(player.video.currentTime);

  useEffect(() => {
    const disposeVideoTimeObserver = ObserveVideoTime({player, setCurrentTime, rate: 10});

    return () => disposeVideoTimeObserver && disposeVideoTimeObserver();
  }, []);

  return (
    <div className={ControlStyles["time-container"]}>
      {
        player.isLive && !player.behindLiveEdge ? null :
          <div className={ControlStyles["time"]}>
          { Time(currentTime, videoState.duration) }
          </div>
      }
      <div className={ControlStyles["spacer"]} />
      <div className={ControlStyles["time"]}>
        { Time(videoState.duration, videoState.duration) }
      </div>
    </div>
  );
};

const CenterButtons = ({player, videoState}) => {
  const collectionInfo = player.controls.GetCollectionInfo();

  const previousMedia = collectionInfo && collectionInfo.isPlaylist && collectionInfo.content[collectionInfo.mediaIndex - 1];
  const nextMedia = collectionInfo && collectionInfo.isPlaylist && collectionInfo.content[collectionInfo.mediaIndex + 1];

  const playerReady = player.controls.IsReady();
  return (
    <div className={ControlStyles["center-buttons"]}>
      {
        !previousMedia && !nextMedia ? null :
          <IconButton
            id={player.controls.__GetPlayerControlId(ElvPlayerControlIds.prev_track)}
            disabled={!playerReady || !previousMedia}
            icon={Icons.PreviousTrackIcon}
            onClick={() => player.controls.CollectionPlayPrevious()}
            className={`${ControlStyles["track-button"]} ${ControlStyles["icon-button--drop-shadow-focus"]}`}
          />
      }
      <IconButton
        id={player.controls.__GetPlayerControlId(ElvPlayerControlIds.rewind)}
        aria-label="Back 10 Seconds"
        icon={Icons.BackwardCircleIcon}
        onClick={() => player.controls.Seek({relativeSeconds: -10})}
        className={ControlStyles["icon-button--drop-shadow-focus"]}
      />
      <IconButton
        id={player.controls.__GetPlayerControlId(ElvPlayerControlIds.play_pause)}
        aria-label={videoState.playing ? "Pause" : "Play"}
        icon={videoState.playing ? Icons.PauseCircleIcon : Icons.PlayCircleIcon}
        onClick={() => player.controls.TogglePlay()}
        className={`${ControlStyles["play-pause-button"]} ${ControlStyles["icon-button--drop-shadow-focus"]}`}
      />
      <IconButton
        id={player.controls.__GetPlayerControlId(ElvPlayerControlIds.fast_forward)}
        aria-label="Forward 10 Seconds"
        icon={Icons.ForwardCircleIcon}
        onClick={() => player.controls.Seek({relativeSeconds: 10})}
        className={ControlStyles["icon-button--drop-shadow-focus"]}
      />
      {
        !previousMedia && !nextMedia ? null :
          <IconButton
            id={player.controls.__GetPlayerControlId(ElvPlayerControlIds.next_track)}
            disabled={!playerReady || !nextMedia}
            icon={Icons.NextTrackIcon}
            onClick={() => player.controls.CollectionPlayNext()}
            className={`${ControlStyles["track-button"]} ${ControlStyles["icon-button--drop-shadow-focus"]}`}
          />
      }
    </div>
  );
};

const MenuButton = ({id, label, icon, children, player, MenuComponent}) => {
  const [show, setShow] = useState(false);

  return (
    <div className={ControlStyles["menu-control-container"]}>
      {
        icon ?
          <IconButton
            id={id}
            aria-label={show ? `Close ${label} Menu` : label}
            aria-haspopup
            icon={icon}
            onClick={() => {
              player.controls.__ToggleMenu(!show);
              setShow(!show);
            }}
            className={`${ControlStyles["icon-button--circle-focus"]} ${show ? ControlStyles["icon-button-active"] : ""}`}
          /> :
          <button
            id={id}
            onClick={() => {
              player.controls.__ToggleMenu(!show);
              setShow(!show);
            }}
            className={`${ControlStyles["text-button"]} ${show ? ControlStyles["text-button--active"] : ""}`}
          >
            { children }
          </button>
      }
      {
        !show ? null :
          <MenuComponent
            player={player}
            Close={() => {
              player.controls.__ToggleMenu(false);
              setShow(false);
            }}
            className={ControlStyles["menu"]}
          />
      }
    </div>
  );
};

const InfoBox = ({player, Close}) => {
  const [imageUrl, setImageUrl] = useState(undefined);

  const {title, description, image, headers} = player.controls.GetContentInfo() || {};

  const containerRef = useRef();

  useEffect(() => {
    setImageUrl(undefined);

    if(!image) { return; }

    ImageUrl({player, pathOrUrl: image, width: 200})
      .then(imageUrl => setImageUrl(imageUrl));
  }, [image]);

  return (
    <div
      ref={containerRef}
      id={player.controls.__GetPlayerControlId(ElvPlayerControlIds.info_box)}
      className={ControlStyles["info-box-container"]}>
      <button
        autoFocus
        onClick={Close}
        className={`${ControlStyles["info-box-button"]} ${ControlStyles["info-box-button--info"]}`}
      >
        Info
      </button>
      <div className={ControlStyles["info-box"]}>
        {
          !imageUrl ? null :
            <div className={ControlStyles["info-box-image-container"]}>
              <img src={imageUrl} alt="Image" className={ControlStyles["info-box-image"]}/>
            </div>
        }
        <div className={`${ControlStyles["info-box-text"]} ${imageUrl && headers && headers.length === 0 ? ControlStyles["info-box-text--top-padding"] : ""}`}>
          {
            !headers || headers.length === 0 ? null :
              <div className={ControlStyles["info-box-headers"]}>
                {headers.map((text, index) =>
                  <div key={`header-${index}`} className={ControlStyles["info-box-header"]}>
                    { text }
                  </div>
                )}
              </div>
          }
          <div className={ControlStyles["info-box-title"]}>
            { title || "" }
          </div>
          <div className={ControlStyles["info-box-description"]}>
            { description || "" }
          </div>
        </div>
        <div className={ControlStyles["info-box-actions"]}>
          <button
            onClick={() => {
              player.controls.Seek({time: 0});
              Close();
            }}
            className={`${ControlStyles["info-box-button"]} ${ControlStyles["info-box-button--restart"]}`}
          >
            <SVG icon={Icons.PlayIcon} />
            From Beginning
          </button>
        </div>
      </div>
    </div>
  );
};

const ContentVerificationControls = ({player}) => {
  const [contentVerified, setContentVerified] = useState(false);

  useEffect(() => {
    const UpdateVerification = () => setContentVerified(player.controls.ContentVerified());

    UpdateVerification();

    player.controls.RegisterSettingsListener(UpdateVerification);
  }, []);

  if(!contentVerified) {
    return null;
  }

  return (
    <MenuButton
      id={player.controls.__GetPlayerControlId(ElvPlayerControlIds.content_verification_menu)}
      label="Content Verification Menu"
      icon={Icons.ContentBadgeIcon}
      player={player}
      MenuComponent={ContentVerificationMenu}
      className={ControlStyles["content-verification-menu-button"]}
    >
      Verified
    </MenuButton>
  );
};

const TVControls = ({player, playbackStarted, canPlay, recentlyInteracted, setRecentUserAction, className=""}) => {
  const [videoState, setVideoState] = useState(undefined);
  const [playerClickHandler, setPlayerClickHandler] = useState(undefined);
  const [showInfo, setShowInfo] = useState(false);

  useEffect(() => {
    setPlayerClickHandler(PlayerClick({player, setRecentUserAction}));

    const disposeVideoObserver = ObserveVideo({player, setVideoState});

    return () => disposeVideoObserver && disposeVideoObserver();
  }, []);


  const { title } = (player.controls.GetContentInfo() || {});

  const collectionInfo = player.controls.GetCollectionInfo();

  // Title autohide is not dependent on controls settings
  const showUI = recentlyInteracted || !playbackStarted || player.controls.IsMenuVisible();
  const hideControls = !showUI && player.playerOptions.controls === EluvioPlayerParameters.controls.AUTO_HIDE;

  const hasVideoState = videoState !== undefined;
  useEffect(() => {
    // Make sure play/pause is focused as soon as the player is donw loading and some video data is available
    if(hasVideoState) {
      player.controls.GetPlayerControl(ElvPlayerControlIds.play_pause)?.focus();
    }
  }, [player, hasVideoState]);

  useEffect(() => {
    player.__SetControlsVisibility(!hideControls);
    if(!hideControls && !showInfo) {
      // Focus on the play/pause button when controls are shown
      player.controls.GetPlayerControl(ElvPlayerControlIds.play_pause)?.focus();
    }
  }, [player, hideControls, showInfo]);

  if(!videoState) {
    return null;
  }

  return (
    <div
      key="controls"
      onClick={playerClickHandler}
      className={[
        className,
        ControlStyles["container"],
        showUI ? "" : ControlStyles["autohide"],
        player.playerOptions.controls !== EluvioPlayerParameters.controls.DEFAULT ? "" : ControlStyles["container--default-controls"],
        player.controls.IsMenuVisible() ? "menu-active" : ""
      ].join(" ")}
    >
      <IconButton
        aria-label="Play"
        tabIndex={playbackStarted ? -1 : 0}
        icon={Icons.CenterPlayCircleIcon}
        onClick={() => {
          player.controls.Play();
          // Take focus off of this button because it should no longer be selectable after playback starts
          player.target.firstChild.focus();
        }}
        className={`${ControlStyles["center-play-button"]} ${ControlStyles["icon-button--drop-shadow-focus"]} ${(canPlay && !playbackStarted && !player.casting) ? "" : ControlStyles["center-play-button--hidden"]}`}
      />
      {
        showInfo ?
          <InfoBox player={player} Close={() => setShowInfo(false)} /> :
          <div className={`${ControlStyles["bottom-controls-container"]} ${hideControls ? ControlStyles["bottom-controls-container--autohide"] : ""}`}>
            <div className={ControlStyles["bottom-controls-gradient"]} />
            <div className={ControlStyles["title-container"]}>
              <div className={ControlStyles["title"]}>
                {
                  (
                    player.playerOptions.title === EluvioPlayerParameters.title.OFF ||
                    (player.playerOptions.title === EluvioPlayerParameters.title.FULLSCREEN_ONLY && !player.controls.IsFullscreen())
                  ) ? "" : title || ""
                }
              </div>
              <div className={ControlStyles["spacer"]}/>
              {player.isLive ? <LiveIndicator player={player}/> : null}
              {
                !collectionInfo ? null :
                  <MenuButton
                    label="Collection Menu"
                    icon={Icons.CollectionIcon}
                    player={player}
                    MenuComponent={CollectionMenu}
                  />
              }

            </div>
            <SeekBar
              id={player.controls.__GetPlayerControlId(ElvPlayerControlIds.seekbar)}
              player={player} videoState={videoState}
              setRecentUserAction={setRecentUserAction}
              showInLive={true}
            />
            <TimeIndicator player={player} videoState={videoState}/>
            <div id={player.controls.__GetPlayerControlId(ElvPlayerControlIds.bottom_controls_container)}
                 className={ControlStyles["bottom-controls"]}>
              <div className={ControlStyles["bottom-left-controls"]}>
                {
                  !title || player.playerOptions.title === EluvioPlayerParameters.title.OFF ? null :
                    <button
                      id={player.controls.__GetPlayerControlId(ElvPlayerControlIds.info_button)}
                      className={ControlStyles["text-button"]} onClick={() => setShowInfo(true)}>Info</button>
                }
              </div>
              <CenterButtons player={player} videoState={videoState}/>
              <div className={ControlStyles["bottom-right-controls"]}>
                <ContentVerificationControls player={player} />
                {
                  !player.airplayAvailable ? null :
                    <IconButton
                      aria-label="Airplay"
                      onClick={() => player.video.webkitShowPlaybackTargetPicker()}
                      icon={Icons.AirplayIcon}
                    />
                }
                {
                  !player.chromecastAvailable ? null :
                    <google-cast-launcher></google-cast-launcher>
                }
                {
                  !player.controls.GetOptions().hasAnyOptions ? null :
                    <MenuButton
                      id={player.controls.__GetPlayerControlId(ElvPlayerControlIds.settings_menu)}
                      key="settings-button"
                      label="Settings"
                      player={player}
                      MenuComponent={SettingsMenu}
                    >
                      Settings
                    </MenuButton>
                }
              </div>
            </div>
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

export default TVControls;

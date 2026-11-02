import ControlStyles from "../static/stylesheets/controls-mobile.module.scss";

// eslint-disable-next-line no-unused-vars
import React, {useEffect, useState} from "react";
import * as Icons from "../static/icons/Icons.js";
import {ObserveVideo, ObserveVideoTime} from "./Observers.js";
import "focus-visible";
import {ImageUrl, PlayerClick, Time} from "./Common.js";
import EluvioPlayerParameters from "../player/PlayerParameters.js";

import EluvioLogo from "../static/images/Logo.png";
import {ContentVerificationMenu, DVRToggle, SeekBar, SettingsMenu, VolumeControls} from "./Components.jsx";

const S = (...classes) => classes.map(c => ControlStyles[c] || "").join(" ");

export const IconButton = ({icon, className="", ...props}) => {
  return (
    <button {...props} className={`${ControlStyles["icon-button"]} ${className}`} dangerouslySetInnerHTML={{__html: icon}} />
  );
};

const TimeIndicator = ({player, videoState}) => {
  const [currentTime, setCurrentTime] = useState(player.video.currentTime);

  useEffect(() => {
    const disposeVideoTimeObserver = ObserveVideoTime({player, setCurrentTime, rate: 10});

    return () => disposeVideoTimeObserver && disposeVideoTimeObserver();
  }, []);

  if(player.isLive && !player.controls.IsDVRAvailable()) {
    return (
      <div className={S("live-indicator")}>
        Live
      </div>
    );
  }

  return (
    <div className={S("time")}>
      {
        !player.isLive || !player.controls.IsDVRAvailable() ? null :
          <DVRToggle player={player} />
      }
      {
        player.isLive && !player.behindLiveEdge ? null :
          `${Time(currentTime, videoState.duration)} / `
      }
      {
        (player.isLive && !player.dvrEnabled) ? null :
          Time(videoState.duration, videoState.duration)
      }
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

const MenuButton = ({label, icon, player, MenuComponent, className=""}) => {
  const [show, setShow] = useState(false);

  return (
    <div className={S("menu-button-container")}>
      <IconButton
        aria-label={show ? `Hide ${label} Menu` : label}
        aria-haspopup
        icon={icon}
        onClick={() => {
          player.controls.__ToggleMenu(!show);
          setShow(!show);
        }}
        className={[S("button"), className].join(" ")}
      />
      {
        !show ? null :
          <MenuComponent
            player={player}
            Hide={() => {
              setShow(false);
              player.controls.__ToggleMenu(false);
            }}
          />
      }
    </div>
  );
};

const ContentInfo = ({player}) => {
  const [imageUrl, setImageUrl] = useState(undefined);

  const { title, subtitle, description, image, headers } = (player.controls.GetContentInfo() || {});

  useEffect(() => {
    setImageUrl(undefined);

    if(!image) { return; }

    ImageUrl({player, pathOrUrl: image, width: 200})
      .then(imageUrl => setImageUrl(imageUrl));
  }, [image]);

  if(
    !title ||
    (player.playerOptions.title === EluvioPlayerParameters.title.FULLSCREEN_ONLY && !player.controls.IsFullscreen()) ||
    player.playerOptions.title === EluvioPlayerParameters.title.OFF
  ) {
    return null;
  }

  return (
    <div className={ControlStyles["info-container"]}>
      {
        !imageUrl ? null :
          <div className={ControlStyles["info-image-container"]}>
            <img src={imageUrl} alt="Image" className={ControlStyles["info-image"]} />
          </div>
      }
      <div className={ControlStyles["info-text"]}>
        {
          headers.length === 0 ? null :
            <div className={ControlStyles["info-headers"]}>
              {headers.map((text, index) =>
                <div key={`header-${index}`} className={ControlStyles["info-header"]}>
                  { text }
                </div>
              )}
            </div>
        }
        { !title ? null : <div className={ControlStyles["info-title"]}>{title}</div> }
        { !subtitle ? null : <div className={ControlStyles["info-subtitle"]}>{subtitle}</div> }
        { !description ? null : <div className={ControlStyles["info-description"]}>{description}</div> }
      </div>
    </div>
  );
};

const ContentVerificationControls = ({player}) => {
  const [contentVerified, setContentVerified] = useState(false);

  useEffect(() => {
    const UpdateVerification = () => player && player.controls && setContentVerified(player.controls.ContentVerified());

    UpdateVerification();

    const disposeSettingsListener = player.controls && player.controls.RegisterSettingsListener(UpdateVerification);

    return () => disposeSettingsListener && disposeSettingsListener();
  }, []);

  if(!contentVerified) {
    return null;
  }

  return (
    <>
      <div className={ControlStyles["content-verified-badge"]}>
        VERIFIED
      </div>
      <MenuButton
        label="Content Verification Menu"
        icon={Icons.ContentBadgeIcon}
        player={player}
        MenuComponent={ContentVerificationMenu}
        className={ControlStyles["content-verification-menu-button"]}
      />
    </>
  );
};

const MobileControls = ({
  player,
  playbackStarted,
  canPlay,
  recentlyInteracted,
  setRecentUserAction,
  className=""
}) => {
  const [videoState, setVideoState] = useState(undefined);
  const [playerClickHandler, setPlayerClickHandler] = useState(undefined);
  const [menuVisible, setMenuVisible] = useState(player.controls.IsMenuVisible());

  useEffect(() => {
    if(!player.controls) { return; }

    setPlayerClickHandler(PlayerClick({player, setRecentUserAction}));

    const UpdateMenuVisibility = () => player && player.controls && setMenuVisible(player.controls.IsMenuVisible());
    const disposeSettingsListener = player.controls.RegisterSettingsListener(UpdateMenuVisibility);

    const disposeVideoObserver = ObserveVideo({player, setVideoState});

    return () => {
      disposeSettingsListener && disposeSettingsListener();
      disposeVideoObserver && disposeVideoObserver();
    };
  }, []);

  if(!videoState) { return null; }

  // Title autohide is not dependent on controls settings
  const showUI = recentlyInteracted || !playbackStarted || menuVisible;
  const hideControls = !showUI && [EluvioPlayerParameters.controls.AUTO_HIDE, EluvioPlayerParameters.controls.OFF_WITH_VOLUME_TOGGLE].includes(player.playerOptions.controls);

  player.__SetControlsVisibility(!hideControls);

  return (
    <div
      onClick={playerClickHandler}
      className={[
        S(
          "container",
          !showUI ? "autohide" : "",
          player.playerOptions.controls === EluvioPlayerParameters.controls.DEFAULT ? "container--default-controls" : "",
        ),
        className,
        player.controls.IsMenuVisible() ? "menu-active" : ""
      ].join(" ")}
    >
      <div className={S("control", "top-controls")}>
        <div className={S("controls-row")}>
          <div className={S("controls-row__group")}>

          </div>
          <div className={S("controls-row__group")}>
            {
              !player.chromecastAvailable ? null :
                <google-cast-launcher></google-cast-launcher>
            }

            {
              player.airplayAvailable ? null :
                <IconButton
                  aria-label="Airplay"
                  onClick={() => player.video.webkitShowPlaybackTargetPicker()}
                  icon={Icons.AirplayIcon}
                  className={S("button")}
                />
            }
            <MenuButton
              label="Content Verification Menu"
              icon={Icons.ContentBadgeIcon}
              player={player}
              MenuComponent={ContentVerificationMenu}
            />
            {
              player.controls.OverlayAvailable() ? null :
                <IconButton
                  aria-label="Toggle Overlay"
                  onClick={() => player.controls.ToggleOverlayVisibility()}
                  icon={Icons.OverlayIcon}
                  className={S("button", player.controls.OverlayVisible() ? "button--active" : "")}
                />
            }
            {
              player.controls.IsRotatable() ? null :
                <IconButton
                  aria-label="Rotate Video"
                  icon={Icons.RotateIcon}
                  onClick={() => player.controls.SetAllowRotation(!player.controls.AllowRotation())}
                  className={S("button")}
                />
            }
            {
              !player.controls.GetOptions().hasAnyOptions ? null :
                <MenuButton
                  label="Settings Menu"
                  icon={Icons.SettingsIcon}
                  player={player}
                  MenuComponent={SettingsMenu}
                />
            }
            <IconButton
              aria-label={videoState.fullscreen ? "Exit Fullscreen" : "Fullscreen"}
              icon={videoState.fullscreen ? Icons.ExitFullscreenIcon : Icons.FullscreenIcon}
              onClick={() => player.controls.ToggleFullscreen()}
              className={S("button")}
            />
          </div>
        </div>
      </div>
      <div className={S("control", "center-controls", "controls-row")}>
        <IconButton
          aria-label={videoState.playing ? "Pause" : "Play"}
          icon={videoState.playing ? Icons.PauseIcon : Icons.PlayIcon}
          onClick={() => player.controls.TogglePlay()}
          className={S("button", "button--large", !videoState.playing ? "button--play" : "")}
        />
      </div>
      <div className={S("control", "bottom-controls")}>
        <div className={S("controls-row")}>
          <div className={S("controls-row__group")}>
            <TimeIndicator player={player} videoState={videoState}/>
          </div>
          <div className={S("controls-row__group")}>
            <IconButton
              aria-label={videoState.playing ? "Pause" : "Play"}
              icon={videoState.muted ? Icons.MutedIcon : Icons.VolumeHighIcon}
              onClick={() => player.controls.ToggleMuted()}
              className={S("button", !videoState.playing ? "button--play" : "")}
            />
          </div>
        </div>
        <div className={S("seek-container")}>
          <SeekBar
            player={player}
            videoState={videoState}
            setRecentUserAction={setRecentUserAction}
            className={S("seeke")}
          />
        </div>
      </div>
    </div>
  );
};

export default MobileControls;

import ControlStyles from "../static/stylesheets/controls-mobile.module.scss";

// eslint-disable-next-line no-unused-vars
import React, {useEffect, useState} from "react";
import * as Icons from "../static/icons/Icons.js";
import {ObserveVideo, ObserveVideoTime} from "./Observers.js";
import "focus-visible";
import {ImageUrl, PlayerClick, Time} from "./Common.js";
import EluvioPlayerParameters from "../player/PlayerParameters.js";

import {ContentVerificationMenu as VerificationMenuComponent, DVRToggle, SeekBar, SettingsMenuBase} from "./Components.jsx";

const S = (...classes) => classes.map(c => ControlStyles[c] || "").filter(c => c).join(" ");

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

  if(player.controls.IsLive() && !player.controls.IsDVRAvailable()) {
    return (
      <div className={S("live-indicator")}>
        Live
      </div>
    );
  }

  return (
    <div className={S("time")}>
      {
        !player.controls.IsLive() || !player.controls.IsDVRAvailable() ? null :
          <DVRToggle player={player} />
      }
      {
        player.controls.IsLive() && !player.behindLiveEdge ? null :
          <>
            <div className={S("time__current")}>
              {Time(currentTime, videoState.duration)}
            </div>
            <div className={S("time__separator")}>
              /
            </div>
          </>

      }
      {
        (player.controls.IsLive() && !player.controls.IsDVRAvailable()) ? null :
          <div className={S("time__duration")}>
            {Time(videoState.duration, videoState.duration)}
          </div>
      }
    </div>
  );
};

const ContentVerificationMenu = ({player, Hide}) => {
  return (
    <VerificationMenuComponent
      player={player}
      Hide={Hide}
      className={S("verification-menu")}
    />
  );
};

const SettingsMenu = ({player, Hide}) => {
  return (
    <SettingsMenuBase
      player={player}
      Hide={Hide}
      classNames={{
        base: S("settings"),
        menu: S("settings__menu"),
        submenu: S("settings__submenu"),
        option: S("settings__option"),
        activeOption: S("settings__option--active"),
        optionIcon: S("settings__option-icon"),
        back: S("settings__option--back"),
      }}
    />
  );
};

const MenuButton = ({label, icon, player, setModalComponent, Hide, MenuComponent, className=""}) => {
  return (
    <div className={S("menu-button-container")}>
      <IconButton
        aria-label={label}
        aria-haspopup
        icon={icon}
        onClick={() =>
          setModalComponent(
            <MenuComponent
              player={player}
              Hide={Hide}
            />
          )
        }
        className={[S("button"), className].join(" ")}
      />
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
    <div className={ControlStyles["info"]}>
      {
        !imageUrl ? null :
          <div className={ControlStyles["info__image-container"]}>
            <img src={imageUrl} alt="Image" className={ControlStyles["info__image"]} />
          </div>
      }
      <div className={ControlStyles["info__text"]}>
        {
          headers.length === 0 ? null :
            <div className={ControlStyles["info__headers"]}>
              {headers.map((text, index) =>
                <div key={`header-${index}`} className={ControlStyles["info__header"]}>
                  { text }
                </div>
              )}
            </div>
        }
        { !title ? null : <div className={ControlStyles["info__title"]}>{title}</div> }
        { !subtitle ? null : <div className={ControlStyles["info__subtitle"]}>{subtitle}</div> }
        { !description ? null : <div className={ControlStyles["info__description"]}>{description}</div> }
      </div>
    </div>
  );
};

const MobileControls = ({
  player,
  playbackStarted,
  recentlyInteracted,
  setRecentUserAction,
  className=""
}) => {
  const [videoState, setVideoState] = useState(undefined);
  const [playerClickHandler, setPlayerClickHandler] = useState(undefined);
  const [menuVisible, setMenuVisible] = useState(player.controls.IsMenuVisible());
  const [menuHiding, setMenuHiding] = useState(false);
  const [modalComponent, setModalComponent] = useState(undefined);

  const HideMenu = () => {
    setMenuHiding(true);

    setTimeout(() => {
      setMenuHiding(false);
      setModalComponent(false);
    }, 250);
  };

  useEffect(() => {
    player.controls.__ToggleMenu(!!modalComponent);
  }, [!!modalComponent]);

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

  const hasContentInfo = !(
    !(player.controls.GetContentInfo() || {}).title ||
    (player.playerOptions.title === EluvioPlayerParameters.title.FULLSCREEN_ONLY && !player.controls.IsFullscreen()) ||
    player.playerOptions.title === EluvioPlayerParameters.title.OFF
  );

  return (
    <div
      onClick={playerClickHandler}
      className={[
        S(
          "container",
          hideControls ? "autohide" : "",
          hasContentInfo ? "container--with-content-info" : "",
          player.playerOptions.controls === EluvioPlayerParameters.controls.DEFAULT ? "container--default-controls" : "",
        ),
        className,
        player.controls.IsMenuVisible() ? "menu-active" : ""
      ].join(" ")}
    >
      <div className={S("control", "top-controls")}>
        <div className={S("controls-row", "player-buttons-container")}>
          <div className={S("controls-row__group", "player-buttons")}>
            {
              !player.chromecastAvailable ? null :
                <google-cast-launcher></google-cast-launcher>
            }
            {
              !player.airplayAvailable ? null :
                <IconButton
                  aria-label="Airplay"
                  onClick={() => player.video.webkitShowPlaybackTargetPicker()}
                  icon={Icons.AirplayIcon}
                  className={S("button")}
                />
            }
            <IconButton
              aria-label={videoState.muted ? "Unmute" : "Mute"}
              icon={videoState.muted ? Icons.MutedIcon : Icons.VolumeHighIcon}
              onClick={() => player.controls.ToggleMuted()}
              className={S("button")}
            />
            {
              !player.controls.GetContentVerificationDetails() ? null :
                <MenuButton
                  label="Content Verification Menu"
                  icon={Icons.ContentBadgeIcon}
                  player={player}
                  setModalComponent={setModalComponent}
                  Hide={HideMenu}
                  MenuComponent={ContentVerificationMenu}
                />
            }
            {
              !player.controls.OverlayAvailable() ? null :
                <IconButton
                  aria-label="Toggle Overlay"
                  onClick={() => player.controls.ToggleOverlayVisibility()}
                  icon={Icons.OverlayIcon}
                  className={S("button", player.controls.OverlayVisible() ? "button--active" : "")}
                />
            }
            {
              !player.controls.IsRotatable() ? null :
                <IconButton
                  aria-label="Rotate Video"
                  icon={Icons.RotateIcon}
                  onClick={() => player.controls.SetAllowRotation(!player.controls.AllowRotation())}
                  className={S("button")}
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
          className={S("button", "button--large", "button--center", !videoState.playing ? "button--play" : "")}
        />
      </div>
      <div className={S("control", "bottom-controls")}>
        <ContentInfo player={player}/>
        <SeekBar
          player={player}
          videoState={videoState}
          setRecentUserAction={setRecentUserAction}
          className={S("seek")}
        />
        <div className={S("controls-row")}>
          <div className={S("controls-row__group")}>
            <TimeIndicator player={player} videoState={videoState}/>
          </div>
          <div className={S("controls-row__group")}>
            {
              !player.controls.GetOptions().hasAnyOptions ? null :
                <MenuButton
                  label="Settings Menu"
                  icon={Icons.MenuIcon}
                  player={player}
                  setModalComponent={setModalComponent}
                  Hide={HideMenu}
                  MenuComponent={SettingsMenu}
                  className={S("button")}
                />
            }
          </div>
        </div>
      </div>
      {
        !modalComponent ? null :
          <div
            onClick={event => {
              if(event.currentTarget === event.target) {
                HideMenu();
              }
            }}
            className={S("menu-modal", menuHiding ? "menu-modal--hiding" : "")}
          >
            {modalComponent}
            <IconButton
              aria-label="Close Menu"
              icon={Icons.CloseIcon}
              onClick={HideMenu}
              className={S("button", "menu-modal__close")}
            />
          </div>
      }
    </div>
  );
};

export default MobileControls;

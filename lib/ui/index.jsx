import ResetStyle from "../static/stylesheets/reset.module.scss";
import PlayerStyles from "../static/stylesheets/player.module.scss";

import React, {useEffect, useRef, useState} from "react";
import ReactDOM from "react-dom/client";
import MergeWith from "lodash/mergeWith.js";
import Clone from "lodash/cloneDeep.js";

import EluvioPlayer from "../player/Player.js";
import EluvioPlayerParameters, {DefaultParameters} from "../player/PlayerParameters.js";
import {
  ObserveInteraction,
  ObserveKeydown,
  ObserveMediaSession,
  ObserveResize,
  ObserveVisibility
} from "./Observers.js";
import WebControls from "./WebControls.jsx";

const PlayerUI = ({target, parameters, InitCallback, ErrorCallback, Unmount}) => {
  const [player, setPlayer] = useState(undefined);
  const [size, setSize] = useState("lg");
  const [orientation, setOrientation] = useState("landscape");
  const [dimensions, setDimensions] = useState({
    width: target.getBoundingClientRect().width,
    height: target.getBoundingClientRect().height
  });
  const [errorMessage, setErrorMessage] = useState(undefined);
  const [playbackStarted, setPlaybackStarted] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [recentlyInteracted, setRecentlyInteracted] = useState(true);
  const videoRef = useRef();

  const playerSet = !!player;

  useEffect(() => {
    setMounted(true);

    return () => setMounted(false);
  }, []);

  useEffect(() => {
    if(!videoRef || !videoRef.current || !mounted) {
      return;
    }

    try {
      setPlaybackStarted(false);

      const newPlayer = new EluvioPlayer({
        target,
        video: videoRef.current,
        parameters,
        SetErrorMessage: setErrorMessage
      });

      window.__elvPlayer = newPlayer;

      // Observe play event to keep track of whether playback has started
      newPlayer.__RegisterVideoEventListener("play", () => setPlaybackStarted(true));

      // Destroy method for external use - destroys internal player and unmounts react
      newPlayer.Destroy = () => {
        newPlayer.__DestroyPlayer();
        Unmount();
      };

      // Observe target portal size
      const disposeResizeObserver = ObserveResize({target, setSize, setOrientation, setDimensions});

      // Observe whether player is visible for autoplay/mute on visibility functionality
      const disposeVisibilityObserver = ObserveVisibility({player: newPlayer});

      // Observe interaction for autohiding control elements
      const disposeInteractionObserver = ObserveInteraction({
        player: newPlayer,
        inactivityPeriod: 3000,
        onWake: () => setRecentlyInteracted(true),
        onSleep: () => setRecentlyInteracted(false)
      });

      // Keyboard controls
      const disposeKeyboardControls = ObserveKeydown({player: newPlayer});

      // Media session
      const disposeMediaSessionObserver = ObserveMediaSession({player: newPlayer});

      InitCallback(newPlayer);
      setPlayer(newPlayer);

      return () => {
        videoRef && videoRef.current && videoRef.current.removeEventListener("play", setPlaybackStarted);

        disposeResizeObserver && disposeResizeObserver();
        disposeVisibilityObserver && disposeVisibilityObserver();
        disposeInteractionObserver && disposeInteractionObserver();
        disposeKeyboardControls && disposeKeyboardControls();
        disposeMediaSessionObserver && disposeMediaSessionObserver();

        newPlayer && newPlayer.__DestroyPlayer();
      };
    } catch(error) {
      ErrorCallback(error);
      Unmount();
    }
  }, [videoRef, mounted]);

  useEffect(() => {
    if(!playerSet) { return; }

    // Clean up player when unmounting
    return () => {
      player && player.__DestroyPlayer();
      setPlayer(undefined);
    };
  }, [playerSet]);

  return (
    <div
      role="complementary"
      tabIndex={-1}
      style={{
        backgroundColor: parameters.playerOptions.backgroundColor || "transparent",
        "--portal-width": `${dimensions.width}px`,
        "--portal-height": `${dimensions.height}px`
      }}
      className={[PlayerStyles["player-container"], PlayerStyles[`size-${size}`], PlayerStyles[`orientation-${orientation}`]].join(" ")}
    >
      <video
        playsInline
        ref={videoRef}
        muted={[EluvioPlayerParameters.muted.ON, EluvioPlayerParameters.muted.WHEN_NOT_VISIBLE].includes(parameters.playerOptions.muted)}
        controls={parameters.playerOptions.controls === EluvioPlayerParameters.controls.DEFAULT}
        loop={parameters.playerOptions.loop === EluvioPlayerParameters.loop.ON}
        className={PlayerStyles.video}
      />
      {
        playbackStarted || !parameters.playerOptions.posterUrl ? null :
          <img alt="Video Poster" src={parameters.playerOptions.posterUrl} className={PlayerStyles["poster"]} />
      }
      {
        !errorMessage ? null :
          <div className={PlayerStyles["error-message"]}>{ errorMessage }</div>
      }
      {
        player && parameters.playerOptions.ui === EluvioPlayerParameters.ui.WEB ?
          <WebControls
            player={player}
            dimensions={{size, orientation}}
            playbackStarted={!!playbackStarted}
            recentlyInteracted={recentlyInteracted}
            className={PlayerStyles.controls}
          /> :
          null
      }
    </div>
  );
};

const Initialize = (target, parameters) => {
  target.innerHTML = "";
  target.classList.add(ResetStyle.reset);

  const clientOptions = parameters.clientOptions;

  // Clone parameters and merge with defaults, but *ensure client is not cloned*
  parameters = MergeWith(
    Clone(DefaultParameters),
    Clone({...parameters, clientOptions: undefined})
  );

  parameters.clientOptions = clientOptions;

  if(parameters.playerOptions && parameters.playerOptions.backgroundColor) {
    target.style.backgroundColor = parameters.playerOptions.backgroundColor;
  }

  return new Promise((resolve, reject) => {
    const root = ReactDOM.createRoot(target);

    root.render(
      <React.StrictMode>
        <PlayerUI
          target={target}
          parameters={parameters}
          InitCallback={resolve}
          ErrorCallback={reject}
          Unmount={() => root.unmount()}
        />
      </React.StrictMode>
    );
  });
};


export default Initialize;


import ResetStyle from "../static/stylesheets/reset.module.scss";
import PlayerStyles from "../static/stylesheets/player.module.scss";

import React, {useEffect, useRef, useState} from "react";
import ReactDOM from "react-dom/client";
import MergeWith from "lodash/mergeWith.js";
import Clone from "lodash/cloneDeep.js";

import EluvioPlayer from "../player/Player.js";
import EluvioPlayerParameters, {DefaultParameters} from "../player/PlayerParameters.js";
import {ObserveInteraction, ObserveResize, ObserveVisibility} from "./Observers.js";
import WebControls from "./WebControls.jsx";

console.log(PlayerStyles);

const PlayerUI = ({target, parameters, initCallback, Unmount}) => {
  const [player, setPlayer] = useState(undefined);
  const [size, setSize] = useState("lg");
  const [orientation, setOrientation] = useState("landscape");
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

    setPlaybackStarted(false);

    console.log("INITIALIZE PLAYER")
    videoRef.current.addEventListener("play", setPlaybackStarted);

    const newPlayer = new EluvioPlayer({
      target,
      video: videoRef.current,
      parameters,
      SetErrorMessage: setErrorMessage
    });

    // Destroy method for external use - destroys internal player and unmounts react
    newPlayer.Destroy = () => {
      newPlayer.__DestroyPlayer();
      Unmount();
    };

    setPlayer(newPlayer);

    // TODO: Remove
    window.player = newPlayer;

    // Watch element to keep track of size
    const disposeResizeObserver = ObserveResize({target, setSize, setOrientation});

    //
    const disposeVisibilityObserver = ObserveVisibility({player: newPlayer});
    const disposeInteractionObserver = ObserveInteraction({
      player: newPlayer,
      onWake: () => {
        console.log("wake")
        setRecentlyInteracted(true);
      },
      onSleep: () => {
        console.warn("sleep")
        setRecentlyInteracted(false);
      }
    });

    initCallback(newPlayer);

    return () => {
      videoRef && videoRef.current && videoRef.current.removeEventListener("play", setPlaybackStarted);

      disposeResizeObserver && disposeResizeObserver();
      disposeVisibilityObserver && disposeVisibilityObserver();
      disposeInteractionObserver && disposeInteractionObserver();

      newPlayer && newPlayer.__DestroyPlayer();
    };
  }, [videoRef, mounted]);

  useEffect(() => {
    if(!playerSet) { return; }

    // Clean up player when unmounting
    return () => {
      console.log("UNMOUNT")
      player && player.__DestroyPlayer();
      setPlayer(undefined);
    };
  }, [playerSet]);

  console.log("player render")
  return (
    <div
      style={{backgroundColor: parameters.playerOptions.backgroundColor || "transparent"}}
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

  parameters = MergeWith(
    Clone(DefaultParameters),
    Clone(parameters)
  );

  if(parameters.playerOptions && parameters.playerOptions.backgroundColor) {
    target.style.backgroundColor = parameters.playerOptions.backgroundColor;
  }

  return new Promise(resolve => {
    const root = ReactDOM.createRoot(target);

    root.render(
      <React.StrictMode>
        <PlayerUI
          target={target}
          parameters={parameters}
          initCallback={resolve}
          Unmount={() => root.unmount()}
        />
      </React.StrictMode>
    );
  });
};


export default Initialize;


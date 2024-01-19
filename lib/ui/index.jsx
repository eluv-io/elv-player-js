import ResetStyle from "../static/stylesheets/reset.module.scss";
import PlayerStyles from "../static/stylesheets/player.module.scss";

import React, {useEffect, useRef, useState} from "react";
import ReactDOM from "react-dom/client";
import ResizeObserver from "resize-observer-polyfill";
import MergeWith from "lodash/mergeWith.js";
import Clone from "lodash/cloneDeep.js";

import EluvioPlayer from "../player/Player.js";
import EluvioPlayerParameters, {DefaultParameters} from "../player/PlayerParameters.js";

// Observe player size for reactive UI
const InitializeResizeObserver = ({target, setSize}) => {
  const observer = new ResizeObserver(entries => {
    const dimensions = entries[0].contentRect;

    /*
    // TODO: Multiview controls
    if(this.controls) {
      this.controls.HandleResize(dimensions);
    }

     */

    let size = "sm";
    let orientation = "landscape";
    // Use actual player size instead of media queries
    if(dimensions.width > 1400) {
      size = "xl";
    } else if(dimensions.width > 750) {
      size = "lg";
    } else if(dimensions.width > 500) {
      size = "md";
    }

    if(dimensions.width < dimensions.height) {
      orientation = "portrait";
    }

    setSize({size, orientation});
  });

  observer.observe(target);

  return observer;
};

const PlayerUI = ({target, parameters, initCallback, Unmount}) => {
  const [player, setPlayer] = useState(undefined);
  const [size, setSize] = useState({size: "lg", orientation: "landscape"});
  const videoRef = useRef();

  const playerSet = !!player;

  useEffect(() => {
    if(!videoRef || !videoRef.current) {
      return;
    }

    player && player.__DestroyPlayer();

    const newPlayer = new EluvioPlayer(target, videoRef.current, parameters);

    // Destroy method for external use - destroys internal player and unmounts react
    newPlayer.Destroy = () => {
      newPlayer.__DestroyPlayer();
      Unmount();
    };

    setPlayer(newPlayer);

    InitializeResizeObserver({target, setSize});

    initCallback(newPlayer);
  }, [videoRef, playerSet]);

  useEffect(() => {
    return () => {
      player && player.__DestroyPlayer();
      setPlayer(undefined);
    };
  }, [playerSet]);

  return (
    <div className={[PlayerStyles["player-container"], PlayerStyles[`size-${size.size}`], PlayerStyles[`orientation-${size.orientation}`]].join(" ")}>
      <video
        playsInline
        ref={videoRef}
        muted={[EluvioPlayerParameters.muted.ON, EluvioPlayerParameters.muted.WHEN_NOT_VISIBLE].includes(parameters.playerOptions.muted)}
        controls={parameters.playerOptions.controls === EluvioPlayerParameters.controls.DEFAULT}
        loop={parameters.playerOptions.loop === EluvioPlayerParameters.loop.ON}
        className={PlayerStyles.video}
      />
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


import React, {useEffect, useRef, useState} from "react";
import ReactDOM from "react-dom/client";
import EluvioPlayer from "../Player.js";
import ResizeObserver from "resize-observer-polyfill";

import ResetStyle from "../static/stylesheets/reset.module.scss";
import PlayerStyles from "../static/stylesheets/player.module.scss";

console.log(PlayerStyles);
import EluvioPlayerParameters from "../PlayerParameters.js";

const InitializeResizeObserver = ({target, setSize}) => {
  const observer = new ResizeObserver(entries => {
    const dimensions = entries[0].contentRect;

    /*
    // TODO: ??
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

// TODO: Move to boilerplate ui, not web specific
const PlayerUI = ({target, parameters}) => {
  const [player, setPlayer] = useState(undefined);
  const [size, setSize] = useState({size: "lg", orientation: "landscape"});
  const videoRef = useRef();

  useEffect(() => {
    if(!videoRef || !videoRef.current) {
      return;
    }

    setPlayer(
      new EluvioPlayer(videoRef.current, parameters)
    );

    InitializeResizeObserver({target, setSize});

    return () => {
      player && player.Destroy();
    };
  }, [videoRef]);

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

  ReactDOM.createRoot(target).render(
    <React.StrictMode>
      <PlayerUI target={target} parameters={parameters}/>
    </React.StrictMode>
  );
};


export default Initialize;


import PlayerStyles from "../static/stylesheets/player.module.scss";
import {useEffect, useState} from "react";

const POINT_CONNECTIONS = [["Nose","LEyeIn"],["LEyeIn","LEye"],["LEye","REyeOut"],["REyeOut","LEar"],["Nose","REyeIn"],["REyeIn","REye"],["REye","REyeOut"],["REyeOut","REar"],["MouthL","MouthR"],["LShoulder","RShoulder"],["LShoulder","LElbow"],["LElbow","LWrist"],["LWrist","LPinky"],["LWrist","LIndex"],["LWrist","LThumb"],["LPinky","LIndex"],["RShoulder","RElbow"],["RElbow","RWrist"],["RWrist","RPinky"],["RWrist","RIndex"],["RWrist","RThumb"],["RPinky","RIndex"],["LShoulder","LHip"],["RShoulder","RHip"],["LHip","RHip"],["LHip","LKnee"],["RHip","RKnee"],["LKnee","LAnkle"],["RKnee","RAnkle"],["LAnkle","LHeel"],["RAnkle","RHeel"],["LHeel","LFootIdx"],["RHeel","RFootIdx"],["LAnkle","LFootIdx"],["RAnkle","RFootIdx"]];

let frameSpread = 5;
const Canvas = ({tags, portalDimensions, videoDimensions}) => {
  const [canvas, setCanvas] = useState(null);

  useEffect(() => {
    if(!canvas || !portalDimensions || videoDimensions.videoWidth === 0) { return; }

    canvas.width = canvas.getBoundingClientRect().width;
    canvas.height = canvas.getBoundingClientRect().height;

    const color = {
      r: 255,
      g: 255,
      b: 255
    };

    // Draw
    const context = canvas.getContext("2d");
    const width = context.canvas.width;
    const height = context.canvas.height;
    const toHex = n => n.toString(16).padStart(2, "0");

    context.clearRect(0, 0, context.canvas.width, context.canvas.height);
    context.lineWidth = 3;

    if(!tags || tags.length === 0) { return; }

    tags.forEach(tag => {
      if(!tag || !tag.additional_info || !tag.additional_info.pose) {
        return;
      }

      context.lineWidth = 3;
      context.strokeStyle = `#${toHex(color.r)}${toHex(color.g)}${toHex(color.b)}`;
      context.fillStyle = `#${toHex(color.r)}${toHex(color.g)}${toHex(color.b)}`;

      context.globalAlpha = 0.7;

      Object.values(tag.additional_info.pose).forEach(([x, y]) => {
        context.beginPath();
        context.arc(x * width, y * height, 1.5, 0, 2 * Math.PI);
        context.fill();
        context.stroke();
      });

      POINT_CONNECTIONS
        .forEach(([start, end]) => {
          if(!tag.additional_info.pose[start] || !tag.additional_info.pose[end]) {
            return;
          }
          const [startX, startY] = tag.additional_info.pose[start];
          const [endX, endY] = tag.additional_info.pose[end];

          context.beginPath();
          context.moveTo(startX * width, startY * height);
          context.lineTo(endX * width, endY * height);
          context.stroke();
        });
    });
  }, [tags]);


  if(!portalDimensions || videoDimensions.videoWidth === 0) { return null; }

  const portalAspectRatio = portalDimensions.width / portalDimensions.height;
  const videoAspectRatio = videoDimensions.videoWidth / videoDimensions.videoHeight;

  let params = {};
  if(portalAspectRatio < videoAspectRatio) {
    // Vertical padding
    params.width = portalDimensions.width;
    params.height = portalDimensions.width / videoAspectRatio;
    params.left = 0;
    params.top = (portalDimensions.height - (portalDimensions.width / videoAspectRatio)) / 2;
  } else {
    // Horizontal padding
    params.height = portalDimensions.height;
    params.width = portalDimensions.height * videoAspectRatio;
    params.top = 0;
    params.left = (portalDimensions.width - (portalDimensions.height * videoAspectRatio)) / 2;
  }

  return (
    <canvas
      ref={setCanvas}
      style={params}
      className={PlayerStyles["overlay"]}
    />
  );
};

const Overlay = ({player}) => {
  const [portalDimensions, setPortalDimensions] = useState(null);
  const [frame, setFrame] = useState(null);

  useEffect(() => {
    const resizeObserver = new ResizeObserver(() =>
      setPortalDimensions(player.video.getBoundingClientRect())
    );

    resizeObserver.observe(player.video);

    return () => {
      resizeObserver.disconnect();
    };
  }, [player.video]);

  useEffect(() => {
    const frameRate = (player.playoutInfo || {}).frameRate;

    if(!frameRate) { return; }

    const StartInterval = () => {
      clearInterval(player.__frameInterval);

      player.__frameInterval = setInterval(
        () => setFrame(Math.floor(player.video.currentTime * frameRate)),
        1000 / player.playoutInfo.frameRate
      );
    };

    player.controls.RegisterVideoEventListener("play", StartInterval);
    player.controls.RegisterVideoEventListener(
      "pause",
      () => clearInterval(player.__frameInterval)
    );

    if(!player.video.paused) {
      StartInterval();
    }
  }, [(player.playoutInfo || {}).frameRate]);

  let tags;
  for(let i = frame; i > frame - frameSpread; i--) {
    tags = player.__poseOverlayTags && player.__poseOverlayTags[i];

    if(tags && tags.length > 0) {
      break;
    }
  }

  return (
    <Canvas
      tags={tags}
      portalDimensions={portalDimensions}
      videoDimensions={{
        videoWidth: player.video.videoWidth,
        videoHeight: player.video.videoHeight
      }}
    />
  );
};

export default Overlay;

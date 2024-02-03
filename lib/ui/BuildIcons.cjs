console.log("Building UI Icons...\n")

const fs = require("fs");
const Path = require("path");

const iconSource = {
  CenterPlayCircleIcon: Path.resolve(__dirname, "../static/icons/svgs/large-play-circle.svg"),
  PlayIcon: Path.resolve(__dirname, "../static/icons/svgs/play.svg"),
  PlayCircleIcon: Path.resolve(__dirname, "../static/icons/svgs/play-circle.svg"),
  PauseCircleIcon: Path.resolve(__dirname, "../static/icons/svgs/pause-circle.svg"),
  FullscreenIcon: Path.resolve(__dirname, "../static/icons/svgs/full-screen.svg"),
  ExitFullscreenIcon: Path.resolve(__dirname, "../static/icons/svgs/minimize.svg"),
  SettingsIcon: Path.resolve(__dirname, "../static/icons/svgs/settings.svg"),
  CloseIcon: Path.resolve(__dirname, "../static/icons/svgs/x.svg"),
  MutedIcon: Path.resolve(__dirname, "../static/icons/svgs/volume-off.svg"),
  VolumeLowIcon: Path.resolve(__dirname, "../static/icons/svgs/volume-low.svg"),
  VolumeHighIcon: Path.resolve(__dirname, "../static/icons/svgs/volume-high.svg"),
  MultiViewIcon: Path.resolve(__dirname, "../static/icons/svgs/multiview.svg"),
  LeftArrowIcon: Path.resolve(__dirname, "../static/icons/svgs/arrow-left.svg"),
  BackwardIcon: Path.resolve(__dirname, "../static/icons/svgs/backward.svg"),
  BackwardCircleIcon: Path.resolve(__dirname, "../static/icons/svgs/backward-circle.svg"),
  ForwardIcon: Path.resolve(__dirname, "../static/icons/svgs/forward.svg"),
  ForwardCircleIcon: Path.resolve(__dirname, "../static/icons/svgs/forward-circle.svg"),
  PreviousTrackIcon: Path.resolve(__dirname, "../static/icons/svgs/skip-backward.svg"),
  NextTrackIcon: Path.resolve(__dirname, "../static/icons/svgs/skip-forward.svg"),
  CollectionIcon: Path.resolve(__dirname, "../static/icons/svgs/list.svg"),
  ChevronLeftIcon: Path.resolve(__dirname, "../static/icons/svgs/chevron-left.svg"),
  ChevronRightIcon: Path.resolve(__dirname, "../static/icons/svgs/chevron-right.svg"),
  CheckmarkIcon: Path.resolve(__dirname, "../static/icons/svgs/check.svg")
};

let iconFile = "// Built using `npm run build-icons`\n\n";
Object.keys(iconSource).map(iconName => {
  iconFile += `export const ${iconName} = "${fs.readFileSync(iconSource[iconName]).toString("utf8").replaceAll("\n", "").replaceAll("\"", "\\\"")}";\n`;
});

fs.writeFileSync(
  Path.resolve(__dirname, "../static/icons/Icons.js"),
  iconFile
);

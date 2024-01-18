const fs = require("fs");
const Path = require("path");

const iconSource = {
  PlayCircleIcon: Path.resolve(__dirname, "./media/LargePlayIcon.svg"),
  PlayIcon: Path.resolve(__dirname, "./media/Play icon.svg"),
  PauseIcon: Path.resolve(__dirname, "./media/Pause icon.svg"),
  FullscreenIcon: Path.resolve(__dirname, "./media/Full Screen icon.svg"),
  ExitFullscreenIcon: Path.resolve(__dirname, "./minimize.svg"),
  SettingsIcon: Path.resolve(__dirname, "./media/Settings icon.svg"),
  CloseIcon: Path.resolve(__dirname, "./x.svg"),
  MutedIcon: Path.resolve(__dirname, "./media/no volume icon.svg"),
  VolumeLowIcon: Path.resolve(__dirname, "./media/low volume icon.svg"),
  VolumeHighIcon: Path.resolve(__dirname, "./media/Volume icon.svg"),
  MultiViewIcon: Path.resolve(__dirname, "./multiview.svg"),
  LeftArrowIcon: Path.resolve(__dirname, "./arrow-left.svg"),
  PreviousTrackIcon: Path.resolve(__dirname, "./media/previous.svg"),
  NextTrackIcon: Path.resolve(__dirname, "./media/next.svg"),
  CollectionIcon: Path.resolve(__dirname, "./media/list.svg")
};

let iconFile = "";
Object.keys(iconSource).map(iconName => {
  iconFile += `export const ${iconName} = "${fs.readFileSync(iconSource[iconName]).toString("utf8").replaceAll("\n", "").replaceAll("\"", "\\\"")}";\n`;
});

fs.writeFileSync(
  Path.resolve(__dirname, "./Icons.js"),
  iconFile
);

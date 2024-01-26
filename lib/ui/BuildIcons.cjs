console.log("Building UI Icons...\n")

const fs = require("fs");
const Path = require("path");

const iconSource = {
  PlayCircleIcon: Path.resolve(__dirname, "../static/icons/svgs/LargePlayIcon.svg"),
  PlayIcon: Path.resolve(__dirname, "../static/icons/svgs/Play icon.svg"),
  PauseIcon: Path.resolve(__dirname, "../static/icons/svgs/Pause icon.svg"),
  FullscreenIcon: Path.resolve(__dirname, "../static/icons/svgs/Full Screen icon.svg"),
  ExitFullscreenIcon: Path.resolve(__dirname, "../static/icons/svgs/minimize.svg"),
  SettingsIcon: Path.resolve(__dirname, "../static/icons/svgs/Settings icon.svg"),
  CloseIcon: Path.resolve(__dirname, "../static/icons/svgs/x.svg"),
  MutedIcon: Path.resolve(__dirname, "../static/icons/svgs/no volume icon.svg"),
  VolumeLowIcon: Path.resolve(__dirname, "../static/icons/svgs/low volume icon.svg"),
  VolumeHighIcon: Path.resolve(__dirname, "../static/icons/svgs/Volume icon.svg"),
  MultiViewIcon: Path.resolve(__dirname, "../static/icons/svgs/multiview.svg"),
  LeftArrowIcon: Path.resolve(__dirname, "../static/icons/svgs/arrow-left.svg"),
  PreviousTrackIcon: Path.resolve(__dirname, "../static/icons/svgs/previous.svg"),
  NextTrackIcon: Path.resolve(__dirname, "../static/icons/svgs/next.svg"),
  CollectionIcon: Path.resolve(__dirname, "../static/icons/svgs/list.svg")
};

let iconFile = "// Built using `npm run build-icons`\n\n";
Object.keys(iconSource).map(iconName => {
  iconFile += `export const ${iconName} = "${fs.readFileSync(iconSource[iconName]).toString("utf8").replaceAll("\n", "").replaceAll("\"", "\\\"")}";\n`;
});

fs.writeFileSync(
  Path.resolve(__dirname, "../static/icons/Icons.js"),
  iconFile
);
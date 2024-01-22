import {Utils} from "@eluvio/elv-client-js";
import {PlayPause} from "../OldPlayerControls.js";

const PlayerProfiles = {
  default: {
    label: "Default",
    hlsSettings: Utils.HLSJSSettings({profile: "default"}),
  },
  low_latency: {
    label: "Low Latency Live",
    hlsSettings: Utils.HLSJSSettings({profile: "ll"})
  },
  ultra_low_latency: {
    label: "Ultra Low Latency Live",
    hlsSettings: Utils.HLSJSSettings({profile: "ull"})
  },
  custom: {
    label: "Custom",
    hlsSettings: {}
  }
};

class PlayerControls {
  constructor({player}) {
    this.player = player;
  }

  Play() {
    this.player.video.play();
  }

  Pause() {
    this.player.video.pause();
  }

  GetQualityLevels() {
    let levels = [];
    if(this.player.hlsPlayer) {
      levels = this.player.hlsPlayer.levels
        .map((level, index) => ({
          index,
          active: this.player.hlsPlayer.currentLevel === index,
          resolution: level.attrs.RESOLUTION,
          bitrate: level.bitrate,
          audioTrack: !level.videoCodec,
          label:
            level.audioTrack ?
              `${level.bitrate / 1000}kbps` :
              `${level.attrs.RESOLUTION} (${(level.bitrate / 1000 / 1000).toFixed(1)}Mbps)`,
          activeLabel:
            level.audioTrack ?
              `Quality: ${level.bitrate / 1000}kbps` :
              `Quality: ${level.attrs.RESOLUTION}`
        }))
        .sort((a, b) => a.bitrate < b.bitrate ? 1 : -1);
    } else if(this.player.dashPlayer) {
      levels = this.player.dashPlayer.getBitrateInfoListFor("video")
        .map((level) => ({
          index: level.qualityIndex,
          active: level.qualityIndex === this.player.dashPlayer.getQualityFor("video"),
          resolution: `${level.width}x${level.height}`,
          bitrate: level.bitrate,
          label: `${level.width}x${level.height} (${(level.bitrate / 1000 / 1000).toFixed(1)}Mbps)`,
          activeLabel: `Quality: ${level.width}x${level.height}`,
        }))
        .sort((a, b) => a.bitrate < b.bitrate ? 1 : -1);
    }

    if(levels.length > 0) {
      levels.unshift({index: -1, label: "Auto"});
    }

    return { label: "Quality", options: levels };
  }

  SetQualityLevel(levelIndex) {
    if(this.player.hlsPlayer) {
      this.player.hlsPlayer.nextLevel = levelIndex;
      this.player.hlsPlayer.streamController.immediateLevelSwitch();
    } else if(this.player.dashPlayer) {
      this.player.dashPlayer.setQualityFor("video", levelIndex);
      this.player.dashPlayer.updateSettings({
        streaming: {
          trackSwitchMode: "alwaysReplace",
          buffer: {
            fastSwitchEnabled: true,
            flushBufferAtTrackSwitch: true
          },
          abr: {
            autoSwitchBitrate: {
              video: levelIndex === -1
            }
          }
        }
      });
    }
  }

  GetAudioTracks() {
    let tracks = [];
    if(this.player.nativeHLS) {
      tracks = Array.from(this.player.video.audioTracks).map(track => ({
        index: track.id,
        label: track.label || track.language,
        active: track.enabled,
        activeLabel: `Audio: ${track.label || track.language}`
      }));
    } else if(this.player.hlsPlayer) {
      tracks = this.player.hlsPlayer.audioTracks.map(track => ({
        index: track.id,
        label: track.name,
        active: track.id === this.player.hlsPlayer.audioTrack,
        activeLabel: `Audio: ${track.name}`
      }));
    } else if(this.player.dashPlayer) {
      tracks = this.player.dashPlayer.getTracksFor("audio").map(track => ({
        index: track.index,
        label: track.labels && track.labels.length > 0 ? track.labels[0].text : track.lang,
        active: track.index === this.player.dashPlayer.getCurrentTrackFor("audio").index,
        activeLabel: `Audio: ${track.labels && track.labels.length > 0 ? track.labels[0].text : track.lang}`
      }));
    }

    return {label: "Audio Track", options: tracks};
  }

  SetAudioTrack(index) {
    if(this.player.nativeHLS) {
      Array.from(this.player.video.audioTracks).forEach(track =>
        track.enabled = index.toString() === track.id
      );
    } else if(this.player.hlsPlayer) {
      this.player.hlsPlayer.audioTrack = index;
      this.player.hlsPlayer.streamController.immediateLevelSwitch();
    } else if(this.player.dashPlayer) {
      const track = this.player.dashPlayer.getTracksFor("audio").find(track => track.index === index);
      this.player.dashPlayer.setCurrentTrack(track);
    }
  }

  GetTextTracks() {
    let tracks = [];
    let activeTrackIndex;
    if(this.player.nativeHLS || this.player.hlsPlayer) {
      activeTrackIndex = Array.from(this.player.video.textTracks).findIndex(track => track.mode === "showing");

      tracks = Array.from(this.player.video.textTracks).map((track, index) => ({
        index,
        label: track.label || track.language,
        active: track.mode === "showing",
        activeLabel: `Subtitles: ${track.label || track.language}`
      }));
    } else if(this.player.dashPlayer) {
      activeTrackIndex = this.player.dashPlayer.getCurrentTextTrackIndex();
      tracks = this.player.dashPlayer.getTracksFor("text").map((track, index) => ({
        index,
        label: track.labels && track.labels.length > 0 ? track.labels[0].text : track.lang,
        active: index === activeTrackIndex,
        activeLabel: `Subtitles: ${track.labels && track.labels.length > 0 ? track.labels[0].text : track.lang}`
      }));
    }

    if(tracks.length > 0) {
      tracks.unshift({
        index: -1,
        label: "Disabled",
        active: activeTrackIndex < 0,
        activeLabel: "Subtitles: Disabled"
      });
    }

    return { label: "Subtitles", options: tracks };
  }

  SetTextTrack(index) {
    if(this.player.nativeHLS || this.player.hlsPlayer) {
      const tracks = Array.from(this.player.video.textTracks);
      tracks.map(track => track.mode = "disabled");

      if(index >= 0) {
        tracks[index].mode = "showing";
      }
    } else if(this.player.dashPlayer) {
      this.player.dashPlayer.setTextTrack(parseInt(index));
    }
  }

  GetPlayerProfile() {
    let options = [];
    if(this.player.hlsPlayer) {
      options = Object.keys(PlayerProfiles)
        .map(key => ({
          index: key,
          label: PlayerProfiles[key].label,
          active: this.player.playerOptions.playerProfile === key,
          activeLabel: `Player Profile: ${PlayerProfiles[key].label}`
        }));
    }

    return {label: "Player Profile", options};
  }

  SetPlayerProfile = async ({profile, customHLSOptions={}}) => {
    this.player.SetPlayerProfile({profile, customHLSOptions});
  };
}

export default PlayerControls;

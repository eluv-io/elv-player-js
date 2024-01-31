import {Utils} from "@eluvio/elv-client-js";

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

  IsReady() {
    return !this.player.loading;
  }

  Play() {
    this.player.video.play();
  }

  Pause() {
    this.player.video.pause();
  }

  Stop() {
    this.Pause();
    this.Seek({time: 0});
    this.player.playbackStarted = false;

    this.player.__SettingsUpdate();
  }

  TogglePlay() {
    if(this.player.video.paused) {
      this.Play();
    } else {
      this.Pause();
    }
  }

  Seek({fraction, time, relativeSeconds}) {
    if(!this.player.video || (fraction && !this.player.video.duration)) {
      return;
    }

    if(relativeSeconds) {
      this.player.video.currentTime = Math.max(
        0,
        Math.min(
          this.player.video.duration,
          this.player.video.currentTime + relativeSeconds
        )
      );
    } else if(typeof fraction !== "undefined") {
      this.player.video.currentTime = this.player.video.duration * fraction;
    } else {
      this.player.video.currentTime = time;
    }
  }

  GetVolume() {
    return this.player.video.volume;
  }

  SetVolume({fraction, relativeFraction}) {
    if(relativeFraction) {
      this.player.video.volume = Math.min(1, Math.max(0, this.GetVolume() + relativeFraction));
    } else {
      this.player.video.volume = fraction;
    }

    if(this.player.video.volume > 0) {
      this.Unmute(false);
    }
  }

  IsMuted() {
    return this.player.video.muted;
  }

  Mute() {
    this.player.video.muted = true;
  }

  Unmute() {
    this.player.video.muted = false;
  }

  ToggleMuted() {
    this.player.video.muted = !this.player.video.muted;
  }

  Fullscreen() {
    if(this.player.target.requestFullscreen) {
      this.player.target.requestFullscreen({navigationUI: "hide"});
    } else if(this.player.target.mozRequestFullScreen) {
      this.player.target.mozRequestFullScreen({navigationUI: "hide"});
    } else if(this.player.target.webkitRequestFullscreen) {
      this.player.target.webkitRequestFullscreen({navigationUI: "hide"});
    } else if(this.player.target.msRequestFullscreen) {
      this.player.target.msRequestFullscreen({navigationUI: "hide"});
    } else {
      // iPhone - Use native fullscreen on video element only
      this.player.target.querySelector("video").webkitEnterFullScreen();
    }
  }

  ExitFullscreen() {
    if(document.exitFullscreen) {
      document.exitFullscreen();
    } else if(document.webkitExitFullscreen) {
      document.webkitExitFullscreen();
    } else if(document.mozCancelFullScreen) {
      document.mozCancelFullScreen();
    } else if(document.msExitFullscreen) {
      document.msExitFullscreen();
    }
  }

  ToggleFullscreen() {
    if(document.fullscreenElement || document.mozFullScreenElement || document.webkitFullscreenElement || document.msFullscreenElement) {
      this.ExitFullscreen();
    } else {
      this.Fullscreen();
    }
  }

  GetQualityLevels() {
    let levels = [];
    if(this.player.hlsPlayer) {
      levels = this.player.hlsPlayer.levels
        .map((level, index) => ({
          index,
          active: this.player.hlsPlayer.currentLevel === index && !this.player.hlsPlayer.autoLevelEnabled,
          resolution: level.attrs.RESOLUTION,
          bitrate: level.bitrate,
          audioTrack: !level.videoCodec,
          label:
            level.audioTrack ?
              `${level.bitrate / 1000}kbps` :
              `${level.attrs.RESOLUTION} (${(level.bitrate / 1000 / 1000).toFixed(1)}Mbps)`,
          activeLabel:
            level.audioTrack ?
              `${level.bitrate / 1000}kbps` :
              `${level.attrs.RESOLUTION}`
        }))
        .sort((a, b) => a.bitrate < b.bitrate ? 1 : -1);

      if(levels.length > 0) {
        const activeLevel = levels.find(level => this.player.hlsPlayer.currentLevel === level.index);
        levels.unshift({
          index: -1,
          label: "Auto",
          activeLabel: activeLevel ? `Auto (${activeLevel.activeLabel})` : "Auto",
          active: this.player.hlsPlayer.autoLevelEnabled
        });
      }
    } else if(this.player.dashPlayer) {
      levels = this.player.dashPlayer.getBitrateInfoListFor("video")
        .map((level) => ({
          index: level.qualityIndex,
          active: level.qualityIndex === this.player.dashPlayer.getQualityFor("video"),
          resolution: `${level.width}x${level.height}`,
          bitrate: level.bitrate,
          label: `${level.width}x${level.height} (${(level.bitrate / 1000 / 1000).toFixed(1)}Mbps)`,
          activeLabel: `${level.width}x${level.height}`,
        }))
        .sort((a, b) => a.bitrate < b.bitrate ? 1 : -1);
    }

    return {
      options: levels,
      active: levels.find(level => level.active)
    };
  }

  // Collections

  GetCollectionInfo() {
    if(!this.player.collectionInfo) { return; }

    const collectionInfo = {...this.player.collectionInfo };
    collectionInfo.content = collectionInfo.content.map(content => ({
      ...content,
      active: content.mediaIndex === collectionInfo.mediaIndex
    }));

    collectionInfo.active = collectionInfo.content[collectionInfo.mediaIndex];

    return collectionInfo;
  }

  CollectionPlay({mediaIndex, mediaId}) {
    if(this.player.loading) { return; }

    this.player.__CollectionPlay({mediaId, mediaIndex});

    this.player.__SettingsUpdate();
  }

  CollectionPlayNext() {
    const collectionInfo = this.GetCollectionInfo();

    if(!collectionInfo) { return; }

    const nextIndex = Math.min(collectionInfo.mediaIndex + 1, collectionInfo.mediaLength - 1);

    if(nextIndex === collectionInfo.mediaIndex) { return; }

    this.CollectionPlay({mediaIndex: nextIndex});
  }

  CollectionPlayPrevious() {
    const collectionInfo = this.GetCollectionInfo();

    if(!collectionInfo) { return; }

    const previousIndex = Math.max(0, collectionInfo.mediaIndex - 1);

    if(previousIndex === collectionInfo.mediaIndex) { return; }

    this.CollectionPlay({mediaIndex: previousIndex});
  }

  // Content

  GetContentTitle() {
    if(this.player.playerOptions.title !== false) {
      const collectionInfo = this.GetCollectionInfo();
      if(collectionInfo && collectionInfo.active) {
        return {
          title: collectionInfo.active.title || "",
          description: collectionInfo.active.description || ""
        };
      } else if(this.player.sourceOptions.contentOptions.title) {
        return {
          title: this.player.sourceOptions.contentOptions.title,
          description: this.player.sourceOptions.contentOptions.description
        };
      }
    }
  }

  // Menu items

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

    this.player.__SettingsUpdate();
  }

  GetAudioTracks() {
    let tracks = [];
    if(this.player.nativeHLS) {
      tracks = Array.from(this.player.video.audioTracks).map(track => ({
        index: track.id,
        label: track.label || track.language,
        active: track.enabled
      }));
    } else if(this.player.hlsPlayer) {
      tracks = this.player.hlsPlayer.audioTracks.map(track => ({
        index: track.id,
        label: track.name,
        active: track.id === this.player.hlsPlayer.audioTrack
      }));
    } else if(this.player.dashPlayer) {
      tracks = this.player.dashPlayer.getTracksFor("audio").map(track => ({
        index: track.index,
        label: track.labels && track.labels.length > 0 ? track.labels[0].text : track.lang,
        active: track.index === this.player.dashPlayer.getCurrentTrackFor("audio").index
      }));
    }

    return {
      options: tracks,
      active: tracks.find(track => track.active)
    };
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
        language: track.language,
        active: track.mode === "showing"
      }));
    } else if(this.player.dashPlayer) {
      activeTrackIndex = this.player.dashPlayer.getCurrentTextTrackIndex();
      tracks = this.player.dashPlayer.getTracksFor("text").map((track, index) => ({
        index,
        label: track.labels && track.labels.length > 0 ? track.labels[0].text : track.lang,
        language: track.lang,
        active: index === activeTrackIndex
      }));
    }

    if(tracks.length > 0) {
      tracks.unshift({
        index: -1,
        label: "Disabled",
        active: activeTrackIndex < 0
      });
    }

    return {
      options: tracks,
      active: tracks.find(track => track.active)
    };
  }

  SetTextTrack(index) {
    index = parseInt(index);

    if(this.player.nativeHLS || this.player.hlsPlayer) {
      const tracks = Array.from(this.player.video.textTracks);
      tracks.map(track => track.mode = "disabled");

      if(index >= 0) {
        tracks[index].mode = "showing";
      }
    } else if(this.player.dashPlayer) {
      this.player.dashPlayer.setTextTrack(parseInt(index));
    }

    if(index >= 0) {
      this.__lastTextTrackIndex = index;
    }
  }

  // Toggle last used / language appropriate text track on/off
  ToggleTextTrack() {
    const {active, options} = this.GetTextTracks();

    if(options.length === 0) { return; }

    if(active && active.index >= 0) {
      this.SetTextTrack(-1);
    } else if(this.__lastTextTrackIndex >= 0) {
      this.SetTextTrack(this.__lastTextTrackIndex);
    } else {
      // Try to find a text track that matches one of the user's languages
      for(const languageCode of navigator.languages) {
        const matchingTrack = options.find(option => option.language === languageCode || option.language === languageCode.split("-")[0]);

        if(matchingTrack) {
          this.SetTextTrack(matchingTrack.index);
          return;
        }
      }

      // No matching tracks found, just enable first in list
      this.SetTextTrack(0);
    }
  }

  GetPlayerProfiles() {
    let options = [];
    if(this.player.hlsPlayer) {
      options = Object.keys(PlayerProfiles)
        .map(key => ({
          index: key,
          label: PlayerProfiles[key].label,
          active: this.player.playerOptions.playerProfile === key,
        }));
    }

    return {
      options,
      active: options.find(option => option.active)
    };
  }

  SetPlayerProfile(profile, customHLSOptions={}) {
    this.player.SetPlayerProfile({profile, customHLSOptions});
  }

  GetPlaybackRates() {
    const options = ["0.25", "0.5", "0.75", "1", "1.25", "1.5", "1.75", "2"]
      .map((speed, index) => ({
        index,
        rate: parseFloat(speed),
        label: `${speed}x`,
        active: this.player.video.playbackRate === parseFloat(speed)
      }));

    return {
      options,
      active: options.find(option => option.active)
    };
  }

  SetPlaybackRate({index, rate}) {
    if(rate) {
      this.player.video.playbackRate = rate;
    } else {
      const option = this.GetPlaybackRates().options[index];

      if(option) {
        this.player.video.playbackRate = option.rate;
      }
    }

    this.player.__SettingsUpdate();
  }
}

export default PlayerControls;

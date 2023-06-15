import PlayCircleIcon from "./static/icons/media/LargePlayIcon.svg";
import PlayIcon from "./static/icons/media/Play icon.svg";
import PauseIcon from "./static/icons/media/Pause icon.svg";
import FullscreenIcon from "./static/icons/media/Full Screen icon.svg";
import ExitFullscreenIcon from "./static/icons/minimize.svg";
import SettingsIcon from "./static/icons/media/Settings icon.svg";
import CloseIcon from "./static/icons/x.svg";
import MutedIcon from "./static/icons/media/no volume icon.svg";
import VolumeLowIcon from "./static/icons/media/low volume icon.svg";
import VolumeHighIcon from "./static/icons/media/Volume icon.svg";
import MultiViewIcon from "./static/icons/multiview.svg";
import LeftArrow from "./static/icons/arrow-left.svg";

import Logo from "./static/images/ELUV.IO white 20 px V2.png";

import {EluvioPlayerParameters} from "./index";

const lsKeyPrefix = "@eluvio/elv-player";
export const LocalStorage = {
  getItem: (key) => {
    try {
      return localStorage.getItem(`${lsKeyPrefix}-${key}`);
    // eslint-disable-next-line no-empty
    } catch (error) {}
  },
  setItem: (key, value) => {
    try {
      localStorage.setItem(`${lsKeyPrefix}-${key}`, value);
    // eslint-disable-next-line no-empty
    } catch (error) {}
  },
  removeItem: (key) => {
    try {
      localStorage.removeItem(`${lsKeyPrefix}-${key}`);
    // eslint-disable-next-line no-empty
    } catch (error) {}
  }
};

export const CreateElement = ({parent, type="div", label, options={}, classes=[], prepend=false}) => {
  const element = document.createElement(type);
  classes.filter(c => c).forEach(c => element.classList.add(c));
  prepend ? parent.prepend(element) : parent.appendChild(element);

  if(label) {
    element.setAttribute("aria-label", label);
  }

  Object.keys(options).forEach(key => element[key] = options[key]);

  return element;
};

const CreateImageButton = ({parent, svg, label, options={}, classes=[], prepend=false}) => {
  classes.unshift("eluvio-player__controls__button");
  const button = CreateElement({parent, type: "button", label, options, classes, prepend});
  button.innerHTML = svg;

  button.querySelector("svg").setAttribute("alt", label);

  return button;
};

const ToggleFullscreen = (target) => {
  const isFullscreen = !!(document.fullscreenElement || document.mozFullScreenElement || document.webkitFullscreenElement || document.msFullscreenElement);

  if(isFullscreen) {
    if(document.exitFullscreen) {
      document.exitFullscreen();
    } else if(document.webkitExitFullscreen) {
      document.webkitExitFullscreen();
    } else if(document.mozCancelFullScreen) {
      document.mozCancelFullScreen();
    } else if(document.msExitFullscreen) {
      document.msExitFullscreen();
    }
  } else {
    if(target.requestFullscreen) {
      target.requestFullscreen({navigationUI: "hide"});
    } else if(target.mozRequestFullScreen) {
      target.mozRequestFullScreen({navigationUI: "hide"});
    } else if(target.webkitRequestFullscreen) {
      target.webkitRequestFullscreen({navigationUI: "hide"});
    } else if(target.msRequestFullscreen) {
      target.msRequestFullscreen({navigationUI: "hide"});
    } else {
      // iPhone - Use native fullscreen on video element only
      target.querySelector("video").webkitEnterFullScreen();
    }
  }
};

const Time = (time, total) => {
  if(isNaN(total) || !isFinite(total) || total === 0) { return "00:00"; }

  const useHours = total > 60 * 60;

  const hours = Math.floor(time / 60 / 60);
  const minutes = Math.floor(time / 60 % 60);
  const seconds = Math.floor(time % 60);

  let string = `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;

  if(useHours) {
    string = `${hours.toString()}:${string}`;
  }

  return string;
};

class PlayerControls {
  constructor({target, video, playerOptions, posterUrl, className}) {
    this.target = target;
    this.video = video;
    this.playerOptions = playerOptions;
    this.timeouts = {};
    this.played = false;
    this.progressHidden = false;

    if(posterUrl) {
      this.SetPosterUrl(posterUrl);
    }

    this.InitializeControls(className);
  }

  SetPosterUrl(posterUrl) {
    if(!posterUrl) { return; }

    this.posterUrl = posterUrl;

    if(posterUrl) {
      // Preload poster before setting it
      const imagePreload = new Image();
      imagePreload.src = posterUrl;
      imagePreload.onload = () => {
        this.video.poster = posterUrl;
      };
    }
  }

  FadeOut({key, elements, delay=250, unless, callback}) {
    if(unless && unless()) { return; }

    clearTimeout(this.timeouts[key]);

    this.timeouts[key] = setTimeout(() => {
      elements.forEach(element => {
        if(!element) { return; }

        element.classList.add("-elv-fade-out");
        element.classList.remove("-elv-fade-in");
      });

      if(callback) {
        callback();
      }
    }, delay);
  }

  FadeIn({key, elements, callback}) {
    clearTimeout(this.timeouts[key]);

    elements.forEach(element => {
      if(!element) { return; }

      element.classList.remove("-elv-fade-out");
      element.classList.add("-elv-fade-in");
    });

    if(callback) {
      callback();
    }
  }

  Seek({relative, absolute}) {
    if(typeof absolute !== "undefined") {
      this.video.currentTime = absolute;
    } else {
      this.video.currentTime = Math.max(0, Math.min(this.video.duration, (this.video.currentTime || 0) + parseFloat(relative)));

      this.target.classList.remove("eluvio-player--seek-left");
      this.target.classList.remove("eluvio-player--seek-right");

      setTimeout(() => {
        this.target.classList.add(relative < 0 ? "eluvio-player--seek-left" : "eluvio-player--seek-right");
      }, 50);
    }
  }

  AutohideControls(controls) {
    this.video.addEventListener("play", () => {
      this.played = true;
    });

    /*
      Controls should stay visible if:
        - Video hasn't started yet
        - Settings menu is open
        - Currently hovering over controls
        - Currently keyboard-selecting controls
    */
    const ControlsShouldShow = () => (
      (!this.played && this.video.paused) ||
      (this.settingsMenu && this.settingsMenu.dataset.mode !== "hidden") ||
      !!Array.from(document.querySelectorAll(":hover")).find(element => this.controls.contains(element)) ||
      !!this.controls.contains(document.activeElement) && document.activeElement.classList.contains("focus-visible")
    );

    const PlayerMove = () => {
      this.FadeIn({
        key: "controls",
        elements: [controls, this.settingsMenu, this.toolTip],
        callback: () => {
          this.target.classList.remove("-elv-no-cursor");
        }
      });
      this.FadeOut({
        key: "controls",
        elements: [controls, this.settingsMenu, this.toolTip],
        delay: 3000,
        unless: () => ControlsShouldShow(),
        callback: () => {
          this.target.classList.add("-elv-no-cursor");
        }
      });

      this.target.style.cursor = "unset";
    };

    // Play / Pause
    this.video.addEventListener("play", () => PlayerMove);
    this.video.addEventListener("pause", () => PlayerMove);

    // Mouse events
    this.target.addEventListener("mousemove", PlayerMove);


    // Touch events
    this.target.addEventListener("touchmove", PlayerMove);

    // Keyboard events
    this.target.addEventListener("blur", () => setTimeout(() => {
      if(!this.target.contains(document.activeElement)) {
        PlayerMove();
      }
    }), 2000);

    window.addEventListener("blur", () => { PlayerMove(); });

    Array.from(this.target.querySelectorAll("button, input")).forEach(button => {
      button.addEventListener("focus", () => { PlayerMove(); });
    });

    PlayerMove();
  }

  InitializeControls(className="") {
    this.target.setAttribute("tabindex", "0");

    if(this.playerOptions.watermark) {
      // Watermark
      const watermark = CreateElement({
        parent: this.target,
        type: "img",
        classes: ["eluvio-player__watermark"]
      });

      watermark.src = Logo;
    }

    // Poster
    /*
    if(this.posterUrl) {
      this.poster = CreateElement({
        parent: this.target,
        type: "img",
        classes: ["eluvio-player__poster-image"],
        label: "Poster Image",
        options: {
          src: this.posterUrl
        }
      });

      this.video.addEventListener("play", () => {
        if(this.poster) {
          if(this.poster.parentNode) {
            this.poster.parentNode.removeChild(this.poster);
          }

          this.poster = undefined;
        }
      });

      this.poster.addEventListener("click", () => this.video.play());
      this.poster.addEventListener("error", () => {
        if(this.poster.parentNode) {
          this.poster.parentNode.removeChild(this.poster);
        }

        this.poster = undefined;
      });
    }

     */

    if([EluvioPlayerParameters.controls.DEFAULT, EluvioPlayerParameters.controls.OFF].includes(this.playerOptions.controls)) {
      // Custom controls disabled
      return;
    }

    if(this.playerOptions.controls === EluvioPlayerParameters.controls.OFF_WITH_VOLUME_TOGGLE) {
      // Controls hidden but need to show volume controls

      let controlsCreated = false;
      const CreateVolumeControl = () => {
        if(controlsCreated) { return; }

        controlsCreated = true;
        const controls = CreateElement({
          parent: this.target,
          type: "div",
          classes: ["eluvio-player__hidden-audio-controls"]
        });

        const volumeButton = CreateImageButton({
          parent: controls,
          svg: this.video.muted || this.video.volume === 0 ? MutedIcon : (this.video.volume < 0.5 ? VolumeLowIcon : VolumeHighIcon),
          classes: ["eluvio-player__controls__button--fixed-size"],
          label: this.video.muted ? "Unmute" : "Mute"
        });

        volumeButton.addEventListener("click", () => {
          this.video.muted = !this.video.muted;
        });

        this.video.addEventListener("volumechange", () => {
          volumeButton.innerHTML = this.video.muted || this.video.volume === 0 ? MutedIcon : (this.video.volume < 0.5 ? VolumeLowIcon : VolumeHighIcon);
        });

        this.AutohideControls(controls);
      };

      const HasAudio = () => (this.video.mozHasAudio || Boolean(this.video.webkitAudioDecodedByteCount) || Boolean(this.video.audioTracks && this.video.audioTracks.length));

      if(HasAudio()) {
        CreateVolumeControl();
      } else {
        this.video.addEventListener("loadeddata", function() {
          if(HasAudio()) {
            CreateVolumeControl();
          }
        });
      }

      return;
    }

    this.video.addEventListener("click", () => {
      if(window.matchMedia("(hover: none)").matches) {
        // Touch screen - don't start/stop on video click
        return;
      }

      clearTimeout(this.timeouts.playPause);
      this.timeouts.playPause = setTimeout(() => this.video.paused ? this.video.play() : this.video.pause(), 200);
    });

    // Big play icon
    this.bigPlayButton = CreateImageButton({
      parent: this.target,
      svg: PlayCircleIcon,
      classes: ["eluvio-player__big-play-button"],
      label: "Play"
    });

    this.video.addEventListener("play", () => {
      this.FadeOut({key: "big-play-button", elements: [this.bigPlayButton]});

      // Prevent big play button from flashing
      setTimeout(() => this.target.classList.remove("eluvio-player-restarted"), 1000);
    });
    this.video.addEventListener("pause", () => this.FadeIn({key: "big-play-button", elements: [this.bigPlayButton]}));

    this.bigPlayButton.style.display = this.video.paused ? null : "none";
    this.bigPlayButton.addEventListener("click", () => this.video.play());

    // Controls container
    const controls = CreateElement({
      parent: this.target,
      type: "div",
      classes: ["eluvio-player__controls", className]
    });

    this.controls = controls;

    // Play / Pause
    const playPauseButton = CreateImageButton({
      parent: controls,
      svg: this.video.paused ? PlayIcon : PauseIcon,
      classes: ["eluvio-player__controls__button-play", this.video.paused ? "" : "eluvio-player__controls__button-pause"],
      label: this.video.paused ? "Play" : "Pause"
    });

    playPauseButton.addEventListener("click", () => {
      this.video.paused ? this.video.play() : this.video.pause();
    });

    // Volume
    const volumeButton = CreateImageButton({
      parent: controls,
      svg: this.video.muted || this.video.volume === 0 ? MutedIcon : (this.video.volume < 0.5 ? VolumeLowIcon : VolumeHighIcon),
      classes: ["eluvio-player__controls__button-volume"],
      label: this.video.muted ? "Unmute" : "Mute"
    });

    const volumeContainer = CreateElement({
      parent: controls,
      type: "div",
      classes: ["eluvio-player__controls__volume-container", "eluvio-player__controls__slider-container"]
    });

    // Volume Slider
    const volumeSlider = CreateElement({
      parent: volumeContainer,
      type: "input",
      options: {
        type: "range",
        min: 0,
        step: 0.05,
        max: 1,
        value: this.video.muted ? 0 : this.video.volume
      },
      classes: ["eluvio-player__controls__volume-slider", "eluvio-player__controls__slider-container__input"]
    });

    // Progress Bar
    const volumeBar = CreateElement({
      parent: volumeContainer,
      type: "progress",
      options: {
        min: 0,
        max: 1,
        value: this.video.muted ? 0 : this.video.volume
      },
      classes: ["eluvio-player__controls__volume", "eluvio-player__controls__slider-container__progress"]
    });

    volumeButton.addEventListener("click", () => {
      this.video.muted = !this.video.muted;
      volumeBar.value = this.video.muted ? 0 : this.video.volume;
    });

    volumeSlider.addEventListener("change", () => {
      this.video.muted = parseFloat(volumeSlider.value) === 0;
      this.video.volume = parseFloat(volumeSlider.value);
      volumeBar.value = volumeSlider.value;
    });

    volumeSlider.addEventListener("input", () => {
      this.video.muted = parseFloat(volumeSlider.value) === 0;
      this.video.volume = parseFloat(volumeSlider.value);
      volumeBar.value = volumeSlider.value;
    });

    const progressTime = CreateElement({
      parent: controls,
      type: "div",
      classes: ["eluvio-player__controls__time", "eluvio-player__controls__progress-time"]
    });

    progressTime.innerHTML = "00:00";

    const progressContainer = CreateElement({
      parent: controls,
      type: "div",
      classes: ["eluvio-player__controls__slider-container", "eluvio-player__controls__progress-container"]
    });

    // Progress Bar
    const progressSlider = CreateElement({
      parent: progressContainer,
      type: "input",
      options: {
        type: "range",
        min: 0,
        step: 0.01,
        max: 1,
        value: 0
      },
      classes: ["eluvio-player__controls__slider-container__input", "eluvio-player__controls__progress-slider"]
    });

    progressSlider.addEventListener("input", () => {
      if(!this.video.duration) { return; }

      this.video.currentTime = this.video.duration * parseFloat(progressSlider.value || 0);
    });

    // Progress Bar
    const progressBar = CreateElement({
      parent: progressContainer,
      type: "progress",
      options: {
        min: 0,
        max: 1,
        value: 0
      },
      classes: ["eluvio-player__controls__slider-container__progress", "eluvio-player__controls__progress"]
    });

    // Progress Bar
    const bufferProgressBar = CreateElement({
      parent: progressContainer,
      type: "progress",
      options: {
        min: 0,
        step: 0.0001,
        max: 1,
        value: 0
      },
      classes: ["eluvio-player__controls__slider-container__progress", "eluvio-player__controls__progress-buffer"]
    });

    this.video.addEventListener("progress", () => {
      if(isNaN(this.video.duration)) { return; }

      const buffer = this.video.buffered;
      let end = 0;
      for(let i = 0; i < buffer.length; i++) {
        if(buffer.start(i) > this.video.currentTime) { continue; }

        if(buffer.end(i) > end) {
          end = buffer.end(i);
        }
      }

      bufferProgressBar.value = 1 - (this.video.duration - end) / this.video.duration;
    });

    const totalTime = CreateElement({
      parent: controls,
      type: "div",
      classes: ["eluvio-player__controls__time", "eluvio-player__controls__total-time"]
    });

    totalTime.innerHTML = "00:00";

    // Right buttons container
    this.rightButtonsContainer = CreateElement({
      parent: controls,
      type: "div",
      classes: ["eluvio-player__controls__right-buttons"]
    });

    // Fullscreen
    const fullscreenButton = CreateImageButton({
      parent: this.rightButtonsContainer,
      svg: FullscreenIcon,
      classes: ["eluvio-player__controls__button-fullscreen"],
      label: "Full Screen"
    });

    fullscreenButton.addEventListener("click", () => ToggleFullscreen(this.target));

    // Settings Menu
    this.settingsMenu = CreateElement({
      parent: this.target,
      type: "div",
      classes: ["eluvio-player__controls__settings-menu", "eluvio-player__controls__settings-menu-hidden"]
    });
    this.settingsMenu.setAttribute("data-mode", "hidden");

    this.target.addEventListener("keydown", event => event && (event.key || "").toLowerCase() === "escape" && this.HideSettingsMenu());

    // Settings Menu
    this.toolTip = CreateElement({
      parent: this.target,
      type: "div",
      classes: ["eluvio-player__controls__tooltip"]
    });

    // Event Listeners

    const ProgressSlider = () => {
      progressSlider.value = isNaN(this.video.duration) ? 0 : this.video.currentTime / this.video.duration;
      progressBar.value = isNaN(this.video.duration) ? 0 : this.video.currentTime / this.video.duration;
    };

    const ProgressTime = () => {
      progressTime.innerHTML = Time(this.video.currentTime, this.video.duration);
    };

    this.video.addEventListener("seeking", () => {
      ProgressSlider();
      ProgressTime();
    });

    this.video.addEventListener("durationchange", () => {
      if(isNaN(this.video.duration) || !isFinite(this.video.duration)) {
        if(!this.progressHidden) {
          controls.classList.add("eluvio-player__controls-no-progress");
        }

        this.progressHidden = true;
      } else {
        progressSlider.step = Math.min(1 / (this.video.duration / 5), 0.01).toFixed(4);

        if(this.progressHidden) {
          this.progressHidden = false;
          controls.classList.remove("eluvio-player__controls-no-progress");
        }
      }

      totalTime.innerHTML = Time(this.video.duration, this.video.duration);

      ProgressTime();
      ProgressSlider();
    });

    this.target.addEventListener("dblclick", event => {
      clearTimeout(this.timeouts.playPause);

      const { width, left } = event.target.getBoundingClientRect();

      const relativeX = (event.clientX - left) / width;

      if(relativeX < 0.15) {
        this.Seek({relative: -10});
      } else if(relativeX > 0.85) {
        this.Seek({relative: 10});
      } else {
        ToggleFullscreen(this.target);
      }
    });

    // Prevent double clicking on controls from going fullscreen
    controls.addEventListener("dblclick", event => event.stopPropagation());

    this.video.addEventListener("play", () => {
      playPauseButton.innerHTML = PauseIcon;
      playPauseButton.classList.add("eluvio-player__controls__button-pause");
      playPauseButton.setAttribute("aria-label", "Pause");

      clearTimeout(this.timeouts.progressTime);
      clearTimeout(this.timeouts.progressSlider);
      this.timeouts.progressTime = setInterval(ProgressTime, 100);
      this.timeouts.progressSlider = setInterval(ProgressSlider, 16.6);

      if(this.playerOptions.controls === EluvioPlayerParameters.controls.AUTO_HIDE) {
        this.target.dispatchEvent(new Event("mousemove"));
      }
    });

    this.video.addEventListener("pause", () => {
      playPauseButton.innerHTML = PlayIcon;
      playPauseButton.classList.remove("eluvio-player__controls__button-pause");
      playPauseButton.setAttribute("aria-label", "Play");

      clearTimeout(this.timeouts.progressTime);
      clearTimeout(this.timeouts.progressSlider);
    });

    this.video.addEventListener("volumechange", () => {
      volumeButton.innerHTML = this.video.muted || this.video.volume === 0 ? MutedIcon : (this.video.volume < 0.5 ? VolumeLowIcon : VolumeHighIcon);
      volumeSlider.value = this.video.muted ? 0 : Math.min(1, Math.max(0, this.video.volume));
      volumeBar.value = this.video.muted ? 0 : Math.min(1, Math.max(0, this.video.volume));
    });

    this.video.addEventListener("seeked", () => progressSlider.value = this.video.currentTime / this.video.duration);

    this.target.addEventListener("fullscreenchange", () => {
      if(!document.fullscreenElement) {
        fullscreenButton.innerHTML = FullscreenIcon;
      } else if(this.target === document.fullscreenElement) {
        fullscreenButton.innerHTML = ExitFullscreenIcon;
      }
    });

    this.target.addEventListener("keydown", event => {
      switch (event.key) {
        case "ArrowLeft":
          this.Seek({relative: -10});
          event.preventDefault();
          break;

        case "ArrowRight":
          this.Seek({relative: 10});
          event.preventDefault();
          break;

        case "ArrowDown":
          this.video.volume = Math.max(0, (this.video.volume || 0) - 0.1);
          event.preventDefault();
          break;

        case "ArrowUp":
          this.video.volume = Math.min(1, (this.video.volume || 0) + 0.1);
          event.preventDefault();
          break;

        case "Enter":
        case " ":
          this.video.paused ? this.video.play() : this.video.pause();
          event.preventDefault();
          break;
      }
    });

    if(this.playerOptions.controls === EluvioPlayerParameters.controls.AUTO_HIDE) {
      this.AutohideControls(controls);
    }
  }

  InitializeMenu(mode) {
    this.settingsMenu.innerHTML = "";
    this.settingsMenu.classList.remove("eluvio-player__controls__settings-menu-hidden");
    this.settingsMenu.setAttribute("data-mode", mode);

    const closeButton = CreateImageButton({
      parent: this.settingsMenu,
      svg: CloseIcon,
      type: "button",
      classes: ["eluvio-player__controls__settings-menu__close"]
    });

    closeButton.addEventListener("click", () => this.HideSettingsMenu());
  }

  AddSetting({Retrieve, Set}) {
    if(!Retrieve) { return; }

    const { label, options } = Retrieve();

    const currentOption = options.find(option => option.active);

    const optionSelectionButton = CreateElement({
      parent: this.settingsMenu,
      type: Set ? "button" : "div",
      classes: ["eluvio-player__controls__settings-menu__option"]
    });

    optionSelectionButton.innerHTML = currentOption && currentOption.activeLabel || label;

    if(Set) {
      optionSelectionButton.addEventListener("click", () => {
        this.InitializeMenu("settings-submenu");

        const backButton = CreateElement({
          parent: this.settingsMenu,
          type: "button",
          classes: ["eluvio-player__controls__settings-menu__option", "eluvio-player__controls__settings-menu__option-back"],
        });

        CreateElement({
          parent: backButton,
          classes: ["eluvio-player__controls__settings-menu__option-back__icon"]
        }).innerHTML = LeftArrow;

        CreateElement({
          parent: backButton,
          classes: ["eluvio-player__controls__settings-menu__option-back__text"]
        }).innerHTML = label;

        backButton.addEventListener("click", () => this.ShowSettingsMenu());

        options
          .forEach(option => {
            const optionButton = CreateElement({
              parent: this.settingsMenu,
              type: "button",
              classes: ["eluvio-player__controls__settings-menu__option", option.active ? "eluvio-player__controls__settings-menu__option-selected" : ""]
            });

            optionButton.innerHTML = option.label;

            optionButton.addEventListener("click", () => {
              Set(option.index);
              this.HideSettingsMenu();
            });
          });

        // Focus on first element in list when menu opened
        const firstItem = this.settingsMenu.querySelector("button");
        if(firstItem) {
          firstItem.focus();
        }
      });
    }
  }

  ShowSettingsMenu() {
    this.InitializeMenu("settings");

    if(this.GetLevels) {
      this.AddSetting({Retrieve: this.GetLevels, Set: this.SetLevel});
    }

    if(this.GetAudioTracks) {
      const tracks = (this.GetAudioTracks() || {}).options || [];

      if(tracks.length > 1) {
        this.AddSetting({Retrieve: this.GetAudioTracks, Set: this.SetAudioTrack});
      }
    }

    if(this.GetTextTracks) {
      this.AddSetting({Retrieve: this.GetTextTracks, Set: this.SetTextTrack});
    }

    // Focus on first element in list when menu opened
    const firstItem = this.settingsMenu.querySelector("button");
    if(firstItem) {
      firstItem.focus();
    }
  }

  HideSettingsMenu() {
    const mode = this.settingsMenu.dataset.mode;
    if(mode === "settings") {
      this.settingsButton.focus();
    } else if(mode === "multiview") {
      this.multiviewButton.focus();
    }

    this.settingsMenu.innerHTML = "";
    this.settingsMenu.classList.add("eluvio-player__controls__settings-menu-hidden");
    this.settingsMenu.setAttribute("data-mode", "hidden");
  }

  UpdateSettings() {
    if(!this.settingsButton) {
      this.settingsButton = CreateImageButton({
        parent: this.rightButtonsContainer,
        svg: SettingsIcon,
        classes: ["eluvio-player__controls__button-settings"],
        prepend: true,
        label: "Settings"
      });

      this.settingsButton.addEventListener("click", () => {
        this.settingsMenu.dataset.mode === "hidden" ?
          this.ShowSettingsMenu() :
          this.HideSettingsMenu();
      });
    }

    if(this.settingsMenu.dataset.mode === "settings") {
      this.ShowSettingsMenu();
    }
  }

  SetAudioTrackControls({GetAudioTracks, SetAudioTrack}) {
    if([EluvioPlayerParameters.controls.OFF, EluvioPlayerParameters.controls.OFF_WITH_VOLUME_TOGGLE, EluvioPlayerParameters.controls.DEFAULT].includes(this.playerOptions.controls)) {
      // Controls disabled
      return;
    }

    this.GetAudioTracks = GetAudioTracks;
    this.SetAudioTrack = SetAudioTrack;

    this.UpdateSettings();
  }

  SetTextTrackControls({GetTextTracks, SetTextTrack}) {
    if([EluvioPlayerParameters.controls.OFF, EluvioPlayerParameters.controls.OFF_WITH_VOLUME_TOGGLE, EluvioPlayerParameters.controls.DEFAULT].includes(this.playerOptions.controls)) {
      // Controls disabled
      return;
    }

    this.GetTextTracks = GetTextTracks;
    this.SetTextTrack = SetTextTrack;

    this.UpdateSettings();
  }

  SetQualityControls({GetLevels, SetLevel}) {
    if([EluvioPlayerParameters.controls.OFF, EluvioPlayerParameters.controls.OFF_WITH_VOLUME_TOGGLE, EluvioPlayerParameters.controls.DEFAULT].includes(this.playerOptions.controls)) {
      // Controls disabled
      return;
    }

    this.GetLevels = GetLevels;
    this.SetLevel = SetLevel;

    this.UpdateSettings();
  }

  InitializeMultiViewControls({AvailableViews, SwitchView}) {
    // Fullscreen
    this.multiviewButton = CreateImageButton({
      parent: this.rightButtonsContainer,
      svg: MultiViewIcon,
      classes: ["eluvio-player__controls__button-multiview"],
      prepend: true,
      label: "Select View"
    });

    this.multiviewButton.addEventListener("click", () => this.ToggleMultiviewControls({AvailableViews, SwitchView}));

    AvailableViews().then(views => {
      const currentView = views.find(view => view.currently_selected);

      if(currentView.hot_spots) {
        const hot_spots = currentView.hot_spots.map(spot => ({
          ...spot,
          target: views.find(view => view.view === spot.next_view)
        }));

        this.InitializeMultiviewHotspots(hot_spots, SwitchView);
      }
    });

    if(!LocalStorage.getItem("multiview-tooltip")) {
      setTimeout(() => {
        this.toolTip.innerHTML = `${MultiViewIcon}<div>This stream has multiple views! Click this button to switch between them.</div>`;

        const ClearTooltip = () => {
          this.toolTip.innerHTML = "";
          LocalStorage.setItem("multiview-tooltip", "1");
        };

        this.toolTip.addEventListener("click", ClearTooltip);
        this.controls.addEventListener("click", ClearTooltip);
      }, 2000);
    }
  }

  async ToggleMultiviewControls({AvailableViews, SwitchView}={}) {
    this.settingsMenu.innerHTML = "";

    if(this.settingsMenu.dataset.mode === "multiview") {
      this.HideSettingsMenu();
      return;
    }

    this.settingsMenu.setAttribute("data-mode", "multiview");
    this.settingsMenu.classList.remove("eluvio-player__controls__settings-menu-hidden");

    const views = await AvailableViews();
    views.map(({view, view_display_label, currently_selected, hot_spots}, i) => {
      const selection = CreateElement({
        parent: this.settingsMenu,
        type: "button",
        classes: ["eluvio-player__controls__settings-menu__option", currently_selected ? "eluvio-player__controls__settings-menu__option-selected" : ""]
      });

      selection.innerHTML = view_display_label;

      if(hot_spots) {
        hot_spots = hot_spots.map(spot => ({
          ...spot,
          target: views.find(view => view.view === spot.next_view)
        }));
      }

      selection.addEventListener("click", () => {
        this.HideSettingsMenu();

        if(this.hotspotOverlay) {
          this.hotspotOverlay.parentNode.removeChild(this.hotspotOverlay);
          this.hotspotOverlay = undefined;
        }

        SwitchView(view);

        if(hot_spots) {
          setTimeout(() => this.InitializeMultiviewHotspots(hot_spots, SwitchView), 3000);
        }

        // Make button spin to show something is happening
        clearTimeout(this.timeouts["spin"]);
        this.multiviewButton.classList.add("eluvio-player__controls__button-multiview-spinning");
        this.timeouts["spin"] = setTimeout(() => {
          this.multiviewButton.classList.remove("eluvio-player__controls__button-multiview-spinning");
        }, 3000);
      });

      // Focus on first element in list when menu opened
      if(i === 0) { selection.focus(); }
    });

    // Focus on first element in list when menu opened
    const firstItem = this.settingsMenu.querySelector("button");
    if(firstItem) {
      firstItem.focus();
    }
  }

  InitializeMultiviewHotspots(hotSpots, SwitchView) {
    this.hotspotOverlay = CreateElement({
      parent: this.target,
      type: "div",
      classes: ["eluvio-player__hotspot-overlay"]
    });

    this.HandleResize(this.target.getBoundingClientRect());

    hotSpots.forEach(({top, right, bottom, left, target, next_view}) => {
      const spot = CreateElement({
        parent: this.hotspotOverlay,
        type: "div",
        classes: ["eluvio-player__hotspot-overlay__target"]
      });

      const title = CreateElement({
        parent: spot,
        type: "h2",
        classes: ["eluvio-player__hotspot-overlay__target__title"]
      });

      title.innerHTML = target.view_display_label;

      spot.style.top = `${top * 100}%`;
      spot.style.right = `${(1-right) * 100}%`;
      spot.style.bottom = `${(1-bottom) * 100}%`;
      spot.style.left = `${left * 100}%`;

      spot.addEventListener("click", async () => {
        // On mobile devices, first touch should show the options
        if("ontouchstart" in window && !this.hotspotOverlay.classList.contains("eluvio-player__hotspot-overlay-visible")) {
          this.hotspotOverlay.classList.add("eluvio-player__hotspot-overlay-visible");
          setTimeout(() => this.hotspotOverlay.classList.remove("eluvio-player__hotspot-overlay-visible"), 3000);
          return;
        }

        this.hotspotOverlay.classList.remove("eluvio-player__hotspot-overlay-visible");
        spot.classList.add("eluvio-player__hotspot-overlay__target-switching");
        setTimeout(() => {
          this.hotspotOverlay.parentNode.removeChild(this.hotspotOverlay);
          this.hotspotOverlay = undefined;
        }, 1000);

        await SwitchView(next_view);
      });
    });
  }

  InitializeTicketPrompt(callback) {
    if(this.bigPlayButton) {
      this.bigPlayButton.parentNode.removeChild(this.bigPlayButton);
    }

    const ticketModal = CreateElement({
      parent: this.target,
      type: "div",
      classes: ["eluvio-player__ticket-modal"]
    });

    ticketModal.addEventListener("dblclick", event => event.stopPropagation());

    const form = CreateElement({
      parent: ticketModal,
      type: "form",
      classes: ["eluvio-player__ticket-modal__form"]
    });

    const errorMessage = CreateElement({
      parent: form,
      type: "div",
      classes: ["eluvio-player__ticket-modal__form__error-text", "eluvio-player__ticket-modal__form__text"]
    });

    const text = CreateElement({
      parent: form,
      type: "div",
      classes: ["eluvio-player__ticket-modal__form__text"]
    });

    text.innerHTML = "Enter your code";

    const input = CreateElement({
      parent: form,
      type: "input",
      classes: ["eluvio-player__ticket-modal__form__input"]
    });

    const submit = CreateElement({
      parent: form,
      type: "button",
      classes: ["eluvio-player__ticket-modal__form__submit"]
    });

    input.focus();

    submit.innerHTML = "Submit";

    submit.addEventListener("click", async event => {
      try {
        submit.setAttribute("disabled", true);
        event.preventDefault();
        errorMessage.innerHTML = "";

        await callback(input.value);
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error("ELUVIO PLAYER: Invalid Code");
        // eslint-disable-next-line no-console
        console.error(error);

        errorMessage.innerHTML = "Invalid Code";
        submit.removeAttribute("disabled");
      }
    });
  }

  HandleResize({width, height}) {
    const ratio = width / height;
    const targetRatio = 16 / 9;

    if(this.hotspotOverlay) {
      let top = 0, right = 0, bottom = 0, left = 0;
      if(Math.abs(ratio - targetRatio) > 0.05) {
        if(ratio < 16 / 9) {
          // Taller
          const heightDiff = Math.floor((height - (width * 9 / 16)) / 2);
          top = heightDiff;
          bottom = heightDiff;
        } else if(ratio > 16 / 9) {
          // Wider
          const widthDiff = Math.floor((width - (height * 16 / 9)) / 2);
          left = widthDiff;
          right = widthDiff;
        }
      }

      this.hotspotOverlay.style.top = `${top}px`;
      this.hotspotOverlay.style.right = `${right}px`;
      this.hotspotOverlay.style.bottom = `${bottom}px`;
      this.hotspotOverlay.style.left = `${left}px`;
    }
  }
}

export default PlayerControls;

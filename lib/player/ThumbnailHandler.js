import {Utils} from "@eluvio/elv-client-js";
import UrlJoin from "url-join";
import {IntervalTree} from "node-interval-tree";

let _tagId = 1;
export const Cue = ({tagType, tagId, label, startTime, endTime, text, tag, ...extra}) => {
  let content;
  if(Array.isArray(text)) {
    text = text.join(", ");
  } else if(typeof text === "object") {
    content = text;

    try {
      text = JSON.stringify(text, null, 2);
    } catch(error) {
      text = "";
    }
  }

  return {
    tagId,
    tagType,
    label,
    startTime,
    endTime,
    text,
    content,
    tag,
    ...extra
  };
};

const FormatVTTCue = ({label, cue}) => {
  // VTT Cues are weird about being inspected and copied
  // Manually copy all relevant values
  const cueAttributes = [
    "align",
    "endTime",
    "id",
    "line",
    "lineAlign",
    "position",
    "positionAlign",
    "region",
    "size",
    "snapToLines",
    "startTime",
    "text",
    "vertical"
  ];

  const cueCopy = {};
  cueAttributes.forEach(attr => cueCopy[attr] = cue[attr]);

  const tagId = _tagId;
  _tagId += 1;

  return Cue({
    tagId,
    tagType: "vtt",
    label,
    startTime: cue.startTime,
    endTime: cue.endTime,
    text: cue.text,
    tag: cueCopy
  });
};

export const ParseVTTTrack = async (track) => {
  const videoElement = document.createElement("video");
  const trackElement = document.createElement("track");

  const dataURL = "data:text/plain;base64," + Utils.B64(track.vttData);

  const textTrack = trackElement.track;

  videoElement.append(trackElement);
  trackElement.src = dataURL;

  textTrack.mode = "hidden";

  await new Promise(resolve => setTimeout(resolve, 500));

  let cues = {};
  Array.from(textTrack.cues)
    .forEach(cue => {
      const parsedCue = FormatVTTCue({label: track.label, cue});
      cues[parsedCue.tagId] = parsedCue;
    });

  return cues;
};

export const CreateTrackIntervalTree = (tags, label) => {
  const intervalTree = new IntervalTree();

  Object.values(tags).forEach(tag => {
    try {
      intervalTree.insert({low: tag.startTime, high: tag.startTime + 1, name: tag.tagId});
    } catch(error) {
      // eslint-disable-next-line no-console
      console.warn(`Invalid tag in track '${label}'`);
      // eslint-disable-next-line no-console
      console.warn(JSON.stringify(tag, null, 2));
      // eslint-disable-next-line no-console
      console.warn(error);
    }
  });

  return intervalTree;
};

class ThumbnailHandler {
  constructor(thumbnailTrackUrl) {
    this.thumbnailTrackUrl = thumbnailTrackUrl;
    this.loaded = false;
  }

  async LoadThumbnails() {
    const thumbnailTrackUrl = new URL(this.thumbnailTrackUrl);
    const authToken = thumbnailTrackUrl.searchParams.get("authorization");
    thumbnailTrackUrl.searchParams.delete("authorization");
    const vttData = await (await fetch(thumbnailTrackUrl, {headers: {Authorization: `Bearer ${authToken}`}})).text();

    let tags = await ParseVTTTrack({label: "Thumbnails", vttData});

    // Determine the maximum time between thumbnails
    let maxInterval = 0;
    let lastStartTime = 0;
    Object.keys(tags || {}).forEach(key => {
      tags[key].endTime = tags[key].startTime;

      maxInterval = Math.max(maxInterval, tags[key].startTime - lastStartTime);
      lastStartTime = tags[key].startTime;
    });

    let imageUrls = {};
    Object.keys(tags).map(id => {
      const [path, rest] = tags[id].tag.text.split("\n")[0].split("?");
      const [query, hash] = rest.split("#");
      const positionParams = hash.split("=")[1].split(",").map(n => parseInt(n));
      const queryParams = new URLSearchParams(`?${query}`);
      const url = new URL(thumbnailTrackUrl);
      url.searchParams.set("authorization", authToken);
      url.pathname = UrlJoin(url.pathname.split("/").slice(0, -1).join("/"), path);
      queryParams.forEach((key, value) =>
        url.searchParams.set(key, value)
      );

      tags[id].imageUrl = url.toString();
      tags[id].thumbnailPosition = positionParams;

      imageUrls[url.toString()] = true;

      delete tags[id].tag.text;
      delete tags[id].text;
    });

    await Promise.all(
      Object.keys(imageUrls).map(async url => {
        const image = new Image();

        await new Promise(resolve => {
          image.src = url;
          image.crossOrigin = "anonymous";
          image.onload = () => {
            resolve();
          };
        });

        imageUrls[url] = image;
      })
    );

    this.maxInterval = Math.ceil(maxInterval);
    this.thumbnailImages = imageUrls;
    this.thumbnails = tags;
    this.intervalTree = CreateTrackIntervalTree(tags, "Thumbnails");

    this.loaded = true;
  }

  ThumbnailImage(startTime) {
    if(!this.intervalTree) { return; }

    let record = (this.intervalTree.search(startTime, startTime + this.maxInterval))[0];
    let thumbnailIndex = record && record.name;

    if(!thumbnailIndex) { return; }

    const tag = this.thumbnails?.[thumbnailIndex?.toString()];

    if(!tag) {
      return;
    }

    if(!this.thumbnailCanvas) {
      this.thumbnailCanvas = document.createElement("canvas");
    }

    const image = this.thumbnailImages[tag?.imageUrl];

    if(image) {
      const [x, y, w, h] = tag.thumbnailPosition;
      this.thumbnailCanvas.height = h;
      this.thumbnailCanvas.width = w;
      const context = this.thumbnailCanvas.getContext("2d");
      context.drawImage(image, x, y, w, h, 0, 0, w, h);
      return this.thumbnailCanvas.toDataURL("image/png");
    }
  }
}

export default ThumbnailHandler;

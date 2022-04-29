---
title: Playback Performance
description: |
  Use the Media Capabilities and the Video Playback Quality APIs to estimate and measure playback efficiency and smoothness.
date: February 18, 2022
length: '1:04'
video-sources:
  - src: https://storage.googleapis.com/kino-assets/playback-performance/manifest.mpd
    type: application/dash+xml
    cast: true
  - src: https://storage.googleapis.com/kino-assets/playback-performance/master.m3u8
    type: application/x-mpegURL
video-subtitles:
  - default: true
    kind: captions
    label: English
    src: https://storage.googleapis.com/kino-assets/playback-performance/cap-en.vtt
    srclang: en
  - default: false
    kind: captions
    label: Česky
    src: https://storage.googleapis.com/kino-assets/playback-performance/cap-cs.vtt
    srclang: cz
thumbnail: https://storage.googleapis.com/kino-assets/playback-performance/thumbnail.png
media-session-artwork:
  - sizes: 96x96
    src: https://storage.googleapis.com/kino-assets/playback-performance/artwork-96x96.png
    type: image/png
  - sizes: 128x128
    src: https://storage.googleapis.com/kino-assets/playback-performance/artwork-128x128.png
    type: image/png
  - sizes: 192x192
    src: https://storage.googleapis.com/kino-assets/playback-performance/artwork-192x192.png
    type: image/png
  - sizes: 256x256
    src: https://storage.googleapis.com/kino-assets/playback-performance/artwork-256x256.png
    type: image/png
  - sizes: 384x384
    src: https://storage.googleapis.com/kino-assets/playback-performance/artwork-384x384.png
    type: image/png
  - sizes: 512x512
    src: https://storage.googleapis.com/kino-assets/playback-performance/artwork-512x512.png
    type: image/png
stats: true
---

## Introduction

Not all devices are able to play all video sources smoothly at all times.

* Older hardware may not be able to decode high resolution video quickly enough.
* Mobile device performance may be different in battery saving modes.
* Not all devices can use hardware acceleration to decode all video codecs.

Assuming you have encoded your video in multiple resolutions and codecs, you should now decide which source you'll serve by default in each device context.

To help you choose, there are two browser APIs able to give insights into video playback performance:

* [Media Capabilities API]: To obtain device's media decoding capabilities.
* [Video Playback Quality API]: To get playback quality metrics for a playing video.

**Try it:** Play the video on this page. Notice the overlay that displays live values returned by the two APIs.

## Media Capabilities API

The [decodingInfo] method of the [Media Capabilities API] accepts a media configuration object and returns information about whether such media playback is going to be `supported`, `smooth` and `powerEfficient`.

```js
const isSupported = (
  'mediaCapabilities' in navigator
  && 'decodingInfo' in navigator.mediaCapabilities
);

// Note: Use `isSupported` to bypass the logic below
//       if the Media Capabilities API is not supported.

const mediaConfiguration = {
    "type": "media-source", // Use "file" for a plain file playback.
    "video": {
        "contentType": "video/webm; codecs=\"vp09.00.40.08\"",
        "width": 1920,
        "height": 1080,
        "bitrate": 3000000,
        "framerate": 23.976023976023978
    },
    "audio": {
        "contentType": "audio/mp4; codecs=\"mp4a.40.2\"",
        "bitrate": 128000,
        "samplerate": 44100,
        "channels": 2
    }
}

navigator.mediaCapabilities.decodingInfo(mediaConfiguration).then(
  result => {
    console.log(`Supported: ${result.supported}`);
    console.log(`Smooth: ${result.smooth}`);
    console.log(`Power efficient: ${result.powerEfficient}`);
  }
)
```

**Note:** There is also an [encodingInfo] method available in some browsers that will return the same type of information for media encoding capabilities of the current device.

## Video Playback Quality API

There is a [VideoPlaybackQuality object] associated with every `<video>` element. The `VideoPlaybackQuality` object contains a couple of key, live video metrics you can use to determine whether the current video playback is smooth.

```js
const video = document.querySelector('video');
const vq = video.getVideoPlaybackQuality();

// Print the number of total created frames
// and dropped frames every second.
setInterval(() => {
  console.log(`Total frames: ${vq.totalVideoFrames}`);
  console.log(`Dropped frames: ${vq.droppedVideoFrames}`);
}, 1000);
```

Data returned by the `VideoPlaybackQuality` object allows you to switch video source to a less demanding one in cases when the target device struggles to decode the data stream in time.

## What's Next?

Next we will [explore the Background Fetch API]. You'll learn how to initiate and handle media downloads that run in the background without depending on your web application being loaded by the browser.

[Media Capabilities API]: https://developer.mozilla.org/en-US/docs/Web/API/MediaCapabilities
[Video Playback Quality API]: https://developer.mozilla.org/en-US/docs/Web/API/VideoPlaybackQuality
[decodingInfo]: https://developer.mozilla.org/en-US/docs/Web/API/MediaCapabilities/decodingInfo
[encodingInfo]: https://developer.mozilla.org/en-US/docs/Web/API/MediaCapabilities/encodingInfo
[VideoPlaybackQuality object]: https://developer.mozilla.org/en-US/docs/Web/API/VideoPlaybackQuality
[explore the Background Fetch API]: /background-fetch-api/

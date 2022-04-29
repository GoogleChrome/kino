---
title: Single Video File
description: |
  Choose a suitable video format to ensure your single media file can be played
  by the majority of browsers and players on the web.
date: April 2nd, 2021
length: '1:04'
video-sources:
  - src: https://storage.googleapis.com/kino-assets/single-video/video.mp4
    type: video/mp4; codecs="avc1.640032,mp4a.40.2"
thumbnail: https://storage.googleapis.com/kino-assets/single-video/thumbnail.png
media-session-artwork:
  - sizes: 96x96
    src: https://storage.googleapis.com/kino-assets/single-video/artwork-96x96.png
    type: image/png
  - sizes: 128x128
    src: https://storage.googleapis.com/kino-assets/single-video/artwork-128x128.png
    type: image/png
  - sizes: 192x192
    src: https://storage.googleapis.com/kino-assets/single-video/artwork-192x192.png
    type: image/png
  - sizes: 256x256
    src: https://storage.googleapis.com/kino-assets/single-video/artwork-256x256.png
    type: image/png
  - sizes: 384x384
    src: https://storage.googleapis.com/kino-assets/single-video/artwork-384x384.png
    type: image/png
  - sizes: 512x512
    src: https://storage.googleapis.com/kino-assets/single-video/artwork-512x512.png
    type: image/png
---

## Introduction

The simplest way of embedding a video on the web is using the HTML Video
element (`<video>`). However, every browser supports a different set of video
formats. Picking the right format will ensure your video has the highest
possible browser compatibility and is going to play in almost every situation.

## Choosing the right format

Browsers usually support multiple video formats, but there is a limited overlap
in their capabilities. If you only want to encode your videos in a single
format, the safest choice is to use an [MP4 container] encapsulating `H.264`
video and `AAC` audio.

### Basic code example

```html
<video controls>
  <source src="video.mp4" type="video/mp4">
</video>
```

This simple approach is enough to get you up and running. Your video will now
play in all major web browsers. Notice the `controls` attribute that instructs
browsers to allow users to control video playback, which includes volume,
seeking, selecting captions, pause/resume playback etc.

A single video source is simple to maintain, but it gives rise to some
challenges. Users of your site are going to use different classes of devices
to watch the video. A high resolution video is going to look great on desktop,
but likely will take a long time to load on slower cellular networks.

Take the video at the top of this page as an example, which has a `1280×720`
resolution using the `H.264` codec with an effective bit rate of `1503 kb/s`.
It looks decent on desktop while being small enough to not cause stuttering on
good quality 3G networks. The video is clear, however, it's not a perfect fit
for either use case and is why you should probably provide multiple video
sources with a bitrate targeting the needs of your users.

### Example FFmpeg command

```
ffmpeg -i source.mp4 -b:v 1350k -c:v libx264 -c:a copy -filter:v "scale=1280:-1" -preset veryslow video.mp4
```

## What's Next?

Advanced codecs like `VP9` and `HEVC` generally produce smaller file sizes,
which improves the visual quality and/or experience on slower networks. Next,
we'll learn when and how to specify [multiple sources] within the HTML5
`<video>` element.

[MP4 container]: https://caniuse.com/mpeg4
[multiple sources]: /multiple-sources/

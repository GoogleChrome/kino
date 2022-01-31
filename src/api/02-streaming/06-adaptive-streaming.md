---
title: Adaptive Streaming
description: |
  Respond to changing network conditions by detecting the available bandwidth
  and inserting video chunks of appropriate bitrates.
date: April 2nd, 2021
length: '1:04'
video-sources:
  - src: https://storage.googleapis.com/kino-assets/adaptive-streaming/manifest.mpd
    type: application/dash+xml
    cast: true
  - src: https://storage.googleapis.com/kino-assets/adaptive-streaming/master.m3u8
    type: application/x-mpegURL
url-rewrites:
  - online: https://storage.googleapis.com/kino-assets/adaptive-streaming/manifest.mpd
    offline: https://storage.googleapis.com/kino-assets/adaptive-streaming/manifest-offline.mpd
video-subtitles:
  - default: true
    kind: captions
    label: English
    src: https://storage.googleapis.com/kino-assets/adaptive-streaming/cap-en.vtt
    srclang: en
  - default: false
    kind: captions
    label: Česky
    src: https://storage.googleapis.com/kino-assets/adaptive-streaming/cap-cs.vtt
    srclang: cs
thumbnail: https://storage.googleapis.com/kino-assets/adaptive-streaming/thumbnail.png
media-session-artwork:
  - sizes: 96x96
    src: https://storage.googleapis.com/kino-assets/adaptive-streaming/artwork-96x96.png
    type: image/png
  - sizes: 128x128
    src: https://storage.googleapis.com/kino-assets/adaptive-streaming/artwork-128x128.png
    type: image/png
  - sizes: 192x192
    src: https://storage.googleapis.com/kino-assets/adaptive-streaming/artwork-192x192.png
    type: image/png
  - sizes: 256x256
    src: https://storage.googleapis.com/kino-assets/adaptive-streaming/artwork-256x256.png
    type: image/png
  - sizes: 384x384
    src: https://storage.googleapis.com/kino-assets/adaptive-streaming/artwork-384x384.png
    type: image/png
  - sizes: 512x512
    src: https://storage.googleapis.com/kino-assets/adaptive-streaming/artwork-512x512.png
    type: image/png
---

## Introduction

Adaptive streaming is a technique where video chunks are encoded in various
bitrates to deliver the best possible experience **under all network
conditions**.

One of the key benefits of adaptive streaming is the ability to adapt to
changing network conditions. Stream manifests usually expose multiple
representations of the same video resource. When those representations differ
in bitrate, the player can toggle between them seamlessly and always **load a
chunk that fits** the currently available bandwidth.

Users may choose to start watching a video on their phone at home and then leave
their wi-fi and switch to a slower cellular network. The video player detects
the change in download speed and when it's about to request another chunk of
video, it can adapt to the new situation and download a lower bitrate chunk
instead.

The video at the top of the page will adapt to your available bandwidth. It logs
download speeds of media chunks being downloaded and computes a rolling average
of the data to determine the average real bandwidth between you and the media
server.

The application then chooses appropriate video representation with an average
bitrate that fits within the available bandwidth.

## Bitrate

Bitrate is a measurement of the amount of data per unit of time. For example,
a video with a bitrate of 500 kb/s will **on average** use 500 kilobits of data to
describe every second of content.

### Constant bitrate

Why **on average**? While it is possible to encode your videos with a **constant
bitrate (CBR)**, consider what effects a truly constant bitrate could have on
video quality.

Imagine a scene with some black text on a white background. The encoder doesn't
need very much data to describe such a scene, even in great detail. Then
imagine a subsequent scene with a confetti cannon firing. The scene is filled
by possibly millions of small pieces of confetti of various colors. There is a
much higher amount of data captured in that second of video.

In the rendered file the first second is going to be extremely crisp, while the
second one blocky, smeared and full of compression artefacts.

### Variable bitrate

This is why **variable bitrate (VBR)** is generally considered a better fit for
video encoding. Simple scenes are encoded using less data, while complex scenes
use more data. In this system encoders aim to encode your media file in such a
way that the final media file's average bitrate is as close to the supplied
bitrate as possible.

## What's Next?

We hoped you have enjoyed learning about the techniques used to encode and play
video on the web. Check back from time to time as we will be expanding on this
PWA and building more features and writing new content. If you want to contribute
to the code that runs this site, make a suggestion, request a feature, or just
want to see how it was built go check out the [source code].

[source code]: https://github.com/GoogleChrome/kino/

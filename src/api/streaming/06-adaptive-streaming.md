---
title: 'Adaptive Streaming'
description: 'Respond to changing network conditions by detecting the available bandwidth and inserting video chunks of appropriate bitrates.'
date: 4th March, 2017
length: '7:43'
video-sources:
  - src: https://storage.googleapis.com/wdm-assets/media/06/manifest.mpd
    type: application/dash+xml
  - src: https://storage.googleapis.com/wdm-assets/media/06/master.m3u8
    type: application/x-mpegURL
video-subtitles:
  - default: true
    kind: captions
    label: English
    src: https://storage.googleapis.com/wdm-assets/media/03/captions/cap-en.vtt
    srclang: en
  - default: false
    kind: captions
    label: Česky
    src: https://storage.googleapis.com/wdm-assets/media/03/captions/cap-cz.vtt
    srclang: cz
thumbnail: https://storage.googleapis.com/wdm-assets/images/adaptive-bitrates.png
---
### Introduction

One of the key benefits of video streaming is the ability to adapt to changing network conditions. Stream manifests usually expose multiple representations of the same video resource. When those representations differ in bitrate, the player can toggle between them seamlessly and always **load a chunk that fits** the currently available bandwidth.

**Bitrate** is measure of amount of data per unit of time. For example a video with bitrate of 500 kbit/s on average uses 500 kilobits of data to describe every second of content.
### Constant bitrate

Why *on average*? While it is possible to encode your videos with a **constant bitrate (CBR)**, consider what effects would a truly constant bitrate have on video quality.

Imagine a scene with a black text on white background. Encoder doesn't need much data to describe such scene even in great detail. Then imagine a subsequent scene with a confetti cannon firing. The scene is filled by small pieces of confetti of different colors. There is an extreme amount of data to be captured.

In the rendered file the first scene is going to be extremely crisp, while the second one blocky, smeared and full of compression artefacts.

### Variable bitrate

This is why **variable bitrate (VBR)** is generally considered a better fit for video encoding. Simple scenes are encoded using less data, complex scenes use more data. In this system encoders aim try to encode your media file in such a way that the final media file's average bitrate is as close to the supplied bitrate as possible.

### Adaptive streaming

Adaptive streaming uses video chunks encoded at different target bitrates to deliver the best possible experience **under all network conditions**.

User may choose to start watching a video on their phone at home and then leave their wi-fi and switch to a slower cellular network. The video player detects the change in downlink speed and when it's about to request another chunk of video, it can adapt to the new situation and download a lower bitrate chunk instead.

### Example

The video at the top of the page will adapt to your available bandwidth. It logs download speeds of media chunks being downloaded and computes a rolling average of the data to determine the average real bandwidth between you and the media server.

The player application then chooses appropriate video representation with an average bitrate that fits within the available bandwidth.

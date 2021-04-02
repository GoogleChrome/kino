---
title: 'Adaptive Bitrates'
description: 'Respond to changing network conditions by detecting the available bandwidth and inserting video chunks of appropriate bitrates.'
date: 4th March, 2017
length: '7:43'
video-sources:
  - src: https://storage.googleapis.com/wdm-assets/media/06/manifest.mpd?1
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
### Subheading

There is *some content*. And here is **some more**. And a [link](http://test.com).

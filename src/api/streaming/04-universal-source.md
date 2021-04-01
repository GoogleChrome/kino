---
title: 'The Universal Source'
description: 'Encode your streams in a universal format to ensure your media can be served using both the DASH and HLS protocols.'
date: 4th March, 2017
length: '7:43'
video-sources:
  - src: https://storage.googleapis.com/wdm-assets/media/04/index.mpd
    type: application/dash+xml
  - src: https://storage.googleapis.com/wdm-assets/media/04/master.m3u8
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
thumbnail: https://storage.googleapis.com/wdm-assets/images/the-universal-source.png
---
## Introduction

Media streaming is a way of delivering and playing back media content piece by piece. Instead of loading a single file containing the media, the player reads an index file describing how the target media is split up into individual chunks of data.

## Use cases for streaming

Producing media chunks and the necessary index file describing the stream is not straightforward, but streaming unlocks some interesting use cases that are not possible to achieve just by pointing the `<video>` element on the page to a set of static source files.

* **Adaptive streaming:** media is encoded in several bitrates and the highest quality media chunk that *fits* the current available bandwidth is sent down the wire.
* **Live broadcast:** media chunks are encoded and made available in real time.
* **Injecting media:** another media like advertisement can be injected into stream in progess without the player having to change the media source.

## Anatomy of a stream



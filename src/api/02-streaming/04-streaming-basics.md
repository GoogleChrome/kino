---
title: Streaming Basics
description: |
  Learn about basic concepts related to streaming and ensure your media can be
  served using both the DASH and HLS protocols.
date: April 2nd, 2021
length: '1:04'
video-sources:
  - src: https://storage.googleapis.com/kino-assets/streaming-basics/manifest.mpd
    type: application/dash+xml
    cast: true
  - src: https://storage.googleapis.com/kino-assets/streaming-basics/master.m3u8
    type: application/x-mpegURL
url-rewrites:
  - online: https://storage.googleapis.com/kino-assets/streaming-basics/manifest.mpd
    offline: https://storage.googleapis.com/kino-assets/streaming-basics/manifest-offline.mpd
video-subtitles:
  - default: true
    kind: captions
    label: English
    src: https://storage.googleapis.com/kino-assets/streaming-basics/cap-en.vtt
    srclang: en
  - default: false
    kind: captions
    label: Česky
    src: https://storage.googleapis.com/kino-assets/streaming-basics/cap-cs.vtt
    srclang: cs
thumbnail: https://storage.googleapis.com/kino-assets/streaming-basics/thumbnail.png
media-session-artwork:
  - sizes: 96x96
    src: https://storage.googleapis.com/kino-assets/streaming-basics/artwork-96x96.png
    type: image/png
  - sizes: 128x128
    src: https://storage.googleapis.com/kino-assets/streaming-basics/artwork-128x128.png
    type: image/png
  - sizes: 192x192
    src: https://storage.googleapis.com/kino-assets/streaming-basics/artwork-192x192.png
    type: image/png
  - sizes: 256x256
    src: https://storage.googleapis.com/kino-assets/streaming-basics/artwork-256x256.png
    type: image/png
  - sizes: 384x384
    src: https://storage.googleapis.com/kino-assets/streaming-basics/artwork-384x384.png
    type: image/png
  - sizes: 512x512
    src: https://storage.googleapis.com/kino-assets/streaming-basics/artwork-512x512.png
    type: image/png
---

## Introduction

Media streaming is a way of delivering and playing back media content piece by
piece. Instead of loading a single file containing the media, which can be slow
if not optimized for the network, the player reads a manifest file describing
how the target media is split into individual chunks of data that are all
stitched back together at runtime—probably at different bitrates.

## Streaming use cases

Producing media chunks and the necessary manifests describing the stream is not
exactly straightforward, but streaming unlocks some interesting use cases that
are not possible to achieve just by pointing the `<video>` element on the page
to a set of static source files.

* **Adaptive streaming:** media is encoded in several bitrates and the highest
  quality media chunk that *fits* the current available bandwidth is returned
  to the video player.
* **Live broadcast:** media chunks are encoded and made available in real time.
* **Injecting media:** other media like advertisement can be injected into
  streams that are currently in progress without the player having to change
  the media source.

## Streaming protocols

The two most commonly used streaming protocols on the web are **Dynamic
Adaptive Streaming over HTTP** (DASH) and **HTTP Live Streaming** (HLS). Players
that support these protocols will fetch the generated manifest file, figure
out which media chunks to request and then combine them into the final media
experience.

### Using `<video>` to play a stream

Many browsers are not going play your stream natively. While there is some
native [support for HLS] playback, browsers generally [don't support native DASH]
stream playback. This means often it's not enough to simply point the `<source>`
in the `<video>` element to a manifest file.

```html
<video controls>
  <source src="manifest.mpd" type="application/dash+xml">
</video>
```

_This is valid, but doesn't actually work. Browsers don't natively support
DASH manifest playback._

What may seem as a deficit is actually a strength in disguise. Streams are
powerful and applications that consume streams have different needs.

Manifest files usually describe many variants of single media. Think different
bitrates, several audio tracks, sometimes the same media encoded in different
formats.

Some applications may want to keep a larger amount of video in the buffer,
others may want to prefetch the first few seconds of video from an upcoming
episode, and some want to implement their own logic for adaptive streaming.
This is where you would want to allow some sort of built-in browser extension
to generate media streams for playback.

### Media Source Extensions

Thankfully, there is something called [Media Source Extensions (MSE)] that
will let JavaScript generate our media streams. In a nutshell, MSE allows
developers to attach a `MediaSource` object to a `<video>` element and have
it play back whatever media data is pumped into the buffers attached to the
`MediaSource` instance.

### Basic code example

```js
const videoEl = document.querySelector('video');
const mediaSource = new MediaSource();

video.src = URL.createObjectURL(mediaSource);
mediaSource.addEventListener(
  'sourceopen',
  () => {
    const mimeString = 'video/mp4; codecs="avc1.42E01E, mp4a.40.2"';
    const buffer = mediaSource.addSourceBuffer(mimeString);

    buffer.appendBuffer( /* Video data as `ArrayBuffer` object. */ )
  }
);
```

The simplified example above illustrates a few things:

* As far as `<video>` is concerned, it is receiving media data from a URL.
* The generated URL is just a pointer to a `MediaSource` instance.
* The `MediaSource` instance creates one or more `SourceBuffer` instances.
* We then just append binary media data into the buffer, e.g. using `fetch`.

While these basic concepts are simple, and it is certainly possible to write a
DASH and HLS compatible video player from scratch, most people usually pick one
of the open source mature solutions that already exist, such as [Shaka Player],
[JW Player], or [Video.js] among others.

Within the roadmap of this demo PWA there are plans to create content that will
demonstrate these frameworks more completely and include offline playback and
digital right management to name a few. So keep an eye out for new articles.

## Media chunks format

For a long time, DASH and HLS required media chunks to be encoded in different
formats. In 2016, however, support for standard **fragmented MP4** (fMP4) files
was added to HLS, a format that DASH also supports.

Video chunks using an `fMP4` container and the `H.264` codec are supported
by both protocols and playable by a vast majority of players. This allows
content producers to encode their videos just once, which in turn **saves time
and disk space**.

### Example FFmpeg command

```
ffmpeg -i source.mp4 \
  -map 0:v:0 -map 0:v:0 -map 0:v:0 -map 0:v:0 -map 0:v:0 -map 0:v:0 -map 0:a:0 \
  -b:v:0 100k -c:v:0 libx264 -filter:v:0 "scale=256:-1" -x264opts:v:0 "keyint=128:min-keyint=128:no-scenecut" -preset:v:0 veryslow \
  -b:v:1 250k -c:v:1 libx264 -filter:v:1 "scale=426:-1" -x264opts:v:1 "keyint=128:min-keyint=128:no-scenecut" -preset:v:1 veryslow \
  -b:v:2 450k -c:v:2 libx264 -filter:v:2 "scale=640:-1" -x264opts:v:2 "keyint=128:min-keyint=128:no-scenecut" -preset:v:2 veryslow \
  -b:v:3 1000k -c:v:3 libx264 -filter:v:3 "scale=854:-1" -x264opts:v:3 "keyint=128:min-keyint=128:no-scenecut" -preset:v:3 veryslow \
  -b:v:4 1500k -c:v:4 libx264 -filter:v:4 "scale=1280:-1" -x264opts:v:4 "keyint=128:min-keyint=128:no-scenecut" -preset:v:4 veryslow \
  -b:v:5 3000k -c:v:5 libx264 -filter:v:5 "scale=1920:-1" -x264opts:v:5 "keyint=128:min-keyint=128:no-scenecut" -preset:v:5 veryslow \
  -use_template 1 -use_timeline 1 -frag_duration 5.12 -seg_duration 5.12 -adaptation_sets "id=0,streams=v  id=1,streams=a" \
  -hls_playlist true -f dash manifest.mpd
```

## What's Next?

To achieve better quality and lower files sizes, you may want to choose to
encode several sets of media chunks using more [efficient formats] and is what
we will learn about next.

[support for HLS]: https://caniuse.com/http-live-streaming
[don't support native DASH]: https://caniuse.com/mpeg-dash
[Media Source Extensions (MSE)]: https://w3c.github.io/media-source/
[Shaka Player]: https://github.com/google/shaka-player
[JW Player]: https://developer.jwplayer.com/
[Video.js]: http://videojs.com/
[efficient formats]: /efficient-formats/

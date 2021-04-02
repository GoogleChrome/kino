---
title: 'Streaming Basics'
description: 'Learn about basic concepts related to streaming and ensure your media can be served using both the DASH and HLS protocols.'
date: 4th March, 2017
length: '7:43'
video-sources:
  - src: https://storage.googleapis.com/wdm-assets/media/04/manifest.mpd
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
### Introduction

Media streaming is a way of delivering and playing back media content piece by piece. Instead of loading a single file containing the media, the player reads an index file describing how the target media is split into individual chunks of data.

### Use cases for streaming

Producing media chunks and the necessary index file describing the stream is not straightforward, but streaming unlocks some interesting use cases that are not possible to achieve just by pointing the `<video>` element on the page to a set of static source files.

* **Adaptive streaming:** media is encoded in several bitrates and the highest quality media chunk that *fits* the current available bandwidth is sent down the wire.
* **Live broadcast:** media chunks are encoded and made available in real time.
* **Injecting media:** another media like advertisement can be injected into stream in progress without the player having to change the media source.

### Streaming protocols

The two most commonly used streaming protocols on the web are *Dynamic Adaptive Streaming over HTTP* (DASH) and *HTTP Live Streaming* (HLS). Players that support these protocols will fetch the generated index file (also called manifest), figure out which media chunks to request and then combine them into the final media experience.

#### Using `<video>` to play a stream

Many browsers are not going play your stream natively. While there is some native [support for HLS](https://caniuse.com/http-live-streaming) playback, browsers generally [don't support native DASH](https://caniuse.com/mpeg-dash) stream playback. This means often it's not enough to simply point `<video>` to a manifest file.

```
<!-- This is valid, but doesn't work. Browsers don't
     natively support DASH manifest playback. -->
<video controls>
  <source src="manifest.mpd" type="application/dash+xml">
</video>
```

What may seem as a deficit is actually a strength is disguise. See, streams are powerful and applications that consume streams have different needs.

Manifest files usually describe many variants of single media. Think different bitrates, several audio tracks, sometimes the same media encoded in different formats.

Applications have different needs also. Some may want to keep a larger amount of video in the buffer. Others may want to prefetch the first few seconds of video from an upcoming episode. Some want to implement their own logic for adaptive streaming.

And that is where [Media Source Extensions (MSE)](https://w3c.github.io/media-source/) come into play.

#### Media Source Extensions (MSE)

In a nutshell, MSE allows developers to attach a `MediaSource` object to a `<video>` element and have it play back whatever media data is pumped into the buffers attached to the `MediaSource` instance.

```
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

* As far as `<video>` is concerned, it is receiving media data from an URL.
* The generated URL is just a pointer to a `MediaSource` instance.
* The `MediaSource` instance creates one or more `SourceBuffer` instances.
* We then just append binary media data into the buffer, e.g. using `fetch`.

While these basic concepts are simple and it is certainly possible to write a DASH and HLS compatible video player from scratch, most people usually pick one of the open source mature solutions that already exist, e.g. [Shaka Player](https://github.com/google/shaka-player), [Video.js](https://github.com/videojs/video.js) and others.

### Media chunks format

For a long time, DASH and HLS required media chunks to be encoded in different formats. In 2016, however, a support for standard **fragmented MP4** (fMP4) files has been added to HLS, a format that DASH also supports.

Video chunks using a fMP4 container and the H.264 coding format are supported by both protocols and playable by a vast majority of players. This allows content producers to encode their videos just once, which in turn **saves time and disk space**.

However, to achieve a better quality and lower files sizes, you may want to choose to encode in several different sets of chunks using [more efficient formats](/efficient-formats/).

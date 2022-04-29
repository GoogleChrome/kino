---
title: Using WebVTT
description: |
  Add subtitles, captions and other text tracks to ensure your videos are
  accessible to the widest possible audience.
date: April 2nd, 2021
length: '1:04'
video-sources:
  - src: https://storage.googleapis.com/kino-assets/using-webvtt/av1.mp4
    type: video/mp4; codecs="av01.0.04M.08, mp4a.40.2"
  - src: https://storage.googleapis.com/kino-assets/using-webvtt/hevc.mp4
    type: video/mp4; codecs="hev1.1.6.L93.90,mp4a.40.2"
    cast: true
  - src: https://storage.googleapis.com/kino-assets/using-webvtt/vp9.webm
    type: video/webm
video-subtitles:
  - default: true
    kind: captions
    label: English
    src: https://storage.googleapis.com/kino-assets/using-webvtt/cap-en.vtt
    srclang: en
  - default: false
    kind: captions
    label: Česky
    src: https://storage.googleapis.com/kino-assets/using-webvtt/cap-cs.vtt
    srclang: cs
thumbnail: https://storage.googleapis.com/kino-assets/using-webvtt/thumbnail.png
media-session-artwork:
  - sizes: 96x96
    src: https://storage.googleapis.com/kino-assets/using-webvtt/artwork-96x96.png
    type: image/png
  - sizes: 128x128
    src: https://storage.googleapis.com/kino-assets/using-webvtt/artwork-128x128.png
    type: image/png
  - sizes: 192x192
    src: https://storage.googleapis.com/kino-assets/using-webvtt/artwork-192x192.png
    type: image/png
  - sizes: 256x256
    src: https://storage.googleapis.com/kino-assets/using-webvtt/artwork-256x256.png
    type: image/png
  - sizes: 384x384
    src: https://storage.googleapis.com/kino-assets/using-webvtt/artwork-384x384.png
    type: image/png
  - sizes: 512x512
    src: https://storage.googleapis.com/kino-assets/using-webvtt/artwork-512x512.png
    type: image/png
---

## Introduction

The WebVTT (Web Video Text Tracks) format is used to describe timed text data
such as closed captions or subtitles. You can use the `<track>` element to
attach the `.vtt` files to your videos in order to make them more accessible
to your audience. Visit the [media accessibility] page on `web.dev` for more
information.

### Basic code example

```html
<video controls>
  <source src="av1.mp4" type="video/mp4; codecs=\"av01.0.05M.08\"">
  <source src="hevc.mp4" type="video/mp4; codecs=\"hvc1\"">
  <source src="h264.mp4" type="video/mp4">

  <track src="cap-en.vtt" srclang="en" label="English" kind="captions">
  <track src="cap-cz.vtt" srclang="cz" label="Česky" kind="captions">
</video>
```

## WebVTT file structure

The WebVTT format is simple. You can even create basic text track files
manually. Just add your text data along with timings.

```
WEBVTT

00:00.000 --> 00:04.000
The first line of the subtitles.

00:05.00 --> 00:07.950
– More content.
– This time on two
```

Want your captions to render in a different position with left or right
alignment? Perhaps to align the captions with the current speaker position?
WebVTT defines settings to do that, and more, directly inside the `.vtt` file.

```
WEBVTT

00:00.000 --> 00:04.000 position:10%,line-left align:left size:35%
The first line of the subtitles.
```

See how the caption placement is defined by adding settings after the time
interval definitions. Another handy feature is the ability to style individual
cues using CSS. Perhaps you want to use a yellow text color, and a
semi-transparent background for all captions.

```html
<style>
  ::cue {
    color: yellow;
    background-color: rgba(0, 0, 0, 0.5);
  }
</style>
<video controls>
  ...
  <track src="cap-en.vtt" srclang="en" label="English" kind="captions">
  <track src="cap-cz.vtt" srclang="cz" label="Česky" kind="captions">
</video>
```

If you're interested in learning more about styling and tagging of individual
cues, the [WebVTT specification] is a good source for advanced examples.

## Kinds of text tracks

Did you notice the `kind` attribute of the `<track>` element? It's used to
indicate what relation the particular text track has to the video. The
possible values of the `kind` attribute are:

* `captions`: For closed captions, i.e. transcripts and possibly translations
  of any audio. Suitable for hearing-impaired people and in cases when the
  video is playing muted.
* `subtitles`: For subtitles, i.e. translations of speech and text in a
  language different from the main language of the video.
* `descriptions`: For descriptions of visual parts of the video content.
  Suitable for visually impaired people.
* `chapters`: Intended to be displayed when the user is navigating within
  the video.
* `metadata`: Not visible. May be used by scripts.

## What's Next?

Now that you understand the basics of making a video available and accessible
on your web page, you might wonder about more complex use cases.

* How do you support multiple audio tracks?
* Is there a way to adjust video bitrate on the fly to fit available bandwidth?
* Can you control how much data is held in memory at any given time?
* How to play back a live video stream?

To answer these questions, continue reading about how this PWA was built in
the [streaming basics] article.

[media accessibility]: https://web.dev/media-accessibility/
[WebVTT specification]: https://w3c.github.io/webvtt/
[streaming basics]: /streaming-basics/

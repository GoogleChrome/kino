---
title: Multiple Sources
description: |
  Use advanced video formats to save bandwidth and improve the visual quality of
  your videos and let the browser choose between them.
date: April 2nd, 2021
length: '1:04'
video-sources:
  - src: https://storage.googleapis.com/kino-assets/multiple-sources/av1.mp4
    type: video/mp4; codecs="av01.0.04M.08, mp4a.40.2"
  - src: https://storage.googleapis.com/kino-assets/multiple-sources/hevc.mp4
    type: video/mp4; codecs="hev1.1.6.L93.90,mp4a.40.2"
    cast: true
  - src: https://storage.googleapis.com/kino-assets/multiple-sources/vp9.webm
    type: video/webm
thumbnail: https://storage.googleapis.com/kino-assets/multiple-sources/thumbnail.png
media-session-artwork:
  - sizes: 96x96
    src: https://storage.googleapis.com/kino-assets/multiple-sources/artwork-96x96.png
    type: image/png
  - sizes: 128x128
    src: https://storage.googleapis.com/kino-assets/multiple-sources/artwork-128x128.png
    type: image/png
  - sizes: 192x192
    src: https://storage.googleapis.com/kino-assets/multiple-sources/artwork-192x192.png
    type: image/png
  - sizes: 256x256
    src: https://storage.googleapis.com/kino-assets/multiple-sources/artwork-256x256.png
    type: image/png
  - sizes: 384x384
    src: https://storage.googleapis.com/kino-assets/multiple-sources/artwork-384x384.png
    type: image/png
  - sizes: 512x512
    src: https://storage.googleapis.com/kino-assets/multiple-sources/artwork-512x512.png
    type: image/png
---

## Introduction

Efficient video formats produce smaller video files while maintaining great
visual quality. What is their main drawback, you ask? None of them are
universally supported by all web browsers and video players. By making use
of the `<source>` fallback technique we can offer browser a list of video
representations to choose from.

## Efficient formats

Several existing codecs provide superior efficiency to the [`H.264`] codec,
which is the format that is closest to being universally supported. Some of
the more widely supported codecs are the [`AV1`], [`VP9`] and [`HEVC`]
formats. Videos in those formats will have a smaller file size, and/or look
better visually compared to `H.264`.

Should you then be using the more efficient codecs? Probably yes, but there is
a small catch. You will need to encode the same video multiple times, each
time using a different codec to target all browsers. Then you will need to add
those encoded files as video `<source>` elements and let browser choose which
one to play.

### Basic code example

```html
<video>
  <source src="av1.mp4" type="video/mp4; codecs=\"av01.0.04M.08\"">
  <source src="hevc.mp4" type="video/mp4; codecs=\"hvc1\"">
  <source src="vp9.mp4" type="video/webm; codecs=\"vp9\"">
  <source src="h264.mp4" type="video/mp4">
</video>
```

Consider the larger time investment needed to encode one video multiple times,
and the associated higher disk space requirements. If you can afford both, your
users will certainly benefit from being served videos in more efficient formats.

Let's compare the results of encoding the source video in these four formats:

* [`AV1`] size 7.02 MB, bitrate 867 kb/s
* [`HEVC`] size 7.62 MB, bitrate 941 kb/s
* [`VP9`] size 9.25 MB, bitrate 1143 kb/s
* [`H.264`] size 12.16 MB, bitrate 1503 kb/s

### Example FFmpeg commands

```
# AV1
ffmpeg -i source.mp4 -b:v 800k -c:v libaom-av1 -c:a copy -filter:v "scale=1280:-1" -cpu-used 5 -row-mt true -threads 8 -crf 24 -tile-columns 1 -tile-rows 0 -strict -2 av1.mp4

# HEVC
ffmpeg -i source.mp4 -c:v libx265 -c:a copy -preset veryslow -crf 25 -filter:v "scale=1280:-1" hevc.mp4

# VP9
ffmpeg -i source.mp4 -b:v 800k -c:v libvpx-vp9 -c:a libopus -filter:v "scale=1280:-1" -deadline best vp9.webm

# H.264
ffmpeg -i source.mp4 -b:v 1350k -c:v libx264 -c:a copy -filter:v "scale=1280:-1" -preset veryslow h264.mp4
```

Resolution of all videos is `1280×720` and their running time is `64` seconds.
Encoders were set up to produce videos of comparable or better visual quality.

### What's Next?

Now that your video is encoded in several efficient formats and served
everywhere, take a second to think about its audience and accessibility. Learn
how to use the `<track>` element to add closed captions, subtitles and more
[using WebVTT].

[`H.264`]: https://caniuse.com/mpeg4
[`AV1`]: https://caniuse.com/av1
[`VP9`]: https://caniuse.com/webm
[`HEVC`]: https://caniuse.com/hevc
[using WebVTT]: /using-webvtt/

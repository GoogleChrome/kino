---
title: Efficient Formats
description: |
  Improve the visual quality of your streams by encoding videos using more
  efficient formats while targeting different platforms.
date: April 2nd, 2021
length: '1:04'
video-sources:
  - src: https://storage.googleapis.com/kino-assets/efficient-formats/manifest.mpd
    type: application/dash+xml
    cast: true
  - src: https://storage.googleapis.com/kino-assets/efficient-formats/master.m3u8
    type: application/x-mpegURL
url-rewrites:
  - online: https://storage.googleapis.com/kino-assets/efficient-formats/manifest.mpd
    offline: https://storage.googleapis.com/kino-assets/efficient-formats/manifest-offline.mpd
video-subtitles:
  - default: true
    kind: captions
    label: English
    src: https://storage.googleapis.com/kino-assets/efficient-formats/cap-en.vtt
    srclang: en
  - default: false
    kind: captions
    label: Česky
    src: https://storage.googleapis.com/kino-assets/efficient-formats/cap-cs.vtt
    srclang: cs
thumbnail: https://storage.googleapis.com/kino-assets/efficient-formats/thumbnail.png
media-session-artwork:
  - sizes: 96x96
    src: https://storage.googleapis.com/kino-assets/efficient-formats/artwork-96x96.png
    type: image/png
  - sizes: 128x128
    src: https://storage.googleapis.com/kino-assets/efficient-formats/artwork-128x128.png
    type: image/png
  - sizes: 192x192
    src: https://storage.googleapis.com/kino-assets/efficient-formats/artwork-192x192.png
    type: image/png
  - sizes: 256x256
    src: https://storage.googleapis.com/kino-assets/efficient-formats/artwork-256x256.png
    type: image/png
  - sizes: 384x384
    src: https://storage.googleapis.com/kino-assets/efficient-formats/artwork-384x384.png
    type: image/png
  - sizes: 512x512
    src: https://storage.googleapis.com/kino-assets/efficient-formats/artwork-512x512.png
    type: image/png
---

## Introduction

Now that you've learned which format to use to encode once for both DASH
and HLS, let's talk about use cases that call for a different approach.

## Better compression

Sometimes you have the time and disk space to encode your media in multiple
formats. We previously learned about encoding [multiple sources] which can
lead to greatly reduced files sizes compared to the standard `H.264` codec,
with our example source video being reduced to around 50% of its original
file size.

Consider a video on demand platform like YouTube. The main bottleneck for
YouTube is... you, or rather the **available bandwidth** between YouTube
servers and your device. YouTube rescales your video and aims to stay under
certain bitrate thresholds for every resolution. It also uses `VP9` as an
efficient coding format of choice along with `H.264`.

This helps YouTube to deliver **smaller video chunks** to clients that
support the more efficient coding formats.

## Targeting different clients

Browsers sometimes support **different coding formats**. If you want to
distribute your stream in an efficient coding format, you're left with two
options:

1. Progressive enhancement.
2. Encoding in multiple formats.

YouTube chose the free `VP9` codec to **progressively enhance** the
experience in clients that implement it. The 4k resolution videos were only
available in `VP9`. Safari previously did not support the `VP9` codec, which
led to Safari users being unable to play 4k videos on YouTube but still able
to play 1080p.

Another options would be to encode your media in several efficient coding
formats. Safari supports `H.265`, which means that encoding for `VP9` *and*
`H.265` will generate **two sets of chunks**, which can both be referenced
from the stream manifest so video players can choose the appropriate source
depending on the client browser or device.

Play the video at the top of the page and if your browser supports the `VP9`
codec, you'll be served `.webm` chunks instead of the default `.mp4` chunks
that are encoded using `H.264`. The `VP9` chunks ended up **25% smaller
(on average)** while maintaining similar visual quality.

Just keep in mind that **compression efficiency depends on many factors**
such as encoding settings or video contents and it's expected that `VP9` will
outperform `H.264` in the vast majority of use cases, however, your mileage
may vary.

### Example FFmpeg command

```
ffmpeg -i source.mp4
  -map 0:v:0 -map 0:v:0 -map 0:v:0 -map 0:v:0 -map 0:v:0 -map 0:v:0 -map 0:v:0 -map 0:v:0 -map 0:v:0 -map 0:v:0 -map 0:v:0 -map 0:v:0 -map 0:a:0 \
  -b:v:0 100k -c:v:0 libx264 -filter:v:0 "scale=256:-1" -x264opts:v:0 "keyint=128:min-keyint=128:no-scenecut" -preset:v:0 veryslow \
  -b:v:1 250k -c:v:1 libx264 -filter:v:1 "scale=426:-1" -x264opts:v:1 "keyint=128:min-keyint=128:no-scenecut" -preset:v:1 veryslow \
  -b:v:2 450k -c:v:2 libx264 -filter:v:2 "scale=640:-1" -x264opts:v:2 "keyint=128:min-keyint=128:no-scenecut" -preset:v:2 veryslow \
  -b:v:3 1000k -c:v:3 libx264 -filter:v:3 "scale=854:-1" -x264opts:v:3 "keyint=128:min-keyint=128:no-scenecut" -preset:v:3 veryslow \
  -b:v:4 1500k -c:v:4 libx264 -filter:v:4 "scale=1280:-1" -x264opts:v:4 "keyint=128:min-keyint=128:no-scenecut" -preset:v:4 veryslow \
  -b:v:5 3000k -c:v:5 libx264 -filter:v:5 "scale=1920:-1" -x264opts:v:5 "keyint=128:min-keyint=128:no-scenecut" -preset:v:5 veryslow \
  -b:v:6 100k -c:v:6 libvpx-vp9 -filter:v:6 "scale=256:-1" -cpu-used:v:6 2 -maxrate:v:6 100k -bufsize:v:6 100k -deadline:v:6 good \
  -b:v:7 250k -c:v:7 libvpx-vp9 -filter:v:7 "scale=426:-1" -cpu-used:v:7 2 -maxrate:v:7 250k -bufsize:v:7 250k -deadline:v:7 good \
  -b:v:8 450k -c:v:8 libvpx-vp9 -filter:v:8 "scale=640:-1" -cpu-used:v:8 2 -maxrate:v:8 450k -bufsize:v:8 450k -deadline:v:8 good \
  -b:v:9 1000k -c:v:9 libvpx-vp9 -filter:v:9 "scale=854:-1" -cpu-used:v:9 2 -maxrate:v:9 1000k -bufsize:v:9 1000k -deadline:v:9 good \
  -b:v:10 1500k -c:v:10 libvpx-vp9 -filter:v:10 "scale=1280:-1" -cpu-used:v:10 2 -maxrate:v:10 1500k -bufsize:v:10 1500k -deadline:v:10 good \
  -b:v:11 3000k -c:v:11 libvpx-vp9 -filter:v:11 "scale=1920:-1" -cpu-used:v:11 2 -maxrate:v:11 3000k -bufsize:v:11 3000k -deadline:v:11 good \
  -use_template 1 -use_timeline 1 -frag_duration 5.12 -seg_duration 5.12 -adaptation_sets "id=0,streams=v  id=1,streams=a" \
  -hls_playlist true -f dash manifest.mpd
```

## What's Next?

Now that your media chunks are efficiently encoded, you need to make sure they
are delivered to the client device on time to achieve the desired seamless
video playback. Let's talk about [adaptive streaming].

[multiple sources]: /multiple-sources/
[adaptive streaming]: /adaptive-streaming/

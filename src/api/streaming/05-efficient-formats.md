---
title: 'Efficient Formats'
description: 'Improve the visual quality of your streams by encoding videos using more efficient formats targeting different platforms.'
date: 4th March, 2017
length: '7:43'
video-sources:
  - src: https://storage.googleapis.com/wdm-assets/media/05/manifest.mpd
    type: application/dash+xml
  - src: https://storage.googleapis.com/wdm-assets/media/05/master.m3u8
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
thumbnail: https://storage.googleapis.com/wdm-assets/images/efficient-formats.png
---
### Introduction

Now that you've [learned](/universal-source/) which format to use to encode once for both the DASH and HLS, let's talk about use cases that call for a different approach.

### Better compression

Sometimes you have the time and disk space to encode your media in multiple formats. We've [learned before](/multiple-sources/) that efficient coding formats can lead to files sizes up to 50% smaller compared to the good old H.264.

Consider a video on demand platform like Youtube. The main bottleneck for YouTube is... you, or rather the **available bandwidth** between Youtube servers and your device. Youtube rescales your video and aims to stay under certain bitrate treshold for every resolution. It also uses VP9 as an efficient coding format of choice along with standard H.264.

This helps Youtube to deliver **smaller video chunks** to clients that support the more efficient coding formats.

### Targeting different clients

Browsers sometimes support **different coding formats**. If you want to distribute your stream in an efficient coding format, you're left with two options:

1. Progressive enhancement.
2. Encoding in multiple formats.

Youtube chose the free VP9 coding format to **progressively enhance** the experience in clients that implement it. The 4k resolution videos were only available in VP9. Safari has not supported the VP9 codec for a long time, which led to Safari users being unable to play 4k videos on Youtube.

Another options is encoding your media in several efficient coding formats. Safari supports H.265, which means that encoding for VP9 *and* H.265 will generate **two sets of chunks**, which can both be referenced from stream manifest files and left for players to choose the appropriate source depending on the client browser or device.

### Example

Play the video at the top of the page and if your browser supports the VP9 codec, you'll be served `.webm` chunks instead of the default `.mp4` chunks encoded using H.264. The VP9 chunks ended up **25 % smaller on average** while maintaining similar visual quality.

Just keep in mind that **compression efficiency depends on many factors** such as encoding settings, video contents etc. and while it's expected for VP9 to outperform H.264 in vast majority of cases, your mileage may vary.

### Adaptive streaming

Now that your media chunks are efficiently encoded, you need to make sure they are delivered to the client device on time to achieve the desired seamless video plaback. Let's talk about [adaptive streaming](/adaptive-bitrates/).

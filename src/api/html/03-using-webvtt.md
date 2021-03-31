---
title: 'Using WebVTT'
description: 'Add subtitles, captions and other text tracks to your content and make your videos accessible by a wider audience.'
date: 4th March, 2017
length: '7:43'
video-sources:
  - src: https://storage.googleapis.com/wdm-assets/videos/http-203/http-203-for-loops.mp4
    type: video/mp4; codecs="avc1.64001f,mp4a.40.2"
video-subtitles:
  - default: true
    kind: subtitles
    label: English
    src: https://storage.googleapis.com/wdm-assets/subtitles/ForBiggerEscapes-en.vtt
    srclang: en
  - default: true
    kind: subtitles
    label: Czech
    src: https://storage.googleapis.com/wdm-assets/subtitles/ForBiggerEscapes-cz.vtt
    srclang: cz
thumbnail: https://storage.googleapis.com/wdm-assets/images/http-203/http-203-for-loops.jpg
---
### Introduction

The WebVTT (Web Video Text Tracks) format is used to describe timed text data such as closed captions or subtitles. You can use the `<track>` element to attach the `.vtt` files to your videos in order to make them more accessible by your audience.

### WebVTT file structure

It is possible to create a `.vtt` manually just by following the [Web Video Text Tracks specification](https://w3c.github.io/webvtt/). The format defines several presentation elements as well as annotations for voices and much more features.

<div class="code-sample">
  <div class="code-sample--title">Example of a WebVTT file</div>
  <div class="code-sample--content">WEBVTT - Subtitles Name

00:00.000 --> 00:04.089
The first line of the subtitles.

00:05.00 --> 00:07.950
– More content.
– This time on two</div>
</div>

### Attaching to a video

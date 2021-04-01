---
title: 'Single Video File'
description: 'Pick a suitable video format to make sure your single media file can be played by a vast majority of browsers and players on the web.'
date: 4th March, 2017
length: '7:43'
video-sources:
  - src: https://storage.googleapis.com/wdm-assets/videos/http-203/background-fetch/manifest.mpd
    type: application/dash+xml
  - src: https://storage.googleapis.com/wdm-assets/videos/http-203/background-fetch/master.m3u8
    type: application/x-mpegURL
thumbnail: https://storage.googleapis.com/wdm-assets/images/single-video-file.png
---
### Introduction

The simplest way of embedding a video on the web is using the <code>&lt;video></code> element. However, every browser supports a different set of video formats. Picking the right format will ensure your video is going to play everywhere.

### Choosing the right format

Browsers usually support multiple video formats, but there is a limited overlap in their capabilities. If you only want to encode your videos in a single format, the safe choice is to use a [MP4 container](https://caniuse.com/mpeg4) encapsulating H.264 video and AAC audio.

<div class="code-sample">
  <div class="code-sample--content">&lt;video>
  &lt;source src="video.mp4" type="video/mp4">
&lt/video></div>
</div>

This simple approach is enough to get you up and running. Your video will now play in all major web browsers.

A single video source is simple to maintain, but it gives rise to some challenges. Users of your site are going to use different classes of devices to watch the video. A high resolution video is going to look great on desktop, but may take a long time to load on slower cellular network – and vice versa.

@todo Take the video above as an example. Talk about its file size, resolution and illustrate the challenges with slower networks.

### Next: Advanced formats

Advanced codecs like VP9 and HEVC generally produce smaller file sizes improving the experience on slower networks. Learn when and how to specify <a href="#">multiple sources</a> of your <code>&ltvideo></code>.

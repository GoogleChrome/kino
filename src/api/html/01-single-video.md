---
title: 'Single Video File'
description: 'Pick a suitable video format to make sure your single media file can be played by a vast majority of browsers and players on the web.'
date: 4th March, 2017
length: '7:43'
video-sources:
  - src: https://storage.googleapis.com/wdm-assets/media/01/video.mp4
    type: video/mp4; codecs="avc1.640032,mp4a.40.2"
thumbnail: https://storage.googleapis.com/wdm-assets/images/single-video-file.png
---
### Introduction

The simplest way of embedding a video on the web is using the `<video>` element. However, every browser supports a different set of video formats. Picking the right format will ensure your video is going to play everywhere.

### Choosing the right format

Browsers usually support multiple video formats, but there is a limited overlap in their capabilities. If you only want to encode your videos in a single format, the safe choice is to use a [MP4 container](https://caniuse.com/mpeg4) encapsulating H.264 video and AAC audio.

```
<video controls>
  <source src="video.mp4" type="video/mp4">
</video>
```

This simple approach is enough to get you up and running. Your video will now play in all major web browsers. Notice the `controls` attribute that instructs browsers to allow users to control video playback, volume, select captions etc.

A single video source is simple to maintain, but it gives rise to some challenges. Users of your site are going to use different classes of devices to watch the video. A high resolution video is going to look great on desktop, but may take a long time to load on slower cellular network – and vice versa.

### Example

Take the video at the top of this page as an example. It's a 1280×720 H.264 video with an effective bit rate of 1503 kb/s. It looks decent on a desktop screen while being small enough to not cause stuttering on good quality 3G networks. It is clear, however, that it's not a perfect fit for either of those use cases.

### Next: Advanced formats

Advanced codecs like VP9 and HEVC generally produce smaller file sizes improving visual quality and experience on slower networks. Learn when and how to specify [multiple sources](/multiple-sources/) of your `<video>`.

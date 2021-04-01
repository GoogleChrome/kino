---
title: 'Multiple Sources'
description: 'Use advanced video formats to save bandwidth and improve visual quality of your videos and let the browser choose between them.'
date: 4th March, 2017
length: '7:43'
video-sources:
  - src: https://storage.googleapis.com/wdm-assets/videos/http-203/http-203-polyfills.mp4
    type: video/mp4; codecs="avc1.64001f,mp4a.40.2"
thumbnail: https://storage.googleapis.com/wdm-assets/images/multiple-sources.png
---
### Introduction

Efficient video formats produce smaller video files while maintaining great visual quality. Their main drawback? None is universally supported by all web browsers and players. By making use of the `<source>` fallback technique we can offer browser a list of representations to choose from.

### Efficient formats

Several existing codecs provide superior efficiency to the [universally usable H.264](https://caniuse.com/mpeg4). Some of the more widely supported are the [AV1](https://caniuse.com/av1), [VP9](https://caniuse.com/webm) and [HEVC](https://caniuse.com/hevc) coding formats. Videos in those formats will be smaller in size, look better visually or both compared to H.264.

Should you then be using the more efficient codecs? Probably yes, but there is a small catch. You will need to encode the same video multiple times, each time using different codec, to target all browsers. Then you add those encoded files as video `<source>` elements and let browser choose which one to play.

<div class="code-sample">
  <div class="code-sample--content">&lt;video>
  &lt;source src="av1.mp4" type="video/mp4; codecs=\"av01.0.05M.08\"">
  &lt;source src="hevc.mp4" type="video/mp4; codecs=\"hvc1\"">
  &lt;source src="h264.mp4" type="video/mp4">
&lt;/video></div>
</div>

Consider the larger time investment needed to encode one video multiple times and the associated higher disk space requirements. If you can afford both, your users will certainly benefit from being served videos in more efficient formats.

### Next: Text tracks and accessibility

Now that your video is served everywhere in the most efficient format possible, take a second to think about its audience and accessibility. Learn how to use the `<track>` element to add closed captions, subtitles and more <a href="#">using WebVTT</a>.

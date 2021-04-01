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
thumbnail: https://storage.googleapis.com/wdm-assets/images/using-webvtt.png
---
### Introduction

The WebVTT (Web Video Text Tracks) format is used to describe timed text data such as closed captions or subtitles. You can use the `<track>` element to attach the `.vtt` files to your videos in order to make them more accessible by your audience.

```
<video controls>
  <source src="av1.mp4" type="video/mp4; codecs=\"av01.0.05M.08\"">
  <source src="hevc.mp4" type="video/mp4; codecs=\"hvc1\"">
  <source src="h264.mp4" type="video/mp4">

  <track src="cap-en.vtt" srclang="en" label="English" kind="captions">
  <track src="cap-cz.vtt" srclang="cz" label="Czech" kind="captions">
</video>
```

### WebVTT file structure

You can create a `.vtt` manually just by following the [Web Video Text Tracks specification](https://w3c.github.io/webvtt/). Take a look at what the basic timings format looks like.

```
WEBVTT

00:00.000 --> 00:04.000
The first line of the subtitles.

00:05.00 --> 00:07.950
– More content.
– This time on two
```

Want your captions to render in a different position with left or right alignment? Perhaps to align the captions with the current speaker position? WebVTT defines settings to do just that directly inside the `.vtt` file.

```
WEBVTT

00:00.000 --> 00:04.000 position:10%,line-left align:left size:35%
The first line of the subtitles.
```

See how the caption placement is defined by adding settings after the time interval definitions? Another handy feature is the ability to style individual cues using CSS. Perhaps you want to use yellow text color and a semitransparent background for all captions.

```
<style>
  ::cue {
    color: yellow;
    background-color: rgba(0, 0, 0, 0.5);
  }
</style>
<video controls>
  ...
  <track src="cap-en.vtt" srclang="en" label="English" kind="captions">
  <track src="cap-cz.vtt" srclang="cz" label="Czech" kind="captions">
</video>
```

### Kinds of text tracks

Noticed the `kind` attribute of the `<track>` element? It's used to indicate what relation the particular text track has to the video. The possible values of the `kind` attribute are:

* `captions`: For closed captions, i.e. transcripts and possibly translations of any audio. Suitable for hearing-impaired people and in cases when the video is playing muted.
* `subtitles`: For subtitles, i.e. translations of speech and text in a language different from the main language of the video.
* `descriptions`: For descriptions of visual parts of the video content. Suitable for visually impaired people.
* `chapters`: Intended to be displayed when the user is navigating within the video.
* `metadata`: Not visible. May be used by scripts.

### Next: Streaming

Subtitles are useful, but what if your video contains multiple audio tracks? Or you want more control over the `<video>` data buffer? For that, we need to get more technical and talk about [streaming](#).

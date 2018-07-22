# jk_SubtitleExport
After Effects script for exporting text layer as SRT subtitles file.

## What's this
This script can export subtitle text layer (with Source Text keyframes) to SRT file.
It works with layers created by [pt_ImportSubtitles script by Paul Tuerslay](https://aescripts.com/pt_importsubtitles/).
It will also work with manually created text layers as long as you want to export single layer with text on keyframes.

## How to use
This script only works with text layers which have _Source text_ keyframes.
There are two modes of operation:
- Export selected layer from the active timeline.
- Export first keyframed text layer from each selected comp.

### Single layer mode
Select subtitle Text Layer you want to export, run the script, and save the SRT.
It's that simple.
After successful export you will see a confirmation window with short summary.
If multiple layers are selected or selected layer doesn't have keyframes, script will throw an error.
Timeline window must be active.

### Comp mode
Select comps in the Project window, run the script, and select destination folder.
Script will export first keyframed and active text layer from each comp.
By default script will use Comp's name for file name. If file with the same name already exists, File Save window will appear.
Any selected non-comp items (solids, footage, etc) are ignored.
If there is no suitable text layer found, nothing will be exported from that comp.

## Why it's useful
Common scenarios:

* You used pt_ImportSubtitles script to create subtitle layer, modified it within After Effects and now want to export SRT.
* You manually created subtitles in After Effects as single text layer with keyframed text.

## Features

* Output file is encoded as UTF-8 with BOM. Lack of BOM may confuse some auto-detect algorithms if there are no non-ASCII characters (e.g. English text).
* Should work with any frame rate.
* After importing resulting SRT with pt_ImportSubtitles keyframes _should_ be at the same position (only tested with "Round down to nearest keyframe" enabled).

## Disclaimer
This script is very rough, created for my own needs. There's only minimal error checking. Script may crash if used in unexpected manner. Double check output SRT to ensure all text is preserved and timings are correct.
If it's useful for you too - that's great.

## Found a bug? Want a feature?
You can report a bug or suggest a feature by creating a [New Issue](https://github.com/Issity/jk_SubtitleExport/issues/new).
I might do something with it but won't promise.

_Live long and prosper!_

# jk_SubtitleExport
After Effects script for exporting text layer as SRT subtitles file.

## What's this
This script can export subtitle text layer (with Source Text keyframes) to SRT file.
It works with layers created by [pt_ImportSubtitles script by Paul Tuerslay](https://aescripts.com/pt_importsubtitles/).
It will also work with manually created text layers as long as you want to export single layer with text on keyframes.

## How to use
Select single text layer which has _Source text_ keyframes.
Run the script.
Select output file.
If nothing went wrong you'll see a message with short summary.

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
You can report a bug or suggest a feature by creating a _New Issue_.
I might do something with it but won't promise.

_Live long and prosper!_

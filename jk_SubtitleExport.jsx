/*
JK_SubtitleExport v0.4.1
Copyright 2018 Jakub Kowalski

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU General Public License for more details.

You should have received a copy of the GNU General Public License
along with this program.  If not, see <http://www.gnu.org/licenses/>.

-------------------------------------------------------------------------------

This script creates SRT files from subtitle text layers (single layer with
Source Text keyframes).
It works with layers created by pt_ImportSubtitles script by Paul Tuerslay -
https://aescripts.com/pt_importsubtitles/

Inspired by Philipp Grolle's script - http://aenhancers.com/viewtopic.php?t=2116

See the GitHub page - https://github.com/Issity/jk_SubtitleExport - to report
a bug, request a feature, or get the latest version.

*/

var scriptName = "JK_SubtitleExport";
var projectPath = app.project.file.path;
var saveFolder = new Folder(projectPath); // default save path is AEP location
var selectedComps = app.project.selection;
var selectedCompsLength = selectedComps.length;
var mode = 0; // 0 - nothing selected; 1 - single layer; 2 - selected comps
var filesExported = 0;
var abortMission = false;

/*
Detect if there is
- active Timeline with a layer selected
- selection in Project window
*/

if (selectedCompsLength != 0) {
  mode = 2;
}

/*
Selecting a single comp would trigger activeItem the same way as having Timeline
window active. We want single layer mode to run only if there is selection
in active Timeline. Otherwise run comp mode even for single comp.
If activeItem is a Comp we check if there's any layer selected.
*/

if ((app.project.activeItem instanceof CompItem) && (app.project.activeItem.selectedLayers.length != 0)) {
  mode = 1;
}

switch (mode) {
  case 0: // Nothing selected
  alert("Please select either a single text layer, composition or multiple compositions.", "Nothing selected!", true);
  break;

  case 1: // Single layer
  var selLayers = app.project.activeItem.selectedLayers;
  try {
    if (selLayers.length > 1) throw "Multiple layers selected!";
    if (selLayers.length == 0) throw "No layer selected!\nThis message should never be displayed!"; // this should be already detected earlier
    if (!(selLayers[0] instanceof TextLayer)) throw "Selected layer is not a text layer!";
    if (selLayers.length != 1) throw "???"; // if we got this far, this check should trigger an error
    if (selLayers[0].property("ADBE Text Properties").property("ADBE Text Document").numKeys == 0) throw "Selected layer has no keyframes!";
// .property("ADBE Text Properties").property("ADBE Text Document") is locale-independent way to access Source Text property.

    saveLayerToSRT(selLayers[0]);
  }
  catch(err) {
    alert(err, scriptName, true);
  }
  break;

  case 2: // Comp(s)
  try {
    var compCounter = 0; // number of Comps in selection
    var usableCompCounter = 0; // number of Comps with keyframed text layers in selection
    for (var i = 0; i <= (selectedCompsLength-1); i++) {
      if (selectedComps[i] instanceof CompItem) {
        compCounter++;
        if (findFirstTextLayerNum(selectedComps[i]) != null) {
          usableCompCounter++;
          if (usableCompCounter == 1) {
            saveFolder = saveFolder.selectDlg("Select folder for SRTs");
            if (saveFolder == null) throw "Operation cancelled!\nDestination folder not selected."
          }
          saveLayerToSRT(selectedComps[i].layer(findFirstTextLayerNum(selectedComps[i])), false, false);
          if (abortMission) throw "Mission aborted by user.";
        }
      }
    }
    if (compCounter == 0) throw "Selection doesn't contain any Comps!";
    if (usableCompCounter == 0 ) throw "Selected comps don't have keyframed text layers!"
    alert("Selected items: \t\t" + selectedCompsLength + "\n" +
          "Selected comps: \t\t" + compCounter + "\n" +
          "Not suitable comps: \t" + (compCounter - usableCompCounter) + "\n" +
          "Skipped by the user: \t" + (usableCompCounter - filesExported) + "\n\n" +
          "Exported comps: \t\t" + filesExported + "\n\n" +
          "Destination path: \n" + saveFolder.fsName);
  }
  catch(err) {
    alert(err, scriptName, true);
  }
  break;

  default:
  alert("Unexpected error!", "Ups!", true);
}

/*
The meat of this script.

subtitleLayer (TextLayer) - layer to be exported
showSummary (Boolean) [true] - display summary of total keyframes and subs
alwaysAskForFileLocation (Boolean) [true] - if false files will be saved at
default location and name. File save dialog would only appear if such file
already exists.
Returns nothing.

Function will take the text layer, extract text and time stamps from keyframes
and write to SRT file.

*/

function saveLayerToSRT(subtitleLayer, showSummary, alwaysAskForFileLocation) {
  if (showSummary === undefined) showSummary = true;
  if (alwaysAskForFileLocation === undefined) alwaysAskForFileLocation = true;
  var compName = subtitleLayer.containingComp.name;
  /*
  We create temporary file handle with default path, so we can show Save
  dialog pointing already to this path and file name.
  I suspect it would work the same if we dropped TmpFile and used just SRTFile
  for both.
  */
  var TmpFile = new File(saveFolder.absoluteURI + "/" + compName + ".srt");
  if ((alwaysAskForFileLocation) || (TmpFile.exists)) {
    SRTFile = TmpFile.saveDlg("Save layer \"" + subtitleLayer.name + "\" from comp \"" +
    compName + "\" as SRT file","SubRip:*.srt,All files:*.*");
  } else {
    SRTFile = TmpFile;
  }
  // if user didn't cancel...
  if (SRTFile != null) {
    var BOMSeq = "\u00EF\u00BB\u00BF"; // BOM sequence for UTF-8 encoding
    // open file for "w"riting,
    SRTFile.open("w","TEXT","????");
    SRTFile.write(BOMSeq); // Manually add BOM
    SRTFile.encoding = "UTF-8"; // After BOM is added switch encoding to UTF-8

    var subNumber = 0; //counter for the number above the timecode (in the SRT)
    var selLayerSourceText = subtitleLayer.property("ADBE Text Properties").property("ADBE Text Document");
    var totalKeys = selLayerSourceText.numKeys;
    var layerInTime = fixAEMath(subtitleLayer.inPoint);
    var layerOutTime = fixAEMath(subtitleLayer.outPoint);
    var firstKeyframe = 1; // Keyframe at layer IN point or just before it
    var lastKeyframe = totalKeys; // last keyframe before layer OUT point or exactly at it
    /*
    Set firstKeyframe to the one at or just befoer layer IN.
    Set lastKeyframe to the one at or just before layer OUT.
    This way we ignore text outside layer's IN and OUT.
    */
    while (layerInTime >= fixAEMath(selLayerSourceText.keyTime(firstKeyframe + 1))) {
      firstKeyframe++;
    }
    while (layerOutTime <= fixAEMath(selLayerSourceText.keyTime(lastKeyframe))) {
      lastKeyframe--;
    }


    for (var j = firstKeyframe; j <= lastKeyframe; j++) {
      var selText = selLayerSourceText.keyValue(j).toString();
      selText = stripWhitespace(selText);
      if (selText != "") {
          // ensure 1st subtitle doesn't start before layer IN point
          if ((subNumber == 0) && ((selLayerSourceText.keyTime(j) < layerInTime) || (j == 1))) {
            var subStartTime = timeToSRTTimecode(layerInTime + 0.0015);
          } else {
            var subStartTime = timeToSRTTimecode(selLayerSourceText.keyTime(j) + 0.0015);
          }

          if (j == lastKeyframe) { // Ensure last time stamp is not beyond layer OUT point
            var subEndTime = timeToSRTTimecode(layerOutTime + 0.0015);
          } else {
            var subEndTime = timeToSRTTimecode(Math.min(selLayerSourceText.keyTime(j + 1), layerOutTime) + 0.0015);
          }
          subNumber++;

/*
Why +0.0015?
Video is frame based, while SRT is time based. This allows for SRT to be used
with different frame rate videos, which is good.
The bad thing is each frame is has a duration (40 ms for 25 FPS or 41.7 for
23.976 FPS). So if subtitle starts or ends at specific frame what time should be
put in the time stamp? First (1 or 0 based?) millisecond of this frame, last,
somewhere between?
I tried AE's default which is start time of the frame. Unfortunately this
caused issues with pt_ImportSubtitles script. It's default setting rounds
time stamps down to the nearest keyframe. As the result some keyframes were
shifted one frame back after import-export-import roundtrip. Not using rounding
makes keyframes to appear between video frames, which causes other issues.
As a workaround 1.5 ms is added to the SRT time stamps. So far it works well for
most common frame rates.
*/

          //writing the results to file
          SRTFile.write(subNumber);
          SRTFile.write("\r\n");
          SRTFile.write(subStartTime);
          SRTFile.write(" --> ");
          SRTFile.write(subEndTime);
          SRTFile.write("\r\n");
          SRTFile.write(selText);
          SRTFile.write("\r\n\r\n");
      }
    }
    // close the text file
    SRTFile.close();
    filesExported++;

    if (showSummary) alert("SRT for layer with " + totalKeys + " keyframes and " + subNumber + " subtitles exported");

    // open text file in default app
    if (showSummary) SRTFile.execute();
  } else {
    if (mode == 2) {
      abortMission = confirm("File not saved!\nLayer \"" + subtitleLayer.name + "\" from comp \"" +
      compName + "\".\n\nDo you want to abort mission?", true, "Abort mission?")
    } else {
      alert("File not saved!\nLayer \"" + subtitleLayer.name + "\" from comp \"" +
      compName + "\".", "File not saved!", true);
    }
  }
}

/*
num (Number)
After Effects does some really weird math.
Two items (like layer OUT point and a keyframe) which are at seemingly the same
point in time, may return different time values. The difference is around 10th
decimal place. In most cases it doesn't matter, but can seriously break
comparisons when checking which of items is earlier in time.
These time values may appear
*/

function fixAEMath (num) {
  var precision = 100000; // probably 1000 would work just as good
  num = Math.round(num * precision) / precision;
  return num;
}

/*
comp (CompItem)
Returns number of the first TextLayer which has keyframes and is enables (eye
icon). If no such layer is found, returns null.
*/

function findFirstTextLayerNum(comp) {
  var currentLayerNum = 0;
  var found = false;
  var currentLayer;
  while ((currentLayerNum < comp.numLayers) && (!(found))) {
    currentLayerNum++;
    currentLayer = comp.layer(currentLayerNum);
    if ((currentLayer instanceof TextLayer) && (currentLayer.enabled) &&
    (currentLayer.property("ADBE Text Properties").property("ADBE Text Document").numKeys != 0)) found = true;
  }
  if (found) {
    return currentLayerNum;
  } else {
    return null;
  }
}

/*
str (String)
Removes any whitespace from the start and end of the string. Including empty
lines and new line symbol.
https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/trim
*/

function stripWhitespace(str) {
  return str.replace(/^[\s\uFEFF\xA0]+|[\s\uFEFF\xA0]+$/g, '');
}

/*
num (Number or String)
size (Number) - number of digits, ideally integer
Returns String
Add 0's to the left/Right side of a number to make it desired lenght.
Used to make time stamp fixed length.
*/

function padLeft(num, size) {
  var s = num.toString();
  while (s.length < size) s = "0" + s;
  return s;
}

function padRight(num, size) {
  var s = num.toString();
  while (s.length < size) s = s + "0";
  return s;
}


/*
timeInSecs (Number) - time in seconds. Who would have thought ;)
Returns String
Converts time in seconds (decimal) to HH:MM:SS,mmm format used in SRT.
H, M and S need to have 2 digits. Milliseconds have 3 digits and are separated
with comma (not a period, it originated in France AFAIK).
*/
function timeToSRTTimecode(timeInSecs) {
  d = Number(timeInSecs).toFixed(3);
  var h = Math.floor(d / 3600);
  var m = Math.floor(d % 3600 / 60);
  var s = Math.floor(d % 3600 % 60);
  var msec = (d % 1).toString().substring(2,5);
  var hDisplay = padLeft(h, 2);
  var mDisplay = padLeft(m, 2);
  var sDisplay = padLeft(s, 2);
  var msecDisplay = padRight(msec, 3);
  var SRTTimecode = hDisplay + ":" + mDisplay + ":" + sDisplay + "," + msecDisplay;
  return SRTTimecode;
}

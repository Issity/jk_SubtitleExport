/*
JK_SubtitleExport v0.4.0
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

if (selectedCompsLength != 0) {
  mode = 2;
}

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
    if (selLayers.length == 0) throw "No layer selected!\nThis message should never be displayed!";
    if (!(selLayers[0] instanceof TextLayer)) throw "Selected layer is not a text layer!";
    if (selLayers.length != 1) throw "???";
    if (selLayers[0].property("ADBE Text Properties").property("ADBE Text Document").numKeys == 0) throw "Selected layer has no keyframes!";

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

  function saveLayerToSRT(subtitleLayer, showSummary, alwaysAskForFileLocation) {
    if (showSummary === undefined) showSummary = true;
    if (alwaysAskForFileLocation === undefined) alwaysAskForFileLocation = true;
    var compName = subtitleLayer.containingComp.name;
    // prompt to save file
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

      var subNumber = 0; //counter for the number above the timecode (in the results)
      var selLayerSourceText = subtitleLayer.property("ADBE Text Properties").property("ADBE Text Document");
      var totalKeys = selLayerSourceText.numKeys;
        var layerInTime = subtitleLayer.inPoint;
        var layerOutTime = subtitleLayer.outPoint;
        var firstKeyframe = 1; // Keyframe at layer IN point or just before it
        var lastKeyframe = totalKeys; // last keyframe before layer OUT point or exactly at it
        while (layerInTime > selLayerSourceText.keyTime(firstKeyframe+1)) {
          firstKeyframe++;
        }
        while (layerOutTime < selLayerSourceText.keyTime(lastKeyframe)) {
          lastKeyframe--;
        }


        for (var j = firstKeyframe; j <= lastKeyframe; j++) {
          var selText = selLayerSourceText.keyValue(j).toString();
          selText = stripWhitespace(selText);
          if (selText != "") {
            if ((subNumber > 0) || (selLayerSourceText.keyTime(j+1) >= layerInTime)) {
              // ensure 1st subtitle doesn't start before layer IN point
              if ((subNumber == 0) && ((selLayerSourceText.keyTime(j) < layerInTime) || (j == 1))) {
                var subStartTime = timeToSRTTimecode(layerInTime+0.0015);
              } else {
                var subStartTime = timeToSRTTimecode(selLayerSourceText.keyTime(j)+0.0015);
              }

              if (j == totalKeys) { // Ensure last time stamp is not beyond layer OUT point
                var subEndTime = timeToSRTTimecode(layerOutTime+0.0015);
              } else {
                var subEndTime = timeToSRTTimecode(Math.min(selLayerSourceText.keyTime(j+1), layerOutTime) + 0.0015);
              }

              //writing the results to file
              subNumber++;
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

  function stripWhitespace(str) {
      return str.replace(/^[\s\uFEFF\xA0]+|[\s\uFEFF\xA0]+$/g, '');
  }

  function padLeft(num, size) {
    // var s = num+"";
    var s = num.toString();
    while (s.length < size) s = "0" + s;
    return s;
  }

  function padRight(num, size) {
    // var s = num+"";
    var s = num.toString();
    while (s.length < size) s = s + "0";
    return s;
  }

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

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

This script will export subtitle text layer (with Source Text keyframes) to SRT file.
It works with layers created by pt_ImportSubtitles script by Paul Tuerslay -
https://aescripts.com/pt_importsubtitles/

Inspired by Philipp Grolle's script - http://aenhancers.com/viewtopic.php?t=2116

Instructions:
Select subtitle Text Layer you want to export, run the script, and save the file as .srt.

*/

var scriptName = "JK_SubtitleExport";
var theComp = app.project.activeItem;
var projectPath = app.project.file.path;

  // Convert Subtitles
  var selLayers = app.project.activeItem.selectedLayers;
  try {
    if (selLayers.length > 1) throw "Multiple layers selected.";
    if (selLayers.length == 0) throw "No layer selected.";
    if (!(selLayers[0] instanceof TextLayer)) throw "Selected layer is not a text layer.";
    if (selLayers.length != 1) throw "???";

    var selLayerSourceText = selLayers[0].property("ADBE Text Properties").property("ADBE Text Document");
    var totalKeys = selLayerSourceText.numKeys;

    if (totalKeys == 0) throw "Selected layer has no keyframes";

    // prompt to save file
    var TmpFile = new File(projectPath + "/" + theComp.name + ".srt");
    SRTFile = TmpFile.saveDlg("Save selected layer as SRT file","SubRip:*.srt,All files:*.*");

    // if user didn't cancel...
    if (SRTFile != null) {
      var BOMSeq = "\u00EF\u00BB\u00BF"; // BOM sequence for UTF-8 encoding
      // open file for "w"riting,
      SRTFile.open("w","TEXT","????");
      SRTFile.write(BOMSeq); // Manually add BOM
      SRTFile.encoding = "UTF-8"; // After BOM is added switch encoding to UTF-8

      var subNumber = 0; //counter for the number above the timecode (in the results)

        var layerInTime = selLayers[0].inPoint;
        var layerOutTime = selLayers[0].outPoint;
        var firstKeyframe = 1; // Keyframe at layer IN point or just before it
        var lastKeyframe = totalKeys; // last keyframe before layer OUT point or exactly at it
        while (layerInTime > selLayerSourceText.keyTime(firstKeyframe+1)) {
          firstKeyframe++;
        }
        while (layerOutTime < selLayerSourceText.keyTime(lastKeyframe)) {
          lastKeyframe--;
        }


        for (var j = firstKeyframe; j <= (lastKeyframe); j++) {
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
        alert("SRT for layer with " + totalKeys + " keyframes and " + subNumber + " subtitles exported");
      // close the text file
      SRTFile.close();

      // open text file in default app
      SRTFile.execute();
    }
  }
  catch(err) {
    alert(err, scriptName, true);
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

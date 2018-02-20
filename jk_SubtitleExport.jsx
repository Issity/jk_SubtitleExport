/*
JK_SubtitleExport v0.3
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

var theComp = app.project.activeItem;

// prompt to save file
var TmpFile = new File(theComp.name + ".srt");
SRTFile = TmpFile.saveDlg("Save selected layer as SRT file","*.srt");

// if user didn't cancel...
if (SRTFile != null) {
  var BOMSeq = "\u00EF\u00BB\u00BF"; // BOM sequence for UTF-8 encoding
  // open file for "w"riting,
  SRTFile.open("w","TEXT","????");
  SRTFile.write(BOMSeq); // Manually add BOM
  SRTFile.encoding = "UTF-8"; // After BOM is added switch encoding to UTF-8

  // Convert Subtitles
  checkParam(1); // Check if text layer is selected. Uses needlesly complex function from other script.
  // app.beginUndoGroup("JK_SubtitleExport");
  var selLayer = app.project.activeItem.selectedLayers;
  var subNumber = 1; //counter for the number above the timecode (in the results)
  for(var i = 0; i<selLayer.length; i++){
    if(selLayer[i] instanceof TextLayer){
      totalKeys = selLayer[i].property("ADBE Text Properties").property("ADBE Text Document").numKeys;
      if (totalKeys > 0) {
        for (var j = 1; j <= (totalKeys-1); j++) {
          var selText = selLayer[i].property("ADBE Text Properties").property("ADBE Text Document").keyValue(j).toString();
          if (selText != "") {
            var subStartTime = timeToSRTTimecode(selLayer[i].property("ADBE Text Properties").property("ADBE Text Document").keyTime(j)+0.0015);
            var subEndTime = timeToSRTTimecode(selLayer[i].property("ADBE Text Properties").property("ADBE Text Document").keyTime(j+1)+0.0015);

            //writing the results to file
            SRTFile.write(subNumber);
            SRTFile.write("\r\n");
            SRTFile.write(subStartTime);
            SRTFile.write(" --> ");
            SRTFile.write(subEndTime);
            SRTFile.write("\r\n");
            SRTFile.write(selText);
            SRTFile.write("\r\n\r\n");
            subNumber++;
          }
        }
        alert("SRT for layer with " + totalKeys + " keyframes and " + subNumber + " subtitles exported");
      } else {
        alert("No layer selected or layer has no keyframes");
      }
    }
  }
  // app.endUndoGroup();

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

  function checkParam(ch){
    var thisComp = null;
    var selectLayer = null;
    switch(ch){
      case 0:
      thisComp = app.project.activeItem;
      if (thisComp == null || !(thisComp instanceof CompItem)){
        alert ("Please Select a Comp", "Error");
        return;
      }
      break;
      case 1:
      selectLayer = app.project.activeItem.selectedLayers;
      if(selectLayer.length < 1){
        alert ("Please Select a Layer(s)", "Error");
        return;
      } else {
        var i ;
        for( i = 0; i<selectLayer.length; i++){
          if(selectLayer[i] instanceof TextLayer)
          break;
        }

        if(i == selectLayer.length){
          alert("Please Select a Text Layer(s)", "Error");
          return;
        }
      }
      break;
      case 2:
      if(ATSE.valInText == ""){
        alert ("No Input Text ", "Error");
        return;
      }
      break;
      default:
    }
  }

  // close the text file
  SRTFile.close();

  // open text file in default app
  SRTFile.execute();
}

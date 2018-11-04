function initLogEntry() {
    return {
        Timestamp: null,
        Event: null,
        Coords: null
    };
}
var driveEntries = document.getElementById("demo");
var driveButton = document.getElementById("driveBtn");
var error_text = document.getElementById("error_message");

//var dbName = "tesla-autopilot-log";
var currentDriveEntries = [];
var driveInProgress = false;
var queueLogEntry = initLogEntry();
var pastDriveList = [];
var mprogress = null;
document.addEventListener('DOMContentLoaded', function ()
{
    if (window.location.href) {
        let url = new URL(window.location.href);
        let searchParams = new URLSearchParams(url.search);
        let foundDev = searchParams.get('dev');
        if (foundDev === '1') {
            Sentry.init({ dsn: 'https://2a4a905c730d48b6aef4888482732f7e@sentry.io/1315531' });
        }
        
    }
    mprogress = new Mprogress({ template: 3, parent:'#left_buttons_container'});
    //Load Previous drive items
    var pastUnifinishedDriveStr = localStorage.getItem('currentDriveEntries');
    if (pastUnifinishedDriveStr) {
        //we found items 
        currentDriveEntries = JSON.parse(pastUnifinishedDriveStr);
        for (let entry of currentDriveEntries) {
            displayLogEntry(generateLogEntryString(entry));
        }
        driveInProgress = true;
        startDriveVisual();
    }
    retrieveAndDisplayPastDrives();

}, false);
function retrieveAndDisplayPastDrives() {
    pastDriveList = retrievePastDrivesList();
    if (pastDriveList && pastDriveList.length > 0) {
        var dl = document.getElementById('pastDriveLog');
        dl.style.display = "block";
        var countPastDriveLog = document.getElementById('pastDriveCount');
        countPastDriveLog.innerHTML = pastDriveList.length;
        //display that we have old drives saved
        /*for(let entry of pastDriveList)
        {
  
        }*/
    }
}
function retrievePastDrivesList() {
    var pastDrivesStr = localStorage.getItem('pastDrivesList');
    if (!pastDrivesStr) {
        pastDrivesStr = JSON.stringify([]);
    }
    return JSON.parse(pastDrivesStr);
}
function startDrive() {
    var start_timestamp = new Date();
    clearCurrentDriveLog();

    displayLogEntry("Started drive:" + start_timestamp.toLocaleString());
    logPersistentEvent("started", start_timestamp, null);

    driveInProgress = true;
    writeErrorMessage('');
    startDriveVisual();
}
function startDriveVisual() {
    driveButton.innerHTML = "End Drive";
    driveButton.style.backgroundColor= 'red';
}
function endDriveVisual() {
    driveButton.innerHTML = "Start Drive";
    //get this from a variable on the css?
    driveButton.style.backgroundColor = '#4CAF50';
}
function endDrive() {
    //Copy / Save this log entry separate
    var end_timestamp = new Date;

    displayLogEntry("Ended drive:" + end_timestamp.toLocaleString());
    logPersistentEvent("ended", end_timestamp, null);

    saveCurrentDrivePermanently();

    clearCurrentDriveLog();

    driveInProgress = false;
    endDriveVisual();
    retrieveAndDisplayPastDrives();
}
function clearAllHistory() {
    //clear everything from the current drive 
    clearCurrentDriveLog();
    clearAllDbHistory();
}
function clearAllDbHistory()
{
 
    localStorage.removeItem('pastDrivesList');
    localStorage.removeItem('currentDriveEntries');
}
function saveCurrentDrivePermanently() {
    //load past Drives

    pastDrives = retrievePastDrivesList();
    pastDrives.push(currentDriveEntries);
    //save past drives
    localStorage.setItem('pastDrivesList', JSON.stringify(pastDrives));
}
function clearCurrentDriveLog() {
    currentDriveEntries = [];
    localStorage.removeItem('currentDriveEntries');
    //remove visual list of log entries for this drive
    while (driveEntries.firstChild) {
        driveEntries.removeChild(driveEntries.firstChild);
    }
}
function logPersistentEvent(event, time, coordinates) {

    var logItem = { Timestamp: time, Event: event, Coords: coordinates };
    //add to memory object
    currentDriveEntries.push(logItem);
    //save to DB
    localStorage.setItem('currentDriveEntries', JSON.stringify(currentDriveEntries));
}

function writeErrorMessage(message) {
    error_text.innerHTML = message;
}
function geo_error(err) {
    mprogress.end();
    writeErrorMessage(`ERROR(${err.code}): ${err.message}`);
    displayLogEntry(generateLogEntryString(queueLogEntry));
    //update persistent database
    logLastEventToPersistent();
}
function driveButtonPressed() {
    if (!driveInProgress) {
        startDrive();
    } else {
        endDrive();
    }

}
function getLocation() {
    var selected_item = document.querySelector('input[name="type"]:checked');
    if (selected_item == null) {
        writeErrorMessage("Select a item to Log.");
        return;
    }
    //in case we forgot to start the drive
    if (!driveInProgress) {
        startDrive();
    }
    if (navigator.geolocation) {
        mprogress.start();
        var selected_type = selected_item.value;
        queueLogEntry.Event = selected_type;
        queueLogEntry.Timestamp = new Date;
        //get gps coords
        navigator.geolocation.getCurrentPosition(showPosition, geo_error);

    } else {
        writeErrorMessage("Geolocation is not supported by this browser.");
    }

}
function generateLogEntryString(logEntry) {
    var content = '';
    if (logEntry.Coords) {
        content += "Latitude: " + logEntry.Coords.latitude +
            "<br>Longitude: " + logEntry.Coords.longitude;
    } else {
        content += "No Location";
    }
    content += "<br> Local Time: " + logEntry.Timestamp.toLocaleString() +
        "<br> Event Type: " + logEntry.Event;
    return content;

}
function displayLogEntry(content) {
    var pnode = document.createElement("p");
    pnode.innerHTML = content;
    var textnode = document.createElement("li");
    textnode.appendChild(pnode);
    driveEntries.insertBefore(textnode, driveEntries.childNodes[0]);
}
function logLastEventToPersistent() {
    logPersistentEvent(queueLogEntry.Event, queueLogEntry.Timestamp, queueLogEntry.Coords);
}
function showPosition(position) {
    mprogress.end();
    queueLogEntry.Coords = position.coords;
    displayLogEntry(generateLogEntryString(queueLogEntry));
    //update persistent database
    logLastEventToPersistent();
}

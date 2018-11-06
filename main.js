function initLogEntry() {
    return {
        Timestamp: null,
        Event: null,
        Coords: {latitude: null,
            longitude: null}
    };
}
var driveEntries = document.getElementById("demo");
var driveButton = document.getElementById("driveBtn");
var error_text = document.getElementById("error_message");
var issues_list = document.getElementById('issues_list');
//var dbName = "tesla-autopilot-log";
var currentDriveEntries = [];
var driveInProgress = false;
var queueLogEntry = initLogEntry();
var pastDriveList = [];
var mprogress = null;
let developer_mode = false;

document.addEventListener('DOMContentLoaded', function ()
{
    if (window.location.href) {
        let url = new URL(window.location.href);
        let searchParams = new URLSearchParams(url.search);
        let foundDev = searchParams.get('dev');
        if (foundDev === '1') {
            
            developer_mode = 1;
            developerMode();
            Sentry.init({ dsn: 'https://2a4a905c730d48b6aef4888482732f7e@sentry.io/1315531' });
        }
        
    }
    addBreadcrumb("DomContentloaded")
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
function developerMode()
{
    let dl = document.getElementById('submitMessage');
    if(dl)
    {
        dl.style.display = "block";
    }
}
function submitMessage()
{
    Sentry.captureMessage("Issue found and submitted by user");
}
function retrieveAndDisplayPastDrives() {
    pastDriveList = retrievePastDrivesList();
    let dl = document.getElementById('pastDriveLog');
    if (pastDriveList && pastDriveList.length > 0) {
       
        dl.style.display = "block";
        var countPastDriveLog = document.getElementById('pastDriveCount');
        countPastDriveLog.innerHTML = pastDriveList.length;
        //display that we have old drives saved
        /*for(let entry of pastDriveList)
        {
  
        }*/
    }else{
        dl.style.display = "hidden";
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
    addBreadcrumb('start drive');
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
    addBreadcrumb("end drive");
    //Copy / Save this log entry separate
    var end_timestamp = new Date;

    displayLogEntry("Ended drive:" + end_timestamp.toLocaleString());
    logPersistentEvent("ended", end_timestamp, null);

    saveCurrentDrivePermanently();

    clearCurrentDriveLog();
    uncheckSelection();
    driveInProgress = false;
    endDriveVisual();
    retrieveAndDisplayPastDrives();
}
function uncheckSelection()
{
    let selected_items = retrieveSelected();
    if(selected_items)
    {
        selected_items.checked = false;
    }
}
function clearAllHistory() {
    addBreadcrumb("clear all history");
    //clear everything from the current drive 
    clearCurrentDriveLog();
    clearAllDbHistory();

    driveInProgress = false;
    endDriveVisual();
    uncheckSelection();
    retrieveAndDisplayPastDrives();
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

    //add to memory object
    var logItem = { Timestamp: time,
         Event: event,
          Coords: null 
    };
    if(coordinates != null)
    {
        logItem.Coords ={latitude: coordinates.latitude,
            longitude:coordinates.longitude}
    }
    currentDriveEntries.push(logItem);
    //save to DB
    localStorage.setItem('currentDriveEntries', JSON.stringify(currentDriveEntries));
}

function writeErrorMessage(message) {
    error_text.innerHTML = message;
}
function addBreadcrumb(message)
{
    if(developer_mode)
    {
        Sentry.addBreadcrumb({
            category: 'ui',
            message: message,
            level: 'info'
        });
    }
    if(issues_list)
    {
        var pnode = document.createElement("p");
        pnode.innerHTML = message;
        var textnode = document.createElement("li");
        textnode.appendChild(pnode);
        issues_list.insertBefore(textnode, null);
        
    }
}
function geo_error(err) {
    
    mprogress.end();
    addBreadcrumb('geo_error called:'+err.message);
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
function retrieveSelected()
{
    return document.querySelector('input[name="type"]:checked');

}
function getLocation() {
    var selected_item = retrieveSelected();
    if (selected_item == null) 
    {
        addBreadcrumb("no item to log");
        writeErrorMessage("Select a item to Log.");
        return;
    }
    addBreadcrumb('getLocation Pressed');
    selected_item.checked = false;
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
        navigator.geolocation.getCurrentPosition(showPositionCB, geo_error);

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
function showPositionCB(position) {
    addBreadcrumb('showPosition Callback called');
  
    mprogress.end();
    queueLogEntry.Coords.latitude = position.coords.latitude;
    queueLogEntry.Coords.longitude = position.coords.longitude;
    displayLogEntry(generateLogEntryString(queueLogEntry));
    //update persistent database
    logLastEventToPersistent();
}

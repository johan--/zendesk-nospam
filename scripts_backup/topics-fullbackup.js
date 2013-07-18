/*
 * Back-up all topics data in Zendesk
 */

"use strict";

var fileBackupTopics = "log/export_topics.txt";
//process.env.NODE_DEBUG = 'true';

// -------
var zd          = require('node-zendesk'),
    fs          = require('fs');

console.log("authenticating...");
var zdc = zd.createClient();

// add dated header to log file
writeFile(fileBackupTopics, "Export of all topics in Zendesk - " + new Date());

// main function
console.log("authenticated, retrieving topics... (this may take a minute)");
zdc.topics.list(function (err, req, topics) {
    if (err) return handleError(err);
    console.log("topics retrieved succesfully (count:",topics.length,"), looping...");
    fs.writeFile(fileBackupTopics, JSON.stringify(topics, null, 2));
    console.log("done, exported to file: "+fileBackupTopics);
});

function handleError(err) {
    console.log(err);
    process.exit(-1);
}

function writeFile(file, text) {
    text = text + "\n";
    var buf = new Buffer(text, 'utf8');
    var fd = fs.openSync(file, 'a');
    fs.writeSync(fd, buf, 0, buf.length, -1);
    fs.closeSync(fd);
}

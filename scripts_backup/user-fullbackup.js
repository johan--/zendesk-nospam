/*
 * Back-up all user's data in Zendesk
 */

"use strict";

var fileBackupUsers = "log/export_users.txt";
//process.env.NODE_DEBUG = 'true';

// -------
var zd          = require('node-zendesk'),
    fs          = require('fs');

console.log("authenticating...");
var zdc = zd.createClient();

// add dated header to log file
writeFile(fileBackupUsers, "Export of all users in Zendesk - " + new Date());

// main function
console.log("authenticated, retrieving users... (this may take a minute)");
zdc.users.list(function (err, req, users) {
    if (err) return handleError(err);
    console.log("users retrieved succesfully (count:",users.length,"), looping...");
    fs.writeFile(fileBackupUsers, JSON.stringify(users, null, 2));
    console.log("done, exported to file: "+fileBackupUsers);
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

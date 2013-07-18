/*
 * @copyright Copyright(c) 2013 C9D B.V. <info AT c9 DOT io>
 * @author Bas de Wachter <bas AT c9 DOT io>
 * @license LICENSE MIT License
 *
 * Implementation of basic forum search functionality using the Zendesk REST API:
 * Searches all topics in the forum for the specified keywords. If equal to/more than the specified 
 * number of keywords are found, it is considered spam. If so, the topic is stored in a log file and deleted.
 * The submitter/user data is stored in a file and subsequentially suspended (not deleted).
 * 
 * --warning--
 * This code is not guaranteed to work, use it at your own risk.
 * Create a back-up of all relevant Zendesk data before running this script.
 * It may delete data. No responsibility or liability accepted.
 *
 * Note the back-up folder, it contains scripts to export the current users / topics.
 * Be wise: use them and verify the result before running this script.
 *
 *
 * usage: 
 *        node zendesk-nospam.js -s <subdomain> -u <username> -t <token> | tee -a ./log/log_zendesk-nospam.txt
 *   or
 *        node zendesk-nospam.js -s <subdomain> -u <username> -p <password> | tee -a ./log/log_zendesk-nospam.txt
 * 
 * output:
 *            <no>,<submitter.id>,<topic.id>,<keywordcount>,<rating>, <topic.title>
 *        ex:  147,     159700586,  12011798,             0,    'ok', 'Support Custom Code Snippets'
 */

"use strict";

/* ------------------------------------------------------------------------------
 * adjustable settings
 *
 * keywords:            array of keywords to search for in a topic, which indicate the message is spam
 * minCountKeywords:    when equal to/more than minCountKeywords are found in one topic, consider it spam
 * fileDeletedTopic:    before a topic is deleted, it is stored in this file for reference 
 * fileSuspendedUser:   before a user is suspended, he is stored in this file for reference 
 * simulate:            inspect the messages without actually 
 * maxProcess:          this limits the number of tickets to be inspected
 */
var keywords = ["loan","credit","financial","payday","fraudulent","iphone ","paycheque","file.getstring"];
var minCountKeywords = 2;
var fileDeletedTopic = "log/log_deleted_topic.txt";
var fileSuspendedUser = "log/log_suspended_user.txt";
var simulate = true;
var maxProcess = 2000;


/* ------------------------------------------------------------------------------
 * implementation
 */
var zd          = require('node-zendesk'),
    fs          = require('fs'),
    async       = require('async');


//process.env.NODE_DEBUG = 'true';
var countTopic, countDone = 0;
if (simulate) console.log("[simulation mode]");
console.log("authenticating...");
var zdc = zd.createClient();

// add dated header to log file
var session_header = new Date() + ": starting new session to delete Zendesk spam"; 
writeFile(fileDeletedTopic, session_header);
writeFile(fileSuspendedUser, session_header);

// main function
console.log("authenticated, retrieving topics... (this may take a minute)");
zdc.topics.list(function (err, req, topics) {
    if (err) return handleError(err);
  
    countTopic = topics.length;
    console.log("topics retrieved succesfully (count:",countTopic,"), looping...");
  
    // reverse order, more efficient
    topics.reverse();

    // check all
    async.eachSeries(topics, checkTopic, function(err, res) {
        console.log("done");
        return;
    });
});

function checkTopic(topic, cb) {
    isSpamTopic(topic, function(err, keywordcount, isSpam) {
        var topicType = (isSpam ? "spam" : "ok");
        countDone++;
        console.log ("%d, %d, %d, %d, '%s', '%s'", countDone, topic.submitter_id, topic.id, keywordcount, topicType, topic.title);
        if (isSpam)
            topicSpam(topic, keywordcount, cb);
        else
            topicOk(topic, keywordcount, cb);
    });
}


function isSpamTopic(topic, cb) {
    // count keywords
    var j, keywordcount = 0;
    for (j = 0; j < keywords.length; j++) {
        (topic.title.toLowerCase().indexOf(keywords[j]) != -1) && keywordcount++;
        (topic.body.toLowerCase().indexOf(keywords[j]) != -1) && keywordcount++;
    }

    return cb(null, keywordcount, keywordcount >= minCountKeywords);
}

function topicOk(topic, keywordcount, cb) {
    topicDone(topic, keywordcount, false, function() {
        cb();
    });
}

function topicSpam(topic, keywordcount, cb) {
    suspendUser(topic.submitter_id, function(err, info) {
        removeTopic(topic, function() {
            topicDone(topic, keywordcount, true, function() {
                cb();
            });
        });
    });
}

function topicDone(topic, keywordcount, isSpam, cb) {
    if (countDone >= maxProcess) process.exit(0);
    cb();
}

function removeTopic(topic, cb) {
    if (simulate) return cb();
    var topic_json = JSON.stringify(topic, null, 4, true);
    writeFile(fileDeletedTopic, topic_json);
    zdc.topics.delete(topic.id, function(err) {
        if (err) return handleError(err);      
        console.log("=> delete topic: ", topic.title);
        cb();
    });
}

function suspendUser(uid, cb) {
    if (simulate) return cb();
    zdc.users.show(uid, function (err, status, user) {
        if (err) return handleError(err);
        var user_json = JSON.stringify(user, null, 4, true);
        writeFile(fileSuspendedUser, user_json);
    
        /* does not work, bug in lib?
        zdc.users.suspend(uid, function(err) {
            if (err) return handleError(err);
        */

        user.suspended = true;
        zdc.users.update(uid, user, function(err) {
            if (err) return handleError(err);
            var info = user.name + " [" + user.email + "]";  
            console.log("=> suspend user: ", info);
            cb(null);
        });
    });
}

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

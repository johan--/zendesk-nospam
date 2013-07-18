Find and delete spam in your Zendesk forum
------------------------------------------

Implementation of basic forum search functionality using the Zendesk REST API:
Searches all topics in the forum for the specified keywords. If equal to/more than the specified number of keywords are found, it is considered spam. 
If so, the topic is stored in a log file and deleted. The submitter/user data is stored in a file and subsequentially suspended (not deleted).

The challenge is to find common keywords in the spam messages. An adjustable variable 'minCountKeywords' determines how many of the keywords need be found to make a topic be considered spam.
Fortunately there is a 'simulation' mode, where the topics are 'rated', but not deleted when rated spam. 
Use simulation mode to find out what topics and value for minCountKeywords are suitable before actually cleaning-up.
The settings are found on top of the code file (zendesk-nospam.js):
```
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
var keywords = ["loan","credit","financial","payday","fraudulent","iphone ","paycheque"];
var minCountKeywords = 2;
var fileDeletedTopic = "log/log_deleted_topic.txt";
var fileSuspendedUser = "log/log_suspended_user.txt";
var simulate = true;
var maxProcess = 2000;
```

Running the code
----------------
For the code to run, a node.js installation is required.
If that is not available, create it for free at [Cloud9 IDE](https://c9.io).
Create an account, clone the github workspace and it is ready for you to use it.

Warning
-------
This code is still in beta and is written to delete data from your (production) environment. 
Be very careful with this, use it at your own risk. No responsibility or liability accepted.
There is no script for restoring backed-up data and we do not guarantee to provide support.

Zendesk authentication
----------------------
To authenticate to Zendesk, you need have the:
* subdomain/company name (found in URL: https://subdomain.zendesk.com )
* username
* token (preferred) or password  

These should be provided as command line parameters:
* -s  subdomain
* -u  user
* -p  password
* -t  token

so for example: 
```
node zendesk-nospam.js -s <subdomain> -u <username> -t <token> | tee -a ./log/log_zendesk-nospam.txt
```

Workflow
--------
A typical workflow would be:

1. Inspect the spam messages
2. Specify/modify keywords & minCountKeywords
3. Run zendesk-nospam.js in simulation mode, inspect result and redo (2) if desired
```
node zendesk-nospam.js -s <subdomain> -u <username> -t <token> | tee -a ./log/log_zendesk-nospam.txt
```
4. Back-up users:
```
node scripts_backup/user-fullbackup.js -s <subdomain> -u <username> -t <token> | tee -a ./log/log_zendesk-nospam.txt
```
5. Back-up tickets:
```
node scripts_backup/topics-fullbackup.js -s <subdomain> -u <username> -t <token> | tee -a ./log/log_zendesk-nospam.txt
```
6. Run zendesk-nospam.js in non-simulation mode, check results



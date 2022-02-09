const fs = require('fs');

function dateTimeZ() { return new Date().toISOString().split('T'); }
function rot13(s) { return s.replace(/[a-zA-Z]/g,function(c){return String.fromCharCode((c<="Z"?90:122)>=(c=c.charCodeAt(0)+13)?c:c-26);}); }

let knownUsers = {};

function loadKnownUsers() {
	fs.readFile('users.json', 'utf-8', (err, data) => {
		if (err) { throw err; }
		knownUsers = JSON.parse(data.toString());
	});
}

function saveKnownUsers() {
	try {
		console.log("[SAVING] started knownUsers");
		fs.writeFileSync('users.json', JSON.stringify(knownUsers));
		console.log("[SAVING] finished knownUsers");
	} catch (error) {
		console.error(err);
	}
}

function appendLogFile(dateTime, user, message) {
	const fs = require('fs');
	fs.appendFileSync('logs/date-'+dateTime[0]+'.json', JSON.stringify({time:dateTime[1],user:user,text:message}) + "\n");
}

function trackUser(user, message) {
	let dateTime = dateTimeZ();
	if (!(user in knownUsers)) knownUsers[user] = {};
	knownUsers[user].lastseen = dateTime[0];
	
	if (!('messages' in knownUsers[user])) knownUsers[user].messages = [];
	knownUsers[user].messages.unshift({text:message, day:dateTime[0], time:dateTime[1]});
	knownUsers[user].messages = knownUsers[user].messages.slice(0,3);

	if (!('tacoGiven' in knownUsers[user])) knownUsers[user].tacoGiven = "";

	appendLogFile(dateTime, user, message)
}


function unknownUserCheck(user, message) {
	return (!(user in knownUsers));
}

function unknownUserDo(user, message) {
	return "Welcome " + user + ", have't seen you before\nA friendly reminder to be respectful";
}

function lmgtfyCheck(user, message) {
	let parts = message.split(" ");
	return (parts.length >= 3 && 
		('tacos' in knownUsers[user]) && 
		knownUsers[user].tacos > 1 && 
		parts[0] == "lmgtfy" &&
		parts[1] in knownUsers);
}

function lmgtfyDo(user, message) {
	let parts = message.split(" ");
	return "hey " + parts[1] + " let me google that for you https://letmegooglethat.com/?q=" + parts.slice(2).join("+"); 
}

function knownUserCheck(user, message) {
	if (user in knownUsers && 'lastseen' in knownUsers[user] && knownUsers[user].lastseen != dateTimeZ()[0]) {
		knownUsers[user] == dateTimeZ()[0];
		return true;
	}
	return false;
}

function knownUserDo(user, message) {
	if (!('tacos' in knownUsers[user])) knownUsers[user].tacos = 0;
	knownUsers[user].tacos += 1;
	return "Hey " + user + ", here is a :taco: for loggin in today.  You now have " + knownUsers[user].tacos + " tacos";
}

function awardTacoCheck(user, message) {
	const msg = message.split(/ +/);
	if (user in knownUsers && !!message.toLowerCase().match(":taco:") && msg.length >= 2 && msg.length <= 5) {
		for(let other of msg) {
			if (other in knownUsers) {
				return true;
			}
		}
	}
	return false
}

function awardTacoDo(user, message) {
	if ("tacoGiven" in knownUsers[user] && knownUsers[user].tacoGiven == dateTimeZ()[0]) {
		return "sorry " + user + " but you can only award tacos once per day";
	}

	const words = message.split(/ +/).filter(x=>x!=":taco:");
	for(let other of words) {
		if (other == user) {
			knownUsers[user].tacoGiven = dateTimeZ()[0];
			return "You used your taco giving ability for the day to discover that you cannot give tacos to yourself";
		}
		if (other in knownUsers) {
			if (!('tacos' in knownUsers[other])) knownUsers[other].tacos = 0;
			knownUsers[other].tacos += 10;
			if (!('tacos' in knownUsers[user])) knownUsers[user].tacos = 0;
			knownUsers[user].tacos += 1;
			knownUsers[user].tacoGiven = dateTimeZ()[0];
			return user + " has awarded " + other + " 10 tacos. " + other + " now has " + knownUsers[other].tacos + " tacos. " + user + " now has " + knownUsers[user].tacos + " tacos";
		}
	}
	return "sorry " + user + ", no users can be found to award that taco";
}


const badWords = rot13('phag avttre avtre avtte snt snttbg nff nffubyr shpx shpxre shpxvat cravf chffl onyyf fuvg gheq gjng shpxsnpr onqjbeq').split(" ").map(x=>" "+x);
function badLanguage(user, message) {
	let padded = " " + message.toLowerCase().replace(/[^a-z ]/,"") + " "
	for (let word of badWords) {
		if (padded.indexOf(word + " ") >= 0) return true;
		if (padded.indexOf(word + "s ") >= 0) return true;
		if (padded.indexOf(word + "'s ") >= 0) return true;
	}
	return false;
}

const okayRepeats = {yes:1, no:1, yeah:1, hi:1, hello:1, oo:1, oO:1, nope:1}
function repeatingSelf(user, message) {
	return (user in knownUsers && 
		"messages" in knownUsers[user] && 
		knownUsers[user].messages.length > 2 && 
		message == knownUsers[user].messages[0].text &&
		dateTimeZ()[0] == knownUsers[user].messages[0].day &&
		message != knownUsers[user].messages[1].text &&
		!(message.match(/^:[a-z]+:$/)) &&
		!(message.toLowerCase().replace(/[^a-z]/g,"") in okayRepeats));
}


loadKnownUsers();

exports.save = saveKnownUsers;
exports.track = trackUser;
exports.knownUsers = function() { return knownUsers; };
exports.handlers = {
	// "unknown user" : {
	// 	check : unknownUserCheck,
	// 	do : unknownUserDo,
	// 	dest : "tacos"
	// },
	"known user" : {
		check : knownUserCheck,
		do : knownUserDo,
		dest : "taco"
	},
	"lmgtfy" : {
		check : lmgtfyCheck,
		do : lmgtfyDo
	},
	"naughty language" : {
		check : badLanguage,
		do : function(user, message) { return user + " be respectful and watch your language\nhttps://www.codingame.com/playgrounds/40701/help-center/code-of-conduct" }
	},
	"user looping" : {
		check : repeatingSelf,
		do : function(user, message) { return user + " please don't repeat yourself"}
	},
	"clash of code" : {
		check : function(user, message) { return message.indexOf("https://www.codingame.com/clashofcode/clash") >= 0 && message.indexOf("report") == -1 },
		do : function(user, message) { return "hey " + user + ", dont paste those links here.  Use the channel #clash" }
	},
	"taco prizes" : {
		check : awardTacoCheck,
		do : awardTacoDo
	},
	"hello" : {
		check : function(user, message) { 
			let m = " "+message.toLowerCase() + " ";
			return !!m.match("[^a-z0-1](yo|hi|hey|hello)[^a-z0-1]") && !!m.match("[^a-z0-1]antiwonto") && m.length < 30;
		},
		do : function(user, message) { return "hey " + user +". I'm a bot :robot:" }
	}
};

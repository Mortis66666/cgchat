'use strict';

const responseHandler = require('./responseHandlers.js'),
  xmpp = require('simple-xmpp'),
  config = require('./config.json'),
  Stanza = require('node-xmpp-client').Stanza;


let queueTimer = null,
  queue = [],
  killed = false,
  readyToRespond = false;


let kill = (code) => {
  if (killed) { return; }
  killed = true;
  readyToRespond = false;
  responseHandler.save();
  console.log('[INFO] Closing process');
  clearInterval(queueTimer);
  setTimeout(() => process.exit(code), 3000);
};

function startQueueTimer() {
  clearInterval(queueTimer);
  queueTimer = setInterval(function() {
    if (queue.length) {
        xmpp.conn.send(queue[0]);
        queue.shift();
    } else {
      clearInterval(queueTimer)
    }
  }, 1000);
}

let sendMessage = function(conference, message) {
    try {
      let stanza = new Stanza('message', {
        to: conference,
        type: 'groupchat',
        id: config.nickname + new Date().getTime()
      });
      stanza.c('body').t(message);  

      queue.push(stanza);
      startQueueTimer();

    } catch (e) {
      console.log('[ERROR]', e);
    }
}




// **************  XMPP CODE *****************

xmpp.on('online', data => {
  console.log('[INFO] Online:', data);
  config.groupchats.forEach(groupchat => {
    xmpp.join(groupchat + '@' + config.muc + '/' + config.nickname);
  });
  console.log("[Online] paused readyToRespond");
  setTimeout(()=> { 
    readyToRespond = true;
    console.log("[Online] enabled readyToRespond");
  }, 2000);
});

// xmpp.on('chat', function(from, message) {
//   console.log("[Personal Received] " + from + " : '" + message + "'");
//   //xmpp.send(from, 'echo: ' + message);
// });

xmpp.on('groupchat', (conference, from, message, stamp, delay) => {
  console.log( new Date().toISOString().slice(0,19) + " " + from + " " + message.replace(/\n/g,"\n    "));
  if (readyToRespond && from != config.nickname) {
    for (let handler of responseHandler.handlers) {
      const handlerName = handler.name;
      if (handler.check(from, message)) {
        sendMessage(conference, "[automated] " + handler.do(from, message));
        break;
      }
    }
  }
  if (readyToRespond) responseHandler.track(from,message);
});

xmpp.on('error', error => {
  console.log('[ERROR] XMPP Error', error);
});

xmpp.on('close', data => {
  console.log('[ERROR] Connection closed:', data);
  kill(1);
});

xmpp.connect({
  jid: config.jid,
  password: config.password,
  host: config.host,
  port: config.port
});



process.on('exit', kill);
process.on('SIGINT', kill);
process.on('SIGUSR1', kill);
process.on('SIGUSR2', kill);
// process.on('uncaughtException', kill);
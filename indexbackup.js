// Setup basic express server
var fs = require('fs');
var http = require('http');


http.createServer(function(req, res) {
    console.log(req.url);
    if(req.headers.host)
    var host = req.headers.host.replace(/:[0-9]+$/g, "");
    else
    var host="";
    res.writeHead(302,{Location:"https://" + host + ":" + 443 + req.url});
    res.end();
}).listen(80, function() {
    console.log('Http Redirect To Https Listening on 80');
});

var https = require('https');
var key = fs.readFileSync('/etc/letsencrypt/live/ai.mashinga.com/privkey.pem');
var cert = fs.readFileSync('/etc/letsencrypt/live/ai.mashinga.com/fullchain.pem');
var https_options = {
    key: key,
    cert: cert
};

var express = require('express');
var app = express(app);
var server = https.createServer(https_options,app);
var io = require('socket.io')(server);
var port = process.env.PORT || 443;
var path = require("path");
var quoteserver =require('kote-api');
server.listen(port, function () {
  console.log('Server listening at port %d', port);
});

// Routing
app.use(express.static(__dirname + '/public'));
app.get("/music",function(req,res){
	res.sendFile(path.join(__dirname +'/public/player.html'));
});

const bodyParser = require('body-parser');


app.use(bodyParser.json());


var apiai = require('apiai');
//maya
//var apiai_app = apiai("90bd9eaaf4bc4675b87163440782c0ee");

//small talks
//var apiai_app = apiai("bf0ebc67e617406eaa88c39c385f186f");

//suppport
var apiai_app = apiai("0bcec16057834c339d3804c495014194");


var skt = "";

// Chatroom

var numUsers = 0;

io.on('connection', function (socket) {
  var addedUser = false; 
skt = socket;
  // when the client emits 'new message', this listens and executes
  socket.on('new message', function (data) {
	
var request = apiai_app.textRequest(data, {
	    sessionId: new Date().getTime()
	});

	request.on('response', function(response) {

	    console.log(response.result.fulfillment.speech);
		  socket.emit('new message', {
		      username: "Maya",

		      message: response.result.fulfillment.speech
		    });

	});

	request.on('error', function(error) {
	    console.log(error);
	});

	request.end();

    // we tell the client to execute 'new message'
  
  });

  // when the client emits 'add user', this listens and executes
  socket.on('add user', function (username) {
    if (addedUser) return;
	socket.emit("new message",{username:"Maya",message:"Hello"});
    
 // we store the username in the socket session for this client
    socket.username = username;
    ++numUsers;
    addedUser = true;
    socket.emit('login', {
      numUsers: numUsers
    });
    // echo globally (all clients) that a person has connected
  //  socket.broadcast.emit('user joined', {
   //   username: socket.username,
   //   numUsers: numUsers
  //  });
  });

  // when the client emits 'typing', we broadcast it to others
//  socket.on('typing', function () {
 //   socket.broadcast.emit('typing', {
 //     username: socket.username
 //   });
//  });

  // when the client emits 'stop typing', we broadcast it to others
  socket.on('stop typing', function () {
    socket.broadcast.emit('stop typing', {
      username: socket.username
    });
  });

  // when the user disconnects.. perform this
  socket.on('disconnect', function () {
    if (addedUser) {
      --numUsers;

      // echo globally that this client has left
   //   socket.broadcast.emit('user left', {
 //       username: socket.username,
   //     numUsers: numUsers
     // });
    }
  });
});

app.post('/hook', function (req, res) {

//    console.log(req);
    try {
        var speech = 'empty speech';

        if (req.body) {
            var requestBody = req.body;

            if (requestBody.result) {
                speech = '';

                if (requestBody.result.fulfillment) {
                    speech += requestBody.result.fulfillment.speech;
                    speech += ' ';
                }

                if (requestBody.result.action) {
			if(requestBody.result.action=="quote.quote-of-the-day"){
			
					var quote="";

	quoteserver.brainyQuote().then(q=>{
		console.log("BrainyQuote : "+q.quote);
		quote = q.quote;
	return res.json({
            speech:quote,
            displayText: quote,
            source: 'apiai-webhook-maya'
        });

	});



			}
 
                    speech += 'action: ' + requestBody.result.action;
        return res.json({
            speech: speech,
            displayText: speech,
           source: 'apiai-webhook-sample'
        });
 
                }
            }
        }

        console.log('speech: ', speech);

 //       return res.json({
   //         speech: speech+quote,
     //       displayText: speech,
      //      source: 'apiai-webhook-sample'
       // });
    } catch (err) {
        console.error("Can't process request", err);

        return res.status(400).json({
            status: {
                code: 400,
                errorType: err.message
            }
        });
    }
});




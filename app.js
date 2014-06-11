/**
 * Module dependencies.
 */

var express = require('express'),
http = require('http'), 
socketio = require('socket.io'),
path = require('path'),
race = require ('./lib/modules/race');

var app = express();

var allowCrossDomain = function(req, res, next) {
	res.header('Access-Control-Allow-Origin', '*');
	res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS');
	res.header('Access-Control-Allow-Headers',
			'Content-Type, Authorization, Content-Length, X-Requested-With');

	// intercept OPTIONS method
	if ('OPTIONS' == req.method) {
		res.send(200);
	} else {
		next();
	}
};

app.configure(function() {
	app.use(allowCrossDomain);
	app.set('port', 3006);
	app.use(express.favicon());
	app.use(express.logger('dev'));
	app.use(express.bodyParser());
	app.use(express.methodOverride());
	app.use(express.static(path.join(__dirname, 'public')));
});

app.configure('development', function() {
	app.use(express.errorHandler());
});

app.get('/users', function(req, res) {

});

app.get('/currentscores', function(req, res) {
	race.queryCurrentScores(req, res);
});

app.get('/ping', function(req, res) {
	res.send('pong');
});


var server = app.listen(app.get('port'), function() {
	console.log("Express server listening on port " + app.get('port'));
});

var io = socketio.listen(server, {
	origins : '*:*'
});
io.set('origins', '*:*');

io.configure('development', function() {
	io.set('transports', [ 'xhr-polling' ]);
	io.set("polling duration", 15);
	io.set('close timeout', 15); // 24h time out
});
race.createRace(app, io);


var hasOwnProperty = Object.prototype.hasOwnProperty;

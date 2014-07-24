var config = require("../../config").values
var util = require("./util")
var dbnames = require("./dbnames").values
var scores = {}
var clients = {} //id (int) : client (obj)
var sessions = [] //array of client id's
var names = {} //array of client id's


function getRandomInt (min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function log(msg) {
 //  console.log(msg);
}

function getRandomName() {
	var random = getRandomInt(0, dbnames.names.length);
	var name = dbnames.names[random];
	log("RandomName between 0 " + dbnames.names.length + " is: " +random  + " --- " + name);
	return name;
}

function getRandomInt(min, max) {
	var i = Math.floor(Math.random() * (max - min + 1)) + min;
	if(i == max)
		i--;
    return i;
}

function Operation () {
	var self = this;
	var member1 = getRandomInt(0,20);
	var member2 = getRandomInt(0,20);

	var operation_type = getRandomInt(0,1) ? '+' : '-'; //build the match challenge.
	self.quest =  member1 + operation_type + member2;
	self.solution = eval (self.quest);
}

function queryCurrentScores(req, res) {
	var playerName = req.query.player;
	if(playerName != undefined) {
		playerName = playerName.slice(0,25); //avoid long names
	}
	res.send(JSON.stringify(sortNumberHigestScore(playerName, scores, 10)));
}

function getNumberUserOnlines(req, res) {
	console.log("Number onlines: " + sessions.length);
	var number = {"n" :sessions.length};
	res.send(JSON.stringify(number));
}

function sortNumberHigestScore(playerName, scores, num){
   var arr = [];
   var sorted = util.sortByObjectValue(scores);
   var containPlayer = false;
   for(var i in sorted){
   	  var elem = sorted[i];
   	  if(elem[0] == playerName)
   	  	containPlayer = true;
      arr.push({player: elem[0], score :elem[1], rank : parseInt(i)});
      if(i == (num - 1)) 
      	break;
   }
   if(containPlayer == false && scores.hasOwnProperty(playerName)) {
      arr.push({player: playerName, score :scores[playerName], rank: util.getObjectKeyIndex(scores, playerName)});
   }
   return arr;
}

function createRace(server, io){
	var socket = io.sockets;
	var history = [];
	var hall_of_fame = [];

	function UpdateHallOfFame(scores, timestamp){

		for (var i = 0, l = scores.length; i < l ;  i++) {
			var score = scores[i];
			score.timestamp = timestamp;
			hall_of_fame.push(score); //add all scores
		};

		//sort by score
		util.sort(hall_of_fame, 'score', true);

		//and slice array!
		return hall_of_fame.slice(0,config.game.show_hall_of_fame);
	}

	function broadcast(sessions, command, data, exception){
		for (var i=0, l=sessions.length; i < l ; i++) {
			if (!exception || sessions[i] != exception)
				emit(clients[sessions[i]], command,data);
		};
	}

	function emit(client, notice, data) {
		var dataToSend = {"notice":notice , "data":data};
		client.emit ('message', dataToSend); //send info joined to client
	}

	var operation = new Operation();
	//var previousOperation = operation;

	function format_scores (scores){
	   var arr = [];
	   for(var key in scores){
	      arr.push({player: key, score : scores[key]});
	   }
	   return arr;
	}

	var game_duration = config.game.duration * 1000;
	var game_started = new Date();
	var currentInterval;
	var currentAITimeOut;
	var currentOperationTime = 0;

	function startGame() {
		setTimeout(function broadcastTime(){
			var timestamp = game_started.getDate() + '/' + (game_started.getMonth() + 1) + '/' + game_started.getFullYear()
			 + ' ' +  game_started.getHours() + ":" + (game_started.getMinutes() > 9 ? game_started.getMinutes() : '0' + game_started.getMinutes());
				if (format_scores(scores).length){
					history.push({
						timestamp: game_started.getTime(),
						name: timestamp,
						scores: format_scores(scores)
					});

					util.sort(history, 'timestamp', true);
					history = history.slice(0,config.game.show_history_games);

					hall_of_fame = UpdateHallOfFame(format_scores(scores), timestamp);

					broadcast (sessions, 'history', history); //broadcast history
				}
				scores = {}; //reset
				game_started = new Date(); //start game again!
				broadcast (sessions, 'scores', format_scores(scores)); //broadcast scores
				broadcast (sessions, 'hall_of_fame', hall_of_fame); //broadcast "hall of fame"
				// broadcast (sessions, 'new_game', null); //flash 'new game!'
				//newOperation();
				startGame();
		}, 86400000);
		newOperation();
	}

	function startAIPlay() {
		var r = getRandomInt(0, 10000);
		log("Play in " + r + " ms");
		return setTimeout(function() {
			var safe_name = getRandomName().slice(0,25); //avoid long names
			// var player = {'player':safe_name};
			// broadcast (sessions, 'result_operation', player); //msg to rest of players. someone else won!
			broadcast (sessions, 'notification', safe_name +" solved this first!"); //msg to rest of players. someone else won!
			scores[safe_name] = (scores[safe_name] || 0) + 1 //credit score to client
			newOperation();
		}, r);
	}

	function startIntervalTimer() {
		var operationTime = setInterval(function(){
			broadcast (sessions, 'time', currentOperationTime++); //broacast time ticks
		}, 1000);
		return operationTime;
	}

	function newOperation() {
		//new challenge
		//previousOperation = operation;
		if((currentInterval != undefined))
			clearInterval(currentInterval);
		if((currentAITimeOut != undefined))
			clearTimeout(currentAITimeOut);
		currentOperationTime = 0;
		operation =  new Operation();
		broadcast (sessions, 'new_operation', operation); //new challenge for all players
		currentInterval = startIntervalTimer();
		if(sessions.length > 0)
			currentAITimeOut = startAIPlay();
	}

	startGame();

	socket.on('connection', function (client) {
		client.on('disconnect', function () {
			for (var i = 0, l = sessions.length; i < l ;  i++) {
				if (sessions[i]==client.id){
					broadcast(sessions, 'notification', names[client.id] + " has left game");
					delete clients[client.id];
					delete names[client.id];
					sessions.splice(i,1);
					break;
				}
			};
		});

		client.on('join', function (data) {
			util.add (sessions, client.id); //add client id to list of sessions
			clients[client.id] = client;  //store specific client objectjson.stringify
			log("All sessions: " + JSON.stringify(sessions));
			emit(client, 'new_operation', operation); //send challenge to new client
			var safe_name = data.name.slice(0,25); //avoid long namess
			names[client.id] = safe_name;
			if(scores.hasOwnProperty(safe_name))
				emit(client, 'score', scores[safe_name]);
			broadcast(sessions, 'notification', safe_name + " has joined game"); 
		});

		client.on('solve_operation', function (data) {
			if (data.operation == operation.solution){
				//result_operation: 1:you win, 2:other player won, 0: bad operation
				emit(client, 'result_operation', 1);//msg to winner
				var safe_name = data.name.slice(0,25); //avoid long names
				broadcast (sessions, 'notification', safe_name +" solved this first!", client.id); //msg to rest of players. someone else won!
				scores[safe_name] = (scores[safe_name] || 0) + 1 //credit score to client
				emit(client, 'score', scores[safe_name]);
				newOperation();
			}
			else //baaaad. you need some math classes
				emit(client, 'notification', "Another player solved this first!" );
		});
	});
}
exports.createRace = createRace;
exports.queryCurrentScores = queryCurrentScores;
exports.getNumberUserOnlines = getNumberUserOnlines;

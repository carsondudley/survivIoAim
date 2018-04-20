(function() {

	var TICKER_INTERVAL = 10; // msec
	var lastTick = 0;

	var bullets = {
		bullet_mp5: {
			speed: 85,
		},
		bullet_ak47: {
			speed: 100,
		},
		bullet_scar: {
			speed: 108,
		},
		bullet_mosin: {
			speed: 178,
		},
		bullet_m39: {
			speed: 125,
		},
		bullet_m870: {
			speed: 66,
		},
		bullet_mp220: {
			speed: 66,
		},
		bullet_m9: {
			speed: 85,
		},
		bullet_ot38: {
			speed: 112,
		},
		bullet_mac10: {
			speed: 75,
		},
		bullet_ump9: {
			speed: 100,
		},
		bullet_dp28: {
			speed: 110,
		},
		bullet_glock: {
			speed: 70,
		},
		bullet_famas: {
			speed: 110,
		},
		bullet_hk416: {
			speed: 105,
		},
		bullet_mk12: {
			speed: 132,
		},
		bullet_m249: {
			speed: 125,
		},
	}

	var calculateRadianAngle = function(cx, cy, ex, ey) {
		var dy = ey - cy;
		var dx = ex - cx;
		var theta = Math.atan2(dy, dx); // range (-PI, PI]
	  // theta *= 180 / Math.PI; // rads to degs, range (-180, 180]
	  // if (theta < 0) theta = 360 + theta; // range [0, 360)

	  return theta;
	}

	var calculateDistance = function(sX, sY, eX, eY) {
		return Math.sqrt(Math.pow(Math.abs(sX - eX), 2) + Math.pow(Math.abs(sY - eY), 2));
	}

	var getSelfPos = function() {
		if(game.activePlayer) {
			return game.activePlayer.pos
		} else {
			return false;
		}
	}

	var detectEnemies = function() {
		var result = [];
		if(!game.playerBarn.playerInfo[game.activeId]) return result;

		var selfTeamId = game.playerBarn.playerInfo[game.activeId].teamId;
		var selfId = game.activeId;
		var objectIds = Object.keys(game.objectCreator.idToObj);
		var playerIds = Object.keys(game.playerBarn.playerInfo);

		for(var i = 0; i < playerIds.length; i++) {
			if( game.objectCreator.idToObj[playerIds[i]] && 
				(!game.objectCreator.idToObj[playerIds[i]].netData.dead) && 
				(!game.objectCreator.idToObj[playerIds[i]].netData.downed) &&
				game.playerBarn.playerInfo[playerIds[i]].teamId != selfTeamId) {
				if(playerIds[i] != selfId) {
					result[playerIds[i]] = game.objectCreator.idToObj[playerIds[i]];
				}
			}
		}

		return result;
	}

	var getMinimalDistanceIndex = function(enemyDistances) {
		return enemyDistances.indexOf(Math.min.apply(null, enemyDistances));
	}

	// More shaken for more values
	// var forecastCoeff = 1;
	// var bulletCoeff = 1;
	// var calculateTargetMousePosition = function(radianAngle, prevRadianAngle, distance) {
	// var halfScreenWidth = game.camera.screenWidth/2;
	// var halfScreenHeight = game.camera.screenHeight/2;

	// var minScreenCircleRadius = halfScreenHeight > halfScreenWidth ? halfScreenWidth : halfScreenHeight;
	// minScreenCircleRadius = Math.floor(minScreenCircleRadius - 1);

	// if(bullets["bullet_" + game.activePlayer.weapType]) {
	// 	bulletCoeff = 90/bullets["bullet_" + game.activePlayer.weapType].speed;
	// } else {
	// 	bulletCoeff = 1;
	// }

	// 	return {
	// 		x: halfScreenWidth + minScreenCircleRadius * Math.cos(radianAngle + bulletCoeff * ( forecastCoeff/100000000 * Math.pow(distance, 5) + forecastCoeff/1000000 * Math.pow(distance, 4) + forecastCoeff/10000 * Math.pow(distance, 3) + forecastCoeff/100 * Math.pow(distance, 2) + forecastCoeff * distance )/4 * (radianAngle - prevRadianAngle)),
	// 		y: halfScreenHeight - minScreenCircleRadius * Math.sin(radianAngle + bulletCoeff * ( forecastCoeff/100000000 * Math.pow(distance, 5) + forecastCoeff/1000000 * Math.pow(distance, 4) + forecastCoeff/10000 * Math.pow(distance, 3) + forecastCoeff/100 * Math.pow(distance, 2) + forecastCoeff * distance )/4 * (radianAngle - prevRadianAngle)),
	// 	}
	// }

	var calculateTargetMousePosition = function(enemyPos, prevEnemyPos, distance) {
		var bulletSpeed = 0;
		var approachTime = Infinity;

		// Check if you not have a bullets
		if(bullets["bullet_" + game.activePlayer.weapType]) {
			bulletSpeed = bullets["bullet_" + game.activePlayer.weapType].speed;
			approachTime = distance/bulletSpeed;
		} else {
			return null;
		}

		var selfPos = getSelfPos();

		var enemySpeed = {
			x: (enemyPos.x - prevEnemyPos.x) / ((Date.now() - lastTick) / 1000),
			y: (enemyPos.y - prevEnemyPos.y) / ((Date.now() - lastTick) / 1000),
		}

		var predictionEnemyPos = {
			x: enemyPos.x + enemySpeed.x * approachTime,
			y: enemyPos.y + enemySpeed.y * approachTime,
		}

		var predictionDistance = calculateDistance(selfPos.x, selfPos.y, predictionEnemyPos.x, predictionEnemyPos.y);

		(function r(n) {
			approachTime = predictionDistance/bulletSpeed;
			predictionEnemyPos.x = enemyPos.x + enemySpeed.x * approachTime;
			predictionEnemyPos.y = enemyPos.y + enemySpeed.y * approachTime,
			predictionDistance = calculateDistance(selfPos.x, selfPos.y, predictionEnemyPos.x, predictionEnemyPos.y);

			if(n == 0) {
				return;
			} else {
				r(n-1);
			}
		})(20);

		var halfScreenWidth = game.camera.screenWidth/2;
		var halfScreenHeight = game.camera.screenHeight/2;

		var minScreenCircleRadius = halfScreenHeight > halfScreenWidth ? halfScreenWidth : halfScreenHeight;
		minScreenCircleRadius = Math.floor(minScreenCircleRadius - 1);		

		var predictionRadianAngle = calculateRadianAngle(selfPos.x, selfPos.y, predictionEnemyPos.x, predictionEnemyPos.y);

		return {
			x: halfScreenWidth + minScreenCircleRadius * Math.cos(predictionRadianAngle),
			y: halfScreenHeight - minScreenCircleRadius * Math.sin(predictionRadianAngle),
		}		
	}

	var state = {
		playerId: 0,
		distance: Infinity,
		radianAngle: 0,
		prevRadianAngle: 0,
		new: false,
		timestamp: Date.now(),
		enemyPos: {
			x: 0,
			y: 0,
		},
		prevEnemyPos: {
			x: 0,
			y: 0,
		},
		targetMousePosition: {
			x: 0,
			y: 0,
		}
	}
	var captureEnemyMode = false;
	var updateState = function(detectedEnemies) {
		var selfPos = getSelfPos();
		var enemyDistances = [];
		var enemyRadianAngles = [];
		var detectedEnemiesKeys = Object.keys(detectedEnemies);

		if(!detectedEnemiesKeys.length) {
			state.new = false;
			state.timestamp = Date.now();	
			return;
		} else {
			if(captureEnemyMode) {				
				if(detectedEnemies[state.playerId]) {
					var enemyPos = detectedEnemies[state.playerId].netData.pos;

					var distance = calculateDistance(selfPos.x, selfPos.y, enemyPos.x, enemyPos.y);
					var radianAngle = calculateRadianAngle(selfPos.x, selfPos.y, enemyPos.x, enemyPos.y);

					state.distance = distance;
					state.prevRadianAngle = state.radianAngle;
					state.radianAngle = radianAngle;
					state.prevEnemyPos = state.enemyPos;
					state.enemyPos = enemyPos;
					state.new = true;
					state.timestamp = Date.now();
					state.targetMousePosition = calculateTargetMousePosition(state.enemyPos, state.prevEnemyPos, state.distance);

					if(state.targetMousePosition === null) {
						state.new = false;
					}

					return;
				}
			}

			for(var i = 0; i < detectedEnemiesKeys.length; i++) {
				var enemyPos = detectedEnemies[detectedEnemiesKeys[i]].netData.pos;

				var distance = calculateDistance(selfPos.x, selfPos.y, enemyPos.x, enemyPos.y);
				var radianAngle = calculateRadianAngle(selfPos.x, selfPos.y, enemyPos.x, enemyPos.y);

				enemyDistances.push(distance);
				enemyRadianAngles.push(radianAngle);	
			}

			var minimalDistanceEnemyIndex = getMinimalDistanceIndex(enemyDistances);
			if(state.playerId != detectedEnemies[detectedEnemiesKeys[minimalDistanceEnemyIndex]].__id) {
				state = {
					playerId: detectedEnemies[detectedEnemiesKeys[minimalDistanceEnemyIndex]].__id,
					distance: enemyDistances[minimalDistanceEnemyIndex],
					radianAngle: enemyRadianAngles[minimalDistanceEnemyIndex],
					prevRadianAngle: enemyRadianAngles[minimalDistanceEnemyIndex],
					prevEnemyPos: detectedEnemies[detectedEnemiesKeys[minimalDistanceEnemyIndex]].netData.pos,
					enemyPos: detectedEnemies[detectedEnemiesKeys[minimalDistanceEnemyIndex]].netData.pos,
					new: true,
					timestamp: Date.now(),
				}

				state.targetMousePosition = calculateTargetMousePosition(state.enemyPos, state.prevEnemyPos, state.distance);

				if(state.targetMousePosition === null) {
					state.new = false;
				}
			} else {
				state.distance = enemyDistances[minimalDistanceEnemyIndex];
				state.prevRadianAngle = state.radianAngle;
				state.radianAngle = enemyRadianAngles[minimalDistanceEnemyIndex];
				state.prevEnemyPos = state.enemyPos;
				state.enemyPos = detectedEnemies[detectedEnemiesKeys[minimalDistanceEnemyIndex]].netData.pos;
				state.new = true;
				state.timestamp = Date.now();
				state.targetMousePosition = calculateTargetMousePosition(state.enemyPos, state.prevEnemyPos, state.distance);

				if(state.targetMousePosition === null) {
					state.new = false;
				}
			}
		}
	}

	var iterate = function() {
		// check if we in game
		if(game.gameOver) {
			disableCheat();
			return;
		}

		updateState(detectEnemies());
		
		if(state.new) {
			game.input.mousePos = state.targetMousePosition;
		}

		if( !game.activePlayer.localData.inventory["8xscope"] &&
			!game.activePlayer.localData.inventory["15xscope"]) {

			game.activePlayer.localData.curScope = "8xscope"; //15xscope
			game.activePlayer.localData.inventory["8xscope"] = 1;	
	}
}	

var addSpaceKeyListener = function() {
	document.addEventListener("keydown", function(event) {
		if(event.which == 32) {
			game.input.mouseButton = true;
		}
	});

	document.addEventListener("keyup", function(event) {
		if(event.which == 32) {
			game.input.mouseButton = false;
		}
	});
}

var removeSpaceKeyListener = function() {
	document.removeEventListener("keydown", function(event) {
		if(event.which == 32) {
			game.input.mouseButton = true;
		}
	});

	document.removeEventListener("keyup", function(event) {
		if(event.which == 32) {
			game.input.mouseButton = false;
		}
	});
}

var addOKeyListener = function() {
	document.addEventListener("keyup", function(event) {
		if(event.which == 79) {
			captureEnemyMode = !captureEnemyMode;
		}
	});
}

var removeOKeyListener = function() {
	document.removeEventListener("keyup", function(event) {
		if(event.which == 79) {
			captureEnemyMode = !captureEnemyMode;
		}
	});
}

var timer = null;
function ticker() {
	timer = setTimeout(ticker, TICKER_INTERVAL);
	iterate();
	lastTick = Date.now();
}	

var defaultBOnMouseDown = function(event) {};
var defaultBOnMouseMove = function(event) {};

var bindCheatListeners = function() {
	defaultBOnMouseDown = game.input.bOnMouseDown;
	defaultBOnMouseMove = game.input.bOnMouseMove;

	window.removeEventListener("mousedown", game.input.bOnMouseDown);
	window.removeEventListener("mousemove", game.input.bOnMouseMove);

	window.addEventListener("mousedown", function(event) {
		if(!event.button && state.new) {
			game.input.mousePos = state.targetMousePosition;
			game.input.mouseButtonOld = false;
			game.input.mouseButton = true;
		} else {
			defaultBOnMouseDown(event);
		}
	});

	window.addEventListener("mousemove", function(event) {
		if(!state.new) {
			defaultBOnMouseMove(event);
		}
	});

	removeSpaceKeyListener();
	addSpaceKeyListener();

	removeOKeyListener();
	addOKeyListener();
}

var unbindCheatListeners = function() {
	window.removeEventListener("mousedown", function(event) {
		if(!event.button && state.new) {
			game.input.mousePos = state.targetMousePosition;
			game.input.mouseButtonOld = false;
			game.input.mouseButton = true;
		} else {
			defaultBOnMouseDown(event);
		}
	});

	window.removeEventListener("mousemove", function(event) {
		if(!state.new) {
			defaultBOnMouseMove(event);
		}
	});

	window.addEventListener("mousedown", defaultBOnMouseDown);
	window.addEventListener("mousemove", defaultBOnMouseMove);

	removeSpaceKeyListener();
	removeOKeyListener();
}

var cheatEnabled = false;
function enableCheat() {
	if(!game.gameOver) {			
		bindCheatListeners();
		game.map.display.topObstacle.alpha = 0.5;
		cheatEnabled = true;

		if(timer) {
			clearTimeout(timer);
			timer = null;
		}

		ticker();
	}
}

function disableCheat() {
	if(timer) {
		clearTimeout(timer);
		timer = null;
	}

	unbindCheatListeners();
	game.map.display.topObstacle.alpha = 1;
	cheatEnabled = false;
	captureEnemyMode = false;
}

var addZKeyListener = function() {
	document.addEventListener("keyup", function(event) {
		if(event.which == 90) {
			if(cheatEnabled) {
				disableCheat();
			} else {
				enableCheat();
			}
		}
	});
}

var removeZKeyListener = function() {
	document.removeEventListener("keyup", function(event) {
		if(event.which == 90) {
			if(cheatEnabled) {
				disableCheat();
			} else {
				enableCheat();
			}
		}
	});
}

removeZKeyListener();
addZKeyListener();	

})();
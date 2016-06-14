var express = require('express');
var cors = require('cors');
var httpRequest = require('request');
var xmlParser = require('xml2js');
var path = require('path');
var app = express();
var router = express.Router();
var async = require('async');
var every = require('schedule').every;
var _ = require('lodash');

var htmlDir = './html/';
var apiContext = '/api';
var port = process.env.PORT || 8888;

var bartApiBaseUrl = 'http://api.bart.gov/api';
// This is a demo key use environment if possible
var bartApiKey = process.env.BART_API_KEY || 'MW9S-E7SL-26DU-VV8V';
var bartApiTimeout = 10000;
var stationsInfo = undefined;

var infoCache = {
	stationList: undefined,
	stationInfo: undefined,
	stationAccess: undefined,
	elevatorStatus: undefined,

	getStationList: function() {
		return stationList;
	},

	updateStationList: function(newStationList) {
		stationList = newStationList;
	},

	getStationInfo: function() {
		return stationInfo;
	},

	updateStationInfo: function(newStationInfo) {
		stationInfo = newStationInfo;
	},

	getStationAccess: function() {
		return stationAccess;
	},

	updateStationAccess: function(newStationAccess) {
		stationAccess = newStationAccess;
	},

	getElevatorStatus: function() {
		return elevatorStatus;
	},

	updateElevatorStatus: function(newElevatorStatus) {
		elevatorStatus = newElevatorStatus;
	}
}; 

function getDistance(latUser, lonUser, latStation, lonStation) {
	var R = 6371;
	var dLat = (latStation - latUser).toRad();
	var dLon = (lonStation - lonUser).toRad();
	var a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        	Math.cos(latStation.toRad()) * Math.cos(latUser.toRad()) *
        	Math.sin(dLon / 2) * Math.sin(dLon / 2);
	var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
	var d = R * c;

	return d * 0.621371;
};

function getStationName(abbr) {
	var stations = infoCache.getStationList().station;
	var n = 0;

	for (n = 0; n < stations.length; n++) {
		if (stations[n].abbr === abbr) {
			return stations[n].name;
		}
	}

	return undefined;
}

function buildHttpRequestOptions(requestUrl) {
	return {
		uri: bartApiBaseUrl + '/' + requestUrl + '&key=' + bartApiKey,
		method: 'GET',
		timeout: bartApiTimeout,
		followRedirect: true,
		maxRedirects: 10
	};
};

function loadElevatorStatus() {
	console.log('Refreshing Elevator status cache...');
	httpRequest(
		buildHttpRequestOptions('bsa.aspx?cmd=elev'),
		function(error, resp, body) {
			// TODO non-happy path
			xmlParser.parseString(body, { trim: true, explicitArray: false, attrkey: 'id' }, function(err, res) {
				infoCache.updateElevatorStatus(res.root);
				console.log('Elevator status cache refreshed.');
			});
		}
	);
}

function loadStationList() {
	console.log('Refreshing Station List cache...');
	httpRequest(
		buildHttpRequestOptions('stn.aspx?cmd=stns'),
		function(error, resp, body) {		
			// TODO non-happy path

			// API still returns COLS incorrectly as 'Coliseum/Oakland Airport'
			// fixes this to correct new name 'Coliseum'
			body = body.replace('Coliseum/Oakland Airport', 'Coliseum');

			xmlParser.parseString(body, { trim: true, explicitArray: false }, function(err, res) {
				infoCache.updateStationList(res.root.stations);

				console.log('Station List cache refreshed.');
				getStationInfoAndAccess();
			});
		}
	);
};

function getStationInfoAndAccess() {
	var stations = infoCache.getStationList().station;
	var stationInfoURLs = [];
	var stationAccessURLs = [];
	var stationAccess = [];
	var stationInfo = [];

	console.log('Getting station information...');

	for (var n = 0; n < stations.length; n++) {
		var thisStation = stations[n];
		stationInfoURLs.push('stn.aspx?cmd=stninfo&orig=' + thisStation.abbr);
		stationAccessURLs.push('stn.aspx?cmd=stnaccess&orig=' + thisStation.abbr);
	}

	async.each(
		stationAccessURLs, 
		function(stationAccessURL, callback) {
			httpRequest(
				buildHttpRequestOptions(stationAccessURL),
				function(error, resp, body) {
					if (stationAccessURL.indexOf('COLS') > -1) {
						// API still returns COLS incorrectly as 'Coliseum/Oakland Airport'
						// fixes this to correct new name 'Coliseum'
						body = body.split('Coliseum/Oakland Airport').join('Coliseum');
					}

					xmlParser.parseString(body, { trim: true, explicitArray: false, attrkey: 'flags' }, function(err, res) {
						stationAccess.push(res.root.stations.station);
						callback();
					});
				}
			);
		},
		function(err) {
			stationAccess = _.sortBy(stationAccess, 'abbr');
			infoCache.updateStationAccess(stationAccess);
			console.log('Station Access cache refreshed.');
		}
	);

	async.each(
		stationInfoURLs,
		function(stationInfoURL, callback) {
			httpRequest(
				buildHttpRequestOptions(stationInfoURL),
				function(error, resp, body) {
					if (stationInfoURL.indexOf('COLS') > -1) {
						// API still returns COLS incorrectly as 'Coliseum/Oakland Airport'
						// fixes this to correct new name 'Coliseum'
						body = body.split('Coliseum/Oakland Airport').join('Coliseum');
					}

					xmlParser.parseString(body, { trim: true, explicitArray: false }, function(err, res) {
						// TODO Single array item fixes...
						stationInfo.push(res.root.stations.station);
						callback();
					});
				}
			);
		},
		function(err) {
			stationInfo = _.sortBy(stationInfo, 'abbr');
			infoCache.updateStationInfo(stationInfo);
			console.log('Station Info cache refreshed.');
		}
	);
};

router.route('/').get(
	function(request, response) {
		response.sendFile('index.html', { root: path.join(__dirname, './html') });
	}
);

router.route(apiContext + '/').get(
	function(request, response) {
		response.sendFile('index.html', { root: path.join(__dirname, './html/api') });
	}
);

router.route(apiContext + '/status').get(
	function(request, response) {
		httpRequest(
			buildHttpRequestOptions('bsa.aspx?cmd=count'),
			function(error, resp, body) {
				// TODO non-happy path
				var xmlStatus = xmlParser.parseString(body, { trim: true, explicitArray: false }, function(err, res) {
					response.jsonp(res.root);
				});
			}
		);
	}
);

router.route(apiContext + '/serviceAnnouncements').get(
	function(request, response) {
		httpRequest(
			buildHttpRequestOptions('bsa.aspx?cmd=bsa&date=today'),
			function(error, resp, body) {
				// TODO non happy path
				var xmlServiceAnnouncements = xmlParser.parseString(body, { trim: true, explicitArray: false }, function(err, res) {
					var newArray = [];

					// Fix single bsa to be an array
					if (! Array.isArray(res.root.bsa)) {
						newArray.push(res.root.bsa);
						res.root.bsa = newArray;
					}

					res.root.bsa = res.root.bsa.reverse();

					response.jsonp(res.root);
				});
			}
		);
	}
);

router.route(apiContext + '/stations').get(
	function(request, response) {
		response.jsonp(infoCache.getStationList().station);
	}
);

router.route(apiContext + '/station/:stationId').get(
	function(request, response) {
		var stations = infoCache.getStationList().station,
			stationId = request.params.stationId.toUpperCase();

		for (var n = 0; n < stations.length; n++) {
			var thisStation = stations[n];
			if (thisStation.abbr === stationId) {
				response.jsonp(thisStation);
				return;;
			}
		}

		// Nothing found!
		response.jsonp({});
	}
);

router.route(apiContext + '/stationAccess').get(
	function(request, response) {
		response.jsonp(infoCache.getStationAccess());
	}
);

router.route(apiContext + '/stationAccess/:stationId').get(
	function(request, response) {
		var stationAccess = infoCache.getStationAccess(),
			stationId = request.params.stationId.toUpperCase();

		for (var n = 0; n < stationAccess.length; n++) {
			var thisStation = stationAccess[n];
			if (thisStation.abbr === stationId) {
				response.jsonp(thisStation);
				return;
			}
		}

		// Nothing found
		response.jsonp({});
	}
);

router.route(apiContext + '/stationInfo').get(
	function(request, response) {
		response.jsonp(infoCache.getStationInfo());
	}
);

router.route(apiContext + '/stationInfo/:stationId').get(
	function(request, response) {
		var stationInfo = infoCache.getStationInfo(),
			stationId = request.params.stationId.toUpperCase();

		for (var n = 0; n < stationInfo.length; n++) {
			var thisStation = stationInfo[n];
			if (thisStation.abbr === stationId) {
				response.jsonp(thisStation);
				return;
			}
		}

		// Nothing found
		response.jsonp({});
	}
);

router.route(apiContext + '/station/:latitude/:longitude').get(
	function(request, response) {
		var stations = infoCache.getStationList().station;
		var closestStation = {};
		var closestDistance = 999999.9;
		var userLatitude = parseFloat(request.params.latitude);
		var userLongitude = parseFloat(request.params.longitude);

		for (var n = 0; n < stations.length; n++) {
			var thisStation = stations[n];
			var thisDistance = getDistance(userLatitude, userLongitude, parseFloat(thisStation.gtfs_latitude), parseFloat(thisStation.gtfs_longitude));
			if (thisDistance < closestDistance) {
				closestStation = JSON.parse(JSON.stringify(thisStation));
				closestStation.distance = closestDistance;
				closestDistance = thisDistance;
			}
		}

		response.jsonp(closestStation);
	}
);

router.route(apiContext + '/stations/:latitude/:longitude').get(
	function(request, response) {
		var stations = JSON.parse(JSON.stringify(infoCache.getStationList().station));
		var userLatitude = parseFloat(request.params.latitude);
		var userLongitude = parseFloat(request.params.longitude);

		for (var n = 0; n < stations.length; n++) {
			var thisStation = stations[n];
			thisStation.distance = getDistance(userLatitude, userLongitude, parseFloat(thisStation.gtfs_latitude), parseFloat(thisStation.gtfs_longitude));
		}

		stations.sort(function(a, b) {
			if (a.distance > b.distance) {
				return 1;
			}
			if (a.distance < b.distance) {
				return -1;
			}
			return 0;
		});

		response.jsonp(stations);
	}
);

router.route(apiContext + '/departures').get(
	function(request, response) {
		httpRequest(
			buildHttpRequestOptions('etd.aspx?cmd=etd&orig=all'),
			function(error, resp, body) {
				// TODO non-happy path

				// Fix up any references to COLS which has the old name in the API
				body = body.split('Coliseum/Oakland Airport').join('Coliseum');

				xmlParser.parseString(body, { trim: true, explicitArray: false }, function(err, res) {
					// TODO fix single etd at each station
					// TODO fix single estimate at each etd at each station
					// TODO fix empty departures for OAKL as no real time there
					// TODO fix COLS name to Coliseum
					response.jsonp(res.root.station);
				});
			}
		);
	}
);

router.route(apiContext + '/departures/:stationId').get(
	function(request, response) {
		var stationId = request.params.stationId.toUpperCase();
		if (stationId === 'OAKL') {
			// BART doesn't implement real time estimates for this station

			response.jsonp({ name: "Oakland Airport", abbr: "OAKL", etd: []});
		} else {
			httpRequest(
				buildHttpRequestOptions('etd.aspx?cmd=etd&orig=' + stationId),
				function(error, resp, body) {
					// TODO non-happy path

					// Fix up any references to COLS which has the old name in the API
					body = body.split('Coliseum/Oakland Airport').join('Coliseum');

					xmlParser.parseString(body, { trim: true, explicitArray: false }, function(err, res) {
						var newArray = [];
						var newObj = {};
						var n = 0;

						if (res.root.message && res.root.message.error) {
							if (res.root.message.error.text === 'Invalid orig') {
								// Unknown station code
								response.jsonp({});
								return;
							}
						}
						// Fix single etd returned by xmlParser to be in an array e.g. FRMT
						if (! Array.isArray(res.root.station.etd)) {
							newArray.push(res.root.station.etd);
							res.root.station.etd = newArray;
						}

						// Fix single estimates
						for (n = 0; n < res.root.station.etd.length; n++) {
							if (! Array.isArray(res.root.station.etd[n].estimate)) {
								newObj = {
									destination: res.root.station.etd[n].destination,
									abbreviation: res.root.station.etd[n].abbreviation,
									estimate: [
										res.root.station.etd[n].estimate
									]
								}
								res.root.station.etd[n] = newObj;
							}
						}

						response.jsonp(res.root.station);
					});
				}
			);
		}
	}
);

// TODO Add the option to specify time/date?  If not specified use 'now'
router.route(apiContext + '/tickets/:fromStation/:toStation').get(
	function(request, response) {
		var fromStation = request.params.fromStation.toUpperCase(),
			toStation = request.params.toStation.toUpperCase();

		httpRequest(
			buildHttpRequestOptions('sched.aspx?cmd=depart&orig=' + fromStation + '&dest=' + toStation + '&time=now&b=0&a=1'),
			function(error, resp, body) {
				// TODO non-happy path
				var xmlStations = xmlParser.parseString(body, { trim: true, explicitArray: false, attrkey: 'details' }, function(err, res) {
					var newArray = [];
					var n = 0;
					var leg = undefined;

					// For some reason this field comes through needing trimming still!
					res.root.schedule.request.trip.details.origTimeDate = res.root.schedule.request.trip.details.origTimeDate.trim();

					// Fix single leg object into an array so API returns an array 
					// regardless of whether the trip is 1,2 or 3 legs
					if (! Array.isArray(res.root.schedule.request.trip.leg)) {
						newArray.push(res.root.schedule.request.trip.leg);
						res.root.schedule.request.trip.leg = newArray;
					}

					// Enrich legs with full station names for origin, destination, trainHeadStation
					for (n = 0; n < res.root.schedule.request.trip.leg.length; n++) {
						leg = res.root.schedule.request.trip.leg[n];
						leg.details.originName = getStationName(leg.details.origin);
						leg.details.destinationName = getStationName(leg.details.destination);
						leg.details.trainHeadStationName = getStationName(leg.details.trainHeadStation);
					}

					// Calculate trip duration
					startDate = new Date(res.root.schedule.request.trip.details.origTimeDate + ' ' + res.root.schedule.request.trip.details.origTimeMin);
					endDate = new Date(res.root.schedule.request.trip.details.destTimeDate + ' ' + res.root.schedule.request.trip.details.destTimeMin);

					res.root.schedule.request.trip.details.duration = ((endDate - startDate) / 60000)

					response.jsonp(res.root);
				});
			}
		);
	}
); 

router.route(apiContext + '/elevatorStatus').get(
	function(request, response) {
		response.jsonp(infoCache.getElevatorStatus());
	}
);

if (typeof(Number.prototype.toRad) === 'undefined') {
  Number.prototype.toRad = function() {
    return this * (Math.PI / 180);
  }
}

// Prime the station list on startup and read periodically
loadStationList();
every('24h').do(function() {
	loadStationList();
});

// Prime the elevator status on startup and read periodically
loadElevatorStatus();
every('15m').do(function() {
	loadElevatorStatus();
});

app.use(cors());
app.use('/', router);
app.listen(port);
console.log('BART API Server listening on port ' + port);
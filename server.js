var express = require('express');
var cors = require('cors');
var httpRequest = require('request');
var xmlParser = require('xml2js');
var path = require('path');
var app = express();
var router = express.Router();
var async = require('async');
var every = require('schedule').every;

var htmlDir = './html/';
var port = process.env.PORT || 8888;

var bartApiBaseUrl = 'http://api.bart.gov/api';
// This is a demo key use environment if possible
var bartApiKey = process.env.BART_API_KEY || 'MW9S-E7SL-26DU-VV8V';
var bartApiTimeout = 10000;
var stationsInfo = undefined;

var infoCache = {
	stationList: undefined,
	stationDetails: undefined,
	elevatorStatus: undefined,

	getStationList: function() {
		return stationList;
	},

	updateStationList: function(newStationList) {
		stationList = newStationList;
	},

	getStationDetails: function() {
		return stationDetails;
	},

	updateStationDetails: function(newStationDetails) {
		stationDetails = newStationDetails;
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
			xmlParser.parseString(body, { trim: true, explicitArray: false }, function(err, res) {
				infoCache.updateStationList(res.root.stations);
				console.log('Station List cache refreshed.');
				getStationInfo();
			});
		}
	);
};

function getStationInfo() {
	var stations = infoCache.getStationList().station;
	var stationInfoURLs = [];
	var stationDetails = [];

	console.log('Getting station information...');

	for (var n = 0; n < stations.length; n++) {
		var thisStation = stations[n];
		stationInfoURLs.push('stn.aspx?cmd=stnaccess&orig=' + thisStation.abbr);
	}

	async.each(
		stationInfoURLs, 
		function(stationInfoURL, callback) {
			httpRequest(
				buildHttpRequestOptions(stationInfoURL),
				function(error, resp, body) {
					xmlParser.parseString(body, { trim: true, explicitArray: false, attrkey: 'flags' }, function(err, res) {
						stationDetails.push(res.root.stations.station);
						callback();
					});
				}
			);
		},
		function(err) {
			infoCache.updateStationDetails(stationDetails);
			console.log('Station Details cache refreshed.');
		}
	);
};

router.route('/').get(
	function(request, response) {
		response.sendFile('index.html', { root: path.join(__dirname, './html') });
	}
);

router.route('/status').get(
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

router.route('/serviceAnnouncements').get(
	function(request, response) {
		httpRequest(
			buildHttpRequestOptions('bsa.aspx?cmd=bsa&date=today'),
			function(error, resp, body) {
				// TODO non happy path
				var xmlServiceAnnouncements = xmlParser.parseString(body, { trim: true, explicitArray: false }, function(err, res) {
					response.jsonp(res.root);
				});
			}
		);
	}
);

router.route('/stations').get(
	function(request, response) {
		response.jsonp(infoCache.getStationList().station);
	}
);

router.route('/station/:stationId').get(
	function(request, response) {
		var stations = infoCache.getStationList().station;

		for (var n = 0; n < stations.length; n++) {
			var thisStation = stations[n];
			if (thisStation.abbr === request.params.stationId) {
				response.jsonp(thisStation);
				break;
			}
		}
	}
);

router.route('/stationDetails').get(
	function(request, response) {
		response.jsonp(infoCache.getStationDetails());
	}
);

router.route('/stationDetails/:stationId').get(
	function(request, response) {
		var stationDetails = infoCache.getStationDetails();

		for (var n = 0; n < stationDetails.length; n++) {
			var thisStation = stationDetails[n];
			if (thisStation.abbr === request.params.stationId) {
				response.jsonp(thisStation);
				break;
			}
		}
	}
);

router.route('/station/:latitude/:longitude').get(
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

router.route('/stations/:latitude/:longitude').get(
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

router.route('/departures/:stationId').get(
	function(request, response) {
		httpRequest(
			buildHttpRequestOptions('etd.aspx?cmd=etd&orig=' + request.param('stationId')),
			function(error, resp, body) {
				// TODO non-happy path
				var xmlStations = xmlParser.parseString(body, { trim: true, explicitArray: false }, function(err, res) {
					response.jsonp(res.root.station);
				});
			}
		);
	}
);

// TODO Add the option to specify time/date?  If not specified use 'now'
router.route('/tickets/:fromStation/:toStation').get(
	function(request, response) {
		httpRequest(
			buildHttpRequestOptions('sched.aspx?cmd=depart&orig=' + request.param('fromStation') + '&dest=' + request.param('toStation') + '&time=9:00am&b=0&a=1'),
			function(error, resp, body) {
				// TODO non-happy path
				var xmlStations = xmlParser.parseString(body, { trim: true, explicitArray: false, attrkey: 'details' }, function(err, res) {
					response.jsonp(res.root);
				});
			}
		);
	}
); 

router.route('/elevatorStatus').get(
	function(request, response) {
		response.jsonp(infoCache.getElevatorStatus());
	}
);

if (typeof(Number.prototype.toRad) === "undefined") {
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
app.use('/api', router);
app.listen(port);
console.log('BART API Server listening on port ' + port);
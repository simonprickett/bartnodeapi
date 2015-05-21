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
	}
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
					xmlParser.parseString(body, { trim: true, explicitArray: false }, function(err, res) {
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

function getDistance(latUser, lonUser, latStation, lonStation) {
	var R = 6371;
	var dLat = (latStation - latUser).toRad();
	var dLon = (lonStation - lonUser).toRad();
	var a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        	Math.cos(latStation.toRad()) * Math.cos(latUser.toRad()) *
        	Math.sin(dLon / 2) * Math.sin(dLon / 2);
	var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
	var d = R * c;

	return d;
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

// TODO make this real, return single closest station
router.route('/station/:latitude/:longitude').get(
	function(request, response) {
		var stations = infoCache.getStationList().station;
		var closestStationAbbr = "FTVL";

		for (var n = 0; n < stations.length; n++) {
			var thisStation = stations[n];
			if (thisStation.abbr === closestStationAbbr) {
				// TODO Add distance field!
				response.jsonp(thisStation);
				break;
			}
		}
	}
);

// TODO make this real, return all stations with distances and isClosest set
router.route('/stations/:latitude/:longitude').get(
	function(request, response) {
		var stations = infoCache.getStationList().station;
		var closestStationAbbr = "FTVL";

		// TODO sorting and stuff
		response.jsonp(infoCache.getStationList().station);
	}
);

// TODO work on station info
// http://api.bart.gov/api/stn.aspx?cmd=stninfo&orig=24th&key=MW9S-E7SL-26DU-VV8V

// TODO work on station access l=1 show legend, l=0 suppresses
// http://api.bart.gov/api/stn.aspx?cmd=stnaccess&orig=12th&key=MW9S-E7SL-26DU-VV8V&l=1

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

// TODO Add the option to specify time/date?
router.route('/tickets/:fromStation/:toStation').get(
	function(request, response) {
		httpRequest(
			buildHttpRequestOptions('sched.aspx?cmd=depart&orig=' + request.param('fromStation') + '&dest=' + request.param('toStation') + '&time=9:00am&b=0&a=1'),
			function(error, resp, body) {
				// TODO non-happy path
				var xmlStations = xmlParser.parseString(body, { trim: true, explicitArray: false }, function(err, res) {
					response.jsonp(res.root);
				});
			}
		);
	}
); 

// TODO cache for a while?
router.route('/elevatorStatus').get(
	function(request, response) {
		httpRequest(
			buildHttpRequestOptions('bsa.aspx?cmd=elev'),
			function(error, resp, body) {
				// TODO non-happy path
				var xmlElevators = xmlParser.parseString(body, { trim: true, explicitArray: false }, function(err, res) {
					response.jsonp(res.root);
				});
			}
		);
	}
);

// Prime the station list on startup and read periodically
loadStationList();
every('24h').do(function() {
	loadStationList();
});

app.use(cors());
app.use('/api', router);
app.listen(port);
console.log('BART API Server listening on port ' + port);

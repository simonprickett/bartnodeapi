var express = require('express');
var cors = require('cors');
var httpRequest = require('request');
var xmlParser = require('xml2js');
var path = require('path');
var app = express();
var router = express.Router();
var every = require('schedule').every;

var htmlDir = './html/';
var port = process.env.PORT || 8888;
// TODO - put this in the environment!
var bartApiKey = 'MW9S-E7SL-26DU-VV8V';

var stationsInfo = undefined;

var infoCache = {
	stationList : undefined,

	getStationList: function() {
		return stationList;
	},

	updateStationList: function(newStationList) {
		stationList = newStationList;
	},
}; 

loadStationList = function() {
	console.log('Refreshing Station List cache...');
	httpRequest({
		uri: 'http://api.bart.gov/api/stn.aspx?cmd=stns&key=' + bartApiKey,
		method: 'GET',
		timeout: 10000,
		followRedirect: true,
		maxRedirects: 10
	}, function(error, resp, body) {
		// TODO non-happy path
		xmlParser.parseString(body, { trim: true, explicitArray: false }, function(err, res) {
			infoCache.updateStationList(res.root.stations);
			console.log('Station List cache refreshed.');
		});
	});
};

getDistance = function(latUser, lonUser, latStation, lonStation) {
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
		httpRequest({
			uri: 'http://api.bart.gov/api/bsa.aspx?cmd=count&key=' + bartApiKey,
			method: 'GET',
			timeout: 10000,
			followRedirect: true,
			maxRedirects: 10
		}, function(error, resp, body) {
			// TODO non-happy path
			var xmlStatus = xmlParser.parseString(body, { trim: true, explicitArray: false }, function(err, res) {
				response.jsonp(res.root);
			});
		});
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


router.route('/departures/:stationId').get(
	function(request, response) {
		httpRequest({
			uri: 'http://api.bart.gov/api/etd.aspx?cmd=etd&orig=' + request.param('stationId') + '&key=' + bartApiKey,
			method: 'GET',
			timeout: 10000,
			followRedirect: true,
			maxRedirects: 10
		}, function(error, resp, body) {
			// TODO non-happy path
			var xmlStations = xmlParser.parseString(body, { trim: true, explicitArray: false }, function(err, res) {
				response.jsonp(res.root.station);
			});
		});
	}
);

// TODO Add the option to specify time/date?
router.route('/tickets/:fromStation/:toStation').get(
	function(request, response) {
		httpRequest({
			uri: 'http://api.bart.gov/api/sched.aspx?cmd=depart&orig=' + request.param('fromStation') + '&dest=' + request.param('toStation') + '&time=9:00am' + '&b=0&a=1&key=' + bartApiKey,
			method: 'GET',
			timeout: 10000,
			followRedirect: true,
			maxRedirects: 10
		}, function(error, resp, body) {
			// TODO non-happy path
			var xmlStations = xmlParser.parseString(body, { trim: true, explicitArray: false }, function(err, res) {
				response.jsonp(res.root);
			});
		});
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

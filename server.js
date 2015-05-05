var express = require('express');
var cors = require('cors');
var httpRequest = require('request');
var xmlParser = require('xml2js');
var app = express();
var router = express.Router();
var port = process.env.PORT || 8888;
var bartApiKey = 'MW9S-E7SL-26DU-VV8V';

var stationsInfo = undefined;

var infoCache = {
	stationList : undefined,

	getStationList: function() {
		console.log('Hello from getStationList');
		return stationList;
	},

	updateStationList: function() {
		console.log('Hello from updateStationList');
	},
}; 

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
		httpRequest({
			uri: 'http://api.bart.gov/api/stn.aspx?cmd=stns&key=' + bartApiKey,
			method: 'GET',
			timeout: 10000,
			followRedirect: true,
			maxRedirects: 10
		}, function(error, resp, body) {
			// TODO non-happy path
			var xmlStations = xmlParser.parseString(body, { trim: true, explicitArray: false }, function(err, res) {
				infoCache.updateStationList(xmlStations);
				response.jsonp(res.root.stations.station);
			});
		});
	}
);

router.route('/stations/:stationId').get(
	function(request, response) {
		var station = {
			id: "POWL",
			name: "Powell St.",
			fourSquareId: "455f7871f964a520913d1fe3",
			latitude: 37.784991,
			longitude: -122.406857,
			address: {
				street: "899 Market Street",
				city: "San Francisco",
				state: "CA",
				zipCode: "94102",
				country: "USA"
			},
			description: "Located at Powell and Market Streets, this station is centrally located near San Francisco's most popular attractions including the cable cars, Union Square, Yerba Buena Gardens, the Moscone Convention Center and the City's Theatre District."
		};

		response.jsonp(station);
	}
);

router.route('/stations/:latitude/:longitude').get(
	function(request, response) {
		var station = {
			id: "POWL",
			name: "Powell St.",
			fourSquareId: "455f7871f964a520913d1fe3",
			latitude: 37.784991,
			longitude: -122.406857,
			address: {
				street: "899 Market Street",
				city: "San Francisco",
				state: "CA",
				zipCode: "94102",
				country: "USA"
			},
			description: "Located at Powell and Market Streets, this station is centrally located near San Francisco's most popular attractions including the cable cars, Union Square, Yerba Buena Gardens, the Moscone Convention Center and the City's Theatre District.",
			distance: 22.2,
			distanceUnits: "miles"
		}

		response.jsonp(station);
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

app.use(cors());
app.use('/api', router);
app.listen(port);
console.log('BART API Server listening on port ' + port);

var express = require('express');
var cors = require('cors');
var app = express();
var router = express.Router();
var port = process.env.PORT || 8888;

router.route('/status').get(
	function(request, response) {
		var status = {
			lastUpdated: "07:21:48 PM",
			trainCount: 48,
			advisories: [
				{ 
					"advisoryText": "There is a delay developing at Fremont on the Fremont Line in the Fremont, Richmond and San Francisco directions due to an equipment problem on a train."
				}
			]
		};

		response.jsonp(status);
	}
);

router.route('/stations').get(
	function(request, response) {
		var stations = [{
				id: "12TH",
				name: "12th St. Oakland City Center",
				fourSquareId: "468eecfdf964a5208f481fe3",
				latitude: 37.803664,
				longitude: -122.271604,
				address: {
					street: "1245 Broadway",
					city: "Oakland",
					state: "CA",
					zipCode: "94612",
					country: "USA"
				},
				description: "12th St. Oakland City Center Station is in the heart of Downtown Oakland, near historic Old Oakland and Oakland's Chinatown."
			},
			{
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
			}
		];

		response.jsonp(stations);
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
		var departures = [
			{
				destinationId: "DALY",
				destination: "Daly City",
				departures: [
					{
						color: "BLUE",
						estimate: "Boarding",
						cars: 8,
						platform: 1,
						bikeFlag: 1
					},
					{
						color: "BLUE",
						estimate: "35 mins",
						cars: 6,
						platform: 1,
						bikeFlag: 1
					}
				]
			},
			{
				destinationId: "DUBL",
				destination: "Dublin/Pleasanton",
				departures: [
					{
						color: "BLUE",
						estimate: "15 mins",
						cars: 4,
						platform: 2,
						bikeFlag: 1
					},
					{
						color: "BLUE",
						estimate: "27 mins",
						cars: 6,
						platform: 2,
						bikeFlag: 1
					}
				]
			}
		];
		response.jsonp(departures);
	}
);

router.route('/tickets/:fromStation/:toStation').get(
	function(request, response) {
		var routeData = {
			fromId: "PITT",
			fromStation: "Pittsburg/Bay Point",
			toId: "DUBL",
			toStation: "Dublin/Pleasanton",
			fare: "6.45",
			clipperFare: "2.40",
			fareCurrency: "USD",
			emissions: 23.3,
			legs: [
        		"At Pittsburg/Bay Point board train to San Francisco Int'l Airport change at MacArthur.",
				"At MacArthur board train to Fremont change at Bay Fair.",
				"At Bay Fair board train to Dublin/Pleasanton alight at Dublin/Pleasanton."
			]
		};
		response.jsonp(routeData);
	}
); 

app.use(cors());
app.use('/api', router);
app.listen(port);
console.log('BART API Server listening on port ' + port);

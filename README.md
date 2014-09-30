#BART Node API

BART JSON API using Node and Express.  Will listen on port 8888, supports JSONP and CORS.

##Status

* Right now, this is an API facade
* Responses are hard coded

##Installation

* Install node
* Make sure node is on your path

##Building

Get depenencies:

```
npm install
```

##Running

Start:

```
node server.js
```

##Example Calls and Responses

* All calls support JSONP, just add callback=&lt;function name&gt; to the URL
* All calls can be made using CORS (see http://enable-cors.org)
* The backend XML API that this uses is documented at http://api.bart.gov/

###GET BART System Status

Returns basic information about the state of BART.

```
http://<hostname>:8888/api/status
```

```
{
	"lastUpdated":"07:21:48 PM",
	"trainCount":48,
	"advisories":[
		{
			"advisoryText":"There is a delay developing at Fremont on the Fremont Line in the Fremont, Richmond and San Francisco directions due to an equipment problem on a train."
		}
	]
}
```

* TODO: Field by field explanation of the response

###GET All Station Details

Returns overview details and ID codes for all stations.

```
http://<hostname>:8888/api/stations
```

```
[
	{
		"id":"12TH",
		"name":"12th St. Oakland City Center",
		"fourSquareId":"468eecfdf964a5208f481fe3",
		"latitude":37.803664,
		"longitude":-122.271604,
		"address": {
			"street":"1245 Broadway",
			"city":"Oakland",
			"state":"CA",
			"zipCode":"94612",
			"country":"USA"
		},
		"description":"12th St. Oakland City Center Station is in the heart of Downtown Oakland, near historic Old Oakland and Oakland's Chinatown."
	},
	{
		"id":"POWL",
		"name":"Powell St.",
		"fourSquareId":"455f7871f964a520913d1fe3",
		"latitude":37.784991,
		"longitude":-122.406857,
		"address":{
			"street":"899 Market Street",
			"city":"San Francisco",
			"state":"CA",
			"zipCode":"94102",
			"country":"USA"
		},
		"description":"Located at Powell and Market Streets, this station is centrally located near San Francisco's most popular attractions including the cable cars, Union Square, Yerba Buena Gardens, the Moscone Convention Center and the City's Theatre District."
	},
	...
]
```

* TODO: Field by field explanation of the response

###GET an Individual Station's Details

```
http://<hostname>:8888/api/stations/<stationId>
```

```
{
	"id":"POWL",
	"name":"Powell St.",
	"fourSquareId":"455f7871f964a520913d1fe3",
	"latitude":37.784991,
	"longitude":-122.406857,
	"address":{
		"street":"899 Market Street",
		"city":"San Francisco",
		"state":"CA",
		"zipCode":"94102",
		"country":"USA"
	},
	"description":"Located at Powell and Market Streets, this station is centrally located near San Francisco's most popular attractions including the cable cars, Union Square, Yerba Buena Gardens, the Moscone Convention Center and the City's Theatre District."
}
```

* TODO: Field by field explanation of the response

###GET Details for the Station Closest to a Point

```
http://<hostname>:8888/api/stations/<latitude>/<longitude>
```

```
{
	"id":"POWL",
	"name":"Powell St.",
	"fourSquareId":"455f7871f964a520913d1fe3",
	"latitude":37.784991,
	"longitude":-122.406857,
	"address":{
		"street":"899 Market Street",
		"city":"San Francisco",
		"state":"CA",
		"zipCode":"94102",
		"country":"USA"
	},
	"description":"Located at Powell and Market Streets, this station is centrally located near San Francisco's most popular attractions including the cable cars, Union Square, Yerba Buena Gardens, the Moscone Convention Center and the City's Theatre District.",
	"distance":22.2,
	"distanceUnits":"miles"
}
```

* TODO: Field by field explanation of the response

###GET Train Departures from an Individual Station

```
http://<hostname>:8888/api/departures/<stationId>
```

```
[
	{
		"destinationId":"DALY",
		"destination":"Daly City",
		"departures":[
			{
				"color":"BLUE",
				"estimate":"15 mins",
				"cars":8,
				"platform":1,
				"bikeFlag":1
			},
			{
				"color":"BLUE",
				"estimate":"35 mins",
				"cars":6,
				"platform":1,
				"bikeFlag":1
			}
		]
	},
	{
		"destinationId":"DUBL",
		"destination":"Dublin/Pleasanton",
		"departures":[
			{
				"color":"BLUE",
				"estimate":"Boarding",
				"cars":4,
				"platform":2,
				"bikeFlag":1
			},
			{
				"color":"BLUE",
				"estimate":"15 mins",
				"cars":6,
				"platform":2,
				"bikeFlag":1
			}
		]
	}
]
```

* TODO: Field by field explanation of the response

###GET Ticket Price and Trip Details Between Two Stations

```
http://<hostname>:8888/api/tickets/<fromStationId>/<toStationId>
```

```
{
	"fromId":"PITT",
	"fromStation":"Pittsburg/Bay Point",
	"toId":"DUBL",
	"toStation":"Dublin/Pleasanton",
	"fare": "6.45",
	"clipperFare": "2.40",
	"fareCurrency": "USD",
	"emissions":23.3,
	"legs":[
		"At Pittsburg/Bay Point board train to San Francisco Int'l Airport change at MacArthur.",
		"At MacArthur board train to Fremont change at Bay Fair.",
		"At Bay Fair board train to Dublin/Pleasanton alight at Dublin/Pleasanton."
	]
}
```

* TODO: Field by field explanation of the response

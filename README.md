#BART Node API

BART JSON API using Node and Express.  Will listen on port 8888, supports JSONP.

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

##Example Calls

All calls support JSONP, just add callback=<function name> to the URL.

###GET BART System Status

Returns basic information about the state of BART.

```
http://<hostname>:8888/api/status
```

###GET All Station Details

Returns overview details and ID codes for all stations.

```
http://<hostname>:8888/api/stations
```

###GET an Individual Station's Details

```
http://<hostname>:8888/api/stations/<stationId>
```

###GET Details for the Station Closest to a Point

```
http://<hostname>:8888/api/stations/<latitude>/<longitude>
```

###GET Train Departures from an Individual Station

```
http://<hostname>:8888/api/departures/<stationId>
```

###GET Ticket Price and Trip Details Between Two Stations

```
http://<hostname>:8888/api/tickets/<fromStationId>/<toStationId>
```

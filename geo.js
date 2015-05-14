<script type="text/javascript">
  <!-- this should be wrapped in a function and put somewhere sensible like with the analytics -->
  navigator.geolocation.getCurrentPosition(function (location) {
    var nearest = getNearestStation(location.coords.latitude, location.coords.longitude);
  });

  if (typeof(Number.prototype.toRad) === "undefined") {
    Number.prototype.toRad = function() {
      return this * Math.PI / 180;
    }
  }

  function getNearestStation(latUser, lonUser) {
    var closestStation = "";
    var closestDistance = 999999;
    var stations = {};

    <!-- this should not be generated each page inefficient make it happen once in a job and live in config -->
    <g:each in="${stations}" var="station">
      <g:set var="stationInfo" value="${grailsApplication.config?.bartStationDetails.'${station.abbr}'}"/>
      stations["${station.abbr}"] = ${stationLatLongService.getStationLatLong(station.abbr.toString())};
    </g:each>

    for (var stn in stations) {
        var thisDistance = getDistance(latUser, lonUser, stations[stn].lat, stations[stn].lon);
        if (thisDistance < closestDistance) {
          closestDistance = thisDistance;
          closestStation = stn;
        }
    }

    return({station: stations[closestStation], distance: closestDistance});
  }

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
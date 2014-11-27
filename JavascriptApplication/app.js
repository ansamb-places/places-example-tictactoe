// Requirements
var argv = require('yargs').argv;
var _ = require('underscore');
var request = require('request');
var path = require('path');
var express = require('express');
var bodyParser = require('body-parser');
var place;

// Command-line arguments
var port = argv.port || 3000;
var places_port = argv.places_port || 8080;

// Get or create the "tic tac toe" place
request('http://localhost:' + places_port + '/core/api/v1/places/', function (error, response, body) {
  if (!error && response.statusCode == 200) {
    place = _.findWhere(JSON.parse(body).data, {name: 'tictactoe'});
    if(typeof place === 'undefined') {
      request.post('http://localhost:' + places_port + '/core/api/v1/places/', {form: {type: 'share', name: 'tictactoe', desc: 'tictactoe'}}, function(err, httpResponse, body) {
        place = JSON.parse(body).data;
      });
    }
  }
});

// Express server to visualize/interact
var app = express();
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname,'public')));

app.get('/moves', function (req, res) {
  request('http://localhost:' + places_port + '/core/api/v1/places/' + place.id + '/contents/', function (error, response, body) {
    if (!error && response.statusCode == 200) {
      res.send(JSON.parse(body).data);
    }
  });
});

app.post('/moves', function (req, res) {
  request.post('http://localhost:' + places_port + '/application/ansamb_tictactoe/?place_name=' + place.id, {form: {x: req.body.x, y: req.body.y, value: req.body.value}});
  res.send('ok');
});

var server = app.listen(port);

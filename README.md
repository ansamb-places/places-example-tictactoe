# Introducing Places REST API : let's play tic tac toe !


![Alt text](/tictactoe.png?raw=true "Tic tac toe")

Today we will build a tic tac toe game using Places REST API. You will learn to develop a [Places][4db9f3b0] Application, play with it with HTTP requests then code the game using [node.js][a8ffd937] and [Places][4db9f3b0]. Your moves will finally remain private between your friends ! ;-)

## Prerequisites

To use the [Places][4db9f3b0] REST API you just need a running instance of [Places][4db9f3b0]. We will test it with the [cURL][f8826133] command.
If you want to run the tic tac toe game, you will need [jQuery][49239bb7] [nodejs and npm][a8ffd937].


## The concept

Each game will be implemented as a place. When a player makes a move, a "tictactoe" content will be added to the place. This content will carry basic information such as the coordinates (between 1 and 3 in a standard tic tac toe game) and the value (cross, circle, etc ...).

To input a specific content in [Places][4db9f3b0], you should define an Application that exposes its specific HTTP routes. We can define any routes to manipulate our contents (create/read/update/delete, crud) or to expose settings.

In our case, we will define a route to add a *tictactoe* content in [Places][4db9f3b0]. Each player will make a move by sending a POST request from our tic tac toe game to our application. It will then send the move to the other players in the same place.

## Places application

You can define any type of content in Places, you just have to create an Application.

On OSX, the `application` folder is located in `./Places.app/Contents/middleware/gui_framework/`.

On Windows and Linux, you will find it in `./Places/middleware/gui_framework/`.

We will first create an `ansamb_tictactoe` folder in it.

Now, let's define our application with an `application.json` file in our new folder:

```javascript
{
  "name":"ansamb_tictactoe",
  "contentType":"tictactoe",
  "js":false,
  "models_dir":"models",
  "models_version":"0.0.1",
  "author":"ansamb"
}
```
This documents describe the name of our Application, the content type it will intercept and handle, and the folder where it can find the models of our contents.

Let's define the *tictactoe* model, by coding a `Tictactoe.js` file in a new `models` subfolder of our Application.

```javascript
module.exports = function(register, DataTypes) {
  return register('tictactoe', {
    id: {
      type: DataTypes.STRING,
      primaryKey: true,
      allowNull: false,
      references: 'contents',
      referencesKey: 'id',
      onDelete: 'cascade',
      onUpdate: 'cascade'
    },
    x: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    y: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    value: {
      type: DataTypes.STRING,
      defaultValue: 'empty'
    }
  }, {
    associate: function(models) {
      return this.belongsTo(models.global.content, {
        onDelete: 'cascade',
        onUpdate: 'cascade',
        as: 'Content'
      });
    }
  });
};
```

Our content is defined by an id, two coordinates (as integers) and a string value (to determine if the content is a cross or a circle).

We just have to create the main file, `index.js` at the root of our Application, to handle the content type.

```javascript
var require_context = function(req, res, next) {
  if (req._ansamb_context === null) {
    return res.send({err: 'no ansamb context found'});
  }
  return next();
};

module.exports = {
  init: function(router) {
    router.on('get', '/content/:content_id', require_context, function(req, res) {
      api.getTictactoe(req._ansamb_context, req.param('content_id'), function(err, tictactoes) {
        res.send({err: err, data: tictactoes});
      });
    });
    router.on('post', '/', require_context, function(req, res) {
      var context = req._ansamb_context;
      if (typeof context === 'undefined') {
        return console.error('No context defined');
      }
      context.content_lib.addContentAutoReply(req.body, res);
    });
  },
  crud: {
    create: function(context, content, data, options, cb) {
      data.id = content.id;
      context.database.models.tictactoe.create(data).done(function(err, tictactoe) {
        if (err !== null) {return cb(err, null);}
        cb(err, tictactoe.values);
      });
    },
    read: function(context, id, cb) {
      context.database.models.tictactoe.find({where: {id: id}}, {raw: true}).done(cb);
    },
    update: function(context, id, new_data, options, cb) {
      delete new_data.id; // we don't want the data id to be modified
      context.database.models.tictactoe.update(new_data, {id: id}).done(function(err) {
        cb(err, new_data);
      });
    },
    delete: function(context, id, cb) {
      context.database.models.tictactoe.destroy({id: id}).done(cb);
    }
  }
};

var api = {
  getTictactoe: function(context, id, cb) {
    context.database.models.tictactoe.find({where: {id: id}}, {raw: true}).done(cb);
  },
  newTictactoe: function(context, tictactoe, cb) {
    context.content_lib.addContentAutoReply(function(err, content, done) {
      if (err !== null) {return cb(err, null);}
      context.database.models.tictactoe.create(tictactoe).done(function(err, tictactoe) {
        if (err !== null) {cb(err, null);}
        tictactoe.setContent(content).done(function(err) {
          cb(err, {content: content.values, data: tictactoe.values});
        });
      });
    });
  }
};
```

Don't worry, this code is easier to understand than it looks ! Let's study it step by step:

```javascript
var require_context = function(req, res, next) {
  if (req._ansamb_context === null) {
    return res.send({err: 'no ansamb context found'});
  }
  return next();
};
```

This function just check if the POST request on our Application server has the right context. A context is an sandboxed API created for your application to gain access to the following framework's features:
- database access to the application's models
- basic informations on the requested place (id, name, folder_path, ...)
- content API to add/update/delete contents for this application
- dedicated websocket channel to push events to the front-end
Note that the context is bound to the place defined into the URL if the place exists.

```javascript
module.exports = {
  init: function(router) {
    router.on('get', '/content/:content_id', require_context, function(req, res) {
      api.getTictactoe(req._ansamb_context, req.param('content_id'), function(err, tictactoes) {
        res.send({err: err, data: tictactoes});
      });
    });
    router.on('post', '/', require_context, function(req, res) {
      var context = req._ansamb_context;
      if (typeof context === 'undefined') {
        return console.error('No context defined');
      }
      context.content_lib.addContentAutoReply(req.body, res);
    });
  },
```

The `init` function add HTTP routes to the Places server to interact with the Application from external systems (as our node.js tic tac toe game). Here we define a GET route to obtain the moves and a POST to add them to a place.

```javascript
crud: {
  create: function(context, content, data, options, cb) {
    data.id = content.id;
    context.database.models.tictactoe.create(data).done(function(err, tictactoe) {
      if (err !== null) {return cb(err, null);}
      cb(err, tictactoe.values);
    });
  },
  read: function(context, id, cb) {
    context.database.models.tictactoe.find({where: {id: id}}, {raw: true}).done(cb);
  },
  update: function(context, id, new_data, options, cb) {
    delete new_data.id; // we don't want the data id to be modified
    context.database.models.tictactoe.update(new_data, {id: id}).done(function(err) {
      cb(err, new_data);
    });
  },
  delete: function(context, id, cb) {
    context.database.models.tictactoe.destroy({id: id}).done(cb);
  }
}
};
```

The crud functions are used to create, read, update and delete our contents in the database. Be sure to specify the right table (tictactoe in our example) !

```coffeescript
var api = {
  getTictactoe: function(context, id, cb) {
    context.database.models.tictactoe.find({where: {id: id}}, {raw: true}).done(cb);
  },
  newTictactoe: function(context, tictactoe, cb) {
    context.content_lib.addContentAutoReply(function(err, content, done) {
      if (err !== null) {return cb(err, null);}
      context.database.models.tictactoe.create(tictactoe).done(function(err, tictactoe) {
        if (err !== null) {cb(err, null);}
        tictactoe.setContent(content).done(function(err) {
          cb(err, {content: content.values, data: tictactoe.values});
        });
      });
    });
  }
};
```

Finally, the api is defining the functions handling the HTTP requests.

Your Places application is now ready, let's try it in a command line terminal with the cURL command !

## Playing with the application

You need a friend to play tic tac toe ! Let's look for him on Places: you need to get his id on the network from his alias.

```bash
curl -X POST -H "Content-Type: application/json" -d '{"type": "email", "alias": "john.doe@ansamb.com"}' 'http://localhost:8080/core/api/v1/contacts/aliases/lookup'
```

With this command, you will obtain the following information about your friend:

```javascript
{
  "err": null,
  "contact": {
    "aliases": {
      "email/john.doe@ansamb.com": {
        "type": "email",
        "alias": "john.doe@ansamb.com"
      }
    },
    "uid": "ansamb_123456789",
    "firstname": "John",
    "lastname": "Doe"
  }
}
```

You can ask him to be a friend on Places:

```bash
curl -X POST -H "Content-Type: application/json" -d '{"type": "email", "alias": "john.doe@ansamb.com"}' 'http://localhost:8080/core/api/v1/contacts/'
```

Just check that his status is "requested" in the HTTP response:

```javascript
{
  "err": null,
  "data": {
    "uid": "ansamb_123456789",
    "status": "requested",
    "request_id": "502c47a7-2fc4-4a0d-8bfe-19b5befccff3",
    "message": "",
    "firstname": "John",
    "lastname": "Doe",
    "password": "",
    "updated_at": "2014-11-18T06:33:01.000Z",
    "created_at": "2014-11-18T06:33:01.000Z",
    "aliases": [...]
  }
}
```

To accept your invitation, your friend should look for your uid:

```bash
curl -X POST -H "Content-Type: application/json" -d '{"type": "email", "alias": "jane.doe@ansamb.com"}' 'http://localhost:8080/core/api/v1/contacts/aliases/lookup'
```

Then send his decision:

```bash
curl -X POST -H "Content-Type: application/json" -d '{"uid":"[CONTACT_ID]"}' 'http://localhost:8080/core/api/v1/contacts/accept/'
```

Congratulation, you have a friend on Places! :)  
Save your friend uid for later, now we will create a place named `myFirstGame` via a POST request:

```bash
curl -X POST -H "Content-Type: application/json" -d '{"type":"share","name":"myFirstGame", "desc":"tictactoe"}' 'http://localhost:8080/core/api/v1/places/'
```

You will receive as a response:

```javascript
{
  "err": null,
  "data": {
    "creation_date": "2014-11-17T14:02:02.240Z",
    "status": "validated",
    "id": "8595350f-3666-4029-9f30-20be0b8e20e9@ansamb_987654321",
    "type": "share",
    "name": "myFirstGame",
    "owner_uid": null,
    "desc": "tictactoe",
    "network_synced": 0,
    "network_request_id": "97a6b71f-e78d-4c87-a877-bffb65147bdc",
    "add_request_id": null,
    "auto_sync": true,
    "auto_download": true,
    "updated_at": "2014-11-17T14:02:02.000Z",
    "created_at": "2014-11-17T14:02:02.000Z"
  }
}
```

With the place id and your friend's uid, you can invite him to play:

```bash
curl -X PUT -H "Content-Type: application/json" 'http://localhost:8080/core/api/v1/places/[PLACE_ID]/ansambers/ansamb_123456789'
```

Your friend should accept the invitation to the place:

```bash
curl -X POST 'http://localhost:8080/core/api/v1/places/[PLACE_ID]/accept'
```

Your friend should check that the place status is validated:

```javascript
{
  "err": null,
  "data": {
    "id": "8595350f-3666-4029-9f30-20be0b8e20e9@ansamb_987654321",
    "name": "myFirstGame",
    "desc": "tictactoe",
    "type": "share",
    "owner_uid": "ansamb_987654321",
    "creation_date": "2014-11-17T14:02:02.000Z",
    "status": "validated",
    "network_synced": 0,
    "network_request_id": "4bb3a70b-907e-4e70-92d3-2e902df07439",
    "add_request_id": "c4fa2215-9779-4659-8fd2-4a5988c7489f",
    "last_sync_date": null,
    "auto_sync": true,
    "auto_download": true,
    "created_at": "2014-11-18T06:44:37.000Z",
    "updated_at": "2014-11-18T06:58:40.000Z"
  }
}
```

So if you play a move (add a content to the place):

```bash
curl -X POST -H "Content-Type: application/json" -d '{"x":1,"y":1,"value":"cross"}' 'http://localhost:8080/application/api/v1/router/ansamb_tictactoe/places/[PLACE_ID]/'
```

You should see the newly added content in your place as a response:

```coffeescript
{
  "err": null,
  "data": {
    "id": "ad2aee06-0632-4abb-8ad5-9778225bfc46",
    "owner": null,
    "content_type": "tictactoe",
    "date": "2014-11-18T07:19:51.600Z",
    "ref_content": null,
    "read": true,
    "downloadable": false,
    "downloaded": true,
    "uploaded": false,
    "synced": false,
    "uri": null,
    "status": null,
    "likes": 0,
    "updated_at": "2014-11-18T07:19:51.000Z",
    "created_at": "2014-11-18T07:19:51.000Z",
    "data": {
      "x": 1,
      "y": 1,
      "value": "cross",
      "content_id": "ad2aee06-0632-4abb-8ad5-9778225bfc46",
      "id": "ad2aee06-0632-4abb-8ad5-9778225bfc46",
      "updated_at": "2014-11-18T07:19:51.000Z",
      "created_at": "2014-11-18T07:19:51.000Z"
    }
  }
}
```

Places handle the content distribution to your friends, so he can also see the move in the game:

```bash
curl 'http://localhost:8080/core/api/v1/places/[PLACE_ID]/contents/'
```

Congratulations, you know all the REST API commands required to code your tic tac toe game using Places ! :D

Now, let's code a simple node.js game to automate the previous requests!

## Tic tac toe game

Our tic tac toe game consist in a node.js backend in interaction with our Places Application. This backend exposes an HTTP server displaying the tic tac toe and receiving request to receive and make moves.

### package.json

To define our game and the npm modules it requires, we need a `package.json` file at the root of our game:

```javascript
{
  "name": "places_tictactoe",
  "version": "1.0.0",
  "description": "Places REST API tutorial",
  "main": "app.js",
  "author": "Ansamb",
  "private": true,
  "dependencies": {
    "body-parser": "^1.9.2",
    "express": "^4.10.2",
    "request": "^2.48.0",
    "underscore": "^1.7.0",
    "yargs": "^1.3.3"
  }
}
```

All those dependencies will be used by the main file, app.js. To install them, just run `npm install` at the root of the game.

### app.js

The main file of the game basically run an express server to display the game and make HTTP requests to our application to play:

```javascript
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
```

Let's have a closer look on this code:

```javascript
// Requirements
var argv = require('yargs').argv;
var _ = require('underscore');
var request = require('request');
var path = require('path');
var express = require('express');
var bodyParser = require('body-parser');
var place;
```

In this part, we load the required libraries:
- argv handles the command arguments to specify a server port or Places' port
- underscore will filter the places array to find the "tictactoe" place
- request is a usefull library handling HTTP requests
- path is used to specify the path to our public folder
- express will create an HTTP server to display the interface and update moves
- bodyParser provides access to the POST body

```javascript
// Command-line arguments
var port = argv.port || 3000;
var places_port = argv.places_port || 8080;
```

We specify two command line options:
- With --port=3001, you can connect to the interface on port 3001
- With --places-port=8081, your node.js server will connect on a Places instance running on port 8081

```javascript
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
```

On startup, we list the user's places to look for a *tictactoe* place and keep it in a global variable. If not found, we create the place with a POST request.

```javascript
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
```

Finally, we instanciate the express server, configure it to serve our frontend files and create two routes, `GET /moves` to fetch the place's contents and `POST /moves` to add a content to the place.

Now, we just need to develop the frontend page, in a public folder.

### public/index.html

The view of our application is carried by a single html page:

```html
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>Places tic tac toe</title>
</head>

<body>
  <table>
    <tr>
      <td><button class="square" id="x1y1">_</button></td>
      <td><button class="square" id="x2y1">_</button></td>
      <td><button class="square" id="x3y1">_</button></td>
    </tr>
    <tr>
      <td><button class="square" id="x1y2">_</button></td>
      <td><button class="square" id="x2y2">_</button></td>
      <td><button class="square" id="x3y2">_</button></td>
    </tr>
    <tr>
      <td><button class="square" id="x1y3">_</button></td>
      <td><button class="square" id="x2y3">_</button></td>
      <td><button class="square" id="x3y3">_</button></td>
    </tr>
  </table>
  <script type="text/javascript" src="scripts/jquery-2.1.1.min.js"></script>
  <script type="text/javascript" src="scripts/main.js"></script>
</body>

</html>
```

Each square is a button carrying the "square" class to append a "onclick" event handler to send the move to Places. The coordinates are picked up from the id. The javascript code of the frontend is stored in a sub-folder `script`.

### public/script/jquery-2.1.1.min.js

We use the [jQuery][49239bb7] library to handle DOM manipulation, the HTTP requests and some operations on arrays.

### public/script/main.js

Our core javascript frontend file pools the places content to display the game and listen on button clicks to make moves:

```javascript
type = location.search[1] || 'O';

setInterval(function() {
  $.get(location.origin + '/moves', function(data) {
    $.each(data, function(index, value) {
      $("#x" + value.data.x + "y" + value.data.y).text(value.data.value);
    });
  });
}, 1000);

$(".square").click(function(event) {
  var xpos = event.target.id[1] || 0;
  var ypos = event.target.id[3] || 0;
  $.ajax({
    url: location.origin + '/moves',
    type: 'POST',
    contentType: 'application/json',
    data: JSON.stringify({x: xpos, y: ypos, value: type})
  });
  $(event.target).text(type);
});
```

Let's review this code in detail:

```javascript
type = location.search[1] || 'O';
```

To determine which symbol should the user play, we just check the first letter in the query of the url (`index.html?X` will let the user play crosses for instance).

```javascript
setInterval(function() {
  $.get(location.origin + '/moves', function(data) {
    $.each(data, function(index, value) {
      $("#x" + value.data.x + "y" + value.data.y).text(value.data.value);
    });
  });
}, 1000);
```

This code will pool the backend for moves and display all of them each seconds.

```javascript
$(".square").click(function(event) {
  var xpos = event.target.id[1] || 0;
  var ypos = event.target.id[3] || 0;
  $.ajax({
    url: location.origin + '/moves',
    type: 'POST',
    contentType: 'application/json',
    data: JSON.stringify({x: xpos, y: ypos, value: type})
  });
  $(event.target).text(type);
});
```

The last part of the code add the handler on the button click events. It extracts the coordinates from the target id, then send them to our backend via a POST request and finally update the game.

## Play the game

To play the game, log into Places. Then, start the node application with `node app.js`. A *tictactoe* place will appear in Places. You can share the place to whoever you want to play with !

Your friend will accept the place and start the node game with the previous command line.

To play just open [http://localhost:3000/][cd040e4d] in your web browser. If you wish to play circles, open  [http://localhost:3000/?X][8ac3d5e7] instead.

Have a nice game !

[49239bb7]: http://jquery.com/ "jQuery"
[f8826133]: http://curl.haxx.se/ "cURL"
[4db9f3b0]: http://www.joinplaces.com/ "Places"
[a8ffd937]: http://nodejs.org/ "nodejs"
[8ac3d5e7]: http://localhost:3000/?X "http://localhost:3000/?X"
[cd040e4d]: http://localhost:3000/ "http://localhost:3000/"

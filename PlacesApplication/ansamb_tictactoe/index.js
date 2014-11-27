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

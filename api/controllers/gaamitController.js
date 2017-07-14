'use strict';

var mongoose = require('mongoose'),
  User = mongoose.model('Users'),
  fetch = require('node-fetch'),
  steem = require('steem');

function serveOauthRequest(req, res, success) {
  var token = req.get("Authorization");

  if (token == null || token === "") {
    res.status(403).send("Oauth Error");
  }

  fetch("https://stagingoauth2.promoincloud.com/oauth/validate_token", { // Call the fetch function passing the url of the API as a parameter
    headers: {
      "Authorization": "Bearer " + token
    }
  })
  .then((resp) => resp.json())
  .then(function(data) {
      if (data != "ACK") {
        res.status(401).send("Oauth Error");
      } else {
        success();
      }
  })
  .catch(function() {
      res.status(401).send("Oauth Error");
  });
}

exports.login = function(req, res) {

  serveOauthRequest(req, res, function() {
    var email = req.body.email;
    var password = req.body.password;

    req.checkBody('email', 'Invalid postparam').notEmpty();
    req.checkBody('password', 'Invalid postparam').notEmpty();

    req.getValidationResult().then(function(result) {
      if (!result.isEmpty()) {
        res.status(400).send('Missing parameters');
        return;
      }
      User.findOne({ 'email': email }, function(err, user) {
        if (err || user === null) {
          res.status(404).send('Email not found');
          return;
        }
        if (user.password === password) {
          user.password = "";
          res.json(user);
        } else {
          res.status(403).send("Password error");
        }
      });
    });
  })

}

exports.list_all_users = function(req, res) {
  serveOauthRequest(req, res, function() {
    User.find({}, function(err, user) {
      if (err)
        res.send(err);
      res.json(user);
    });
  })
};

exports.create_a_user = function(req, res) {
  serveOauthRequest(req, res, function() {
    var new_user = new User(req.body);
    new_user.save(function(err, user) {
      if (err)
        res.send(err);
      res.json(user);
    });
  })
};

exports.read_a_user = function(req, res) {
  serveOauthRequest(req, res, function() {
    User.findById(req.params.userId, function(err, user) {
      if (err)
        res.send(err);
      res.json(user);
    });
  })
};

exports.update_a_user = function(req, res) {
  serveOauthRequest(req, res, function() {
    User.findOneAndUpdate({_id: req.params.userId}, req.body, {new: true}, function(err, user) {
      if (err)
        res.send(err);
      user.password = "";
      res.json(user);
    });
  })
};

exports.delete_a_user = function(req, res) {
  serveOauthRequest(req, res, function() {
    User.remove({
      _id: req.params.userId
    }, function(err, user) {
      if (err)
        res.send(err);
      res.json({ message: 'User successfully deleted' });
    });
  })
};

exports.upvote_post = function(req, res) {
  serveOauthRequest(req, res, function() {

    var userId = req.params.userId;
    User.findOne({ 'steemitUsername': userId }, function(err, user) {
      if (err) {
        res.status(404).send("User not found")
        return;
      }
      var author = req.body.author;
      var permlink = req.body.permlink;
      var postingWif = user.postingKey;

      console.log(postingWif);

      steem.broadcast.vote(
        postingWif,
        userId, // Voter
        author, // Author
        permlink, // Permlink
        10000, // Weight (10000 = 100%)
        function(err, result) {
          if (err) {
            res.status(500).send(err)
            return
          }
          res.send("Upvote complete")
        }
      );
    });
  })
};

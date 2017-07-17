'use strict';

var mongoose = require('mongoose'),
  User = mongoose.model('Users'),
  fetch = require('node-fetch'),
  steem = require('steem'),
  sha512 = require('js-sha512');

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
    var password = sha512(req.body.password);

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
    req.body.password = sha512(req.body.password);
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

exports.read_a_user_by_username = function(req, res) {
    serveOauthRequest(req, res, function() {
    User.findOne({ 'steemitUsername': req.params.username }, function(err, user) {
      if (err)
        res.send(err);
      res.json(user);
    });
  })
}

exports.update_a_user = function(req, res) {
  serveOauthRequest(req, res, function() {
    User.findOneAndUpdate({_id: req.params.userId}, req.body, {new: true}, function(err, user) {
      if (err)
        res.send(err);
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

exports.follow_a_user = function(req, res) {
  serveOauthRequest(req, res, function() {
    var followed = req.params.followed;
    var follower = req.params.follower;

    User.findOneAndUpdate({ _id: followed }, { $push: { followers: follower } }, function(err, user) {
      if (err) {
        res.send(err);
        return;
      }
      res.json("User Followed");
    });
  });
}

exports.suggest_users = function(req, res) {
  serveOauthRequest(req, res, function() {
    User.find({}, function(err, users) {
      if (err) {
        res.send(err);
      }
      var user1;
      var user2;
      var user3;
      do {
        user1 = users[Math.floor(Math.random()*users.length)];
        console.log(user1._id)
      } while ( user1._id == req.params.userId)
      do {
        user2 = users[Math.floor(Math.random()*users.length)];
        console.log(user2._id)
      } while (user1 === user2 || user2._id == req.params.userId);
      do {
        user3 = users[Math.floor(Math.random()*users.length)];
        console.log(user3._id)
      } while (user3 === user1 || user3 === user2 || user3._id == req.params.userId)
      res.json([user1, user2, user3]);
    });
  });
}

exports.upvote_post = function(req, res) {
  serveOauthRequest(req, res, function() {

    var userId = req.params.userId;
    User.findOne({ 'steemitUsername': userId }, function(err, user) {
      if (err) {
        res.status(404).json("User not found")
        return;
      }
      var author = req.body.author;
      var permlink = req.body.permlink;
      var postingWif = user.postingKey;

      steem.broadcast.vote(
        postingWif,
        userId, // Voter
        author, // Author
        permlink, // Permlink
        10000, // Weight (10000 = 100%)
        function(err, result) {
          if (err) {
            res.status(500).json(err)
            return
          }
          res.json("Upvote complete")
        }
      );
    });
  })
};

exports.create_post = function(req, res) {
  serveOauthRequest(req, res, function() {

    var userId = req.params.userId;
    User.findOne({ 'steemitUsername': userId }, function(err, user) {
      if (err) {
        res.status(404).json("User not found")
        return;
      }

      var permlink = new Date().toISOString().replace(/[^a-zA-Z0-9]+/g, '').toLowerCase();
      var postingWif = user.postingKey;

      var title = req.body.title;
      var body = req.body.body;

      if (title === undefined || title === "") {
        res.status(400).json("Title not found");
        return;
      } 

      if (body === undefined || body === "") {
        res.status(400).json("Body not found");
        return;
      }

      steem.broadcast.comment(
        postingWif,
        '', // Leave parent author empty
        "gaamit", // Main tag
        userId, // Author
        permlink + '-post', // Permlink
        title, // Title
        body, // Body
        { tags: ['gamedev'], app: 'gaamit' }, // Json Metadata
        function(err, result) {
          if (err) {
            res.status(500).json(err)
            return
          }
          res.json("Post Uploaded")
        }
      );
    });

  });
}

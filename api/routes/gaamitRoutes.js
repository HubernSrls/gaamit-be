'use strict';
module.exports = function(app) {
  var gaamit = require('../controllers/gaamitController');
  const path = require('path');

  app.route('/login')
    .post(gaamit.login);

  // gaamit Routes
  app.route('/users')
    .get(gaamit.list_all_users)
    .post(gaamit.create_a_user);

  app.route('/users/:userId')
    .get(gaamit.read_a_user)
    .put(gaamit.update_a_user)
    .delete(gaamit.delete_a_user);

  app.route('/users/:follower/follow/:followed')
    .get(gaamit.follow_a_user);

  app.route('/users/:userId/suggested')
    .get(gaamit.suggest_users);

  app.route('/upvote/:userId')
    .post(gaamit.upvote_post);

  app.route('/post/:userId')
    .post(gaamit.create_post);

};

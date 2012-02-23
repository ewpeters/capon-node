var Schema = require('../lib/schema');

function UserController(schema, options) {
  if (! (this instanceof arguments.callee)) {
    return new arguments.callee(arguments);
  }
  var self = this;

  self.schema = schema;
  self.settings = {
      location_id: options.location_id
    , type: options.type || 'sms'
  }
}

UserController.prototype.logResponse = function(uid, message) {
  var self = this;
  var now = new Date();
  self.schema.UserResponse().create({
       origin: uid
     , destination: null
     , message: message
     , created_at: now
     , updated_at: now
  }, function(e,r){});
};

UserController.prototype.handleMessage = function(uid, message, location_id, callback) {
  var self = this;
  
  self.logResponse(uid, message);
  var returnMessage = "";
  var location;
  var user;

  self.getLocation(location_id, function(loc) {
    location = loc;
    returnMessage = "Welcome to " + location.name;
    var user = self.getUser(uid, function(u) {
      user = u;
      if (user.current_user_state && user.current_user_state.location_id == location.id) {
        if (user.current_user_state.job_type_id) {
           self.nextQuestion(user.current_user_state, function(msg) {
             callback(msg);
           })
        } else {
          self.firstQuestion(user.current_user_state, function(msg) {
            callback(msg);
          })
        }
      } else {
        self.updateUserState({'user_id': user.id, 'location_id': location_id})
        callback(returnMessage);
      }
    });
  });
};

UserController.prototype.getUser = function(uid, callback) {
  var self = this;

  self.schema.User().find({'uid': uid}, function(err, results) {
    if (results[0]) {
      // get current user_state somewhere around here
      // 
      callback(results[0]);
    } else {
      var now = new Date()
      self.schema.User().create({'uid': uid, 'created_at': now, 'updated_at':now}, function(err, user) {
        callback(user);
      })
    }
  });
};

UserController.prototype.nextQuestion = function(user_state, callback) {
  var self = this;

  self.schema.JobQuestion().find({'id': user_state.job_question_id}, function(err, results) {
    self.schema.JobQuestion().find({'job_type_id': results[0].job_type_id, 'position': results[0].position + 1}, function(err, results2) {
      if (results2[0]) {
        self.schema.Question().find({'id': results2[0].question_id}, function(err, question) {
          if (question[0]) {
            user_state.job_question_id = results2[0].id

            self.updateUserState(user_state);
            callback(question[0].text);
          } else {
            callback("");
          }
        })
      } else {
        callback("");
      };
    });
  });
};

UserController.prototype.firstQuestion = function(user_state, callback) {
  var self = this;

  self.schema.JobQuestion().find({job_type_id: user_state.job_type_id, position: 1}, {include: {question: {}}}, function(err, results) {
    if (results[0]) {
      callback(results[0].question.text);
    } else {
      callback("");
    };
  });
};

UserController.prototype.updateUserState = function(userstate) {
  var self = this;
  userstate.last_message_recieved_at = new Date();
  self.schema.CurrentUserState().find({'user_id': userstate.user_id}, function(e, results) {
    if (results[0]) {
      self.schema.CurrentUserState().update(results[0].id, userstate, function(e,r){});
    } else {
      self.schema.CurrentUserState().create(userstate, function(e,r){});
    };
  });
};


module.exports = UserController;

// maybe put this in a location file?
UserController.prototype.getLocation = function(id, callback) {
  var self = this;

  self.schema.Location().find({id: id}, function(err, results) {
    callback(results[0]);
  });
};

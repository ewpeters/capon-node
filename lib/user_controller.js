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


// entry point for the class
UserController.prototype.handleMessage = function(uid, message, location_id, callback) {
  var self = this;

  self.logResponse(uid, message);
  var returnMessage = "";
  var location;
  var user;

  self.getLocation(location_id, function(loc) {
    location = loc;
    var user = self.getUser(uid, function(u) {
      user = u;
      if (user.current_user_state && user.current_user_state.location_id == location.id) {
        // in the middle of a question list
        if (user.current_user_state.job_question_id) {
           self.nextQuestion(user.current_user_state, function(msg) {
             callback(msg);
           })
        } else { 
          // just picked a job type
          var position = parseInt(message);
          if (position >= 0 && position < location.location_jobs.length) {
            user.current_user_state.job_type_id = location.location_jobs[position].job_type.id
            self.firstQuestion(user.current_user_state, function(msg) {
              callback(msg);
            }); 
          } else {
            var errorMessage = ["Sorry, we couldn't quite make that out"];
            for (var i in location.location_jobs) {
              errorMessage.push(i + " for " + location.location_jobs[i].job_type.name);
            }
            callback(errorMessage);
          }
        }
      } else {
        returnMessage = ["Welcome to " + location.name];
        returnMessage.push("Here are some jobs we have available:");
        for (var i in location.location_jobs) {
          returnMessage.push(i + " for " + location.location_jobs[i].job_type.name);
        }
        self.updateUserState({'user_id': user.id, 'location_id': location_id})
        callback(returnMessage);
      }
    });
  });
};

UserController.prototype.getUser = function(uid, callback) {
  var self = this;

  self.schema.User().find({'uid': uid}, {include: {current_user_state: {}}, }, function(err, results) {
    if (results[0]) {
      results[0].current_user_state = results[0].current_user_state[0]
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
            callback(["Q" + results2[0].position + ": " + question[0].text, "Y/N?"]);
          } else {
            self.destroyUserState(user_state.user_id);
            callback(["Couldn't find a question to ask you. ¯\(°_o)/¯"]);
          }
        })
      } else {
        self.destroyUserState(user_state.user_id);
        callback(["Great, thank you for the interest in Philz Coffee and we will contact you when a position opens up."]);
      };
    });
  });
};

UserController.prototype.firstQuestion = function(user_state, callback) {
  var self = this;
  self.schema.JobQuestion().find({job_type_id: user_state.job_type_id, position: 1}, {include: {question: {}}}, function(err, results) {
    if (results[0]) {
      user_state.job_question_id = results[0].id;
      user_state.job_type_id = results[0].job_type_id;
      self.updateUserState(user_state);
      callback(["Q1: " + results[0].question.text, "Y/N?"]);
    } else {
      self.destroyUserState(user_state.user_id);
      callback(["There appear to be no questions for this job! O.O"]);
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

UserController.prototype.destroyUserState = function(user_id) {
  var self = this;
  
  self.schema.CurrentUserState().destroy({user_id: user_id}, function(e,r){});
};

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

module.exports = UserController;

// maybe put this in a location file?
UserController.prototype.getLocation = function(id, callback) {
  var self = this;

  self.schema.Location().find({id: id}, {include: {'location_jobs': {include: {'job_type': {}}}}}, function(err, results) {
    callback(results[0]);
  });
};

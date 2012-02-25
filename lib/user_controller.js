var Schema = require('../lib/schema');
RestClient = require('twilio').RestClient;
client = new RestClient("ACb1926ecd3ad84048adf8a66d391a4c0b", "ee3bf85c87c17e9d8401748153f3b5b5");
var HOSTNAME = "http://24.6.38.198/"

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
            user.current_user_state.job_type_id = location.location_jobs[position].job_type.id;
            self.firstQuestion(user.current_user_state, function(msg) {
              callback(msg);
            }); 
          } else if (message == "M" || message == "m") {
            if (location.location_jobs[0].page_number != -1 && user.current_user_state.current_page != -1) {
              var returnMessage = [];
              var curr;
              for (var i in location.location_jobs) {
                curr = location.location_jobs[i];
                if (curr.page_number == (user.current_user_state.current_page + 1)) {
                  returnMessage.push("" + i + " for " + location.location_jobs[i].job_type.name);
                };
              };
              if (curr != location.location_jobs[location.location_jobs.length-1]) {
                self.updateUserState({'user_id': user.id, 'location_id': location_id, 'current_page': curr.page_number + 1});
                returnMessage.push("M for More")
              } else {
                self.updateUserState({'user_id': user.id, 'location_id': location_id, 'current_page': -1})
              }
              console.log("return message")
              callback(returnMessage)
            } else {
              callback("");
            }
          } else {
            var errorMessage = ["Sorry, we couldn't quite make that out"];
            callback(errorMessage);
          }
        }
      } else {
        // self.updateUserState({'user_id': user.id, 'location_id': location_id})
        callback(["Welcome to " + location.name]);
        var returnMessage = "Q1/5: Which of the following jobs would you be interested in?\nReply with:\n";
        for (var i in location.location_jobs) {
          if (location.location_jobs[i].page_number == 1 || location.location_jobs[i].page_number == -1) {
            returnMessage += i + " for " + location.location_jobs[i].job_type.name + "\n";
          }
        };
        if (location.location_jobs[0] && location.location_jobs[0].page_number != -1) {
          self.updateUserState({'user_id': user.id, 'current_page': location.location_jobs[0].page_number})
          returnMessage += "M for More";
        }
        
        console.log("sending message");
        console.log(returnMessage);
        console.log(returnMessage.length);
        self.sendMessage(returnMessage, location, user.uid);
      };
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
      self.schema.User().create({'uid': uid, 'created_at': now, 'updated_at':now}, function(err, results) {
        callback(results.rows[0]);
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
        callback(["Great, thank you for the interest. We will contact you when a position opens up."]);
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

UserController.prototype.updateUserStateFromNumber = function(number, user_state) {
  var self = this;
  self.schema.User().find({'uid': number}, {include: {current_user_state: {}}, }, function(err, results) {
    if (results[0]) {
      user_state.user_id = results[0].id;
      self.updateUserState(user_state);
    };
  });
}

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

UserController.prototype.sendMessage = function(message, location, to) {
  var self = this;
  
  client.sendSms("+14157280972", to, message, HOSTNAME + location.id, null, null);
};

// maybe put this in a location file?
UserController.prototype.getLocation = function(id, callback) {
  var self = this;

  self.schema.Location().find({id: id}, {include: {'location_jobs': {include: {'job_type': {}}}}}, function(err, results) {
    callback(results[0]);
  });
};

module.exports = UserController;

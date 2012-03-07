var Schema = require('../lib/schema');
RestClient = require('twilio').RestClient;
client = new RestClient("ACa634f2fcd9794deba0f3d19b8dc62ac5", "4eb49a241795f530b2e2eeebd9b45086");

var HOSTNAME;
if (process.env.NODE_ENV== "production") {
  HOSTNAME = "http://capon-node.herokuapp.com/"
} else {
  HOSTNAME = "http://99.175.101.255/"
}
 
var ALPHA_HASH = {
  0: "A",
  1: "B",
  2: "C",
  3: "D",
  4: "E",
  5: "F",
  6: "G",
  7: "H",
  8: "I",
  9: "J",
  10: "K",
  11: "L",
  12: "M"
}

var REVERSE_APLHA_HASH = {
  "A": 0,
  "B": 1,
  "C": 2,
  "D": 3,
  "E": 4,
  "F": 5,
  "G": 6,
  "H": 7,
  "I": 8,
  "J": 9,
  "K": 10,
  "L": 11,
  "M": 12
}
function logger(things) {
  for (var i in things) {
    console.log(things[i]);
  }
}

function UserController(schema_in, options) {
  if (! (this instanceof arguments.callee)) {
    return new arguments.callee(arguments);
  }
  var self = this;

  self.schema = schema_in;
}


// entry point for the class
UserController.prototype.handleMessage = function(uid, message, location_id, callback) {
  var self = this;
  self.logResponse(uid, message);
  var location;
  var user;
  logger(["Handling Message"])
  self.getLocation(location_id, function(loc) {
    
    location = loc; 
    logger(["Got Location", location])
    var user;
    self.getUser(uid, function(u) {
      user = u;
      if (user.current_user_state && user.current_user_state.location_id == location.id) {
        // in the middle of a question list
        logger(["in the middle of a question list"]);
        if (user.current_user_state.job_question_id) {
          logger(["Find job question"]);
          self.schema.JobQuestion().find({job_type_id: user.current_user_state.job_type_id}, function(err, res) {
            logger(["Calling next question"]);
            self.nextQuestion(user.current_user_state, message, res.length, location.name, function(msg) {
              logger(["Returning next question", msg]);
              callback(msg);
            });
          });
        } else { 
          // just picked a job type
          var position = parseInt(message);
          if (position >= 0 && position < location.location_jobs.length) {
            user.current_user_state.job_type_id = location.location_jobs[position].job_type.id;
            self.schema.JobQuestion().find({job_type_id: user.current_user_state.job_type_id}, function(err, res) {
              self.firstQuestion(user.current_user_state, res.length, function(msg) {
                callback(msg);
              }); 
            });
          } else if (message.toUpperCase() == "M") {
            if (location.location_jobs[0].page_number != -1 && user.current_user_state.current_page != -1) {
              var returnMessage = [];
              var curr;
              var last;
              for (var i in location.location_jobs) {
                curr = location.location_jobs[i];
                if (curr.page_number == (user.current_user_state.current_page + 1)) {
                  last = location.location_jobs[i];
                  returnMessage.push("" + i + " for " + location.location_jobs[i].job_type.name);
                };
              };
              if (last != location.location_jobs[location.location_jobs.length-1]) {
                self.updateUserState({'user_id': user.id, 'location_id': location_id, 'current_page': last.page_number});
                returnMessage.push("M for More")
              } else {
                self.updateUserState({'user_id': user.id, 'location_id': location_id, 'current_page': -1})
              }
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
        var returnMessage = "Which of the following jobs would you be interested in?\nReply with:\n";
        var uid = user.uid;
        for (var i in location.location_jobs) {
          if (location.location_jobs[i].page_number == 1 || location.location_jobs[i].page_number == -1) {
            returnMessage += i + " for " + location.location_jobs[i].job_type.name + "\n";
          }
        };

        if (location.location_jobs[0] && location.location_jobs[0].page_number != -1) {
          self.updateUserState({'user_id': user.id, 'current_page': location.location_jobs[0].page_number})
          returnMessage += "M for More";
        }

        setTimeout(function() {
          self.sendMessage(returnMessage, location, uid);
        }, 1000);
      };
    });
  });
};

UserController.prototype.getUser = function(uid, callback) {
  var self = this;
  logger(["Searching for user"]);
  self.schema.User().find({'uid': uid}, {include: {current_user_state: {}}, }, function(err, results) {
    if (results[0]) {
      logger(["Found user", results[0]])
      results[0].current_user_state = results[0].current_user_state[0]
      callback(results[0]);
    } else {
      var now = new Date()
      logger(["Did not find user"]);
      self.schema.User().create({'uid': uid, 'created_at': now, 'updated_at':now}, function(err, results) {
        logger(["Created user", results.rows[0]]);
        callback(results.rows[0]);
      })
    }
  });
};

UserController.prototype.nextQuestion = function(user_state, response, length, name, callback) {
  var self = this;
  var userResponse = response.toUpperCase();
  logger(["Finding JobQuestion"]);
  self.schema.JobQuestion().find({'id': user_state.job_question_id}, {include: {question: {include: {answers: {}}}}}, function(err, results) {
    logger(["Found job question", results[0]]);
    if (results[0]) {
      if (results[0].question.question_tyoe == 1 && userResponse != "Y" && userResponse != "N") {
        callback(["Invalid response"]);
      } else if (results[0].question.question_tyoe == 2 && REVERSE_APLHA_HASH[userResponse] >= results[0].question.length) {
        callback(["Invalid response"]);
      }
      self.answerQuestion(user_state, results[0].question, userResponse);
    }
    logger(["Finding JobQuestion 2"]);
    self.schema.JobQuestion().find({'job_type_id': results[0].job_type_id, 'position': results[0].position + 1}, function(err, results2) {
      logger(["Found job question 2", results2[0]]);
      if (results2[0]) {
        logger(["Finding Question"]);
        self.schema.Question().find(results2[0].question_id, {include: {answers: {}}}, function(err, question) {
          logger(["Found Question", question]);
          if (question) {
            var qArray = ["Q" + results2[0].position + "/" + length +  ": "  + question.text];
            user_state.job_question_id = results2[0].id

            self.updateUserState(user_state);

            self.questionTyper(question, qArray);
            callback(qArray);
          } else {
            self.destroyUserState(user_state.user_id);
            callback(["Couldn't find a question to ask you. ¯\(°_o)/¯"]);
          }
        })
      } else {
        self.destroyUserState(user_state.user_id);
        callback(["Great, thank you for the interest in "+ name +".", "We will contact you when a position opens up that fits your skills."]);
      };
    });
  });
};

UserController.prototype.firstQuestion = function(user_state, length, callback) {
  var self = this;
  self.schema.JobQuestion().find({job_type_id: user_state.job_type_id, position: 1}, {include: {question: {include: {answers: {}}}}}, function(err, results) {
    if (results[0]) {
      var question = results[0].question;
      var qArray = ["Q1/"+ length +": " + question.text];
      user_state.job_question_id = results[0].id;
      user_state.job_type_id = results[0].job_type_id;
      self.updateUserState(user_state);
      
      self.questionTyper(question, qArray);
      callback(qArray);
    } else {
      self.destroyUserState(user_state.user_id);
      callback(["There appear to be no questions for this job! O.O"]);
    };
  });
};

UserController.prototype.questionTyper = function(question, array) {
  if (question.question_type == 1) {
    array.push("Y/N?");
  } else if (question.question_type == 2) {
    for (var i in question.answers) {
      array.push(ALPHA_HASH[i] + " for " + question.answers[i].text);
    }
  }
}

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

UserController.prototype.answerQuestion = function(user_state, question, response) {
  var self = this;
  var now = new Date();
  var qType = question.question_type;
  var answerId = null;
  if (qType == 1) {
    var yesOrNo = response == "Y" ? "Yes" : "No"
    answerId = question.answers[0].text == yesOrNo ? question.answers[0].id : question.answers[1].id;
  } else if (qType == 2) {
    answerId = question.answers[REVERSE_APLHA_HASH[response]].id;
  } 
  self.schema.UserAnswer().find({'user_id': user_state.user_id, 'question_id': question.id}, function(err, results) {
    if (results[0]) {
      self.schema.UserAnswer().update({'answer_id': answerId, updated_at: now, text: response}, function(err,r) {
        if (err) {
          console.log("Error saving UserAnswer:");
          console.log({'user_id': user_state.user_id, 'answer_id': answerId, 'question_id': question.id, text: response});
          console.log("trace: ");
          console.log(err);
        }
      });
    } else {
      self.schema.UserAnswer().create({'user_id': user_state.user_id, 'answer_id': answerId, 'question_id': question.id, text: response, created_at: now, updated_at: now}, function(err, r) {
        if (err) {
          console.log("Error saving UserAnswer:");
          console.log({'user_id': user_state.user_id, 'answer_id': answerId, 'question_id': question.id, text: response});
          console.log("trace: ");
          console.log(err);
        }
      })
    }
  });

} 

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
  logger(["Sending message"]);
  self.schema.Number().find({location_id: location.id}, function(err, results) {
    logger(["Found Number", results[0]]);
    if (results[0]) {
      logger(["Sending SMS"]);
      client.sendSms(results[0].number, to, message, HOSTNAME + location.id, null, null);
    }
  });

};

// maybe put this in a location file?
UserController.prototype.getLocation = function(id, callback) {
  var self = this;

  self.schema.Location().find(id, {include: {'location_jobs': {include: {'job_type': {}}}}}, function(err, results) {
    callback(results);
  });
};

UserController.prototype.restClient = function() {
  return client;
};

UserController.prototype.setRestClient = function(newClient) {
  client = newClient;
};

module.exports = UserController;

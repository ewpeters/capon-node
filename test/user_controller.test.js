var assert = require('chai').assert;
RestClient = require('twilio').RestClient;
RestClient.prototype.sendSmS = function() {
  
}
describe('UserController', function(){
  var UserController = require('../lib/user_controller');
  var Schema = require('../lib/schema');

  var testSchema = new Schema({
    database: "capon_test",
    user: "capon",
    password: "capon",
    host: "localhost"
  });
  var testController = new UserController(testSchema, {});
  // methods I stub at some point
  var GetUser          = testController.getUser;
  var GetLocation      = testController.getLocation;
  var UpdateUserState  = testController.updateUserState;
  var NextQuestion     = testController.nextQuestion;
  var FirstQuestion    = testController.firstQuestion;
  var DestroyUserState = testController.destroyUserState;
  var LogResponse      = testController.logResponse;
  var SendMessage      = testController.sendMessage;
  var QuestionTyper    = testController.questionTyper;

  beforeEach(function(done) {
    testSchema.User().destroy({}, function(err, results) {
      testSchema.UserResponse().destroy({}, function(err, results) {
        testSchema.JobQuestion().destroy({}, function(err, results) {
          testSchema.JobType().destroy({}, function(err, results) {
            testSchema.Question().destroy({}, function(err, results) {
              testSchema.CurrentUserState().destroy({}, function(err, results) {
                testSchema.Answer().destroy({}, function(err, results) {
                  testSchema.UserAnswer().destroy({}, function(err, results) {
                    done();
                  });
                });
              });
            });
          });
        });
      });
    });
  });

  // tests for UserController#handleMessage since these call handle message on a 1 second timout beware
  describe("#handleMessage", function() {
    it("should call logResponse whenenver handleText is called", function(done) {
      var logCalled = false
      testController.logResponse = function(u, m) {
        logCalled = true;
      };
  
      testController.getLocation = function(n, callback) {
        callback({name: "Test", location_jobs: []});
      };
  
      testController.geUser = function(n, callback) {
        callback({current_user_state: null});
      };
  
      testController.updateUserState = function(n) {};
  
      testController.handleMessage("uid", "message", 1, function() {
        assert.isTrue(logCalled);
        setTimeout(done, 700);
      });
    });
  });

  describe("#handleMessage", function() {
    it("should display the welcome message with jobs if the current user state is null and call sendMessage after callback", function(done) {
      this.timeout(3000);
      // TODO: Read this from a config file
      var sendMessageCalled = false;
      var welcomeMessage = ['Welcome to Philz'];
      var location = {name: "Philz", location_jobs: [{job_type: {name: "test job"}, page_number: -1}]};
      var uid = "555555555";
  
      testController.getUser = function(n, callback) {
        callback({uid: uid, current_user_state: null});
      };
      
      testController.sendMessage = function(msg, loc, user_uid) {
        assert.equal(msg, "Which of the following jobs would you be interested in?\nReply with:\n0 for test job\n")
        assert.deepEqual(loc, location);
        assert.deepEqual(user_uid, uid);
        sendMessageCalled = true;
      };
  
      testController.getLocation = function(n, callback) {
        callback(location);
      };
  
      testController.handleMessage(uid, "", 1, function(message) {
        assert.deepEqual(welcomeMessage, message);
        assert.isFalse(sendMessageCalled);
      });
      
      setTimeout(function() {
        assert.isTrue(sendMessageCalled);
        done();
      }, 700);
    });
  });
  
  describe("#handleMessage", function() {
    it("should display the welcome message if the user is in a different location and call sendMessage about a half second after callback", function(done) {
      // TODO: Read this from a config file
      this.timeout(3000);
      var sendMessageCalled = false;
      var welcomeMessage = ['Welcome to Philz'];
      var location = {name: "Philz", location_jobs: [{job_type: {name: "test job"}, page_number: -1}]};
      var uid = "555555555";

      testController.getUser = function(n, callback) {
        callback({uid: uid, current_user_state: {location_id: 2}});
      };
      
      testController.getLocation = function(n, callback) {
        callback(location);
      };
      
      testController.sendMessage = function(msg, loc, user_uid) {
        assert.equal(msg, "Which of the following jobs would you be interested in?\nReply with:\n0 for test job\n")
        assert.deepEqual(loc, location);
        assert.deepEqual(user_uid, uid);
        sendMessageCalled = true;
      };
  
      testController.handleMessage(uid, "", 1, function(message) {
        assert.deepEqual(welcomeMessage, message);
        assert.isFalse(sendMessageCalled);
      });
      // 
      setTimeout(function() {
        assert.isTrue(sendMessageCalled);
        done();
      }, 700);
    });
  });
  
  describe("#handleMessage", function() {
    it("should display the welcome message, send the job type list with paging, and update current user state with a page number", function(done) {
      // TODO: Read this from a config file
      this.timeout(3000);
      var sendMessageCalled = false;
      var welcomeMessage = ['Welcome to Philz'];
      var location = {name: "Philz", location_jobs: [{job_type: {name: "test job"}, page_number: 1}, {job_type: {name: "test job 2"}, page_number: 2}]};
      var uid = "555555555";

      testController.getUser = function(n, callback) {
        callback({uid: uid, current_user_state: {location_id: 2}});
      };
      
      testController.getLocation = function(n, callback) {
        callback(location);
      };

      testController.updateUserState = function(n) {
        assert.equal(n.current_page, 1);
      };

      testController.sendMessage = function(msg, loc, user_uid) {
        assert.equal(msg, "Which of the following jobs would you be interested in?\nReply with:\n0 for test job\nM for More")
        assert.deepEqual(loc, location);
        assert.deepEqual(user_uid, uid);
        sendMessageCalled = true;
      };
  
      testController.handleMessage(uid, "", 1, function(message) {
        assert.deepEqual(welcomeMessage, message);
        assert.isFalse(sendMessageCalled);
      });

      setTimeout(function() {
        assert.isTrue(sendMessageCalled);
        done();
      }, 700);
    });
  });
  
  describe("#handleMessage", function() {
    it("should respond with the 2nd page of the job list if the current user state is on page 1 and there is a second page, and end paging (update user state and no M for more)", function(done) {
      // TODO: Read this from a config file
      this.timeout(3000);
      var sendMessageCalled = false;
      var secondPage = ['1 for test job 2'];
      var location = {id: 1, name: "Philz", location_jobs: [{job_type: {name: "test job"}, page_number: 1}, {job_type: {name: "test job 2"}, page_number: 2}]};
      var uid = "555555555";

      testController.getUser = function(n, callback) {
        callback({uid: uid, current_user_state: {location_id: 1, current_page: 1}});
      };
      
      testController.getLocation = function(n, callback) {
        callback(location);
      };

      testController.updateUserState = function(n) {
        assert.equal(n.current_page, -1);
      };

      testController.sendMessage = function(msg, loc, user_uid) {
      };
  
      testController.handleMessage(uid, "M", 1, function(message) {
        assert.deepEqual(secondPage, message);
        assert.isFalse(sendMessageCalled);
        done();
      });

    });
  });

  describe("#handleMessage", function() {
    it("should respond with the 2nd page of the job list if the current user state is on page 1 and there is a second page, and continue paging (update user state and M for more)", function(done) {
      // TODO: Read this from a config file
      this.timeout(3000);
      var sendMessageCalled = false;
      var secondPage = ['1 for test job 2', "M for More"];
      var location = {id: 1, name: "Philz", location_jobs: [{job_type: {name: "test job"}, page_number: 1}, {job_type: {name: "test job 2"}, page_number: 2}, {job_type: {name: "test job 3"}, page_number: 3}]};
      var uid = "555555555";

      testController.getUser = function(n, callback) {
        callback({uid: uid, current_user_state: {location_id: 1, current_page: 1}});
      };
      
      testController.getLocation = function(n, callback) {
        callback(location);
      };

      testController.updateUserState = function(n) {
        assert.equal(n.current_page, 2);
      };

      testController.sendMessage = function(msg, loc, user_uid) {
      };
  
      testController.handleMessage(uid, "M", 1, function(message) {
        assert.deepEqual(secondPage, message);
        assert.isFalse(sendMessageCalled);
        done();
      });

    });
  });
  

  describe("#handleMessage", function() {
    it("should call nextQuestion if the current user state exists and is set to the current location", function(done) {
  
      testController.getUser = function(n, callback) {
        callback({current_user_state: {location_id: 1, job_question_id: 1}});
      };
  
      testController.getLocation = function(n, callback) {
        callback({id: 1,location_jobs: []});
      };
  
      testController.updateUserState = function() {};
  
      testController.nextQuestion = function(n, callback) {
        assert.isTrue(true);
        done();
      };
  
      testController.handleMessage("12313", "", 1, function(message) {});
    });
  });

  describe("#handleMessage", function() {
    it("should call firstQueston if the current user state exists, is set to the current location, does not have a job question id, and has messaged a VALID job type", function(done) {
  
      testController.getUser = function(n, callback) {
        callback({current_user_state: {location_id: 1, job_question_id: null}});
      };
  
      testController.getLocation = function(n, callback) {
        callback({id: 1, location_jobs: [{job_type: {name: "test job"}}]});
      };
  
      testController.updateUserState = function() {};
  
      testController.firstQuestion = function(n, callback) {
        assert.isTrue(true);
        done();
      };
  
      testController.handleMessage("0", "0", 1, function(message) {});
    });
  });

  describe("#handleMessage", function() {
    it("should return an erro message and the list of job types if the current user state exists, is set to the current location, does not have a job question id, and has messaged a INVALID job type", function(done) {
  
      testController.getUser = function(n, callback) {
        callback({current_user_state: {location_id: 1, job_question_id: null}});
      };
  
      testController.getLocation = function(n, callback) {
        callback({id: 1, location_jobs: [{job_type: {name: "test job"}}]});
      };
  
      testController.updateUserState = function() {};
  
      testController.handleMessage("0", "10", 1, function(message) {
        assert.deepEqual(message, ["Sorry, we couldn't quite make that out"]);
        done();
      });
    });
  });
  
  // tests for UserController#getUser
  describe("#getUser", function() {
    it('should create and return new user for a uid not seen before', function(done) {
      var uid = "555555555"; 
      testController.getUser(uid, function(a) {
        var gotUser = a;
        testSchema.User().find({ 'uid': uid }, function(err, results) {
          assert.deepEqual(gotUser, results[0]);
          done();
        });
      });
    });
  });
  
  describe("#getUser", function() {
    it('should return a new user if one exists for that uid', function(done) {
      var now = new Date();
      var createdUser = {id: 1, uid: "1", created_at: now, updated_at: now, current_user_state: undefined};
      testSchema.User().find({ 'uid': createdUser.uid }, function(err, results) {
        assert.isNull(results[0]);
  
        testSchema.User().create(createdUser, function(err, results) {
          testController.getUser(createdUser.uid, function(user) {
            assert.isNotNull(user);
            assert.deepEqual(user, createdUser);
            done();
          });
        });
      });
    });
  });
  
  // tests for UserController#nextQuestion
  describe("#nextQuestion", function() {
    it("shoud get the next question given a current_user_state in the middle of a question list, call updateUserState, and answer the question if question type is 1 with Y", function(done) {
      var userStateCalled = false;
      testController.updateUserState = function() { userStateCalled = true; };
      var qTyperCalled = false;
      testController.questionTyper = function(n) { qTyperCalled = true; };

      var now = new Date();
      var jobQuestions = [{id: 1, job_type_id: 1, question_id: 1, position: 1, created_at: now, updated_at: now}, {id: 2, job_type_id: 1, question_id: 2, position: 2, created_at: now, updated_at: now}, {id: 3, job_type_id: 1, question_id: 3, position: 3, created_at: now, updated_at: now}, {id: 4, job_type_id: 1, question_id: 4, position: 4, created_at: now, updated_at: now}];
      
      testSchema.JobQuestion().create(jobQuestions, function(e, r){});
      testSchema.JobType().create({id: 1, created_at: now, updated_at: now}, function(){});
      testSchema.Question().create({id: 2, text: "question 2", question_type: 1, created_at: now, updated_at: now}, function(){});
      testSchema.Answer().create({text: "Yes", id: 1, question_id: 2, created_at: now, updated_at: now}, function(e,r) {});
      testSchema.Answer().create({text: "No", id: 2, question_id: 2, created_at: now, updated_at: now}, function(e,r) {});
      testSchema.Question().create({id: 3, text: "question 3", created_at: now, updated_at: now}, function(){});

      setTimeout(function() {
        testController.nextQuestion({job_question_id: 2, job_type_id: 1, user_id: 1}, "Y", 5, "Philz", function(question) {
          assert.deepEqual(question, ['Q3/5: question 3']);
          assert.isTrue(userStateCalled);
          assert.isTrue(qTyperCalled);
          setTimeout(function() {
            testSchema.UserAnswer().find({user_id: 1, question_id: 2}, function(err, results) {
              assert.isNotNull(results[0]);
              assert.equal(results[0].answer_id, 1);
              assert.equal(results[0].text, "Y");
              done();
            });
          }, 20);
        });
      }, 10);      
    });
  });

  describe("#nextQuestion", function() {
    it("shoud get the next question given a current_user_state in the middle of a question list, call updateUserState, and answer the question if question type is 1 with N", function(done) {
      var userStateCalled = false;
      testController.updateUserState = function() { userStateCalled = true; };
      var qTyperCalled = false;
      testController.questionTyper = function(n) { qTyperCalled = true; };

      var now = new Date();
      var jobQuestions = [{id: 1, job_type_id: 1, question_id: 1, position: 1, created_at: now, updated_at: now}, {id: 2, job_type_id: 1, question_id: 2, position: 2, created_at: now, updated_at: now}, {id: 3, job_type_id: 1, question_id: 3, position: 3, created_at: now, updated_at: now}, {id: 4, job_type_id: 1, question_id: 4, position: 4, created_at: now, updated_at: now}];
      
      testSchema.JobQuestion().create(jobQuestions, function(e, r){});
      testSchema.JobType().create({id: 1, created_at: now, updated_at: now}, function(){});
      testSchema.Question().create({id: 2, text: "question 2", question_type: 1, created_at: now, updated_at: now}, function(){});
      testSchema.Answer().create({text: "Yes", id: 1, question_id: 2, created_at: now, updated_at: now}, function(e,r) {});
      testSchema.Answer().create({text: "No", id: 2, question_id: 2, created_at: now, updated_at: now}, function(e,r) {});
      testSchema.Question().create({id: 3, text: "question 3", created_at: now, updated_at: now}, function(){});

      setTimeout(function() {
        testController.nextQuestion({job_question_id: 2, job_type_id: 1, user_id: 1}, "N", 5, "Philz", function(question) {
          assert.deepEqual(question, ['Q3/5: question 3']);
          assert.isTrue(userStateCalled);
          assert.isTrue(qTyperCalled);
          setTimeout(function() {
            testSchema.UserAnswer().find({user_id: 1, question_id: 2}, function(err, results) {
              assert.isNotNull(results[0]);
              assert.equal(results[0].answer_id, 2);
              assert.equal(results[0].text, "N");
              done();
            });
          }, 20);
        });
      }, 10);      
    });
  });
  
  describe("#nextQuestion", function() {
    it("shoud get the next question given a current_user_state in the middle of a question list, call updateUserState, and answer the question if question type is 2 with A", function(done) {
      var userStateCalled = false;
      testController.updateUserState = function() { userStateCalled = true; };
      var qTyperCalled = false;
      testController.questionTyper = function(n) { qTyperCalled = true; };

      var now = new Date();
      var jobQuestions = [{id: 1, job_type_id: 1, question_id: 1, position: 1, created_at: now, updated_at: now}, {id: 2, job_type_id: 1, question_id: 2, position: 2, created_at: now, updated_at: now}, {id: 3, job_type_id: 1, question_id: 3, position: 3, created_at: now, updated_at: now}, {id: 4, job_type_id: 1, question_id: 4, position: 4, created_at: now, updated_at: now}];
      
      testSchema.JobQuestion().create(jobQuestions, function(e, r){});
      testSchema.JobType().create({id: 1, created_at: now, updated_at: now}, function(){});
      testSchema.Question().create({id: 2, text: "question 2", question_type: 2, created_at: now, updated_at: now}, function(){});
      testSchema.Answer().create({text: "Test Answer A", id: 1, question_id: 2, created_at: now, updated_at: now}, function(e,r) {});
      testSchema.Answer().create({text: "Test Answer B", id: 2, question_id: 2, created_at: now, updated_at: now}, function(e,r) {});
      testSchema.Question().create({id: 3, text: "question 3", created_at: now, updated_at: now}, function(){});

      setTimeout(function() {
        testController.nextQuestion({job_question_id: 2, job_type_id: 1, user_id: 1}, "A", 5, "Philz", function(question) {
          assert.deepEqual(question, ['Q3/5: question 3']);
          assert.isTrue(userStateCalled);
          assert.isTrue(qTyperCalled);
          setTimeout(function() {
            testSchema.UserAnswer().find({user_id: 1, question_id: 2}, function(err, results) {
              assert.isNotNull(results[0]);
              assert.equal(results[0].answer_id, 1);
              assert.equal(results[0].text, "A");
              done();
            });
          }, 20);
        });
      }, 10);      
    });
  });
  
  describe("#nextQuestion", function() {
    it("shoud get the next question given a current_user_state in the middle of a question list, call updateUserState, and answer the question if question type is 2 with B", function(done) {
      var userStateCalled = false;
      testController.updateUserState = function() { userStateCalled = true; };
      var qTyperCalled = false;
      testController.questionTyper = function(n) { qTyperCalled = true; };

      var now = new Date();
      var jobQuestions = [{id: 1, job_type_id: 1, question_id: 1, position: 1, created_at: now, updated_at: now}, {id: 2, job_type_id: 1, question_id: 2, position: 2, created_at: now, updated_at: now}, {id: 3, job_type_id: 1, question_id: 3, position: 3, created_at: now, updated_at: now}, {id: 4, job_type_id: 1, question_id: 4, position: 4, created_at: now, updated_at: now}];
      
      testSchema.JobQuestion().create(jobQuestions, function(e, r){});
      testSchema.JobType().create({id: 1, created_at: now, updated_at: now}, function(){});
      testSchema.Question().create({id: 2, text: "question 2", question_type: 2, created_at: now, updated_at: now}, function(){});
      testSchema.Answer().create({text: "Test Answer A", id: 1, question_id: 2, created_at: now, updated_at: now}, function(e,r) {});
      testSchema.Answer().create({text: "Test Answer B", id: 2, question_id: 2, created_at: now, updated_at: now}, function(e,r) {});
      testSchema.Question().create({id: 3, text: "question 3", created_at: now, updated_at: now}, function(){});

      setTimeout(function() {
        testController.nextQuestion({job_question_id: 2, job_type_id: 1, user_id: 1}, "B", 5, "Philz", function(question) {
          assert.deepEqual(question, ['Q3/5: question 3']);
          assert.isTrue(userStateCalled);
          assert.isTrue(qTyperCalled);
          setTimeout(function() {
            testSchema.UserAnswer().find({user_id: 1, question_id: 2}, function(err, results) {
              assert.isNotNull(results[0]);
              assert.equal(results[0].answer_id, 2);
              assert.equal(results[0].text, "B");
              done();
            });
          }, 20);
        });
      }, 10);      
    });
  });

  describe("#nextQuestion", function() {
    it("shoud get the next question given a current_user_state in the middle of a question list, call updateUserState, and answer the question if question type is 3 with whatever", function(done) {
      var userStateCalled = false;
      testController.updateUserState = function() { userStateCalled = true; };
      var qTyperCalled = false;
      testController.questionTyper = function(n) { qTyperCalled = true; };

      var now = new Date();
      var jobQuestions = [{id: 1, job_type_id: 1, question_id: 1, position: 1, created_at: now, updated_at: now}, {id: 2, job_type_id: 1, question_id: 2, position: 2, created_at: now, updated_at: now}, {id: 3, job_type_id: 1, question_id: 3, position: 3, created_at: now, updated_at: now}, {id: 4, job_type_id: 1, question_id: 4, position: 4, created_at: now, updated_at: now}];
      
      testSchema.JobQuestion().create(jobQuestions, function(e, r){});
      testSchema.JobType().create({id: 1, created_at: now, updated_at: now}, function(){});
      testSchema.Question().create({id: 2, text: "question 2", question_type: 3, created_at: now, updated_at: now}, function(){});
      testSchema.Question().create({id: 3, text: "question 3", created_at: now, updated_at: now}, function(){});

      setTimeout(function() {
        testController.nextQuestion({job_question_id: 2, job_type_id: 1, user_id: 1}, "whatever", 5, "Philz", function(question) {
          assert.deepEqual(question, ['Q3/5: question 3']);
          assert.isTrue(userStateCalled);
          assert.isTrue(qTyperCalled);
          setTimeout(function() {
            testSchema.UserAnswer().find({user_id: 1, question_id: 2}, function(err, results) {
              assert.isNotNull(results[0]);
              assert.equal(results[0].answer_id, null);
              assert.equal(results[0].text, "WHATEVER");
              done();
            });
          }, 20);
        });
      }, 10);      
    });
  });

  describe("#nextQuestion", function() {
    it("shoud return goodbye message and call destroyUserState if at the end of the job's questions", function(done) {
      var destroyStateCalled = false;
      var answerQCalled = false;
      testController.destroyUserState = function() { destroyStateCalled = true; };
      testController.answerQuestion = function()   { answerQCalled = true; };
      var qTyperCalled = false;
      testController.questionTyper = function(n) { qTyperCalled = true; };

      var now = new Date();
      var jobQuestions = [{id: 1, job_type_id: 1, question_id: 1, position: 1, created_at: now, updated_at: now}, {id: 2, job_type_id: 1, question_id: 2, position: 2, created_at: now, updated_at: now}, {id: 3, job_type_id: 1, question_id: 3, position: 3, created_at: now, updated_at: now}, {id: 4, job_type_id: 1, question_id: 4, position: 4, created_at: now, updated_at: now}];
      
      testSchema.JobQuestion().create(jobQuestions, function(e, r){});
      testSchema.JobType().create({id: 1, created_at: now, updated_at: now}, function(){});
      testSchema.Question().create({id: 2, text: "question 2", created_at: now, updated_at: now}, function(){});
      testSchema.Question().create({id: 3, text: "question 3", created_at: now, updated_at: now}, function(){});
      
      setTimeout(function() {
          testController.nextQuestion({job_question_id: 4, job_type_id: 1, user_id: 1}, "msg", 5, "Philz", function(question) {
            assert.deepEqual(question, ["Great, thank you for the interest in Philz and we will contact you when a position opens up."]);
            assert.isTrue(destroyStateCalled);
            assert.isTrue(answerQCalled);
            assert.isFalse(qTyperCalled);
            done();
          });
      }, 10)
    });
  });
  // 
  describe("#nextQuestion", function() {
    it("shoud return an error message if there is no question to ask and call destroyUserState", function(done) {
      var destroyStateCalled = false;
      testController.destroyUserState = function() { destroyStateCalled = true; };

      var qTyperCalled = false;
      testController.questionTyper = function(n) { qTyperCalled = true; };

      var now = new Date();
      var jobQuestions = [{id: 1, job_type_id: 1, question_id: 1, position: 1, created_at: now, updated_at: now}, {id: 2, job_type_id: 1, question_id: 2, position: 2, created_at: now, updated_at: now}, {id: 3, job_type_id: 1, question_id: 3, position: 3, created_at: now, updated_at: now}, {id: 4, job_type_id: 1, question_id: 4, position: 4, created_at: now, updated_at: now}];
      
      testSchema.JobQuestion().create(jobQuestions, function(e, r){});
      testSchema.JobType().create({id: 1, created_at: now, updated_at: now}, function(){});
  
  
      setTimeout(function() {
          testController.nextQuestion({job_question_id: 2, job_type_id: 1, user_id: 1}, "msg", 5, "Philz", function(question) {
            assert.deepEqual(question, [ 'Couldn\'t find a question to ask you. ¯\(°_o)/¯']);
            assert.isTrue(destroyStateCalled);
            assert.isFalse(qTyperCalled);
            done();
          });
      }, 10)
    });
  });
  
  describe("#firstQuestion", function() {
    it('should ask the first question and and call updateUserState and cal question typer', function(done) {
      var updateUserStateCalled = false;
      testController.updateUserState = function(n) {
        updateUserStateCalled = true;
      }
      
      var qTyperCalled = false;
      testController.questionTyper = function(n) { qTyperCalled = true; };
  
      var now = new Date();
      var jobQuestions = [{id: 1, job_type_id: 1, question_id: 1, position: 1, created_at: now, updated_at: now}, {id: 2, job_type_id: 1, question_id: 2, position: 2, created_at: now, updated_at: now}];
      testSchema.JobQuestion().create(jobQuestions, function(e, r){});
      testSchema.Question().create({id: 1, text: "question 1", created_at: now, updated_at: now}, function(){});
      testSchema.Question().create({id: 2, text: "question 2", created_at: now, updated_at: now}, function(){});
      
      setTimeout(function() {
        testController.firstQuestion({job_type_id: 1, user_id: 1}, 5, function(text) {
          assert.isTrue(updateUserStateCalled);
          assert.deepEqual(text, ['Q1/5: question 1']);
          done();
        });
      }, 15);
    });
  });

  describe("#firstQuestion", function() {
    it('should display an error message and call destroyUserState if there are no questions for a job', function(done) {
      var destroyCalled = false;
      var qTyperCalled = false;
      testController.questionTyper = function(n) { qTyperCalled = true; };
      testController.destroyUserState = function(n) {
        destroyCalled = true;
      }
  
      testController.firstQuestion({job_type_id: 1, user_id: 1}, 5, function(text) {
        assert.isTrue(destroyCalled);
        assert.isFalse(qTyperCalled);
        assert.deepEqual(text, ["There appear to be no questions for this job! O.O"]);
        done();
      })
    });
  });

  // tests for UserController#questionTyper
  describe("#questionTyper", function() {
    it("should build input arrays for both question types and do", function(done) {
      var inputArray = [];
      var expectedArray = ["Y/N?"];
      var question = {question_type: 1, answers: [{text: "1"}, {text: "2"}, {text: "3"}]}

      testController.questionTyper(question, inputArray);

      assert.deepEqual(inputArray, expectedArray);

      //question type 2
      inputArray = [];
      expectedArray = ["A for 1", "B for 2", "C for 3"]
      question.question_type = 2;

      testController.questionTyper(question, inputArray);
      assert.deepEqual(inputArray, expectedArray);

      done();
    });
  });

  // tests for UserController#updateUserState
  describe("#updateUserState", function() {
    it('should create a new user state if one doesnt exist for a user', function(done) {
      testController.getUser = function(n, callback) {
        callback({id: 1});
      };
      testController.updateUserState({user_id: 1});
      setTimeout(function () {
        testSchema.CurrentUserState().find({user_id: 1}, function(err, results) {
          assert.isNotNull(results[0]);
          assert.equal(results[0].user_id, 1);
          done();
        })
      }, 100)
    });
  });
  
  describe("#updateUserState", function() {
    it('should udate the current user state if one exists for a user', function(done) {
      testController.getUser = function(n, callback) {
        callback({id: 1});
      };
  
      testSchema.CurrentUserState().create({user_id: 1, location_id: 1}, function(err, results) {
        testController.updateUserState({user_id: 1, location_id: 2});
      });
  
      setTimeout(function () {
        testSchema.CurrentUserState().find({user_id: 1}, function(err, results) {
          assert.isNotNull(results[0]);
          assert.equal(results[0].user_id, 1);
          assert.equal(results[0].location_id, 2);
          done();
        })
      }, 25)
    });
  });
  
  // tests for UserController#updateUserStateFromNumber
  describe("#updateUserStateFromNumber", function() {
    it('should NOT create a new user state if one doesnt exist for a number', function(done) {
  
      testController.updateUserStateFromNumber(1, {});
      setTimeout(function () {
        testSchema.CurrentUserState().find({user_id: 1}, function(err, results) {
          assert.isNull(results[0]);
          done();
        })
      }, 100)
    });
  });
  
  describe("#updateUserStateFromNumber", function() {
    it('should udate the current user state if one exists for a number', function(done) {
      testSchema.User().create({id: 1, uid: 2, created_at: new Date(), updated_at: new Date()}, function(e,r){});
      testSchema.CurrentUserState().create({user_id: 1, location_id: 1}, function(err, results) {
        testController.updateUserStateFromNumber(2, {location_id: 2});
      });
  
      setTimeout(function () {
        testSchema.CurrentUserState().find({user_id: 1}, function(err, results) {
          assert.isNotNull(results[0]);
          assert.equal(results[0].user_id, 1);
          assert.equal(results[0].location_id, 2);
          done();
        })
      }, 25)
    });
  });
  // tests for UserController#destroyUserState
  describe("#destroyUserState", function() {
    it('should destroy the user state specificed by user_id', function(done) {
      var user_id = 1
      
      testSchema.CurrentUserState().create({user_id: user_id}, function(e, r) {
        assert.equal(r.rowCount, 1);
        testController.destroyUserState(user_id);
        setTimeout(function() {
          testSchema.CurrentUserState().find({user_id: user_id}, function(err, results){
            assert.isNull(results[0]);
            done();
          });
        }, 10)
      });
    });
  });
  
  // tests for UserController#logResponse
  describe("#logResponse", function() {
    it('should create a user response for an uid and a message', function(done) {
      var now = new Date();
      var ori = "uid"
      var msg = "msg"
  
      testSchema.UserResponse().create({origin: ori, message: msg, created_at: now, updated_at: now}, function(e, r) {
        assert.equal(r.rowCount, 1);
        testController.logResponse(ori, msg);
        setTimeout(function() {
          testSchema.UserResponse().find({origin: ori, message: msg}, function(err, results){
            assert.isNotNull(results[0]);
            assert.equal(results[0].origin, ori);
            assert.equal(results[0].message, msg);
            done();
          });
        }, 10)
      });
    });
  });
  
  // tests for UserController#getLocation
  describe("#getLocation", function() {
    it("should return the location specified by id", function(done) {
      var now = new Date();
      var location = {created_at: now, updated_at: now, employer_id: 0, name: "Test Location", street: "123", city: "Derp", state: "CA", zip: "94133", position: 1, location_jobs: []}
  
      testSchema.Location().create(location, function(err, loc) {
        testController.getLocation(loc.rows[0].id, function(myLoc) {
          location.id = loc.rows[0].id;
  
          assert.isNotNull(myLoc);
          assert.deepEqual(location, myLoc);
          testSchema.Location().destroy(myLoc, function(e,r) {
            done();
          });
        });
      });
    });
  });

  // 
  // sampleTest
  // describe("#handleText", function() {
  //   it('should do something', function(done) {
  //   });
  // });
  
  
  afterEach(function(done){
    testController.getUser = GetUser;
    testController.getLocation = GetLocation;
    testController.updateUserState = UpdateUserState;
    testController.nextQuestion = NextQuestion;
    testController.firstQuestion = FirstQuestion;
    testController.destroyUserState = DestroyUserState;
    testController.logResponse = LogResponse;
    testController.sendMessage = SendMessage;
    testController.questionTyper = QuestionTyper;
    done();
  });
});
// 
// exports['should display the greeting corresponding to the location messaged'] = function() {
// 
// };
// 
// exports['should show the jobs available for a location'] = function() {
//   
// }
// 

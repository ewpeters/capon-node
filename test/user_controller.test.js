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

  beforeEach(function(done) {
    testSchema.User().destroy({}, function(err, results) {
      testSchema.UserResponse().destroy({}, function(err, results) {
        testSchema.JobQuestion().destroy({}, function(err, results) {
          testSchema.JobType().destroy({}, function(err, results) {
            testSchema.Question().destroy({}, function(err, results) {
              testSchema.CurrentUserState().destroy({}, function(err, results) {
                done();
              });
            });
          });
        });
      });
    });
  });

  // tests for UserController#handleMessage
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
        done();
      });
    });
  });

  describe("#handleMessage", function() {
    it("should display the welcome message with jobs if the current user state is null and call sendMessage after callback", function(done) {
      // TODO: Read this from a config file
      var sendMessageCalled = false;
      var welcomeMessage = ['Welcome to Philz'];
      var uid = "555555555";
  
      testController.getUser = function(n, callback) {
        callback({current_user_state: null});
      };
      
      testController.sendMessage = function() {
        sendMessageCalled = true;
      };
  
      testController.getLocation = function(n, callback) {
        callback({name: "Philz", location_jobs: [{job_type: {name: "test job"}}]});
      };
  
      testController.handleMessage(uid, "", 1, function(message) {
        assert.deepEqual(welcomeMessage, message);
        assert.isFalse(sendMessageCalled);
      });
      
      setTimeout(function() {
        assert.isTrue(sendMessageCalled);
        done();
      }, 20);
    });
  });
  describe("#handleMessage", function() {
    it("should display the welcome message if the user is in a different location and call sendMessage after callback", function(done) {
      // TODO: Read this from a config file
      var sendMessageCalled = false;
      var welcomeMessage = ['Welcome to Philz'];
      var uid = "555555555";
  
      testController.getUser = function(n, callback) {
        callback({current_user_state: {location_id: 2}});
      };
      
      testController.getLocation = function(n, callback) {
        callback({name: "Philz", location_jobs: [{job_type: {name: "test job"}}]});
      };
      
      testController.sendMessage = function() {
        sendMessageCalled = true;
      };
  
      testController.handleMessage(uid, "", 1, function(message) {
        assert.deepEqual(welcomeMessage, message);
        assert.isFalse(sendMessageCalled);
        
      });
      
      setTimeout(function() {
        assert.isTrue(sendMessageCalled);
        done();
      }, 20);
    });
  });
  
  describe("#handleMessage", function() {
    it("should call nextQuestion if the current user state exists and is set to the current location", function(done) {

      testController.getUser = function(n, callback) {
        callback({current_user_state: {location_id: 1, job_question_id: 1}});
      };

      testController.getLocation = function(n, callback) {
        callback({id: 1});
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
        assert.deepEqual(message, ["Sorry, we couldn't quite make that out", "0 for test job"]);
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
    it("shoud get the next question given a current_user_state in the middle of a question list and call updateUserState", function(done) {
      var userStateCalled = false;
      testController.updateUserState = function() { userStateCalled = true; };
      var now = new Date();
      var jobQuestions = [{id: 1, job_type_id: 1, question_id: 1, position: 1, created_at: now, updated_at: now}, {id: 2, job_type_id: 1, question_id: 2, position: 2, created_at: now, updated_at: now}, {id: 3, job_type_id: 1, question_id: 3, position: 3, created_at: now, updated_at: now}, {id: 4, job_type_id: 1, question_id: 4, position: 4, created_at: now, updated_at: now}];
      
      testSchema.JobQuestion().create(jobQuestions, function(e, r){});
      testSchema.JobType().create({id: 1, created_at: now, updated_at: now}, function(){});
      testSchema.Question().create({id: 2, text: "question 2", created_at: now, updated_at: now}, function(){});
      testSchema.Question().create({id: 3, text: "question 3", created_at: now, updated_at: now}, function(){});
      
      setTimeout(function() {
        testController.nextQuestion({job_question_id: 2, job_type_id: 1, user_id: 1}, function(question) {
          assert.deepEqual(question, ['Q3: question 3', 'Y/N?']);
          assert.isTrue(userStateCalled);
          done();
        });
      }, 10)
    });
  });

  describe("#nextQuestion", function() {
    it("shoud return goodbye message and call destroyUserState if at the end of the job's questions", function(done) {
      var destroyStateCalled = false;
      testController.destroyUserState = function() { destroyStateCalled = true; };
      var now = new Date();
      var jobQuestions = [{id: 1, job_type_id: 1, question_id: 1, position: 1, created_at: now, updated_at: now}, {id: 2, job_type_id: 1, question_id: 2, position: 2, created_at: now, updated_at: now}, {id: 3, job_type_id: 1, question_id: 3, position: 3, created_at: now, updated_at: now}, {id: 4, job_type_id: 1, question_id: 4, position: 4, created_at: now, updated_at: now}];
      
      testSchema.JobQuestion().create(jobQuestions, function(e, r){});
      testSchema.JobType().create({id: 1, created_at: now, updated_at: now}, function(){});
      testSchema.Question().create({id: 2, text: "question 2", created_at: now, updated_at: now}, function(){});
      testSchema.Question().create({id: 3, text: "question 3", created_at: now, updated_at: now}, function(){});

      setTimeout(function() {
          testController.nextQuestion({job_question_id: 4, job_type_id: 1, user_id: 1}, function(question) {
            assert.deepEqual(question, ["Great, thank you for the interest. We will contact you when a position opens up."]);
            assert.isTrue(destroyStateCalled);
            done();
          });
      }, 10)
    });
  });
  
  describe("#nextQuestion", function() {
    it("shoud return an error message if there is no question to ask and call destroyUserState", function(done) {
      var destroyStateCalled = false;
      testController.destroyUserState = function() { destroyStateCalled = true; };
      var now = new Date();
      var jobQuestions = [{id: 1, job_type_id: 1, question_id: 1, position: 1, created_at: now, updated_at: now}, {id: 2, job_type_id: 1, question_id: 2, position: 2, created_at: now, updated_at: now}, {id: 3, job_type_id: 1, question_id: 3, position: 3, created_at: now, updated_at: now}, {id: 4, job_type_id: 1, question_id: 4, position: 4, created_at: now, updated_at: now}];
      
      testSchema.JobQuestion().create(jobQuestions, function(e, r){});
      testSchema.JobType().create({id: 1, created_at: now, updated_at: now}, function(){});


      setTimeout(function() {
          testController.nextQuestion({job_question_id: 2, job_type_id: 1, user_id: 1}, function(question) {
            assert.deepEqual(question, [ 'Couldn\'t find a question to ask you. ¯\(°_o)/¯']);
            assert.isTrue(destroyStateCalled);
            done();
          });
      }, 10)
    });
  });
  
  describe("#firstQuestion", function() {
    it('should ask the first question and and call updateUserState', function(done) {
      var updateUserStateCalled = false;
      testController.updateUserState = function(n) {
        updateUserStateCalled = true;
      }

      var now = new Date();
      var jobQuestions = [{id: 1, job_type_id: 1, question_id: 1, position: 1, created_at: now, updated_at: now}, {id: 2, job_type_id: 1, question_id: 2, position: 2, created_at: now, updated_at: now}];
      testSchema.JobQuestion().create(jobQuestions, function(e, r){});
      testSchema.Question().create({id: 1, text: "question 1", created_at: now, updated_at: now}, function(){});
      testSchema.Question().create({id: 2, text: "question 2", created_at: now, updated_at: now}, function(){});
      
      testController.firstQuestion({job_type_id: 1, user_id: 1}, function(text) {
        assert.isTrue(updateUserStateCalled);
        assert.deepEqual(text, ['Q1: question 1', 'Y/N?']);
        done();
      })
    });
  });

  describe("#firstQuestion", function() {
    it('should display an error message and call destroyUserState if there are no questions for a job', function(done) {
      var destroyCalled = false;
      testController.destroyUserState = function(n) {
        destroyCalled = true;
      }

      testController.firstQuestion({job_type_id: 1, user_id: 1}, function(text) {
        assert.isTrue(destroyCalled);
        assert.deepEqual(text, ["There appear to be no questions for this job! O.O"]);
        done();
      })
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

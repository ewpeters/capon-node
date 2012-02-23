var assert = require('chai').assert;

describe('UserController', function(){
  var UserController = require('../lib/user_controller');
  var Schema = require('../lib/schema');
  var uid = "555555555"; 
  var testSchema = new Schema({
    database: "capon_test",
    user: "capon",
    password: "capon",
    host: "localhost"
  });
  var testController = new UserController(testSchema, {});
  // methods I mock at some point
  var GetUser     = testController.getUser;
  var GetLocation = testController.getLocation;
  var UpdateUserState = testController.updateUserState;

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

  describe("#getUser", function() {
    it('should create a new user for a uid not seen before', function(done) {
      testController.getUser(uid, function() {
        testSchema.User().find({ 'uid': uid }, function(err, results) {
          assert.isNotNull(results[0]);
          done();
        });
      });
    });
  });

  describe("#handleMessage", function() {
    it("should create a valid user response row every time a text is recieved", function(done) {
      var message = "Hello!";
      testController.getUser = function(n, callback) {
        callback({current_user_state: {user_id: 1}});
      };
  
      testController.getLocation = function(n, callback) {
        callback({});
      };
      
      testController.updateUserState = function() {
        
      };

      testController.handleMessage(uid, message, 1, function() {
        setTimeout(function() {
          testSchema.UserResponse().find({origin: uid, message: message}, function(err, results) {
            assert.isNotNull(results[0]);
            assert.equal(results[0].message, message);
            assert.equal(results[0].origin, uid);
            done();
          });
        }, 10)
      });
    });
  });

  describe("#handleMessage", function() {
    it("should display the welcome message if the current user state is null", function(done) {
      // TODO: Read this from a config file
      var welcomeMessage = "Welcome to Philz";
  
      testController.getUser = function(n, callback) {
        callback({current_user_state: null});
      };
      
      testController.updateUserState = function() {
        
      };

      testController.getLocation = function(n, callback) {
        callback({name: "Philz"});
      };

      testController.handleMessage(uid, "", 1, function(message) {
        assert.equal(welcomeMessage, message);
        done();
      });
    });
  });

  describe("#handleMessage", function() {
    it("should display the welcome message if the user is in a different location", function(done) {
      // TODO: Read this from a config file
      var welcomeMessage = "Welcome to Philz";
  
      testController.getUser = function(n, callback) {
        callback({current_user_state: {location_id: 2}});
      };
      
      testController.getLocation = function(n, callback) {
        callback({name: "Philz", id: 1});
      };
      
      testController.updateUserState = function() {
        
      };

      testController.handleMessage(uid, "", 1, function(message) {
        assert.equal(welcomeMessage, message);
        done();
      });
    });
  });
  
  describe("#getLocation", function() {
    it("should return the location specified by id", function(done) {
      var now = new Date();
      var location = {created_at: now, updated_at: now, employer_id: 0, name: "Test Location", street: "123", city: "Derp", state: "CA", zip: "94133", position: 1}

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
  
  
  describe("#nextQuestion", function() {
    it("shoud get the next question given a current_user_state in the middle of a question list and update user state", function(done) {
      var now = new Date();
      var jobQuestions = [{id: 1, job_type_id: 1, question_id: 1, position: 1, created_at: now, updated_at: now}, {id: 2, job_type_id: 1, question_id: 2, position: 2, created_at: now, updated_at: now}, {id: 3, job_type_id: 1, question_id: 3, position: 3, created_at: now, updated_at: now}, {id: 4, job_type_id: 1, question_id: 4, position: 4, created_at: now, updated_at: now}];
      
      testSchema.JobQuestion().create(jobQuestions, function(e, r){});
      testSchema.JobType().create({id: 1, created_at: now, updated_at: now}, function(){});
      testSchema.Question().create({id: 2, text: "question 2", created_at: now, updated_at: now}, function(){});
      testSchema.Question().create({id: 3, text: "question 3", created_at: now, updated_at: now}, function(){});
      testSchema.CurrentUserState().create({job_question_id: 2, job_type_id: 1, user_id: 1}, function() {});
      
      
      setTimeout(function() {testController.nextQuestion({job_question_id: 2, job_type_id: 1, user_id: 1}, function(question) {
          assert.equal(question, "question 3");
          setTimeout(function() {
            testSchema.CurrentUserState().find({user_id: 1}, function(err, results) {
              assert.isNotNull(results[0]);
              assert.equal(results[0].job_question_id, 3);
              assert.equal(results[0].job_type_id, 1);
              assert.equal(results[0].user_id, 1);
              assert.isNotNull(results[0].last_message_recieved_at);
              done();
            });
          }, 10);
        });
      }, 10)
    });
  });

  
  
  describe("#firstQuestion", function() {
    it('should ask the first question and update the user state', function(done) {
      var now = new Date();
      var jobQuestions = [{id: 1, job_type_id: 1, question_id: 1, position: 1, created_at: now, updated_at: now}, {id: 2, job_type_id: 1, question_id: 2, position: 2, created_at: now, updated_at: now}];
      testSchema.JobQuestion().create(jobQuestions, function(e, r){});
      testSchema.Question().create({id: 1, text: "question 1", created_at: now, updated_at: now}, function(){});
      testSchema.Question().create({id: 2, text: "question 2", created_at: now, updated_at: now}, function(){});
      
      testController.firstQuestion({job_type_id: 1}, function(text) {
        assert.equal(text, "question 1");
        done();
      })
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

var assert = require('chai').assert;

describe('UserController', function(){
  var UserController = require('../lib/user_controller');
  var Schema = require('../lib/schema');
  var number = "555555555"; 
  var testSchema = new Schema({
    database: "capon_test",
    user: "capon",
    host: "localhost"
  });
  var testController = new UserController(testSchema, {});

  describe("#getUser", function() {
    it('should create a new user for a number not seen before', function(done) {
      testController.getUser(number, function() {
        testSchema.User().find({ 'number': number }, function(err, results) {
          assert.isNotNull(results[0]);
          done();
        });
      });
    });
  });

  describe("#handleText", function() {
    it("should create a valid user response row every time a text is recieved", function(done) {
      var message = "Hello!";
      testController.handleText(number, message, function() {
        setTimeout(function() {
          testSchema.UserResponse().find({origin_number: number, message: message}, function(err, results) {
            assert.isNotNull(results[0]);
            assert.equal(results[0].message, message);
            assert.equal(results[0].origin_number, number);
            done();
          });
        }, 1)
      });
    });
  });
  
  describe("#getLocation", function() {
    it("should return the location specified by id", function(done) {
      this.timeout(2000);
      var now = new Date()
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

  // sampleTest
  // describe("#handleText", function() {
  //   it('should do something', function(done) {
  //   });
  // });
  afterEach(function(done){
    testSchema.User().destroy({}, function(err, results) {
      testSchema.UserResponse().destroy({}, function(err, results) {
        done();
      });
    });
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

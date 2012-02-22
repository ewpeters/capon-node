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

UserController.prototype.logResponse = function(number, message) {
  var self = this;
  var now = new Date();
  self.schema.UserResponse().create({
       origin_number: number
     , destination_number: null
     , message: message
     , created_at: now
     , updated_at: now
  }, function(e,r){});
};

UserController.prototype.handleText = function(number, message, callback) {
  var self = this;
  
  self.logResponse(number, message);
  callback();
};

UserController.prototype.getUser = function(number, callback) {
  var self = this;

  self.schema.User().find({'number': number}, function(err, results) {
    if (results[0]) {
      callback(results[0]);
    } else {
      var now = new Date()
      self.schema.User().create({'number': number, 'created_at': now, 'updated_at':now}, function(err, user) {
        callback(user);
      })
    }
  });
};

// maybe put this in a location file?
UserController.prototype.getLocation = function(id, callback) {
  var self = this;

  self.schema.Location().find({id: id}, function(err, results) {
    callback(results[0]);
  });
};


module.exports = UserController;


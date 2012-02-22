var FastLegS = require('FastLegS');

function Schema(options) {
  if (! (this instanceof arguments.callee)) {
    return new arguments.callee(arguments);
  }
  var self = this;

  self.settings = {
      user: options.user
    , database: options.database
    , host: options.host
  }
  self.init();
}

Schema.prototype.init = function() {
  var self = this;

  var connectionParams = {
    user: self.settings.user
  , database: self.settings.database
  , host: self.settings.host
  , port: 5432
  };
  FastLegS.connect(connectionParams);
    
};

Schema.prototype.User = function() {
  return FastLegS.Base.extend({
    tableName: 'users',
    primaryKey: 'id'
  });
};

Schema.prototype.UserResponse = function() {
  return FastLegS.Base.extend({
    tableName: 'user_responses',
    primaryKey: 'id'
  });
};

Schema.prototype.Location = function() {
  return FastLegS.Base.extend({
    tableName: 'locations',
    primaryKey: 'id'
  });
};

module.exports = Schema;

var FastLegS = require('FastLegS');

function Schema(options) {
  if (! (this instanceof arguments.callee)) {
    return new arguments.callee(arguments);
  }
  var self = this;

  self.settings = {
      user: options.user
    , database: options.database
    , host: options.host,
      password: options.password
  }
  self.init();
}

Schema.prototype.init = function() {
  var self = this;

  var connectionParams = {
    user: self.settings.user
  , password: self.settings.password
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


Schema.prototype.JobType = function() {
  return FastLegS.Base.extend({
    tableName: 'job_types',
    primaryKey: 'id'
  });
};

Schema.prototype.Question = function() {
  return FastLegS.Base.extend({
    tableName: 'questions',
    primaryKey: 'id'
  });
};

Schema.prototype.JobQuestion = function() {
  var self = this;
  return FastLegS.Base.extend({
    tableName: 'job_questions',
    primaryKey: 'id',
    one: [
            { 'question': self.Question(), joinOn: 'question_id' }
          ]
  });
};


Schema.prototype.CurrentUserState = function() {
  return FastLegS.Base.extend({
    tableName: 'current_user_states',
    primaryKey: 'id'
  });
};

module.exports = Schema;

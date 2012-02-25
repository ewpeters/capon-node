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
Schema.prototype.CurrentUserState = function() {
  return FastLegS.Base.extend({
    tableName: 'current_user_states',
    primaryKey: 'id'
  });
};

Schema.prototype.User = function() {
  var self = this;
  return FastLegS.Base.extend({
    tableName: 'users',
    primaryKey: 'id',
    one: [
      {'current_user_state': self.CurrentUserState(), joinOn: 'user_id'}
    ]
  });
};

Schema.prototype.UserResponse = function() {
  return FastLegS.Base.extend({
    tableName: 'user_responses',
    primaryKey: 'id'
  });
};

Schema.prototype.JobType = function() {
  return FastLegS.Base.extend({
    tableName: 'job_types',
    primaryKey: 'id'
  });
};

Schema.prototype.LocationJob = function() {
  var self = this;
  return FastLegS.Base.extend({
    tableName: 'location_jobs',
    primaryKey: 'id',
      one: [
        {'job_type': self.JobType(), joinOn: 'job_type_id'}
      ]
  });  
};

Schema.prototype.Location = function() {
  var self = this;
  return FastLegS.Base.extend({
    tableName: 'locations',
    primaryKey: 'id',
    many: [
      {'location_jobs': self.LocationJob(), joinOn: 'location_id'}
    ]
  });
};


Schema.prototype.Answer = function() {
  return FastLegS.Base.extend({
    tableName: 'answers',
    primaryKey: 'id'
  });
};

Schema.prototype.UserAnswer = function() {
  return FastLegS.Base.extend({
    tableName: 'user_answers',
    primaryKey: 'id'
  });
};

Schema.prototype.Question = function() {
  var self = this;
  return FastLegS.Base.extend({
    tableName: 'questions',
    primaryKey: 'id',
    many: [
      {'answers': self.Answer(), joinOn: 'question_id'}
    ]
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




module.exports = Schema;

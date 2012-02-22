process.addListener('uncaughtException', function (err, stack) {
  console.log('------------------------');
  console.log('Exception: ' + err);
  console.log(err.stack);
  console.log('------------------------');
});

var Schema = require('./lib/schema');

var testSchema = new Schema({
  database: "capon_test",
  user: "capon",
  host: "localhost"
});


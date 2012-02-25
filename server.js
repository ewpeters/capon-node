var http = require("http");
var querystring = require('querystring');
process.addListener('uncaughtException', function (err, stack) {
  console.log('------------------------');
  console.log('Exception: ' + err);
  console.log(err.stack);
  console.log('------------------------');
});
var UserController = require('./lib/user_controller');
var Schema = require('./lib/schema');

var mySchema = new Schema({
  database: "capon_development",
  user: "capon",
  host: "localhost"
});
var userController = new UserController(mySchema, {});

function onRequest(request, response) {
  response.writeHead(200, {"Content-Type": "text/html"});
  // response.write("<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n");
  var data = '';
  request.on('data', function (chunk) {
    data += chunk;
  });
  
  request.on('end', function() {
    var dataHash = querystring.parse(data);

    
    if (dataHash.SmsStatus == 'sent') {
      console.log("got sent")
      userController.updateUserStateFromNumber(dataHash.To, {location_id: 1});
    } else {
      console.log("From: " + dataHash.From + " Body: " + dataHash.Body);
      userController.handleMessage(dataHash.From, dataHash.Body, 1, function(message) {
        response.write( "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n");
        response.write("<Response>");

        response.write("<Sms>");
        for (var i in message) {
          var line = message[i];
          response.write(line);
          response.write("\n");
        }
        response.write("</Sms>");
        response.write("</Response>");
        response.end();
      });
    };
  });
};

http.createServer(onRequest).listen(80);

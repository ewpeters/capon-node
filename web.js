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

// gvughgqdyu:_Dfxp2ZjjBtcmxI4mhVD@ec2-50-16-197-136.compute-1.amazonaws.com/gvughgqdy
var mySchema = new Schema(process.env.DATABASE_URL);
var userController = new UserController(mySchema, {});

function onRequest(request, response) {
  response.writeHead(200, {"Content-Type": "text/html"});
    
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

var port = process.env.PORT || 80
http.createServer(onRequest).listen(port);

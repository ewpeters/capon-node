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

var mySchema;
if (process.env.NODE_ENV == "production") {
  mySchema = new Schema(process.env.DATABASE_URL); 
} else {  
  mySchema = new Schema("tcp://localhost:5432/capon_test");
}

var userController = new UserController(mySchema, {});

function onRequest(request, response) {
  var matchLoc = request.url.match(/^\/(\d+)$/);
  var locationId;
  if (matchLoc) {
    locationId = matchLoc[1];
  } else {
    response.writeHead(200, {"Content-Type": "text/html"});
    response.write("Invalid URL");
    response.end();
    return
  }

  var data = [];
    request.on('data', function (chunk) {
      data.push(chunk);
      if (data.length > 1e6) {
        // FLOOD ATTACK OR FAULTY CLIENT, NUKE REQUEST
        response.writeHead(200, {"Content-Type": "text/html"});
        response.write("Stop spamming!");
        request.end();
      }
    });
    
    request.on('end', function() {
      var dataHash = querystring.parse(data.join(''));
    
      console.log("Got Request")
      console.log(request.url)
      console.log(dataHash);
      if (dataHash.SmsStatus == 'sent') {
        console.log("got sent")
        userController.updateUserStateFromNumber(dataHash.To, {location_id: locationId});
        response.end();
      } else {
        console.log("From: " + dataHash.From + " Body: " + dataHash.Body);
        userController.handleMessage(dataHash.From, dataHash.Body, locationId, function(message) {
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

var TwilioClient = require('twilio').Client,
      Twiml = require('twilio').Twiml,
      sys = require('sys');

exports['should test twilio'] = function() {
    var client = new TwilioClient('ACb1926ecd3ad84048adf8a66d391a4c0b', 'ee3bf85c87c17e9d8401748153f3b5b5', 'http://demo.twilio.com/', {sandbox: true});
    var phone = client.getPhoneNumber("+15302589161")
    
    phone.setup(function() {
        phone.makeCall('+14155992671', null, function(call) {
            call.on('answered', function(callParams, response) {
                response.append(new Twiml.Say('2766-3109 Howdy mom and or dad! I hope you are well! I know you know your son loves you!'));
                response.send();
            });
        });
    });
};

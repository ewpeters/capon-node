var originals = [];
var stubs     = [];


module.exports.stubFunction = function(original, stub) {
  originals << original;
  stubs << stub;
  console.log(original == stub)
  original = stub;
  console.log(original == stub)
}

module.exports.unStub = function() {
  for (var i in stubs) {
    stubs[i] = originals[i];
  }
  originals = [];
  stubs     = [];
}

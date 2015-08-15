;(function(global){
  console.log("--- simple function tests -----------------------------");
  function error(message) {
    console.log("ERROR: " + message);
  }
  function info(message) {
    console.log("INFO: " + message);
  }
  function log(message) {
    console.log("LOG: " + message);
  }
  error("AARRGGGHH");
  info("Did you know!");
  log("This is cool");
  console.log("--- function call expression ordering -----------------------------");
  function literal_then_message(message) {
    console.log("TEST: " + message);
  }
  literal_then_message("test");
  function message_then_literal(message) {
    console.log(message + " < was the message");
  }
  message_then_literal("test");
}(this));
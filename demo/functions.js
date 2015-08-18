;(function(global){
  console.log("--- Simple Tests -----------------------------");
  function error(message) {
    console.log("ERROR: " + message);
  }
  function info(message) {
    console.log("INFO: " + message);
  }
  function log(message) {
    console.log("LOG: " + message);
  }
  function anotherError(m1, m2, m3) {
    console.log("another error: " + m1 + ", " + m2 + ", " + m3);
  }
  error("AARRGGGHH");
  info("Did you know!");
  log("This is cool");
  anotherError("one" , "two" , "three");
  console.log("--- Return Types -----------------------------");
  function test() {
    function test_internal() {
      console.log("Hello World from test()>test_internal()");
    }
    test_internal();
  }
  test();
  console.log("--- Multiple Arguments -----------------------------");
  function where_in(the, world) {
    console.log(world + " " + the);
  }
  where_in(false , "Is code the world? ");
  console.log("--- Argument Type Checking -----------------------------");
  error("error(string)");
  error(1);
  error(10.10);
  error(false);
  error(true);
  function only_takes_string(message) {
    console.log(message);
  }
  only_takes_string("cool");
  function some_numbers(an_int, a_float) {
    console.log("an_int: " + an_int + ", a_float: " + a_float);
  }
  some_numbers(1 , 1.01);
  some_numbers(100 , 124.1241);
  console.log("--- Function call expression ordering -----------------------------");
  function literal_then_message(message) {
    console.log("TEST: " + message);
  }
  literal_then_message("test");
  function message_then_literal(message) {
    console.log(message + " < was the message");
  }
  message_then_literal("test");
  console.log("--- Invalid Declarations -----------------------------");
}(this));
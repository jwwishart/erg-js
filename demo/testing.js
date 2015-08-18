;(function(global){
  var name = "Justin Wishart";
  var age = 35;

// RAW ASM OUTPUT START (javascript -------------------------

console.log("welcome to the house of asm");

// RAW ASM OUTPUT END (javascript) --------------------------

  function print_message(name, age) {
    console.log("Hello, my name is '" + name + "' and I'm " + age + " years of age");
  }
  function print_message2(n, a) {
    console.log("Hello, my name is '" + n + "' and I'm " + a + " years of age");
  }
  function print_message_closed() {
    console.log("Hello, my name is '" + name + "' and I'm " + age + " years of age");
  }
  print_message(name , age);
  print_message2(name , age);
  print_message_closed();
  name = "WHAT";
  age = 1;
  print_message(name , age);
  function woo_hoo(message) {

// RAW ASM OUTPUT START (javascript -------------------------

console.log(message.toUpperCase());

// RAW ASM OUTPUT END (javascript) --------------------------

  }
  woo_hoo("This is the asm... to remember!");
}(this));
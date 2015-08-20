;(function(global){
  try {
  console.log("\nThe start of defer.erg\n");
  function something() {
    console.log("something() start ---------");
    console.log("one");
    console.log("two");
    console.log("three");
    console.log("something() end   ---------");
  }
  function something_with_mixed_calls() {
    try {
    console.log("something_with_mixed_calls() start ---------");
    console.log("two");
    console.log("something_with_mixed_calls() end ---------");
    } finally {
        console.log("three");
        console.log("one");
    }
  }
  function something_with_defer() {
    try {
    console.log("something_with_defer() start ---------");
    console.log("something_with_defer() end   ---------");
    } finally {
        console.log("three");
        console.log("two");
        console.log("one");
    }
  }
  something();
  console.log("\n");
  something_with_mixed_calls();
  console.log("\n");
  something_with_defer();
  console.log("\n");
  } finally {
    console.log("The end of defer.erg");
  }
}(this));
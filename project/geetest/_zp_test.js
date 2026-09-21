const w = 2;
function f() {
  switch (1) {
    case 1:
      var a = 10;
      break;
    case 2:
      var a = 20;
      break;
  }
  switch (w) {
    case 1:
      console.log('one');
      break;
    case 2:
      console.log('two');
      break;
    default:
      console.log('dflt');
  }
  var z = 9;
  switch (z) {
    case 9:
      console.log('nine');
      break;
  }
  var dyn = g();
  switch (dyn) {
    case 1:
      console.log('d1');
      break;
  }
}

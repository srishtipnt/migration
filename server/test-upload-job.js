
function greet(name) {
  console.log("Hello, " + name + "!");
}

const user = "World";
greet(user);

class Calculator {
  add(a, b) {
    return a + b;
  }
  
  subtract(a, b) {
    return a - b;
  }
}

export { greet, Calculator };

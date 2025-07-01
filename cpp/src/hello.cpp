#include "shared.hpp"  
#include <emscripten/bind.h>  
#include <iostream>  
#include <string>  
  
using namespace emscripten;  
  
class HelloWorld {  
public:  
    static std::string sayHello() {  
        return "Hello, World from C++!";  
    }  
      
    static std::string greet(const std::string& name) {  
        return "Hello, " + name + " from C++!";  
    }  
};  
  
EMSCRIPTEN_BINDINGS(HelloWorld) {  
    class_<HelloWorld>("HelloWorld")  
        .class_function("sayHello", &HelloWorld::sayHello)  
        .class_function("greet", &HelloWorld::greet);  
}
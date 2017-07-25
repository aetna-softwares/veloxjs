# veloxjs
VeloxJS

This is an experimentation to create JS dev tools that help to :
* Reuse as much code as possible between platforms : web, desktop, mobile
* Use as much well-known technology as possible (no new UI XML markup language, fancy transpiling step...)
* respect the following MVC concepts : 
  * the controller knows the view but the view never knows the controller. The view emit event and the controller listen to those events
  * views must respect interfaces and created through factory as we should get platform specific implementation
  * models are only data structure
* no magic big brother watching data store and decide to do action by itself. The views provide data binding system but render and parsing are called explicitely

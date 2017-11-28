'use strict'

angular.module('spBlogger',['ui.router','spBlogger.controllers','spBlogger.directives','spBlogger.filters','spBlogger.services']);

angular.module('spBlogger').config(['$httpProvider','$locationProvider',function($httpProvider,$locationProvider){
    
  



    	$locationProvider.html5Mode(true);


}]);


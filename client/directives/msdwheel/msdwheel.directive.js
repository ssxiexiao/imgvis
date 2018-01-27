'use strict';

import angular from 'angular';
import * as d3 from 'd3';

export default angular.module('directive.msdwheel', [])
  .directive('msdWheel', [ '$parse', function($parse) {
    return {
      restrict: 'A',
      link: function(scope, element, attrs) {
        var expr = $parse(attrs['msdWheel']),
            fn = function(event, deltaX, deltaY){
              expr(scope, {
                $event: event,
                $deltaX: deltaX,
                $deltaY: deltaY
              });
            };
        let domEle = element[0];
        domEle.addEventListener('wheel', function(e) {
          // console.log(e);
          // console.log('wheel');
          fn(e, e.deltaX, e.deltaY);
        }, false);
      }
    };
  }])
  .name;
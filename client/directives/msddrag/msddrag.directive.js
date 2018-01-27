'use strict';

import angular from 'angular';
import * as d3 from 'd3';

export default angular.module('directive.msddrag', [])
  .directive('msdDrag', [ '$parse', function($parse) {
    return {
      restrict: 'A',
      link: function(scope, element, attrs) {
        var expr = $parse(attrs['msdDrag']),
            fn = function(event, X, Y){
              expr(scope, {
                $event: event,
                $X: X,
                $Y: Y
              });
            };
        let domEle = element[0];
        let mousedown = false, p, pre;

        domEle.addEventListener('mousedown', function(e) {
          e.preventDefault();
          p = [ e.clientX, e.clientY ];
          pre = p;
          mousedown = true;
        }, false);
        domEle.addEventListener('mouseup', function(e) {
          e.preventDefault();
          mousedown = false;
          p = undefined;
          pre = undefined;
        }, false);
        document.addEventListener('mousemove', function(e) {
          e.preventDefault();
          if (mousedown) {
            let pp = [ e.clientX, e.clientY ],
              X = pp[0] - pre[0], Y = pp[1] - pre[1];
            fn(e, X, Y);
            pre = pp;
          }
        }, false);
      }
    };
  }])
  .name;
'use strict';

import angular from 'angular';
import * as d3 from 'd3';

export default angular.module('directive.drawing', [])
  .directive('drawing', [ 'event', '$timeout', function(event, $timeout) {
    return {
      restrict: 'A',
      link: function(scope, element, attrs) {
        let canvas = element[0];
        // console.log(scope);
        d3.select(canvas).attr('width', canvas.clientWidth)
          .attr('height', canvas.clientHeight);
        let ctx = canvas.getContext('2d');
        scope.$watch(() => scope.$ctrl.shadowCanvas, function() {
          if (!scope.$ctrl.shadowCanvas) return;
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(scope.$ctrl.shadowCanvas, 0, 0);
        });
      }
    };
  }])
  .name;
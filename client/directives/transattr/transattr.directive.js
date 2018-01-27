'use strict';

import angular from 'angular';
import * as d3 from 'd3';

export default angular.module('directive.transattr', [])
  .directive('transAttr', [ '$parse', function($parse) {
    return {
      restrict: 'A',
      link: function(scope, element, attrs) {
        let domEle = element[0];
        let d3sel = d3.select(domEle);
        scope.$watchCollection(attrs.transAttr, function (newAttrs) {
          newAttrs = d3.entries(newAttrs);
          console.log(newAttrs);
          var trans = d3sel.transition().duration(1000);
          newAttrs.forEach(function (attr) {
            trans.attr(attr.key, attr.value);
          });
        });
      }
    };
  }])
  .name;
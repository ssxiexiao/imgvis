'use strict';

import angular from 'angular';

/**
 * Removes server error when user updates input
 */
angular.module('semanticImageVisApp')
  .directive('mongooseError', function() {
    return {
      restrict: 'A',
      require: 'ngModel',
      link(scope, element, attrs, ngModel) {
        console.log('aaaaaa');
        element.on('keydown', () => ngModel.$setValidity('mongoose', true));
      }
    };
  });

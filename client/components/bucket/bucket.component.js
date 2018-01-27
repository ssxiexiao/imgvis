'use strict';
/* eslint no-sync: 0 */

import angular from 'angular';
import * as d3 from 'd3';

export class BucketComponent {

  /*@ngInject*/
  constructor(event, $scope, $timeout) {
    this.event = event;
  }

  $onInit() {

  }

  $onChanges(obj) {
    if (obj.ngModel.isFirstChange()) return;
  }

}

export default angular.module('directives.bucket', [])
  .component('bucket', {
    template: require('./bucket.html'),
    controller: BucketComponent,
    bindings: {
      ngModel: '<'
    }
  })
  .name;

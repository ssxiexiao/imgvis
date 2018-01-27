'use strict';
/* eslint no-sync: 0 */

import angular from 'angular';
import * as d3 from 'd3';

export class LeftpanelComponent {

  base = "http://10.76.2.57:8000/";
  dashboardvisible = 0;
  text = '';

  /*@ngInject*/
  constructor(event, $scope, $timeout) {
    this.event = event;
  }

  $onInit() {

  }

  $onChanges(obj) {
    if (obj.ngModel) {
      this.keywords = this.ngModel.keywords;
      this.keyimages = this.ngModel.keyimages;
    }
  }

  locateWord() {
    let word = this.text.toLowerCase();
    this.onLocate({word});
  }

  deleteQuery(index, type) {
    this.onDelete({ index, type });
  }

  switchAction(index, type) {
    this.onSwitch({ index, type });
  }

}

export default angular.module('directives.leftpanel', [])
  .component('leftpanel', {
    template: require('./leftpanel.html'),
    controller: LeftpanelComponent,
    bindings: {
      ngModel: '<',
      onDelete: '&',
      onSwitch: '&',
      onLocate: '&',
      onQuery: '&'
    }
  })
  .name;

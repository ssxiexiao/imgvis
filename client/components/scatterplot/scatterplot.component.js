'use strict';
/* eslint no-sync: 0 */

import angular from 'angular';
import * as d3 from 'd3';
import scaleTransform from '../../util/scaletransform';

function getScatterplot(data) {
  let container = document.getElementsByClassName('vis')[0];
  let shadowCanvas = document.createElement('canvas');
  let width = Number(container.clientWidth),
    height = Number(container.clientHeight);
  shadowCanvas.width = width;
  shadowCanvas.height = height;
  // console.log(shadowCanvas.width, shadowCanvas.height);
  let shadowCtx = shadowCanvas.getContext('2d');
  let scale = scaleTransform.ScaleData(data, width, height),
    xscale = scale[0], yscale = scale[1];
  shadowCtx.fillStyle = 'rgba(50, 90, 230, 0.25)';
  for (let t of data.image) {
    let x = Math.round(xscale(t.solution[0])),
      y = Math.round(yscale(t.solution[1]));
    let r = 3;
    shadowCtx.beginPath();
    shadowCtx.arc(x, y, r, 0, 2 * Math.PI, true);
    shadowCtx.fill();
  }
  return shadowCanvas.toDataURL();
}

export class ScatterplotComponent {

  /*@ngInject*/
  constructor(event, $scope, $timeout) {
    this.event = event;
  }

  $onInit() {

  }

  $onChanges(obj) {
    if (obj.ngModel.isFirstChange()) return;
    this.url = getScatterplot(this.ngModel);
  }

}

export default angular.module('directives.scatterplot', [])
  .component('scatterplot', {
    template: require('./scatterplot.html'),
    controller: ScatterplotComponent,
    bindings: {
      ngModel: '<'
    }
  })
  .name;

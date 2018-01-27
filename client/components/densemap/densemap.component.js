'use strict';
/* eslint no-sync: 0 */

import angular from 'angular';
import * as heatmap from '../../util/heatmap';
import * as d3 from 'd3';
import scaleTransform from '../../util/scaletransform';

function getHeatmap(data) {
  let container = document.getElementsByClassName('vis')[0];
  let width = Number(container.clientWidth), height = Number(container.clientHeight);
  let platte = ['#fff7fb', '#ece2f0', '#d0d1e6', '#a6bddb', '#67a9cf', '#3690c0', '#02818a', '#016450'];
  let heatInstance = heatmap.create({
    container: container,
    radius: 10,
    maxOpacity: 1,
    minOpacity: .0,
    blur: .75
  });
  let scale = scaleTransform.ScaleData(data, width, height),
    xscale = scale[0], yscale = scale[1];
  let points = {};
  for (let t of data.image) {
    let x = Math.round(xscale(t.solution[0])),
      y = Math.round(yscale(t.solution[1]));
    let xy = x + '-' + y;
    if (points[xy]) points[xy] += 1;
    else points[xy] = 1;
  }
  let datapoints = [];
  for (let xy of Object.keys(points)) {
    let x = Number(xy.split('-')[0]),
      y = Number(xy.split('-')[1]);
    datapoints.push({
      x: x,
      y: y,
      value: points[xy]
    });
  }
  heatInstance.setData({
    max: d3.max(datapoints, d => d.value),
    data: datapoints
  });
  return heatInstance.getShadowCanvas();
}

function TransformWrapper(width, height) {
  let getTransformation = function(imageData, scale, offset) {
    // console.time('transformation');
    scale = scale || 1;
    offset = offset || [0, 0];
    let shadowCanvas = document.createElement('canvas');
    let canvas = document.createElement('canvas');
    shadowCanvas.width = width;
    shadowCanvas.height = height;
    canvas.width = width;
    canvas.height = height;
    let ctx = canvas.getContext('2d');
    let shadowCtx = shadowCanvas.getContext('2d');
    // ctx.clearRect(0, 0, width, height);
    // shadowCtx.clearRect(0, 0, width, height);
    let shadowImageData = shadowCtx.createImageData(imageData);
    for (let i = 0; i < imageData.data.length; i++) {
      shadowImageData.data[i] = imageData.data[i];
    }
    // translate
    shadowCtx.putImageData(shadowImageData, offset[0], offset[1]);
    // scale
    ctx.scale(scale, scale);
    ctx.drawImage(shadowCanvas, 0, 0);
    // console.timeEnd('transformation');
    return canvas;
  }
  return getTransformation;
}

export class DensemapComponent {

  /*@ngInject*/
  constructor(event, $scope, $interval) {
    this.event = event;
    this.$scope = $scope;
    this.$interval = $interval;
  }

  $onInit() {
  }

  $onChanges(obj) {
    let self = this;
    if (obj.ngModel && !obj.ngModel.isFirstChange()) {
      self.shadowCanvas = getHeatmap(self.ngModel);
      let ctx = self.shadowCanvas.getContext('2d');
      self.imageData = ctx.getImageData(0, 0, self.shadowCanvas.width, self.shadowCanvas.height);
      self.transformation = TransformWrapper(self.shadowCanvas.width, self.shadowCanvas.height);
    }
    if (obj.ngScale && !obj.ngScale.isFirstChange()) {
      // self.transition(obj.ngScale.previousValue, obj.ngScale.currentValue);
      let scale = self.ngScale;
      let offset = self.ngOffset;
      self.shadowCanvas = self.transformation(self.imageData, scale, offset);
    }
    if (obj.ngOffset && !obj.ngOffset.isFirstChange()) {
      let scale = self.ngScale;
      let offset = self.ngOffset;
      self.shadowCanvas = self.transformation(self.imageData, scale, offset);
    }
  }

  transition(prescale, targetscale) {
    let self = this;
    let transform = d3.scaleLinear().domain([0, 1]).range([prescale, targetscale]);
    let fps = 60, duration = 500, times = Math.floor(fps * (duration / 1000));
    let offset = self.offset;
    let steps = [];
    let count = 0;
    for (let i = 1; i <= times; i++) {
      let e = d3.easeCubic(i / times);
      let scale = transform(e).toFixed(6);
      steps.push({
        time: Math.floor((1 / times)*duration),
        scale: scale,
        canvas: self.transformation(self.imageData, scale, offset)
      });
      if (i === times) {
        console.time('invoke');
        let t = self.$interval(function() {
          if (count === times) self.$interval.cancel(t);
          if (steps[count]) {
            if (count === 0) console.timeEnd('invoke');
            self.shadowCanvas = steps[count].canvas;
            count++;
          }
        }, Math.floor((1 / times)*duration));
      }
    }
  }

}

export default angular.module('directives.densemap', [])
  .component('densemap', {
    template: require('./densemap.html'),
    controller: DensemapComponent,
    bindings: {
      ngModel: '<',
      ngScale: '<',
      ngOffset: '<'
    }
  })
  .name;

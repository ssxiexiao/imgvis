'use strict';

import angular from 'angular';
import * as d3 from 'd3';
import Draw from './draw.service';

let Dispatch = function() {
  // let events = [];
  let dispatch = d3.dispatch('clickImage', 'clickSvg', 'clickText', 'mouseoverText', 'mouseleaveText', 'mouseoverImage', 'mouseleaveImage');

  dispatch.on('clickImage', function() {

  });

  dispatch.on('clickSvg', function() {

  });

  dispatch.on('clickText', function() {

  });

  return dispatch;
};
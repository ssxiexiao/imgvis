'use strict';

import angular from 'angular';
import * as d3 from 'd3';

let transition = {};

transition.MoveWord = function(transition, callback) {
  let call = false;
  transition
    .duration(1000)
    .attr('x', d => d.solution[0])
    .attr('y', d => d.solution[1])
    .on('end', function() {
      if(!call && callback) {
        callback();
        call = true;
      }
    });
};

transition.FadeIn = function(transition, callback) {
  let call = false;
  transition
    .attr('fill-opacity', 0)
    .transition()
    .duration(100)
    .attr('fill-opacity', 1)
    .on('interrupt', function() {
      d3.select(this)
        .attr('fill-opacity', 1)
        .remove();
    })
    .on('end', function() {
      if(!call && callback) {
        callback();
        call = true;
      }
    });
};

transition.FadeOut = function(transition, callback) {
  let call = false;
  transition
    .attr('fill-opacity', 1)
    .transition()
    .duration(200)
    .attr('fill-opacity', 0)
    .on('interrupt', function() {
      d3.select(this)
        .attr('fill-opacity', 0)
        .remove();
    })
    .on('end', function() {
      if(!call && callback) {
        callback();
        call = true;
      }
    })
    .remove();
};

export default transition;
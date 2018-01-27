'use strict';
/* eslint no-sync: 0 */

import angular from 'angular';
import * as d3 from 'd3';
import scaleTransform from '../../util/scaletransform';
import mathFactory from '../../util/mathfactory';
import VPTree from '../../util/vptree';

function getStars(data) {
  let container = document.getElementsByClassName('vis')[0];
  let width = Number(container.clientWidth), height = Number(container.clientHeight);
  let scale = scaleTransform.ScaleData(data, width, height),
    xscale = scale[0], yscale = scale[1];
  let planets = [];
  for (let image of data.image) {
    let planet = {};
    planet._data_ = image;
    planets.push(planet);
  };
  planets = planets.filter(d => d._data_.solution[0] !== null);
  let getPlanets = BrushPlanets(planets);
  let texts = [];
  for (let word of data.word) {
    let text = {};
    text._data_ = word;
    text.x = Math.round(xscale(word.solution[0]));
    text.y = Math.round(yscale(word.solution[1]));
    text.zindex = 0;
    text.planets = function() {
      let result = getPlanets(this._data_.solution, 0.1).map(d => d.data._data_);
      return result;
    };
    texts.push(text);
  }
  return texts;
}

function BrushPlanets(node) {
  let points = [];
  for (let i = 0; i < node.length; i++) {
    let d = node[i];
    if (d._data_) {
      points.push(d._data_.solution);
    }
  }
  let vptree = VPTree.build(points, mathFactory.Euclidean_distance);
  // Brush by a center and radius
  return function (p, radius) {
    let result = vptree.search(p, Infinity, radius);
    result.sort((a, b) => a.dist - b.dist);
    for (let obj of result) {
      obj.data = node[obj.i];
    }
    return result;
  };
};

let SolarChart = function () {
  let cx, cy, radial = 150, data, arcs, origin, X;
  let solar = {};
  solar.cx = function (_) {
    if (!arguments.length) return cx;
    cx = _;
    return solar;
  };
  solar.cy = function (_) {
    if (!arguments.length) return cy;
    cy = _;
    return solar;
  };
  solar.radial = function (_) {
    if (!arguments.length) return radial;
    radial = _;
    return solar;
  };
  solar.data = function (_) {
    if (!arguments.length) return data;
    data = _.slice(0, 8);
    return solar;
  };
  solar.focus = function (index) {
    if (arcs.length <= 4) return;
    let focusangle = Math.PI / 2;
    let angle = mathFactory.IncludedAngle(origin[index].startAngle, origin[index].endAngle);
    let restAngle = 2 * Math.PI - focusangle;
    arcs[index].startAngle = origin[index].startAngle - ((focusangle - angle) / 2);
    arcs[index].endAngle = origin[index].endAngle + ((focusangle - angle) / 2);
    let startAngle = arcs[index].endAngle;
    let count = 0;
    let indices = [];
    for (let i = index + 1; i < arcs.length; i++) indices.push(i);
    for (let i = 0; i < index; i++) indices.push(i);
    for (let i of indices) {
      let arc = arcs[i];
      arc.startAngle = startAngle + count * (restAngle / (arcs.length - 1));
      arc.endAngle = startAngle + ((count + 1) * (restAngle / (arcs.length - 1)));
      count++;
    }
    for (let arc of arcs) {
      arc.startAngle = mathFactory.NormalizeAngle(arc.startAngle);
      arc.endAngle = mathFactory.NormalizeAngle(arc.endAngle);
    }
    computeLayout(arcs);
    return arcs;
  };
  solar.layout = function () {
    let pie = d3.pie();
    if (data.length === 1)
      pie.padAngle(Math.PI * 3 / 2);
    else if (data.length === 2)
      pie.padAngle(Math.PI / 2);
    else if (data.length === 3)
      pie.padAngle(Math.PI / 6);
    else
      pie.padAngle(0.1);
    arcs = pie(data.map(d => 1));
    origin = pie(data.map(d => 1));
    arcs = arcs.map(d => {
      delete (d['data']);
      delete (d['value']);
      return d;
    });
    computeLayout(arcs);
    return arcs;
  };
  solar.relayout = function () {
    for (let i = 0; i < arcs.length; i++) {
      arcs[i].startAngle = origin[i].startAngle;
      arcs[i].endAngle = origin[i].endAngle;
      arcs[i].padAngle = origin[i].padAngle;
    }
    computeLayout(arcs);
  };
  solar.clipPath = function (width, height) {
    selection
      .attr('cx', d => {
        let aspect = d.image.width / d.image.height;
        return aspect > 1 ? (d.image.r * aspect) : d.image.r;
      })
      .attr('cy', d => {
        let aspect = d.image.width / d.image.height;
        return aspect > 1 ? d.image.r : (d.image.r / aspect);
      })
      .attr('r', d => d.image.r);
  };
  solar.image = function (selection) {
    selection
      .attr('width', d => {
        let aspect = d.image.width / d.image.height;
        return aspect > 1 ? (d.image.r * 2 * aspect) : (d.image.r * 2);
      })
      .attr('height', d => {
        let aspect = d.image.width / d.image.height;
        return aspect > 1 ? (d.image.r * 2) : (d.image.r * 2 / aspect);
      })
      .attr('transform', (d) => {
        let aspect = d.image.width / d.image.height;
        let width = aspect > 1 ? (d.image.r * 2 * aspect) : (d.image.r * 2);
        let height = aspect > 1 ? (d.image.r * 2) : (d.image.r * 2 / aspect);
        let x = d.image.p[0] - (width / 2);
        let y = d.image.p[1] - (height / 2);
        return 'translate(' + x + ',' + y + ')';
      })
      .attr('xlink:href', (d) => {
        let base = 'http://10.76.2.57:8000/';
        return base + d.image.src;
      });
  };

  function computeLayout(arcs) {
    let caption_offset = 15; // 15px
    for (let i = 0; i < arcs.length; i++) {
      let arc = arcs[i];
      let radius = mathFactory.AngleandRadialToRadius(mathFactory.IncludedAngle(arc.startAngle, arc.endAngle) - arc.padAngle, radial);
      let midAngle = mathFactory.MidAngle(arc.startAngle, arc.endAngle);
      let p = mathFactory.AngleToXY(midAngle, radial, cx, cy);
      let caption_start = mathFactory.AngleToXY(midAngle, radial + radius + caption_offset, cx, cy);
      if (!arc.image) {
        arc.image = { p: p, r: radius, d: data[i], src: data[i].id };
      }
      else {
        arc.image.p = p;
        arc.image.r = radius;
      }
      arc.caption = { p: caption_start, text: arc.image.d.caption[0] };
      arc.caption.anchor = (midAngle < Math.PI / 2 || midAngle > Math.PI * 3 / 2) ? 'start' : 'end';
    }
  }

  return solar;
};


export class GalaxyComponent {

  stars = [];
  planets = [];
  focusing = {
    previousClick: undefined,
    previousHover: undefined,
    currentClick: undefined,
    currentHover: undefined,
    transform: '',
    update: function () {
      if (this.currentClick) {
        this.previousData = this.data;
        this.data = this.currentClick;
        this.text = this.data._data_.word;
      }
      else if (this.currentHover) {
        this.previousData = this.data;
        this.data = this.currentHover;
        this.text = this.data._data_.word;
      }
      else {
        this.previousData = this.data;
        this.data = undefined;
        this.text = undefined;
      }
      if (this.data) 
        this.transform = 'translate('+this.data.x+','+this.data.y+')';
      else
        this.transform = '';
    }
  };

  /*@ngInject*/
  constructor(event, $scope, $timeout, $sce) {
    this.event = event;
    this.$scope = $scope;
    this.$sce = $sce;
    $scope.$safeApply = function (fn) {
      var phase = this.$root.$$phase;
      if (phase == '$apply' || phase == '$digest')
        this.$eval(fn);
      else
        this.$apply(fn);
    };
  }

  $onInit() {
    let container = document.getElementsByClassName('vis')[0];
    this.width = Number(container.clientWidth);
    this.height = Number(container.clientHeight);
    this.mid = [ this.width / 2, this.height / 2 ];
    this.solarChart = SolarChart();
  }

  $onChanges(obj) {
    console.log(obj);
    let self = this;
    if (obj.ngModel && !obj.ngModel.isFirstChange()) {
      self.stars = getStars(self.ngModel);
    }
    if (obj.ngScale && !obj.ngScale.isFirstChange()) {
      let scale = self.ngScale;
      let offset = self.ngOffset;
      self.stars = self.transformation(self.stars, scale, offset);
    }
    if (obj.ngOffset && !obj.ngOffset.isFirstChange()) {
      let scale = self.ngScale;
      let offset = self.ngOffset;
      self.stars = self.transformation(self.stars, scale, offset);
    }
    if (obj.ngLocate && !obj.ngLocate.isFirstChange()) {
      let text = obj.ngLocate.currentValue;
      for (let star of this.stars) {
        if (star._data_.word === text) {
          console.log('locate to:', star.x, star.y);
          let dx = self.mid[0] - star.x, dy = self.mid[1] - star.y;
          self.onMove({ dx, dy });
        }
      }
    }
  }

  $onWheel($event, $deltaX, $deltaY) {
    let self = this;
    if ($deltaY < 0) this.onExpand();
    if ($deltaY > 0) this.onContract();
  }

  $onDrag($event, $X, $Y) {
    this.onMove({dx: $X, dy: $Y});
  }

  $onStarClick($star) {
    console.log($star);
    // click it last time
    if (this.focusing.currentClick === $star) {
      console.log('click old');
      this.focusing.previousClick = this.focusing.currentClick;
      this.focusing.currentClick = undefined;
    }
    // click new star
    else {
      console.log('click new');
      this.focusing.previousClick = this.focusing.currentClick;
      this.focusing.currentClick = $star;
    }
    this.focusing.update();
    if (this.focusing.data) {
      this.planets = [];
      this.focusing.data.zindex = 1;
      if (this.focusing.previousData) this.focusing.previousData.zindex = 0;
      if(!this.updatePlanets(this.focusing.data)) {
        this.focusing.currentClick = undefined;
        this.focusing.update();
      }
    }
    else {
      if (this.focusing.previousData) this.focusing.previousData.zindex = 0;
      this.planets = [];
    }
  }

  $onStarHover($star) {
    let self = this;
    self.focusing.previousHover = self.focusing.currentHover;
    self.focusing.currentHover = $star;
    self.focusing.update();
    if (self.focusing.data !== $star) return;
    let $data = self.focusing.data;
    $data.zindex = 1;
    self.updatePlanets($data);
  }

  $onStarLeave($star) {
    let self = this;
    self.focusing.previousHover = self.currentHover;
    self.focusing.currentHover = undefined;
    self.focusing.update();
    if (self.focusing.data) return;
    $star.zindex = 0;
    self.planets = [];
  }

  $onStarDblclick($star) {
    console.log($star);
    let self = this;
    let index = Math.random() * self.stars.length;
    let parent = self.stars[parseInt(index)];
    let table = [
      { 'node': $star, 'parent': parent },
      { 'node': parent, 'parent': null }
    ];
    let root = d3.stratify()
      .id(function(d) { return d.node._data_.word; })
      .parentId(function(d) { return d.parent ? d.parent._data_.word : null; })
      (table);
    console.log(root);
    let tree = d3.tree()
        .size([600, 300]);
    let g = d3.select('galaxy').select('svg').append('g').classed('test', true);
    var link = g.selectAll(".link")
      .data(tree(root).descendants().slice(1))
      .enter().append("path")
        .attr("class", "link")
        .attr("d", function(d) {
          return "M" + d.y + "," + d.x
              + "C" + (d.y + d.parent.y) / 2 + "," + d.x
              + " " + (d.y + d.parent.y) / 2 + "," + d.parent.x
              + " " + d.parent.y + "," + d.parent.x;
        });

    var node = g.selectAll(".node")
      .data(root.descendants())
      .enter().append("g")
        .attr("class", function(d) { return "node" + (d.children ? " node--internal" : " node--leaf"); })
        .attr("transform", function(d) { return "translate(" + d.y + "," + d.x + ")"; })

    node.append("circle")
        .attr("r", 2.5);

    node.append("text")
        .attr("dy", 3)
        .attr("x", function(d) { return d.children ? -8 : 8; })
        .style("text-anchor", function(d) { return d.children ? "end" : "start"; })
        .text(function(d) { return d.id.substring(d.id.lastIndexOf(".") + 1); });
  }

  updatePlanets($data) {
    let self = this;
    let planets = $data.planets();
    planets = planets.filter((d) => {
      let caption = d.caption[0].split(' ');
      for (let word of caption) {
        if (word === $data._data_.word) return true;
      }
      return false;
    });
    if (planets.length === 0) {
      return false;
    }
    let results = [];
    self.solarChart.data(planets)
      .cx(0)
      .cy(0);
    let arcs = self.solarChart.layout();
    for (let planet of arcs) {
      let image = new Image();
      let base = 'http://10.76.2.57:8000/';
      image.src = base + planet.image.src;
      image.onload = function () {
        let aspect = image.width / image.height;
        let width = aspect > 1 ? (planet.image.r * 2 * aspect) : (planet.image.r * 2);
        let height = aspect > 1 ? (planet.image.r * 2) : (planet.image.r * 2 / aspect);
        planet.cx = aspect > 1 ? (planet.image.r * aspect) : planet.image.r;
        planet.cy = aspect > 1 ? planet.image.r : (planet.image.r / aspect);
        planet.r = planet.image.r;
        planet.width = width;
        planet.height = height;
        planet.xlink = image.src;
        let x = planet.image.p[0] - (width / 2);
        let y = planet.image.p[1] - (height / 2);
        planet.transform = 'translate(' + x + ',' + y + ')';
        results.push(planet);
        if ($data === self.focusing.data && results.length === arcs.length) {
          self.$scope.$safeApply(function () {
            self.planets = results;
          });
        }
      }
    }
    return true;
  }

  transformation(texts, scale, offset) {
    scale = scale || 1;
    offset = offset || [0, 0];
    for (let text of texts) {
      if (text.ox === undefined) text.ox = text.x;
      if (text.oy === undefined) text.oy = text.y;
      text.x = text.ox + offset[0];
      text.y = text.oy + offset[1];
      text.x *= scale;
      text.y *= scale;
    }
    return texts;
  }

  trustSrc(src) {
    return this.$sce.trustAsResourceUrl(src);
  }

}

export default angular.module('directives.galaxy', [])
  .component('galaxy', {
    template: require('./galaxy.html'),
    controller: GalaxyComponent,
    bindings: {
      ngModel: '<',
      ngScale: '<',
      ngOffset: '<',
      ngLocate: '<',
      onExpand: '&',
      onContract: '&',
      onMove: '&'
    }
  })
  .name;

'use strict';

import angular from 'angular';
import * as d3 from 'd3';
import solar from './solar.service';
import scaleTransform from '../../util/scaletransform';
import clustering from '../../util/clustering';
import stopword from '../../resource/stopword';
import Singular from '../../resource/singular';
import VPTree from '../../util/vptree';
import mathFactory from '../../util/mathfactory';
import textFactory from '../../util/textfactory';
import collision from '../../util/collision';
import Draw from './draw.service';

// Return a function to search word vElement
let SearchWord = function(words) {
  let word2id = {};
  words.forEach((d, i) => {
    word2id[d._data_.word] = i;
  });
  return function(word) {
    if (!word2id.hasOwnProperty(word)) return;
    return words[word2id[word]];
  };
};

// Return a function to search image vElement
let SearchImage = function(images) {
  let image2id = {};
  images.forEach((d, i) => {
    image2id[d._data_.id] = i;
  });
  return function(id) {
    if (!image2id.hasOwnProperty(id)) return;
    return images[image2id[id]];
  };
};

// Return a function to brush neighboors of a point
let Brush = function(node) {
  let points = [];
  for (let i = 0; i < node.length; i++) {
    let d = node[i];
    if (d._data_) {
      points.push(d._data_.solution);
    }    
  }
  let vptree = VPTree.build(points, mathFactory.Euclidean_distance);
  // Brush by a center and radius
  return function(p, radius) {
    let result = vptree.search(p, Infinity, radius);
    result.sort((a, b) => a.dist - b.dist);
    for (let obj of result) {
      obj.data = node[obj.i];
    }
    return result;
  };
};

// Return color generator
let ColorGenerator = function() {
  let _count = 0;
  let _colors = ['#FF7F00', '#248D22', '#9564BF', '#8D594A', '#E574C3', '#7F7F7F', '#BCBE00', '#00BED0' ];
  return function(counter) {
    let result;
    result = _colors[_count];
    _count = (_count + 1) % 8;
    return result;
  }
};

let TransformMatrix = function(arr) {
  let matrix = {};
  let attr = [ 'a', 'b', 'c', 'd', 'e', 'f' ];
  for (let i = 0; i < attr.length; i++)
    matrix[attr[i]] = arr[i];
  return matrix;
};

let ZoomManager = function(deepest = 3) {
  let _levels = 0;
  let timeouts = [];
  let clean = function() {
    for (let t of timeouts)
      t.stop();
    timeouts = [];
  }
  return {
    current: () => { return _levels; },
    zoomIn: () => { 
      if (_levels < deepest) {
        _levels += 1;
        return true;
      }
      return false;
    },
    zoomOut: () => {
      if (_levels > 0) {
        _levels -= 1;
        return true;
      }
      return false;
    },
    set: (level) => {
      _levels = level;
    },
    clean: clean,
    execute: (cb) => {
      clean();
      let t = d3.timeout(function() {
        if (cb) cb();
      }, 0);
      timeouts.push(t);
    }
  };
};

function Starry() {
  let backcanvas, forecanvas, svg;
  let _xdomain, _ydomain;
  let _xscale, _yscale;
  let _originScale;
  let _data, _width, _height;
  let _interfaces = {};
  let _labels = {};
  let _groups = {};
  let _virtualElements = {};
  let _vsvg = {};
  let _heap = [];
  let _keywords = [];
  let _keywordProportion = [ 0.15, 0.15, 0.59, 1, 1 ];
  let _zoomProportion = [ 1, 2, 4, 8, 16 ];
  let _zoomManager = {};

  let starry = {
    // Configure data
    // nodes: { word, image }
    configure: function(config) {
      _data = config.data;
      _data.word = _data.word.filter((a) => Singular[a.word])
      _width = config.width;
      _height = config.height;
      backcanvas = config.backcanvas;
      forecanvas = config.forecanvas;
      svg = config.svg;
      _interfaces = {};
      _labels = {};
      _groups = {};
      _virtualElements = {};
      _vsvg = {};
      _heap = [];
      _keywords = [];
      _heap = [];
      _heap.push(starry.data());
      _zoomManager = ZoomManager(_zoomProportion.length-1);
    },
    resetSolution: function(data) {
      for (let i = 0; i < data.word.length; i++) {
        _data.word[i].solution = data.word[i].solution;
      }
      for (let i = 0; i < data.image.length; i++) {
        _data.image[i].solution = data.image[i].solution;
      }
      starry.scaleData();
      _originScale = [ _xscale.copy(), _yscale.copy() ];
      starry.clear(forecanvas.node());
      starry.clear(backcanvas.node());
      starry.computeGroups();
      starry.renderInit();
    },
    init: function() {
      for (let i = 0; i < _data.image.length; i++) {
        if (i !== _data.image[i].index) console.log(false);
      }
      for (let i = 0; i < _data.word.length; i++) {
        if (i !== _data.word[i].index) console.log(false);
      }      
      starry.scaleData();
      _originScale = [ _xscale.copy(), _yscale.copy() ];
      starry.clear(forecanvas.node());
      starry.clear(backcanvas.node());
      svg.select('.all-container').selectAll('*').remove();
      console.log(svg.selectAll('*').size())
    },
    // Return data
    data: function() {
      return _data;
    },
    // Return user viewness data
    inViewData: function(data, scale) {
      scale = scale || starry.scale();
      let result = data.filter(d => {
        let x = d.solution[0];
        return x >= 0 && x <= _width;
      });
      result = result.filter(d => {
        let y = d.solution[1];
        return y >= 0 && y <= _height;
      });
      return result;
    },
    layer: function() {
      return _heap.length;
    },
    heap: function() {
      return _heap[_heap.length - 1];
    },
    scale: function() {
      return [ _xscale, _yscale ];
    },
    // Scale the data
    scaleData: function() {
      let data = starry.heap();
      console.log(data.image.filter(d => d.solution === undefined || d.solution[0] === undefined));
      let xset = data.word.map(d => d.solution[0]);
      let yset = data.word.map(d => d.solution[1]);
      xset = xset.concat(data.image.map(d => d.solution[0]));
      yset = yset.concat(data.image.map(d => d.solution[1]));
      _xdomain = d3.extent(xset);
      _ydomain = d3.extent(yset);
      let canvasWidth = _width;
      let canvasHeight = _height;
      let xlen = _xdomain[1] - _xdomain[0];
      let ylen = _ydomain[1] - _ydomain[0];
      let scaleFactor = Math.min(canvasWidth, canvasHeight) / Math.max(xlen, ylen);
      let xscale = d3.scaleLinear().domain(_xdomain);
      let yscale = d3.scaleLinear().domain(_ydomain);
      xscale.range([ 0, xlen*scaleFactor ]);
      yscale.range([ ylen*scaleFactor, 0 ]);
      _xscale = scaleTransform.Centerize(xscale, canvasWidth/2);
      _yscale = scaleTransform.Centerize(yscale, canvasHeight/2);
    },
    // Transform scale
    transformScale: function(scale, config) {
      if (config.shift) {
        scale = scale.map((d, i) => scaleTransform.Shift(d, config.shift[i]));
      }
      if (config.scale) {
        config.center = config.center || [];
        scale = scale.map((d, i) => scaleTransform.Scale(d, config.factor, config.center[i]));
      }
      return scale;
    },
    groups: function() {
      return _groups;
    },
    computeGroups: function(cb) {
      let data = starry.data();
      let nodes = data.image;
      nodes = nodes.concat(data.word);
      let result = clustering(nodes.map(d => d.solution));
      let groups = result.groups;
      let noise = result.noise;
      if (!noise) noise = [];
      console.log(groups);
      let labels = nodes.map(d => -1);
      for (let i = 0; i < groups.length; i++) {
        for (let index of groups[i]) {
          labels[index] = i;
        }
      }
      _labels.image = labels.slice(0, data.image.length);
      _labels.word = labels.slice(data.image.length, nodes.length);
      if (cb) cb(_labels);
      _groups = { image: [], word: [] };
      for (let i = 0; i <= d3.max(labels); i++) {
        _groups.image.push([]);
        _groups.word.push([]);
      }
      for (let i = 0; i < _labels.image.length; i++) {
        let label = _labels.image[i];
        if (label > -1)
          _groups.image[label].push(i);
      }
      for (let i = 0; i < _labels.word.length; i++) {
        let label = _labels.word[i];
        if (label > -1)
          _groups.word[label].push(i);
      }
    },
    // extract keywords
    extractKeywords: function(proportion) {
      let X = [];
      let data = starry.data();
      let util = _interfaces;
      let root = [];
      let hash = {};
      for (let i = 0; i < data.word.length; i++) {
        // console.log(data.word[i].constructors);
        root.push({'word': data.word[i].word, 'parentNum': data.word[i].constructors.length, 'times': 0 });
        hash[data.word[i].word] = root[root.length - 1];
      }
      for (let i = 0; i < data.image.length; i++) {
        for (let keyword of data.image[i].caption[0].split(' ')) {
          keyword = Singular[keyword];
          if (hash[keyword]) hash[keyword].times++;
        }
      }
      root.sort((a, b) => {
        if (a.parentNum !== b.parentNum)
          return a.parentNum - b.parentNum;
        return b.times - a.times;
      });
      // for (let group of _groups.image) {
      //   let document = '';
      //   for (let index of group) {
      //     let caption = data.image[index].caption[0];
      //     document += caption + ' ';
      //   }
      //   X.push(document);
      // }
      // let tf_idf = textFactory.TF_IDF(X);
      // let result = [];
      // for (let i = 0; i < tf_idf.tfs.length; i++) {
      //   let tf = tf_idf.tfs[i];
      //   let words = _groups.word[i].map(d => data.word[d].word);
      //   let buffs = [];
      //   for (let word of words) {
      //     if (tf.get(word) !== undefined)
      //       buffs.push({ word: word, v: tf.get(word) });
      //   }
      //   let n = Math.floor(buffs.length * proportion);
      //   buffs.sort((a, b) => b.v - a.v);
      //   result = result.concat(buffs.slice(0, n));
      // }
      // result = result.map(d => d.word);
      let num = Math.floor(root.length * proportion);
      // let rootNum = root.filter(d => d.parentNum === 0).length;
      // num = Math.max(rootNum, num);
      let result = root.slice(0, num).map(d => d.word);
      return result;
    },
    // Return keywords accordinig to zoom level
    keywords: function() {
      let current = _zoomManager.current();
      if(_keywords[current]) return _keywords[current];
      let keywords = starry.extractKeywords(_keywordProportion[current]);
      _keywords[current] = keywords;
      return keywords;
    },
    virtualElements: function() {
      return _virtualElements;
    },
    // init vElements, should only be called once
    genVirtualElements: function() {
      let scale = starry.scale();
      let width = Math.abs(scale[0].range()[1] - scale[0].range()[0]);
      let height = Math.abs(scale[0].range()[1] - scale[0].range()[0]);
      let svg = document.createElementNS("http://www.w3.org/2000/svg", "svg"); 
      d3.select('.virtual').remove();
      d3.select(svg).attr('width', _width).attr('height', _height).classed('virtual', true);
      // svg.style.visibility = 'hidden';
      _virtualElements = { image: [], word: [] };
      for (let node of _data.image) {
        _virtualElements.image.push({
          _data_: node, 
          id: _virtualElements.image.length,
          solution: node.solution.map((d, i) => scale[i](d)),
          style: {
            fillStyle: 'rgb(255, 255, 255)',
            opacity: 0.8
          }
        });
      }
      for (let node of _data.word) {
        let text = document.createElementNS("http://www.w3.org/2000/svg", "text");
        let solution = node.solution.map((d, i) => scale[i](d));
        svg.appendChild(text);
        _virtualElements.word.push({
          _data_: node, 
          id: _virtualElements.word.length,
          solution: solution,
          _solution_: solution.slice(0),
          text: node.word,
          style: {},
          dom: text
        });
        d3.select(text)
          .attr('x', solution[0])
          .attr('y', solution[1])
          .attr('font-size', 15)
          .text(node.word);
      }
      console.log(_virtualElements);
      _vsvg = svg;
    },
    // update vElements of words
    updateWordElements: function(scale) {
      scale = scale || starry.scale();
      let data = starry.heap();
      let util = starry.interfaces();
      d3.select(_vsvg).selectAll('*').remove();
      console.time('update words');
      for (let node of data.word) {
        let vElem = util.searchWord(node.word);
        vElem.solution = vElem._data_.solution.map((d, i) => scale[i](d));
        vElem._solution_ = vElem.solution.slice(0);
        d3.select(vElem.dom)
          .attr('x', vElem.solution[0])
          .attr('y', vElem.solution[1]);
        _vsvg.appendChild(vElem.dom);
      }
      console.timeEnd('update words');
    },
    // update vElements of images
    updateImageElements: function(scale) {
      scale = scale || starry.scale();
      let data = starry.heap();
      let util = starry.interfaces();
      console.time('update images');
      for (let node of data.image) {
        let vElem = util.searchImage(node.id);
        vElem.solution = vElem._data_.solution.map((d, i) => scale[i](d));
      }
      console.timeEnd('update images');
    },
    // Return interactive interfaces
    interfaces: function() {
      return _interfaces;
    },
    // Init interfaces, should only be called once
    genInterfaces: function(exportCallback) {
      let vElements = starry.virtualElements();
      // Brush interface
      let brushImage = Brush(vElements.image);
      let brushWord = Brush(vElements.word);
      // Search interface
      let searchWord = SearchWord(vElements.word);
      let searchImage = SearchImage(vElements.image);
      // Render interface
      let drawWord = Draw.DrawWord();
      let drawImage = Draw.DrawImage();
      let drawDensity = Draw.DrawDensity();
      let drawContour = Draw.DrawContour();
      let drawSolar = Draw.DrawSolar();
      let fixSolar = Draw.FixSolar();
      let deleteSolar = Draw.DeleteSolar();
      let drawTree = Draw.DrawTree();
      let animateCanvas = Draw.AnimateCanvas();
      // Update interfaces
      _interfaces = { drawWord, drawImage, drawContour, drawDensity, drawTree, drawSolar, fixSolar, deleteSolar, animateCanvas, searchWord, searchImage };
      _interfaces.brushImage = function(p, radius) {
        let scale = starry.scale();
        p = p.map((d, i) => scale[i].invert(d));
        let factor = Math.abs(scale[0].domain()[0] - scale[0].domain()[1]) / Math.abs(scale[0].range()[1] - scale[0].range()[0]);
        radius *= factor;
        return brushImage(p, radius);
      };
      _interfaces.brushWord = function(p, radius) {
        let scale = starry.scale();
        p = p.map((d, i) => scale[i].invert(d));
        let factor = Math.abs(scale[0].domain()[0] - scale[0].domain()[1]) / Math.abs(scale[0].range()[1] - scale[0].range()[0]);
        radius *= factor;
        return brushWord(p, radius);
      };
      _interfaces.exportCallback = exportCallback;
      _interfaces.getWordByIndex = function(index) {
        return _data.word[index];
      };
      _interfaces.getImageByIndex = function(index) {
        return _data.image[index];
      };
      // Save
      starry.heap().brushImage = _interfaces.brushImage;
      starry.heap().brushWord = _interfaces.brushWord;

      // console.log(brushImage([350, 270], 100).length);

      return _interfaces;
    },
    // Render VElements: render all data
    renderInit: function() {
      let util = starry.interfaces();
      d3.select(forecanvas.node().parentNode).select('.virtual').remove()
      forecanvas.node().parentNode.appendChild(_vsvg);
      // Get the initial keywords
      for (let i = 0; i < _keywordProportion.length; i++) {
        _keywords[i] = starry.extractKeywords(_keywordProportion[i]);
      }
      let keywords = starry.keywords();
      let keywordsElem = keywords.map(d => util.searchWord(d));
      collision.FixConflict(keywordsElem);
      util.drawWord(svg, keywordsElem, { util });

      let color = ColorGenerator();
      // let labelColor = color();
      let groups = starry.groups().image;
      let imagesElem = starry.virtualElements().image;
      for (let group of groups) {
        let labelColor = color();
        // labelColor = '#248D22';
        group = group.map(d => imagesElem[d]);
        for (let elem of group) {
          elem.style.fillStyle = labelColor;
          elem.style.opacity = 0.45;
        }
        // util.drawContour(forecanvas.node(), group);
      }
      util.drawImage(forecanvas.node(), imagesElem);
      let area = {
        x: parseInt(_xscale.range()[0]),
        y: parseInt(_yscale.range()[1]), 
        width: parseInt(_xscale.range()[1] - _xscale.range()[0]), 
        height: parseInt(_yscale.range()[0] - _yscale.range()[1])
      };
      // util.drawDensity(backcanvas.node(), area, util.brushImage);
    },
    renderImage: function(canvas) {
      let util = starry.interfaces();
      let data = starry.heap();
      let imagesElem = data.image.map(d => util.searchImage(d.id));
      if (starry.layer() === 1) {
        let groups = starry.groups().image;
        for (let group of groups) {
          group = group.map(d => imagesElem[d]);
          util.drawContour(canvas.node(), group);
        }
      }
      console.time('draw image');
      util.drawImage(canvas.node(), imagesElem);
      console.timeEnd('draw image');
    },
    renderWord: function(svg, config) {
      config = config || {};
      let util = starry.interfaces();
      let keywords = starry.keywords();
      let wordsElem = keywords.map(d => util.searchWord(d));
      collision.FixConflict(starry.inViewData(wordsElem));
      config.util = util;
      util.drawWord(svg, wordsElem, config);
    },
    shift: function(config) {
      config = config || {};
      svg.selectAll('.click-image-point').remove();
      if (!config.offset) return;
      if (!config.endstatus) {
        let matrix = 'matrix(0,0,0,0,' + config.offset[0] + ',' + config.offset[1] + ')';
        svg.select('.all-container')
          .attr('transform', 'translate(' + config.offset[0] + ',' + config.offset[1] + ')');
        forecanvas.node().style.top = config.offset[1] + 'px';
        forecanvas.node().style.left = config.offset[0] + 'px';
        backcanvas.node().style.top = config.offset[1] + 'px';
        backcanvas.node().style.left = config.offset[0] + 'px';
      }
      else {
        let matrix = svg.select('.all-container').node().getCTM();
        svg.select('.all-container').selectAll('.solar')
          .each(function (d) {
            let m = d3.select(this).node().getCTM();
            d3.select(this).attr('transform', 'translate(' + m.e + ',' + m.f + ')');
          });
        svg.select('.all-container')
          .attr('transform', '');
        forecanvas.node().style.top = 0 + 'px';
        forecanvas.node().style.left = 0 + 'px';

        let scale = starry.scale().map(d => d.copy());
        scale = scale.map((d, i) => scaleTransform.Shift(d, config.offset[i]));
        _xscale = scale[0];
        _yscale = scale[1];
        starry.updateImageElements();
        starry.updateWordElements();
        starry.clear(forecanvas.node());
        starry.renderImage(forecanvas);
        starry.renderWord(svg);
      } 
    },
    // Clean the canvas
    clear: function(canvas) {
      console.log('clear');
      let ctx = canvas.getContext("2d");
      let canvasWidth = canvas.clientWidth;
      let canvasHeight = canvas.clientHeight;
      ctx.clearRect(0, 0, canvasWidth, canvasHeight);
    },
    zoomByWheel: function(config) {
      _zoomManager.clean();
      let currentScale = starry.scale();
      let targetScale;
      let util = starry.interfaces();
      if (config.zoomIn === true && _zoomManager.zoomIn()) {
        config.scale = true;
        let current = _zoomManager.current();
        config.factor =  _zoomProportion[current] / _zoomProportion[current-1];
      }
      if (config.zoomOut === true && _zoomManager.zoomOut()) {
        config.scale = true;
        let current = _zoomManager.current();
        config.factor = _zoomProportion[current] / _zoomProportion[current+1];
      }
      if (config.scale) {
        config.center = [ _width / 2 , _height / 2 ];
        targetScale = starry.transformScale(currentScale, config);
        _xscale = targetScale[0];
        _yscale = targetScale[1];
        starry.clear(forecanvas.node());
        starry.updateWordElements();
        starry.renderWord(svg, {
          zoomByWheel: true, renderCanvas: function () {
            // starry.clear(forecanvas.node());
            // starry.renderImage(forecanvas);
          }
        });
        util.animateCanvas(backcanvas.node(), config.factor, function () {
          starry.clear(forecanvas.node());
          starry.updateImageElements();
          starry.renderImage(forecanvas);
        });
        util.deleteSolar(svg);
        svg.selectAll('.click-image-point').remove();
        svg.selectAll('.children').classed('children', false);
        svg.selectAll('.parent').classed('parent', false);
        svg.selectAll('.node-inspect').classed('node-inspect', false);
        svg.selectAll('.focus-keyword').classed('focus-keyword', false);
      }
    },
    jumpToPoint: function(_solution_, callback) {
      let jumpToLevel, util = starry.interfaces();
      jumpToLevel = _keywordProportion.length - 1;
      // Zoom
      let targetScale = starry.scale();
      if (_zoomManager.current() != jumpToLevel) {
        let config = {};
        let current = _zoomManager.current();
        config.scale = true;
        config.factor = _zoomProportion[jumpToLevel] / _zoomProportion[current];
        config.center = [midx, midy];
        targetScale = starry.transformScale(targetScale, config);
      }
      let solution = _solution_.map((d, i) => targetScale[i](d));
      let midx = _width / 2, midy = _height / 2;
      let offset = [midx - solution[0], midy - solution[1]];
      targetScale = starry.transformScale(targetScale, { shift: offset });
      _xscale = targetScale[0];
      _yscale = targetScale[1];
      _zoomManager.set(jumpToLevel);
      starry.clear(forecanvas.node());
      starry.updateWordElements();
      starry.updateImageElements();
      console.log('update');
      util.deleteSolar(svg);
      svg.selectAll('.click-image-point').remove();
      svg.selectAll('.children').classed('children', false);
      svg.selectAll('.parent').classed('parent', false);
      svg.selectAll('.node-inspect').classed('node-inspect', false);
      svg.selectAll('.focus-keyword').classed('focus-keyword', false);
      starry.renderWord(svg, {
        zoomByWheel: true, renderCanvas: callback
      });
    },
    jumpToImage: function(config) {
      let util = starry.interfaces();
      let imageElem = util.searchImage(config.id);
      if (!imageElem) return;
      let callback = function() {
        starry.clear(forecanvas.node());
        starry.renderImage(forecanvas);
        let solution = imageElem.solution;
        svg.select('.all-container').selectAll('.click-image-point').remove();
        svg.select('.all-container').append('circle')
          .classed('click-image-point', true)
          .attr('cx', solution[0])
          .attr('cy', solution[1])
          .attr('r', 3)
          .attr('fill', '#fff');
      };
      starry.jumpToPoint(imageElem._data_.solution, callback);
    },
    jumpToWord: function(config) {
      let util = starry.interfaces();
      let wordElem = util.searchWord(config.word);
      if (!wordElem) return;
      let callback = function() {
        console.log('jumptoword');
        starry.clear(forecanvas.node());
        starry.renderImage(forecanvas);
        // highlight keywords
        svg.selectAll('.keyword').sort((a, b) => a.text !== config.word);
        let word = svg.selectAll('.keyword')
          .filter((d) => d.text === config.word);
        word.each(function(d, i) {
          let onClick = d3.select(this).on("click");
          let onMouseover = d3.select(this).on("mouseover");
          onMouseover.apply(this, [d, i]);
          onClick.apply(this, [d, i]);
        });
      };
      starry.jumpToPoint(wordElem._data_.solution, callback);
    }
  };

  return starry;
}

export default Starry;
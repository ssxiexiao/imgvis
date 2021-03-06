'use strict';

import angular from 'angular';
import * as d3 from 'd3';
import searchInterface from './searchInterface.service';


export default angular.module('directive.searchInterface', [])
  .directive('searchInterface', [ 'event', '$http', 'database', function(event, $http, database) {
    return {
      restrict: 'E',
      scope: {},
      template: require('./searchInterface.html'),
      link: function(scope, element, attrs) {
        scope.base = "http://10.76.2.57:8000/";
        scope.keywords = [['Cat', 'plus'], ['Dog', 'plus']];
        scope.keyimages = [];
        scope.captions = [];
        scope.images = [];
        scope.showingImages = [];
        scope.dashboardvisible = 1;
        scope.basepage = 1;
        scope.currentpage = 1;
        scope.word = { children: [], parents:[], text: '',  parentIndex: -1 };
        scope.image ={ parents: [], id: '', parentIndex: -1 };
        scope.modifying = false;
        scope.loading = false;
        scope.adding_query_word = false;
        scope.safeApply = function (fn) {
          var phase = this.$root.$$phase;
          if (phase == '$apply' || phase == '$digest')
            this.$eval(fn);
          else
            this.$apply(fn);
        };
        scope.deleteKeyword = function(index) {
          scope.keywords.splice(index, 1);
        };
        scope.deleteKeyimage = function(index) {
          scope.keyimages.splice(index, 1);
        };
        scope.changeAction = function(index, type) {
          let data = type === 'word' ? scope.keywords[index] : scope.keyimages[index];
          if (data[1] === 'plus')
            data[1] = 'minus';
          else
            data[1] = 'plus';
        };
        scope.inspectImage = function(image) {
          event.emit(event.SHOWIMAGECHANGED, [image]);
          event.emit(event.SEARCHIMAGE, { id: image.id });
        };
        scope.updatePage = updatePage.bind(undefined, scope);
        scope.pagination = pagination.bind(undefined, scope);
        scope.clickPage = function(page) {
          let n = 5;
          scope.currentpage = page;
          scope.showingImages = scope.images.slice((page-1)*n, page*n);
        };
        scope.locateImage = function(id) {
          event.emit(event.SEARCHIMAGE, { id: id });
        };
        scope.semanticQuery = function() {
          let query = obtainQuery(scope.keywords, scope.keyimages);
          console.log(query);
          spinner.classed('hidden', false);
          $http({
            url: '/api/search',
            method: "GET",
            params: query
          }).then(response => {
            let msg = response.data;
            let images = database.searchImage(msg.map(d => d.id));
            event.emit(event.SEMANTICQUERYRESULT, images);
            // scope.images = images;
            // scope.basepage = 1;
            // scope.currentpage = 1;
            // scope.captions = images.map(d => d.caption[0].charAt(0).toUpperCase() + d.caption[0].slice(1));
            // scope.clickPage(1);
            spinner.classed('hidden', true);
          });
        }
        scope.removeWordConstructor = function($index) {
          scope.word.parents.splice($index, 1);
          if (scope.word.parentIndex >= scope.word.parents.length) {
            scope.word.parentIndex = scope.word.parents.length - 1;
          }
        };
        scope.selectWordConstructor = function($index) {
          console.log($index);
          scope.word.parentIndex = $index;
        };
        scope.reConstructWord = function() {
          let data = angular.copy(scope.word);
          if (data.parents.length > 0) {
            let tmp = data.parents[0];
            data.parents[0] = data.parents[data.parentIndex];
            data.parents[data.parentIndex] = tmp;
          }
          spinner.classed('hidden', false);
          console.log('reconstruct', data);
          return $http({
              url: '/api/project/word/'+data.text,
              method: "GET",
              params: data
            }).then(response => {
              let msg = response.data;
              console.log(msg);
              event.emit(event.DATASETCHANGED, msg);
              database.configure(msg);
              spinner.classed('hidden', true);
            });
        };
        scope.selectImageConstructor = function ($index) {
          scope.image.parentIndex = $index;
        };
        scope.reConstructImage = function() {
          let data = angular.copy(scope.image);
          if (data.parents.length > 0) {
            let tmp = data.parents[0];
            data.parents[0] = data.parents[data.parentIndex];
            data.parents[data.parentIndex] = tmp;
          }
          spinner.classed('hidden', false);
          console.log('reconstruct', data);
          return $http({
            url: '/api/project/image/' + data.id,
            method: "GET",
            params: data
          }).then(response => {
            let msg = response.data;
            console.log(msg);
            event.emit(event.DATASETCHANGED, msg);
            database.configure(msg);
            spinner.classed('hidden', true);
          });
        };


        let container = d3.select(element[0]);
        let search_input = container.select('#search-keyword');
        let add_query_word = container.select('#add-query-word');
        let search_submit = container.select('.search-submit');
        let fuilist = container.select('.fui-list');
        let spinner = container.select('.spinner');
        let dashboard = container.select('.dashboard');

        // Submit event
        search_submit.on('click', function() {
          d3.event.preventDefault();
          let text = search_input.node().value;
          if (text.length > 0) {
            // scope.$apply(function () {
            //   addWord(scope.keywords, text.charAt(0).toUpperCase() + text.slice(1).toLowerCase());
            // });
            event.emit(event.SEARCHKEYWORD, { word: text.toLowerCase() });
          }
        });
        search_input.on('keypress', function() {
          // d3.event.preventDefault();
          if (d3.event.keyCode != 13) return;
          d3.event.preventDefault();
          search_submit.node().click();
        });
        add_query_word.on('keypress', function() {
          if (d3.event.keyCode != 13) return;
          d3.event.preventDefault();
          let text = add_query_word.node().value;     
          if (text.length > 0) {
            scope.safeApply(function () {
              addWord(scope.keywords, text.charAt(0).toUpperCase() + text.slice(1).toLowerCase());
            });
          }     
          add_query_word.node().value = '';
        });

        event.on(scope, event.SPECIFYKEYIMAGE, function (msg) {
          console.log(msg);
          scope.safeApply(function () {
            addImage(scope.keyimages, msg.image);
          });          
        });

        event.on(scope, event.SHOWRECONSTRUCT, function (msg) {
          console.log(msg);
          scope.word.text = msg.word;
          scope.word.children = msg.children;
          scope.word.parents = msg.constructors;
          scope.word.parentIndex = 0;
          console.log(scope.word.children);
          scope.image.id = '';
          scope.image.parents = [];
          scope.image.parentIndex = -1;
        });

        event.on(scope, event.SHOWIMAGECONSTRUCTOR, function (msg) {
          console.log(msg);
          scope.image.parents = msg.constructors;
          scope.image.id = msg.id;
          scope.image.parentIndex = 0;
          scope.word.text = '';
          scope.word.children = [];
          scope.word.parents = [];
          scope.word.parentIndex = -1;
        });

      }
    };
  }])
  .name;

function addImage (keyimages, image) {
  for (let keyimage of keyimages) {
    if(keyimage[0].id === image.id) return;
  }
  keyimages.push([image, 'plus']);
}

function addWord (keywords, word) {
  for (let keyword of keywords) {
    if (keyword[0] === word) return;
  }
  keywords.push([word, 'plus']);
}

function obtainQuery (keywords, keyimages) {
  let query = {
    'include_word': [],
    'include_image': [],
    'exclude_word': [],
    'exclude_image': []
  }
  for (let x of keywords) {
    if (x[1] === 'plus')
      query.include_word.push(x[0].toLowerCase())
    else
      query.exclude_word.push(x[0].toLowerCase())
  }
  for (let x of keyimages) {
    if (x[1] === 'plus')
      query.include_image.push(x[0].id)
    else
      query.exclude_image.push(x[0].id)    
  }
  return query;
}

function updatePage(scope, direct) {
  let n = 5;
  let links = 3;
  let images = scope.images;
  let maxPage = images.length % n === 0? images.length / n : Math.floor(image.length / n) + 1;
  maxPage -= links - 1;
  if (direct === 'prev') {
    scope.basepage = Math.max(scope.basepage - 1, 1);
  }
  if (direct === 'next') {
    scope.basepage = Math.min(scope.basepage + 1, maxPage);
  }
}

function pagination(scope) {
  let images = scope.images;
  let n = 5; //image per page
  if (images.length < n) 
    return false;
  return true;
};
import angular from 'angular';
import uiRouter from 'angular-ui-router';
import routing from './main.routes';
import * as d3 from 'd3';

export class MainController {
  level = 0;
  scale = 1;
  offset = [0, 0];
  transition = [];
  query = {
    keywords: [['Cat', 'plus'], ['Dog', 'plus'], ['Boy', 'plus']],
    keyimages: []
  };
  locateText = '';

  /*@ngInject*/
  constructor($http, $scope, socket, event, database, $stateParams) {
    this.$http = $http;
    this.socket = socket;
    this.event = event;
    this.database = database;
    this.$scope = $scope;
    this.$stateParams = $stateParams;
    $scope.$safeApply = function (fn) {
      var phase = this.$root.$$phase;
      if (phase == '$apply' || phase == '$digest')
        this.$eval(fn);
      else 
        this.$apply(fn);
    };

    $scope.$on('$destroy', function() {
      socket.unsyncUpdates('thing');
    });
  }

  $onInit() {
    let msg = {};
    let route;
    console.log(this.$stateParams.mode);
    if (this.$stateParams.mode === 'cnn') {
      route = '/api/project/cnnstep1';
    }
    else if (this.$stateParams.mode === 'low') {
      route = '/api/project/lowstep1';
    }
    else {
      route = '/api/project';
    }
    console.log(route);
    this.$http.get(route)
      .then(response => {
        msg = response.data;
        console.log(msg);
        if (msg.image && msg.word) {
          this.event.emit(this.event.DATASETCHANGED, msg);
          this.database.configure(msg);
          this.msg = msg;
        }
      });
  }

  expand() {
    let self = this;
    let pre = this.level;
    self.level = Math.min(self.level + 1, 50);
    if (pre === this.level) return;
    self.$scope.$safeApply(function() {
      self.scale = (self.level * 0.5) + 1;
    });
    console.log('expand');
  }

  contract() {
    let self = this;
    let pre = this.level;
    self.level = Math.max(self.level - 1, 0);
    if (pre === this.level) return;
    self.$scope.$safeApply(function() {
      self.scale = (self.level * 0.5) + 1;
    });
    console.log('contract');
  }

  move(dx, dy) {
    let self = this;
    self.$scope.$safeApply(function() {
      self.offset = [
        self.offset[0] + (dx/self.scale),
        self.offset[1] + (dy/self.scale)
      ]
    });
    // console.log('move', self.offset);
  }

  deleteQuery(index, type) {
    let self = this;
    if (type === 'word') {
      self.query.keywords.splice(index, 1);
    }
    else {
      self.query.keyimages.splice(index, 1);  
    }
  }

  switchAction = function (index, type) {
    let self = this;
    let data = type === 'word' ? self.query.keywords[index] : self.query.keyimages[index];
    if (data[1] === 'plus')
      data[1] = 'minus';
    else
      data[1] = 'plus';
  }

  locateTo = function(word) {
    this.locateText = word;
    console.log('locate', this.locateText);
  }
}

export default angular.module('semanticImageVisApp.main', [uiRouter])
  .config(routing)
  .component('main', {
    template: require('./main.html'),
    controller: MainController
  })
  .name;

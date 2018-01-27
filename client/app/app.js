'use strict';

import angular from 'angular';
// import ngAnimate from 'angular-animate';
import ngCookies from 'angular-cookies';
import ngResource from 'angular-resource';
import ngSanitize from 'angular-sanitize';
import 'angular-socket-io';

import uiRouter from 'angular-ui-router';
import uiBootstrap from 'angular-ui-bootstrap';
// import ngMessages from 'angular-messages';
// import ngValidationMatch from 'angular-validation-match';


import {
  routeConfig
} from './app.config';

import _Auth from '../components/auth/auth.module';
import account from './account';
import admin from './admin';
import navbar from '../components/navbar/navbar.component';
import footer from '../components/footer/footer.component';
import densemap from '../components/densemap/densemap.component';
import scatterplot from '../components/scatterplot/scatterplot.component';
import galaxy from '../components/galaxy/galaxy.component';
import leftpanel from '../components/leftpanel/leftpanel.component';
import bucket from '../components/bucket/bucket.component';
import solar from '../components/solar/solar.component';
import main from './main/main.component';
import constants from './app.constants';
import util from '../components/util/util.module';
import socket from '../components/socket/socket.service';
import directive from '../directives/directive.module';
import service from '../services';

import './app.scss';

angular.module('semanticImageVisApp', [ngCookies, ngResource, ngSanitize, 'btford.socket-io',
  uiRouter, uiBootstrap, _Auth, account, admin, navbar, footer, densemap, scatterplot, galaxy, leftpanel, bucket, solar, main, constants, socket, util, directive, service
])
  .config(routeConfig)
  .run(function($rootScope, $location, Auth) {
    'ngInject';
    // Redirect to login if route requires auth and you're not logged in

    $rootScope.$on('$stateChangeStart', function(event, next) {
      Auth.isLoggedIn(function(loggedIn) {
        if(next.authenticate && !loggedIn) {
          $location.path('/login');
        }
      });
    });
  });

angular.element(document)
  .ready(() => {
    angular.bootstrap(document, ['semanticImageVisApp'], {
      strictDi: true
    });
  });
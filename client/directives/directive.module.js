'use strict';

import angular from 'angular';

import browser from './browser/browser.directive';
import starry from './starry/starry.directive';
import searchInterface from './searchInterface/searchInterface.directive';
import drawing from './drawing/drawing.directive';
import msdwheel from './msdwheel/msdwheel.directive';
import msddrag from './msddrag/msddrag.directive';
import transattr from './transattr/transattr.directive';

export default angular.module('semanticImageVisApp.directive', [ browser, starry, searchInterface, drawing, msddrag, msdwheel, transattr ])
  .name;
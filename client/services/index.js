'use strict';

import angular from 'angular';
import event from './event/event.service';
import database from './database/database.service';

export default angular.module('semanticImageVisApp.service', [ event, database ])
  .name;
'use strict';

var express = require('express');
var controller = require('./project.controller');

var router = express.Router();

router.get('/', controller.DefaultProjection);
router.get('/lowstep1', controller.LowProjection);
router.get('/cnnstep1', controller.CnnProjection);
router.get('/word/:word', controller.ReconstructWord);
router.get('/image/:id', controller.ReconstructImage);
router.get('/updatelabel/1', controller.UpdateClusters);

module.exports = router;
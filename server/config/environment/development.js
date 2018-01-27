'use strict';
/*eslint no-process-env:0*/

// Development specific configuration
// ==================================
module.exports = {

  // MongoDB connection options
  mongo: {
    uri: 'mongodb://10.76.2.57/imagevis'
  },

  // Seed database on startup
  seedDB: true

};

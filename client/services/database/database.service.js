'use strict';

import angular from 'angular';

// Return a function to search word
let SearchWord = function (words) {
  let word2id = {};
  words.forEach((d, i) => {
    word2id[d.word] = i;
  });
  return function (word) {
    if (!word2id.hasOwnProperty(word)) return;
    return words[word2id[word]];
  };
};

// Return a function to search image
let SearchImage = function (images) {
  let image2id = {};
  images.forEach((d, i) => {
    image2id[d.id] = i;
  });
  return function (id) {
    if (!image2id.hasOwnProperty(id)) return;
    return images[image2id[id]];
  };
};

export default angular.module('service.database', [])
  .factory('database', ['$rootScope', function ($rootScope) {
    let images, words;
    let database = {};
    let searchImage, searchWord;
    database.configure = function(data) {
      images = data.image;
      words = data.word;
      searchImage = SearchImage(images);
      searchWord = SearchWord(words);
    }
    database.searchImage = function(ids) {
      let result = [];
      for (let id of ids) {
        result.push(searchImage(id));
      }
      return result.filter(d => d != undefined);
    };
    database.searchWord = function(words) {
      let result = [];
      for (let word of words) {
        result.push(searchWord(word));
      }
      return result.filter(d => d != undefined);     
    }
    return database;
  }])
  .name;
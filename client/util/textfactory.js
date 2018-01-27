'use strict';

import Singular from '../resource/singular';
import Stopword from '../resource/stopword';

// Compute the tf-idf value
let TF_IDF = function(X) {
  let idf = new Map();
  let tfs = [];
  for (let sentence of X) {
    sentence = sentence.split(' ');
    let tf = new Map();
    for (let word of sentence) {
      if (Stopword[word]) continue;
      word = Singular[word] || word;
      if (!tf.has(word)) tf.set(word, 1);
      else tf.set(word, tf.get(word) + 1);
    }
    for (let word of tf.keys()) {
      if (!idf.has(word)) idf.set(word, 1);
      else idf.set(word, idf.get(word) + 1);
    }
    tfs.push(tf);
  }
  for (let word of idf.keys()) {
    idf.set(word, Math.log(X.length / idf.get(word)));
  }
  for (let tf of tfs) {
    for (let word of tf.keys()) {
      tf.set(word, tf.get(word) * idf.get(word));
    }
  }
  return { tfs, idf };
};

let Frequent = function(X, keyword) {
  let occurance = {};
  let result = [];
  for (let sentence of X) {
    sentence = sentence.split(' ');
    let occur = false;
    for (let word of sentence) {
      if (word === keyword) {
        occur = true;
        break;
      }
    }
    if (!occur) continue;
    for (let word of sentence) {
      if (Stopword[word]) continue;
      occurance[word] = occurance[word] ? occurance[word] + 1 : 1;
    }
  }
  delete(occurance[keyword]);
  for (let word of Object.keys(occurance)) {
    result.push({ word: word, times: occurance[word] });
  }
  result.sort((a, b) => b.times - a.times);
  return result;
};

export default { TF_IDF, Frequent };
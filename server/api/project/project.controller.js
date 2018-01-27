/**
 * Using Rails-like standard naming convention for endpoints.
 * GET     /api/things              ->  index
 * POST    /api/things              ->  create
 * GET     /api/things/:id          ->  show
 * PUT     /api/things/:id          ->  upsert
 * PATCH   /api/things/:id          ->  patch
 * DELETE  /api/things/:id          ->  destroy
 */

'use strict';

import jsonpatch from 'fast-json-patch';
import Image from '../image/image.model';
import Word from '../word/word.model';
import Xto2d from './project.service';
import keyword from './keyword';
import reconstruct from './reconstruct.service';
import clustering from 'density-clustering';

function IsKeyword() {
  let hash = {};
  keyword.forEach(d => hash[d] = 1);
  return function(word) {
    return hash[word];
  };
}

function respondWithResult(res, statusCode) {
  statusCode = statusCode || 200;
  return function(entity) {
    if(entity) {
      return res.status(statusCode).json(entity);
    }
    return null;
  };
}

function patchUpdates(patches) {
  return function(entity) {
    try {
      jsonpatch.apply(entity, patches, /*validate*/ true);
    } catch(err) {
      return Promise.reject(err);
    }

    return entity.save();
  };
}

function removeEntity(res) {
  return function(entity) {
    if(entity) {
      return entity.remove()
        .then(() => {
          res.status(204).end();
        });
    }
  };
}

function handleEntityNotFound(res) {
  return function(entity) {
    if(!entity) {
      res.status(404).end();
      return null;
    }
    return entity;
  };
}

function handleError(res, statusCode) {
  statusCode = statusCode || 500;
  return function(err) {
    res.status(statusCode).send(err);
  };
}

export function DefaultProjection(req, res) {
  let image_projection = { 'id': 1, 'origin_constructors': 1, 'caption': 1, 'index': 1, 'solution': 1, 'label': 1 };
  let word_projection = { 'word': 1, 'origin_constructors': 1, 'index': 1, 'solution': 1, 'label': 1 };  
  let data = {};
  return Image.find(null, image_projection).exec()
    .then((image) => {
      data.image = image;
      return Word.find(null, word_projection).exec();
    })
    .then((word) => {
      data.word = word;
      return data;
    })
    .then((data) => {
      data.image = data.image.sort((a, b) => a.index - b.index);
      data.word = data.word.sort((a, b) => a.index - b.index);
      let imageConstructors = data.image.map(d => d.origin_constructors);
      let wordConstructors = data.word.map(d => d.origin_constructors);
      let result = {};
      result.image = data.image.map((d, i) => {
        return { _id: d._id, id: d.id, caption: d.caption, constructors: imageConstructors[i], solution: d.solution, index: d.index, label: d.label };
      });
      result.word = data.word.map((d, i) => {
        return { _id: d._id, word: d.word, constructors: wordConstructors[i], solution: d.solution, index: d.index, label: d.label };
      });

      // reset the constructors
      updateWord(result.word);
      updateImage(result.image);
      return result;
    })
    .then(respondWithResult(res))
    .catch(handleError(res));
};

export function LowProjection(req, res) {
  let image_projection = { 'id': 1, 'origin_constructors': 1, 'caption': 1, 'index': 1, 'colorhistogram_solution_step1': 1 };
  let word_projection = { 'word': 1, 'origin_constructors': 1, 'index': 1, 'colorhistogram_solution_step1': 1 };  
  let data = {};
  return Image.find(null, image_projection).exec()
    .then((image) => {
      data.image = image;
      return Word.find(null, word_projection).exec();
    })
    .then((word) => {
      data.word = word;
      return data;
    })
    .then((data) => {
      data.image = data.image.sort((a, b) => a.index - b.index);
      data.word = data.word.sort((a, b) => a.index - b.index);
      let imageConstructors = data.image.map(d => d.origin_constructors);
      let wordConstructors = data.word.map(d => d.origin_constructors);
      let result = {};
      result.image = data.image.map((d, i) => {
        return { _id: d._id, id: d.id, caption: d.caption, constructors: imageConstructors[i], solution: d.colorhistogram_solution_step1, index: d.index };
      });
      result.word = data.word.map((d, i) => {
        return { _id: d._id, word: d.word, constructors: wordConstructors[i], solution: d.colorhistogram_solution_step1, index: d.index };
      });
      updateWord(result.word);
      updateImage(result.image);
      console.log(Object.keys(result));
      return result;
    })
    .then(respondWithResult(res))
    .catch(handleError(res));
};

export function CnnProjection(req, res) {
  let image_projection = { 'id': 1, 'origin_constructors': 1, 'caption': 1, 'index': 1, 'solution_step1': 1 };
  let word_projection = { 'word': 1, 'origin_constructors': 1, 'index': 1, 'solution_step1': 1 };  
  let data = {};
  return Image.find(null, image_projection).exec()
    .then((image) => {
      data.image = image;
      return Word.find(null, word_projection).exec();
    })
    .then((word) => {
      data.word = word;
      return data;
    })
    .then((data) => {
      data.image = data.image.sort((a, b) => a.index - b.index);
      data.word = data.word.sort((a, b) => a.index - b.index);
      let imageConstructors = data.image.map(d => d.origin_constructors);
      let wordConstructors = data.word.map(d => d.origin_constructors);
      let result = {};
      result.image = data.image.map((d, i) => {
        return { _id: d._id, id: d.id, caption: d.caption, constructors: imageConstructors[i], solution: d.solution_step1, index: d.index };
      });
      result.word = data.word.map((d, i) => {
        return { _id: d._id, word: d.word, constructors: wordConstructors[i], solution: d.solution_step1, index: d.index };
      });
      updateWord(result.word);
      updateImage(result.image);
      return result;
    })
    .then(respondWithResult(res))
    .catch(handleError(res));
};

export function ReconstructWord(req, res) {
  let word = req.params.word;
  let query = req.query;
  if (query.parents) {
    if (query.parents instanceof Array) {
      query.constructors = query.parents.map(d => JSON.parse(d));;
    }
    else {
      query.constructors = [query.parents].map(d => JSON.parse(d));;
    }
    console.log('reconstruct', query.text, 'parent', query.constructors);
  }
  else {
    console.log('reconstruct', query.text, 'parent', 'none');
    query.constructors = [];
  }
  let image_projection = { 'id': 1, 'solution_step1': 1, 'constructors': 1, 'caption': 1, 'index': 1 };
  let word_projection = { 'word': 1, 'solution_step1': 1, 'constructors': 1, 'projections': 1, 'index': 1 };
  // let isKeyword = IsKeyword();
  let data = {};
  return Image.find(null, image_projection).exec()
    .then((image) => {
      data.image = image;
      return Word.find(null, word_projection).exec();
    })
    .then((word) => {
      data.word = word;
      return data;
    })
    .then((data) => {
      data.image = data.image.sort((a, b) => a.index - b.index);
      data.word = data.word.sort((a, b) => a.index - b.index);
      for (let i = 0; i < data.image.length; i++) {
        if (i !== data.image[i].index) console.log(false);
      }
      let wordIndex;
      let hash = {};
      for (let i = 0; i < data.word.length; i++) {
        if (data.word[i].word === query.text)
          wordIndex = i;
      }
      console.log(wordIndex);
      let wordProjections = data.word.map(d => d.projections);
      let imageConstructors = data.image.map(d => d.constructors);
      let wordConstructors = data.word.map(d => d.constructors);
      wordConstructors[wordIndex] = query.constructors;
      let result = {};
      result.image = data.image.map((d, i) => {
        return { _id: d._id, id: d.id, caption: d.caption, constructors: imageConstructors[i], index: d.index };
      });
      result.word = data.word.map((d, i) => {
        return { _id: d._id, word: d.word, constructors: wordConstructors[i], index: d.index };
      });
      updateWord([result.word[wordIndex]]);
      let newsolution = reconstruct.reconstructWord(wordConstructors, imageConstructors, wordProjections);
      for (let i = 0; i < newsolution.image.length; i++) {
        result.image[i].solution = newsolution.image[i];
        if (!newsolution.image[i]) console.log(i);
      }
      for (let i = 0; i < newsolution.word.length; i++) {
        result.word[i].solution = newsolution.word[i];
      }
      return result;
    })
    .then(respondWithResult(res))
    .catch(handleError(res));
}

export function ReconstructImage(req, res) {
  let query = req.query;
  if (query.parents) {
    if (query.parents instanceof Array) {
      query.constructors = query.parents.map(d => JSON.parse(d));
    }
    else {
      query.constructors = [query.parents].map(d => JSON.parse(d));;
    }
    console.log('reconstruct', query.id, 'parent', query.constructors);
  }
  else {
    console.log('reconstruct', query.id, 'parent', 'none');
    query.constructors = [];
  }
  let image_projection = { 'id': 1, 'constructors': 1, 'caption': 1, 'index': 1 };
  let word_projection = { 'word': 1, 'constructors': 1, 'solution': 1, 'index': 1 };
  // let isKeyword = IsKeyword();
  let data = {};
  return Image.find(null, image_projection).exec()
    .then((image) => {
      data.image = image;
      return Word.find(null, word_projection).exec();
    })
    .then((word) => {
      data.word = word;
      return data;
    })
    .then((data) => {
      data.image = data.image.sort((a, b) => a.index - b.index);
      data.word = data.word.sort((a, b) => a.index - b.index);
      for (let i = 0; i < data.image.length; i++) {
        if (i !== data.image[i].index) console.log(false);
      }
      let imageIndex;
      let hash = {};
      for (let i = 0; i < data.image.length; i++) {
        if (data.image[i].id === query.id)
          imageIndex = i;
      }
      console.log(imageIndex);
      let wordPositions = data.word.map(d => d.solution);
      let imageConstructors = data.image.map(d => d.constructors);
      let wordConstructors = data.word.map(d => d.constructors);
      imageConstructors[imageIndex] = query.constructors;
      let result = {};
      result.image = data.image.map((d, i) => {
        return { _id: d._id, id: d.id, caption: d.caption, constructors: imageConstructors[i], index: d.index };
      });
      result.word = data.word.map((d, i) => {
        return { _id: d._id, word: d.word, constructors: wordConstructors[i], index: d.index };
      });
      updateImage([result.image[imageIndex]]);
      let newsolution = reconstruct.reConstructImage(wordPositions, imageConstructors);
      for (let i = 0; i < newsolution.image.length; i++) {
        result.image[i].solution = newsolution.image[i];
        if (!newsolution.image[i]) console.log(i);
      }
      for (let i = 0; i < newsolution.word.length; i++) {
        result.word[i].solution = newsolution.word[i];
      }
      return result;
    })
    .then(respondWithResult(res))
    .catch(handleError(res));
}

export function UpdateClusters(req, res) {
  let query = req.query;
  let image_projection = { 'id': 1, 'constructors': 1, 'caption': 1, 'index': 1, 'label': 1 };
  let word_projection = { 'word': 1, 'constructors': 1, 'solution': 1, 'index': 1, 'label': 1 };
  // let isKeyword = IsKeyword();
  let data = {};
  return Image.find(null, image_projection).exec()
    .then((image) => {
      data.image = image;
      return Word.find(null, word_projection).exec();
    })
    .then((word) => {
      data.word = word;
      return data;
    })
    .then((data) => {
      data.image = data.image.sort((a, b) => a.index - b.index);
      data.word = data.word.sort((a, b) => a.index - b.index);
      let result = {};
      result.image = data.image.map((d, i) => {
        return { _id: d._id, label: query.image[i] };
      });
      result.word = data.word.map((d, i) => {
        return { _id: d._id, label: query.word[i] };
      });
      updateImageLabel(result.image);
      updateWordLabel(result.word);
    })
    .then(respondWithResult(res))
    .catch(handleError(res));
}

function updateImageLabel(images) {
  for (let d of images) {
    Image.findByIdAndUpdate(d._id, { $set: { 'label': d.label } }, function (error) {
      if (error) console.log(error);
    });
  }
}

function updateWordLabel(words) {
  for (let d of words) {
    Word.findByIdAndUpdate(d._id, { $set: { 'label': d.label } }, function (error) {
      if (error) console.log(error);
    });
  }
}

function updateImage(images) {
  for (let d of images) {
    Image.findByIdAndUpdate(d._id, { $set: { 'constructors': d.constructors } }, function (error) {
      if (error) console.log(error);
    });
  }
}
function updateWord(words) {
  for (let d of words) {
    Word.findByIdAndUpdate(d._id, { $set: { 'constructors': d.constructors } }, function (error) {
      if (error) console.log(error);
    });
  }
}

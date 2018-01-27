'use strict';

import mongoose from 'mongoose';
// import {registerEvents} from './image.events';

var WordSchema = new mongoose.Schema({
  word: String,
  vec: [Number],
  solution: [Number],
  children: [Number],
  constructors: [],
  projections: [],
  index: Number,
  origin_constructors: [],
  colorhistogram_solution_step1: [Number],
  solution_step1: [Number],
  label: Number
}, { collection: 'word' });

// registerEvents(ImageSchema);
export default mongoose.model('Word', WordSchema);
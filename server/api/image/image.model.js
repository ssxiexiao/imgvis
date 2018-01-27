'use strict';

import mongoose from 'mongoose';
// import {registerEvents} from './image.events';

var ImageSchema = new mongoose.Schema({
  id: String,
  cnn_vec: [Number],
  caption: [],
  caption_vec: [Number],
  solution: [Number],
  constructors: [],
  index: Number,
  origin_constructors: [],
  colorhistogram_solution_step1: [Number],
  solution_step1: [Number],
  label: Number
}, { collection: 'image' });

// registerEvents(ImageSchema);
export default mongoose.model('Image', ImageSchema);
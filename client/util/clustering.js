'use strict';
import clustering from 'density-clustering';
import * as d3 from 'd3';
import mathFactory from './mathfactory';

// Compute the group of data
let ComputeGroup = function(X, radius = 0.03, n = 15) {
  // console.log(X);
  let result = {};
  // let dbscan = new clustering.DBSCAN();
  // let dbclusters = dbscan.run(X, radius, n);

  // result.groups = [X.map((d,i) => i)];
  // return result;
  
  // let optics = new clustering.OPTICS();
  // let opclusters = optics.run(X, radius, n);

  // let clusters = opclusters;

  // let centers = clusters.map(d => {
  //   let points = d.map(i => X[i]);
  //   let mean = [d3.mean(points.map(p => p[0])), d3.mean(points.map(p => p[1]))];
  //   return mean;
  // });

  // let SX = centers;
  // let kmeans = new clustering.KMEANS();
  // let centerclusters = kmeans.run(SX, 8);
  // let groups = [];
  // for (let g of centerclusters) {
  //   let tmp = [];
  //   for (let index of g) {
  //     tmp = tmp.concat(clusters[index]);
  //   }
  //   tmp.sort((a, b) => a - b);
  //   groups.push(tmp);
  // }
  // groups = groups.sort((a, b) => a[0] - b[0]);
  // // let groups = clusters;
  // result.groups = groups;
  // // console.log(clusters)
  // // result.noise = dbscan.noise;
  let kmeans = new clustering.KMEANS();
  let clusters = kmeans.run(X, 8);
  result.groups = clusters;
  result.noise = [];
  return result;
};

let DClustering = function(X, dc) {
  let D = [], rho=[], delta=[];
  for (let i = 0; i < X.length; i++) {
    D.push([]);
    for (let j = 0; j < X.length; j++) {
      if (i > j)
        D[i].push(D[j][i])
      else if (i === j)
        D[i].push(0)
      else
        D[i].push(mathFactory.Euclidean_distance(X[i], X[j]));
    }
  }
  for (let i = 0; i < X.length; i++) {
    let tmp_rho = 0;
    for (let j = 0; j < X.length; j++) {
      if (D[i][j] < dc) tmp_rho++;
    }
    rho.push(tmp_rho);
  } 
  for(let i = 0; i < X.length; i++) {
    let tmp_delta = Infinity;
    let maximum = true;
    for (let j = 0; j < X.length; j++) {
      if (rho[j] > rho[i]) {
        maximum = false;
        tmp_delta = Math.min(D[i][j], tmp_delta);
      }
    }
    if (maximum)
      tmp_delta = d3.max(D[i]);
    delta.push(tmp_delta);
  }

};

export default ComputeGroup;
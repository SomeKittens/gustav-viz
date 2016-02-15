'use strict';

/**
 * Some demo methods to get Gustav up and running for testing
 */

// Require the things
let Observable = require('@reactivex/rxjs').Observable;
let gustav = require('gustav').gustav;

let sauce = () => Observable.interval(1000);

let double = (iO) => iO.flatMap(datum => Observable.fromArray([datum * 2, datum]));
let ident = iO => iO.do(() => {});
let half = (iO) => iO.filter(datum => datum % 2);

let logger = (iO) => iO.subscribe(() => {});

gustav.source('sauce', sauce);
gustav.transformer('double', double);
gustav.transformer('half', half);
gustav.transformer('ident', ident);
gustav.sink('logger', logger);

let s = gustav.createWorkflow('name')
  .source('sauce');
let s0 = s.clone();

let d = s.transf('double')
          .transf('ident');
let h = s0.transf('half')
          .transf('double');

h.tap('logger', null, {
  gid: 'other'
});

let wf = d
  .merge(h)
  .sink('logger');

module.exports = [wf];
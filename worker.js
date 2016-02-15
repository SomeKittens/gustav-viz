'use strict';

let fs = require('fs');
let express = require('express');
let serveStatic = require('serve-static');
let path = require('path');
let gustav = require('gustav');
let R = require('ramda');

// TODO: Be able to point to an external source for either:
//   - Workflow definitions
//   - Some controller of running workflows to tap into
// let workflows = require('./gmethods');
let workflows = require('../../projects/wikiparse/dist/wf').default;
console.log(workflows);

module.exports.run = (worker) => {
  console.log('   >> Worker PID:', process.pid);

  let app = require('express')();

  let httpServer = worker.httpServer;
  let scServer = worker.scServer;

  app.use(serveStatic(path.resolve(__dirname, 'public')));


  httpServer.on('request', app);

  console.log(`pid ${process.pid} starting workflow`);
  let meta = channel => {
    let cachedItems = [];
    setInterval(() => {
      if (!cachedItems.length) { return; }
      scServer.exchange.publish(channel, cachedItems);
      cachedItems = [];
    }, 50);
    return R.curry((nodeName, datum) => {
      cachedItems.push({
        nodeName,
        datum
      });
    });
  };

  let wfJSONs = [];

  workflows.map(wf => {
    wf.addMetadataFunction(meta(wf.name));
    wf.start();

    let json = wf.toJSON();

    let indexToIdMap = [];
    json.forEach((node, idx) => {
      indexToIdMap[node.id] = idx;
    });

    wfJSONs.push({
      name: wf.name,
      nodes: json,
      links: json.reduce((links, node) => {
        if (!node.dataFrom) { return links; }
        node.dataFrom.forEach(df => links.push({
          target: indexToIdMap[node.id],
          source: indexToIdMap[df]
        }));
        return links;
      }, [])
    });
  });

  app.get('/graphdef', (req, res) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'X-Requested-With');

    res.json(wfJSONs);
  });
  /*
    In here we handle our incoming realtime connections and listen for events.
  */
  let count = 0;
  scServer.on('connection', (socket) => {
    let id = count++;
    console.log(`client ${id} connected, pid ${process.pid}`);

    socket.on('disconnect', () => {
      console.log(`client ${id} disconnected, pid ${process.pid}`);
    });
  });
};

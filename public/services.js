'use strict';

let app = angular.module('gSankey');

class StreamHandler {
  constructor($rootScope) {
    this.handlers = {};
    this.$rootScope = $rootScope;
    this.socket = socketCluster.connect({
      port: 8080
    });

    this.socket.on('error', err => {
      throw 'Socket error - ' + err;
    });
  }
  initWorkflow (name) {
    if (this.handlers[name]) {
      throw new Error('Attempted to init workflow that already exists: ' + name);
    }
    let someWorkflow = this.socket.subscribe(name);
    this.handlers[name] = [() => this.$rootScope.$evalAsync()];
    someWorkflow.watch(data => this.handlers[name].forEach(handler => handler(data)));
  }
  addHandler (wf, handler) {
    if (!this.handlers[wf]) {
      this.initWorkflow(wf);
    }
    this.handlers[wf].push(handler);
  }
}

app.service('streamHandler', StreamHandler);

class WfModel {
  constructor($http) {
    this.modelFetchPromise = $http.get('http://localhost:8080/graphdef').then(allData => allData.data);
  }
  getModel () {
    return this.modelFetchPromise
  }
}

app.service('wfModel', WfModel);

app.service('config', function () {
  this.node = {
    radius: 30,
    border: 5,
    textPadding: 25
  };

  this.link = {
    width: 14,
    color: 'red'
  };

  this.msgBall = {
    radius: 6,
    ttl: 2000
  };


  this.node.width = (this.node.radius + this.node.border) * 2;
});
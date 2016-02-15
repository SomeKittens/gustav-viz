'use strict';
var app = angular.module('gSankey');
var StreamHandler = (function () {
    function StreamHandler($rootScope) {
        this.handlers = {};
        this.$rootScope = $rootScope;
        this.socket = socketCluster.connect({
            port: 8080
        });
        this.socket.on('error', function (err) {
            throw 'Socket error - ' + err;
        });
    }
    StreamHandler.prototype.initWorkflow = function (name) {
        var _this = this;
        if (this.handlers[name]) {
            throw new Error('Attempted to init workflow that already exists: ' + name);
        }
        var someWorkflow = this.socket.subscribe(name);
        this.handlers[name] = [function () { return _this.$rootScope.$evalAsync(); }];
        someWorkflow.watch(function (data) { return _this.handlers[name].forEach(function (handler) { return handler(data); }); });
    };
    StreamHandler.prototype.addHandler = function (wf, handler) {
        if (!this.handlers[wf]) {
            this.initWorkflow(wf);
        }
        this.handlers[wf].push(handler);
    };
    return StreamHandler;
})();
app.service('streamHandler', StreamHandler);
var WfModel = (function () {
    function WfModel($http) {
        this.modelFetchPromise = $http.get('http://localhost:8080/graphdef').then(function (allData) { return allData.data; });
    }
    WfModel.prototype.getModel = function () {
        return this.modelFetchPromise;
    };
    return WfModel;
})();
app.service('wfModel', WfModel);

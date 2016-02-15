'use strict';
angular.module('gSankey', ['ngMaterial'])
    .config(function ($mdThemingProvider, $mdIconProvider) {
    var rootURL = 'https://rawgit.com/angular/material-start/es5-tutorial/app/';
    // Register the user `avatar` icons
    $mdIconProvider
        .defaultIconSet(rootURL + 'assets/svg/avatars.svg', 128)
        .icon('share', rootURL + 'assets/svg/share.svg', 24)
        .icon('menu', rootURL + 'assets/svg/menu.svg', 24)
        .icon('google_plus', rootURL + 'assets/svg/google_plus.svg', 512)
        .icon('hangouts', rootURL + 'assets/svg/hangouts.svg', 512)
        .icon('twitter', rootURL + 'assets/svg/twitter.svg', 512)
        .icon('phone', rootURL + 'assets/svg/phone.svg', 512);
    $mdThemingProvider.theme('default')
        .primaryPalette('brown')
        .accentPalette('red');
})
    .controller('data', function ($scope, $compile, $timeout, wfModel, streamHandler) {
    var DC = this;
    DC.datums = {};
    wfModel.getModel().then(function (models) {
        console.log('models', models);
        DC.workflows = models;
        DC.active = models[0];
        $timeout(function () { return $compile(document.querySelector('svg'))($scope); });
        models.forEach(function (model) {
            model.nodes.forEach(function (node) { return DC.datums[node.name] = []; });
            streamHandler.addHandler(model.name, function (data) { return data.forEach(function (event) { return DC.datums[event.nodeName].push(event.datum); }); });
        });
    });
    DC.showNodeData = function (nodeName) {
        console.log('showing', nodeName);
        DC.showNode = nodeName;
    };
    DC.selectFlow = function (flowName) {
        DC.active = flowName;
        $timeout(function () { return $compile(document.querySelector('svg'))($scope); });
    };
});

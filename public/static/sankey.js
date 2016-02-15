angular.module('gSankey')
    .component('sankey', {
    bindings: {
        flow: '=',
        activeNode: '='
    },
    template: '<canvas ng-click="$ctrl.handleClick($event)"></canvas>',
    controller: function ($scope, streamHandler) {
        'use strict';
        var _this = this;
        // Declare all the variables!
        var canvas = document.querySelector('canvas');
        // These are set later because right now canvas width/height is 0
        var width, height, center;
        var context = canvas.getContext('2d');
        var nodeNameToIdx;
        var activeGraph;
        var msgs = [];
        var ballColors = ['maroon', 'orange', 'olive', 'purple', 'fuchsia', 'lime', 'green', 'navy', 'blue', 'aqua', 'teal', 'silver', 'gray'];
        var nodeRadius = 50;
        var borderSize = 5;
        var fullRad = nodeRadius + borderSize;
        var msgBallRad = 8;
        var textPadding = 25;
        // Called every time the selected graph changes
        var init = function (n) {
            if (!n) {
                return;
            }
            msgs = [];
            activeGraph = _this.flow;
            // Used when identifying an incoming message
            nodeNameToIdx = activeGraph.nodes.reduce(function (prev, node, idx) {
                prev[node.name] = idx;
                return prev;
            }, {});
            streamHandler.addHandler(_this.flow.name, function (data) {
                data.forEach(function (datum) {
                    // TODO: get all target nodes (instead of just +1)
                    // TODO: object pooling
                    var n = nodeNameToIdx[datum.nodeName];
                    if (n === undefined) {
                        return;
                    }
                    msgs.push({
                        source: n,
                        target: n + 1,
                        timestamp: Date.now(),
                        color: ballColors[Math.floor(Math.random() * ballColors.length)]
                    });
                });
            });
        };
        $scope.$watch(function () { return _this.flow.name; }, init);
        var draw = function () {
            if (!activeGraph) {
                requestAnimationFrame(draw);
                return;
            }
            if (canvas.clientWidth) {
                width = canvas.width = canvas.clientWidth;
                height = canvas.height = canvas.clientHeight;
                center = {
                    x: width / 2,
                    y: height / 2
                };
            }
            else {
                return;
            }
            var nodeSpacing = (width - (fullRad * 2)) / (activeGraph.nodes.length - 1);
            context.fillStyle = 'white';
            context.fillRect(0, 0, width, height);
            activeGraph.nodes.forEach(function (node, idx) {
                node.x = (idx * nodeSpacing) + fullRad;
                node.y = center.y;
                // TODO: add location details to node
                context.beginPath();
                context.arc(node.x, node.y, nodeRadius, 0, 2 * Math.PI, false);
                context.fillStyle = 'green';
                if (_this.activeNode && _this.activeNode.name === node.name) {
                    context.fillStyle = 'orange';
                }
                context.fill();
                context.lineWidth = 5;
                context.strokeStyle = '#003300';
                context.stroke();
                // Label
                context.fillStyle = 'black';
                context.font = '20px sans-serif';
                var w = context.measureText(node.name).width;
                context.fillText(node.name, node.x - (w / 2), node.y + nodeRadius + textPadding);
            });
            activeGraph.links.forEach(function (link) {
                var sauce = activeGraph.nodes[link.source];
                var targ = activeGraph.nodes[link.target];
                context.beginPath();
                context.fillStyle = 'red';
                context.fillRect(sauce.x + msgBallRad, sauce.y - 10, (targ.x - sauce.x - msgBallRad), 20);
            });
            var ballOnScreen = 2000;
            msgs.forEach(function (msg) {
                var now = Date.now();
                if (msg.timestamp + ballOnScreen < now) {
                    msg.done = true;
                    return;
                }
                var sauce = activeGraph.nodes[msg.source];
                var start = sauce.x + (msgBallRad * 2);
                var targ = activeGraph.nodes[msg.target].x - msgBallRad;
                var distance = targ - start;
                var distanceTraveled = Math.floor((now - msg.timestamp) / ballOnScreen * distance);
                context.beginPath();
                context.fillStyle = msg.color;
                context.arc(start + distanceTraveled, sauce.y, msgBallRad, 0, 2 * Math.PI, false);
                context.fill();
            });
            requestAnimationFrame(draw);
        };
        draw();
        function within(within, x, y) {
            if (!x || !y) {
                return false;
            }
            return x + within >= y && x - within <= y;
        }
        this.handleClick = function (e) {
            e.preventDefault();
            // http://stackoverflow.com/a/5932203/1216976
            var totalOffsetX = 0;
            var totalOffsetY = 0;
            var x = 0;
            var y = 0;
            var currentElement = e.target;
            do {
                totalOffsetX += currentElement.offsetLeft - currentElement.scrollLeft;
                totalOffsetY += currentElement.offsetTop - currentElement.scrollTop;
            } while (currentElement = currentElement.offsetParent);
            x = event.pageX - totalOffsetX;
            y = event.pageY - totalOffsetY;
            activeGraph.nodes.some(function (node) {
                if ((within(nodeRadius, x, node.x) && within(nodeRadius, y, node.y))
                    || (within(100, x, node.x) && within(20, y, node.y + nodeRadius + textPadding))) {
                    console.log(node.name);
                    _this.activeNode = node;
                    return true;
                }
            });
        };
    }
});

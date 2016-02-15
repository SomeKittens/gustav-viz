angular.module('gSankey')
.component('sankey', {
  bindings: {
    flow: '=',
    activeNode: '='
  },
  template: '<canvas ng-click="$ctrl.handleClick($event)"></canvas>',
  controller: function ($scope, streamHandler, config) {
    'use strict';

    // Declare all the variables!
    let canvas = document.querySelector('canvas');
    // These are set later because right now canvas width/height is 0
    let width, height;
    let context = canvas.getContext('2d');
    let nodeNameToIdx;
    let activeGraph;
    let msgs = [];
    let ballColors = ['maroon', 'orange', 'olive', 'purple', 'fuchsia', 'lime', 'green', 'navy', 'blue', 'aqua', 'teal', 'silver', 'gray'];
    let path;

    console.log(config);

    // Calculate node positions
    // Ripped off of d3 Sankey stuff
    let recalcNodes = () => {
      // Remove one full node from calculated width
      // This is for padding along the edges
      let sWidth = width - (config.node.width);

      let x = d3
        .sankey()
        .nodeWidth(config.node.width)
        .nodePadding(10)
        .size([sWidth, height])
        .nodes(activeGraph.nodes)
        .links(activeGraph.links)
        .layout(32);

      let columns = activeGraph.nodes.reduce((prev, node) => {
        if (!prev[node.x]) {
          prev[node.x] = [];
        }
        prev[node.x].push(node);
        return prev;
      }, {});
      Object.keys(columns).forEach(key => {
        let numInColumn = columns[key].length;
        let chunkSize = height / numInColumn;
        columns[key].forEach((node, i) => {
          node.y = (i * chunkSize) + (chunkSize / 2);
        });
      });

      activeGraph.nodes.forEach(node => {
        // Sankey tries to make a bar, we have a fixed-height node in the middle
        // node.y = (node.y + node.dy) / 2;
        // Add padding so we don't clip off the edge
        node.x += config.node.width;
      });
    };

    // Called every time the selected graph changes
    let init = n => {
      if (!n) { return; }
      msgs = [];
      activeGraph = this.flow;
      // Used when identifying an incoming message
      // Means every new message is O(1) instead of O(n)
      nodeNameToIdx = activeGraph.nodes.reduce((prev, node, idx) => {
        prev[node.name] = idx;
        return prev;
      }, {});

      activeGraph.links = activeGraph.links.map(link => {
        link.value = 1;
        return link;
      });

      streamHandler.addHandler(this.flow.name, data => {
        data.forEach(datum => {
          // TODO: get all target nodes (instead of just +1)
          // TODO: object pooling
          let n = nodeNameToIdx[datum.nodeName];
          let node = activeGraph.nodes[n];
          if (n === undefined) { return; }

          let color = ballColors[Math.floor(Math.random() * ballColors.length)];
          node.sourceLinks.forEach(ld => {
            let start = {
              x: ld.source.x + (config.msgBall.radius * 2),
              y: ld.source.y
            };
            let end = {
              x: ld.target.x - (config.msgBall.radius * 2),
              y: ld.target.y
            };
            let distance = {
              x: end.x - start.x,
              y: end.y - start.y
            };
            msgs.push({
              start: start,
              distance: distance,
              timestamp: Date.now(),
              color: color
            });
          });
        });
      });
      recalcNodes();
    };

    $scope.$watch(() => this.flow.name, init);

    let draw = () => {
      if (!activeGraph || !canvas.clientWidth) {
        requestAnimationFrame(draw);
        return;
      }

      if (canvas.clientWidth !== width) {
        // Need to recalculate things based on new width
        width = canvas.width = canvas.clientWidth;
        height = canvas.height = canvas.clientHeight;

        recalcNodes();
      }

      context.fillStyle = 'white';
      context.fillRect(0, 0, width, height);

      // Paint nodes
      activeGraph.nodes.forEach((node, idx) => {
        context.beginPath();
        context.arc(node.x, node.y, config.node.radius, 0, 2 * Math.PI);
        context.fillStyle = 'green';
        if (this.activeNode && this.activeNode.name === node.name) {
          context.fillStyle = 'orange';
        }
        context.fill();

        context.lineWidth = config.node.border;
        context.strokeStyle = '#003300';
        context.stroke();

        // Label
        context.fillStyle = 'black';
        context.font = '20px sans-serif';
        var w = context.measureText(node.name).width;
        context.fillText(node.name, node.x - (w/2), node.y + config.node.radius + config.node.textPadding);
      });

      // Paint intra-node links
      activeGraph.links.forEach(link => {
        context.beginPath();
        context.moveTo(link.source.x + (config.msgBall.radius * 2), link.source.y);
        context.lineTo(link.target.x - (config.msgBall.radius), link.target.y);
        context.lineWidth = config.link.width;
        context.strokeStyle = config.link.color;
        context.lineCap = 'round';
        context.stroke();
      });

      // Paint msg balls
      let now = Date.now();
      msgs.forEach(msg => {
        // Has it reached the target node?
        if (msg.timestamp + config.msgBall.ttl < now) {
          msg.done = true;
          return;
        }

        // How far along have we gone?
        let distanceTraveledX = Math.floor((now - msg.timestamp) / config.msgBall.ttl * msg.distance.x);
        let distanceTraveledY = Math.floor((now - msg.timestamp) / config.msgBall.ttl * msg.distance.y);

        context.beginPath();
        context.fillStyle = msg.color;
        context.arc(msg.start.x + distanceTraveledX, msg.start.y + distanceTraveledY, config.msgBall.radius, 0, 2 * Math.PI, false);
        context.fill();
      });

      requestAnimationFrame(draw);
    };

    // Start animating
    draw();

    function within(margin, x, y) {
      if (!x || !y) { return false; }
      return x + margin >= y && x - margin <= y;
    }

    // If the user clicks on a node, set that one to active
    this.handleClick = (e) => {
      e.preventDefault();
      // http://stackoverflow.com/a/5932203/1216976
      let totalOffsetX = 0;
      let totalOffsetY = 0;
      let x = 0;
      let y = 0;
      let currentElement = e.target;

      do {
        totalOffsetX += currentElement.offsetLeft - currentElement.scrollLeft;
        totalOffsetY += currentElement.offsetTop - currentElement.scrollTop;
      } while(currentElement = currentElement.offsetParent);

      x = e.pageX - totalOffsetX;
      y = e.pageY - totalOffsetY;

      activeGraph.nodes.some(node => {
        if ((within(config.node.radius, x, node.x) && within(config.node.radius, y, node.y)) ||
          (within(100, x, node.x) && within(20, y, node.y + config.node.radius + config.node.textPadding))) {
          console.log(node.name);
          this.activeNode = node;
          return true;
        }
      });
    };
  }
});

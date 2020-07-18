

/**
 * The visualization controller will works as a state machine.
 * See files under the `doc` folder for transition descriptions.
 * See https://github.com/jakesgordon/javascript-state-machine
 * for the document of the StateMachine module.
 */
var Controller = StateMachine.create({
    initial: 'none',
    events: [
        {
            name: 'init',
            from: 'none',
            to:   'ready'
        },
        {
            name: 'set',
            from: '*',
            to:   'ready'
        },
        {
            name: 'search',
            from: 'starting',
            to:   'searching'
        },
        {
            name: 'pause',
            from: 'searching',
            to:   'paused'
        },
        {
            name: 'finish',
            from: 'searching',
            to:   'finished'
        },
        {
            name: 'resume',
            from: 'paused',
            to:   'searching'
        },
        {
            name: 'cancel',
            from: 'paused',
            to:   'ready'
        },
        {
            name: 'modify',
            from: 'finished',
            to:   'modified'
        },
        {
            name: 'reset',
            from: '*',
            to:   'ready'
        },
        {
            name: 'clear',
            from: ['finished', 'modified'],
            to:   'ready'
        },
        {
            name: 'start',
            from: ['ready', 'modified', 'restarting'],
            to:   'starting'
        },
        {
            name: 'restart',
            from: ['searching', 'finished'],
            to:   'restarting'
        },
        {
            name: 'dragStart',
            from: ['ready', 'finished'],
            to:   'draggingStart'
        },
		{
            name: 'dragStart2',
            from: ['ready', 'finished'],
            to:   'draggingStart2'
        },
		{
            name: 'dragStart3',
            from: ['ready', 'finished'],
            to:   'draggingStart3'
        },
        {
            name: 'dragEnd',
            from: ['ready', 'finished'],
            to:   'draggingEnd'
        },
        {
            name: 'drawWall',
            from: ['ready', 'finished'],
            to:   'drawingWall'
        },
        {
            name: 'eraseWall',
            from: ['ready', 'finished'],
            to:   'erasingWall'
        },
        {
            name: 'rest',
            from: ['draggingStart', 'draggingStart2', 'draggingStart3', 'draggingEnd', 'drawingWall', 'erasingWall'],
            to  : 'ready'
        },
    ],
});

$.extend(Controller, {
     
    gridSize: [64,36], // number of nodes horizontally and vertically
    operationsPerSecond: 300,
	RoverImg: ['./visual/js/mars_rover.png', './visual/js/mars_rover2.png', './visual/js/mars_rover3.png'],

    getGridSize: function(){ 
        var w = Math.floor($(window).width()/View.nodeSize) +1,
              h = Math.floor($(window).height()/View.nodeSize) + 1;
          console.log(w, h);
          this.gridSize = [w,h];          
    },

    /**
     * Asynchronous transition from `none` state to `ready` state.
     */
    onleavenone: function() {
        Controller.getGridSize();
        var numCols = this.gridSize[0],
            numRows = this.gridSize[1];

        this.grid = new PF.Grid(numCols, numRows);

        View.init({
            numCols: numCols,
            numRows: numRows
        });
		
		this.endNodes = new Array;
		
        View.generateGrid(function() {
            Controller.setDefaultStartEndPos();
            Controller.bindEvents();
            Controller.transition(); // transit to the next state (ready)
        });

        var x = document.getElementById("WelcomeMsg");
        setTimeout(function(){ x.className = x.className.replace("show", ""); }, 3500);
        this.$buttons = $('.control_button');

        this.hookPathFinding();

        return StateMachine.ASYNC;
        // => ready
    },
    ondrawWall: function(event, from, to, gridX, gridY) {
        this.setWalkableAt(gridX, gridY, false);
        // => drawingWall
    },
    oneraseWall: function(event, from, to, gridX, gridY) {
        this.setWalkableAt(gridX, gridY, true);
        // => erasingWall
    },
    onsearch: function(event, from, to) {
        var grid,
            timeStart, timeEnd,
            finder = Panel.getFinder();

        timeStart = window.performance ? performance.now() : Date.now();

        this.winner = new Array;
        var graph = this.makeGraph(this.endNodes);
        this.graph = graph;
		
        this.operationCount = this.operations.length;
        timeEnd = window.performance ? performance.now() : Date.now();
        this.timeSpent = (timeEnd - timeStart).toFixed(4);

        this.loop();
        // => searching
    },
    makeGraph: function(endNodes){
        var n = endNodes.length;
        var graph = new Array(n-1); 
		var win_len = 100000;

        for(var i = 0; i < graph.length; i++){
          
                var Grid,finder = Panel.getFinder();
                Grid = this.grid.clone(i);

                var dist = finder.findPath(
                  endNodes[i][0], endNodes[i][1], endNodes[n-1][0], endNodes[n-1][1], Grid, i
                );
				
                var len = PF.Util.pathLength(dist);
		          
		if(len< win_len && len > 0) {win_len = len; this.winner = [i]; }
        else if(len === win_len) this.winner.push(i);		
		
                graph[i] = new Array(2);
                graph[i][0]=len;
                graph[i][1]= dist;
        }
       
        return graph;
	},	
    onrestart: function() {
        // When clearing the colorized nodes, there may be
        // nodes still animating, which is an asynchronous procedure.
        // Therefore, we have to defer the `abort` routine to make sure
        // that all the animations are done by the time we clear the colors.
        // The same reason applies for the `onreset` event handler.
        View.dynamicStats('Restarting');
		setTimeout(function() {
            Controller.clearOperations();
            Controller.clearFootprints();
			View.setRoverPos(Controller.endNodes[0][0], Controller.endNodes[0][1], 0);
			View.setRoverPos(Controller.endNodes[1][0], Controller.endNodes[1][1], 1);
			View.setRoverPos(Controller.endNodes[2][0], Controller.endNodes[2][1], 2);
            Controller.start();
        }, View.nodeColorizeEffect.duration * 1.2);
        // => restarting
    },
    onpause: function(event, from, to) {
		View.dynamicStats('Paused. Resume race again');
        // => paused
    },
    onresume: function(event, from, to) {
		View.dynamicStats('Resuming');
        this.loop();
        // => searching
    },
    oncancel: function(event, from, to) {
        this.clearOperations();
        this.clearFootprints();
		View.dynamicStats('Cancelled. Start race again');
        // => ready
    },

    onfinish: function(event, from, to) {
		var path = this.graph;
		
        View.showStats({
            pathLength1: path[0][0],
			pathLength2: path[1][0],
			pathLength3: path[2][0],
            timeSpent:  this.timeSpent,
            operationCount: this.operationCount,
        });
		
		var imgs = [ "<img src= './visual/js/mars_rover.png' width=30% >" , 
		             "<img src= './visual/js/mars_rover2.png' width=30% />" ,
		             "<img src= './visual/js/mars_rover3.png' width=34% />"
		];
		
		var x = document.getElementById("WinMsg");	
		
		console.log(this.winner);
		
		if(this.winner[0] === undefined){
			x.innerHTML = "No rover can reach the destination.";
		}	
		else{	
		    var pathLen = path[this.winner[0]][0];
		    for(var i=0; i<3; i++){
				if(this.winner.indexOf(i) === -1){
					
					var len = 0, j=0;
					while(len <= pathLen){
					    a = path[i][1][j];
                        b = path[i][1][j+1];
                        dx = a[0] - b[0];
                        dy = a[1] - b[1];
                        len += Math.sqrt(dx * dx + dy * dy);
                        j++;						
					}
					path[i][1].splice(j);
					View.setRoverPos(path[i][1][j-1][0], path[i][1][j-1][1], i);
				}
		        
		        else{
		            View.setRoverPos(this.endNodes[3][0], this.endNodes[3][1], i); 
		        }
				
				View.drawPath(path[i][1], i);
		
	        }	
		
		    var winRover = (this.winner[0] +1);
			var winImg = imgs[Controller.winner[0]];
		     
		    for(var i=1; i<this.winner.length; i++){
			    winRover = winRover + " and rover " + (this.winner[i]+1);   
		        winImg = winImg + " " +imgs[Controller.winner[i]];
			}	
		
			x.innerHTML = "Congrats, rover " + winRover + " won" + "<br>" + winImg ;
		}	
			
        setTimeout(function(){ x.className = x.className.replace("", "show"); }, 1000);
        setTimeout(function(){ x.className = x.className.replace("show", ""); }, 4000);
		
        // => finished
    },
    onclear: function(event, from, to) {
        this.clearOperations();
        this.clearFootprints();
		View.dynamicStats('Path Cleared. Start race again');
        // => ready
        // => ready
    },
    onmodify: function(event, from, to) {
        // => modified
    },
    onset: function(event, from, to) {
        setTimeout(function() {
            Controller.clearOperations();
            Controller.clearAll();
            Controller.buildNewGrid();
        }, View.nodeColorizeEffect.duration * 1.2);
        // => ready
    },

    onreset: function(event, from, to) {
        setTimeout(function() {
			View.dynamicStats('Reset done. Start race again')
            Controller.clearOperations();
            Controller.clearAll();
            Controller.buildNewGrid();
        }, View.nodeColorizeEffect.duration * 1.2);
        // => ready
    },

    /**
     * The following functions are called on entering states.
     */

    onready: function() {
        console.log('=> ready');
        this.setButtonStates({
            id: 1,
            text: 'Start Race',
            enabled: true,
            callback: $.proxy(this.start, this),
        }, {
            id: 2,
            text: 'Pause Race',
            enabled: false,
        }, {
            id: 3,
            text: 'Clear Walls',
            enabled: true,
            callback: $.proxy(this.reset, this),
        });
        // => [starting, draggingStart, draggingEnd, drawingStart, drawingEnd]
    },
    onstarting: function(event, from, to) {
        console.log('=> starting');
        // Clears any existing search progress
        this.clearFootprints();
        this.setButtonStates(
          {
            id: 2,
            enabled: true,
        });
        this.search();
        // => searching
    },
    onsearching: function() {
        console.log('=> searching');
        this.setButtonStates({
            id: 1,
            text: 'Restart Race',
            enabled: true,
            callback: $.proxy(this.restart, this),
        }, {
            id: 2,
            text: 'Pause Race',
            enabled: true,
            callback: $.proxy(this.pause, this),
        });
        // => [paused, finished]
    },
    onpaused: function() {
        console.log('=> paused');
        this.setButtonStates({
            id: 1,
            text: 'Resume Race',
            enabled: true,
            callback: $.proxy(this.resume, this),
        }, {
            id: 2,
            text: 'Cancel Race',
            enabled: true,
            callback: $.proxy(this.cancel, this),
        });
        // => [searching, ready]
    },
    onfinished: function() {
        console.log('=> finished');
        this.setButtonStates({
            id: 1,
            text: 'Restart Race',
            enabled: true,
            callback: $.proxy(this.restart, this),
        }, {
            id: 2,
            text: 'Clear Path',
            enabled: true,
            callback: $.proxy(this.clear, this),
        });
    },
    onmodified: function() {
        console.log('=> modified');
        this.setButtonStates({
            id: 1,
            text: 'Start Race',
            enabled: true,
            callback: $.proxy(this.start, this),
        }, {
            id: 2,
            text: 'Clear Path',
            enabled: true,
            callback: $.proxy(this.clear, this),
        });
    },

    /**
     * Define setters and getters of PF.Node, then we can get the operations
     * of the pathfinding.
     */
    hookPathFinding: function() {

        PF.Node.prototype = {
            get opened() {
                return this._opened;
            },
            set opened(v) {
                this._opened = v;
                Controller.operations.push({
                    x: this.x,
                    y: this.y,
                    attr: 'opened',
                    value: v,
                    s: this.s 
                });
            },
            get closed() {
                return this._closed;
            },
            set closed(v) {
                this._closed = v;
                Controller.operations.push({
                    x: this.x,
                    y: this.y,
                    attr: 'closed',
                    value: v,
                    s: this.s
                });
            },
            get tested() {
                return this._tested;
            },
            set tested(v) {
                this._tested = v;
                Controller.operations.push({
                    x: this.x,
                    y: this.y,
                    attr: 'tested',
                    value: v,
                    s: this.s
                });
            },
        };

        this.operations = [];
    },
    bindEvents: function() {
        $('#draw_area').mousedown($.proxy(this.mousedown, this));
        $(window)
            .mousemove($.proxy(this.mousemove, this))
            .mouseup($.proxy(this.mouseup, this));
    },
    loop: function() {
        var interval = 1000 / this.operationsPerSecond;
        (function loop() {
            if (!Controller.is('searching')) {
                return;
            }
            Controller.step();
            setTimeout(loop, interval);
        })();
    },
    step: function() {
        var operations = this.operations,
            op, isSupported;

        do {
            if (!operations.length) {
                this.finish(); // transit to `finished` state
                return;
            }
            op = operations.shift();
            isSupported = View.supportedOperations.indexOf(op.attr) !== -1;
        } while (!isSupported);

        View.setAttributeAt(op.x, op.y, op.attr, op.value, op.s);
    },
    clearOperations: function() {
        this.operations = [];
    },
    clearFootprints: function() {
        View.clearFootprints();
        View.clearPath();
    },
    clearAll: function() {
        this.clearFootprints();
        View.clearBlockedNodes();
    },
    buildNewGrid: function() {
        this.grid = new PF.Grid(this.gridSize[0], this.gridSize[1]);
    },
    mousedown: function (event) {
        var coord = View.toGridCoordinate(event.pageX, event.pageY),
            gridX = coord[0],
            gridY = coord[1],
            grid  = this.grid;

        if (this.can('dragStart') && this.isStartPos(gridX, gridY,0)) {
            this.dragStart();
            return;
        }
		if (this.can('dragStart2') && this.isStartPos(gridX, gridY,1)) {
            this.dragStart2();
            return;
        }
		if (this.can('dragStart3') && this.isStartPos(gridX, gridY,2)) {
            this.dragStart3();
            return;
        }
        if (this.can('dragEnd') && this.isEndPos(gridX, gridY, 3)) {
            this.dragEnd();
            return;
        }
        if (this.can('drawWall') && grid.isWalkableAt(gridX, gridY)) {
            this.drawWall(gridX, gridY);
            return;
        }
        if (this.can('eraseWall') && !grid.isWalkableAt(gridX, gridY)) {
            this.eraseWall(gridX, gridY);
        }
    },
    mousemove: function(event) {
        var coord = View.toGridCoordinate(event.pageX, event.pageY),
            grid = this.grid,
            gridX = coord[0],
            gridY = coord[1];

        if (this.isStartOrEndPos(gridX, gridY)) {
            return;
        }

        switch (this.current) {
        case 'draggingStart':
            if (grid.isWalkableAt(gridX, gridY)) {
                this.setStartPos(gridX, gridY,0);
            }
            break;
		case 'draggingStart2':
            if (grid.isWalkableAt(gridX, gridY)) {
                this.setStartPos(gridX, gridY,1);
            }
            break;
		case 'draggingStart3':
            if (grid.isWalkableAt(gridX, gridY)) {
                this.setStartPos(gridX, gridY,2);
            }
            break;
        case 'draggingEnd':
            if (grid.isWalkableAt(gridX, gridY)) {
                this.setEndPos(gridX, gridY,3);
            }
            break;
        case 'drawingWall':
            this.setWalkableAt(gridX, gridY, false);
            break;
        case 'erasingWall':
            this.setWalkableAt(gridX, gridY, true);
            break;
        }
    },
    mouseup: function(event) {
        if (Controller.can('rest')) {
            Controller.rest();
        }
    },
    setButtonStates: function() {
        $.each(arguments, function(i, opt) {
            var $button = Controller.$buttons.eq(opt.id - 1);
            if (opt.text) {
                $button.text(opt.text);
            }
            if (opt.callback) {
                $button
                    .unbind('click')
                    .click(opt.callback);
            }
            if (opt.enabled === undefined) {
                return;
            } else if (opt.enabled) {
                $button.removeAttr('disabled');
            } else {
                $button.attr({ disabled: 'disabled' });
            }
        });
    },
    /**
     * When initializing, this method will be called to set the positions
     * of start node and end node.
     * It will detect user's display size, and compute the best positions.
     */
    setDefaultStartEndPos: function() {
        var width, height,
            marginRight, availWidth,
            centerX, centerY,
            endX, endY,
            nodeSize = View.nodeSize;

        width  = this.gridSize[0]*30;
        height = this.gridSize[1]*30;

        marginRight = $('#algorithm_panel').width();
        availWidth = width - marginRight;

        centerX = Math.ceil(availWidth / 2 / nodeSize);
        centerY = Math.floor(height / 2 / nodeSize);

        this.setStartPos(centerX-1, centerY, 0);
	    this.setStartPos(centerX+4, centerY-5, 1);
	    this.setStartPos(centerX+4, centerY+5, 2);
        this.setEndPos(centerX+4, centerY, 3);
   
    },
    setStartPos: function(gridX, gridY, n) {
        this.endNodes[n] = [gridX, gridY];
        View.setStartPos(gridX, gridY, n);
		View.setRoverPos(gridX, gridY, n);
    },
    setEndPos: function(gridX, gridY, n) {
        this.endNodes[n] = [gridX, gridY];
        View.setEndPos(gridX, gridY, n);
    },
    setWalkableAt: function(gridX, gridY, walkable) {
		if(this.grid.isInside(gridX, gridY)){
           this.grid.setWalkableAt(gridX, gridY, walkable);
           View.setAttributeAt(gridX, gridY, 'walkable', walkable,0);
        }
	},
    isStartPos: function(gridX, gridY, n) {
		if(this.endNodes[n] === undefined) return false;
        return gridX === this.endNodes[n][0] && gridY === this.endNodes[n][1];
    },
    isEndPos: function(gridX, gridY, n) {
        if(this.endNodes[n] === undefined) return false;
		return (gridX === this.endNodes[n][0] && gridY === this.endNodes[n][1]);
    },
    isStartOrEndPos: function(gridX, gridY) {
        return this.isStartPos(gridX, gridY,0) || this.isStartPos(gridX, gridY,1) || this.isStartPos(gridX, gridY,2) || this.isEndPos(gridX, gridY,3);
    },
});

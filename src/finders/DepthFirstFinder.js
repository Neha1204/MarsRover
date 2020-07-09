var Util = require('../core/Util');
var DiagonalMovement = require('../core/DiagonalMovement');

/**
 * Depth-First-Search path finder.
 * @constructor
 * @param {Object} opt
 * @param {boolean} opt.allowDiagonal Whether diagonal movement is allowed.
 *     Deprecated, use diagonalMovement instead.
 * @param {boolean} opt.dontCrossCorners Disallow diagonal movement touching
 *     block corners. Deprecated, use diagonalMovement instead.
 * @param {DiagonalMovement} opt.diagonalMovement Allowed diagonal movement.
 * @param {Boolean} opt.biDirectional whether bidirectional search or not.
 */
function DepthFirstFinder(opt) {
    opt = opt || {};
    this.allowDiagonal = opt.allowDiagonal;
    this.dontCrossCorners = opt.dontCrossCorners;
    this.diagonalMovement = opt.diagonalMovement;
    this.biDirectional = opt.biDirectional;

    if (!this.diagonalMovement) {
        if (!this.allowDiagonal) {
            this.diagonalMovement = DiagonalMovement.Never;
        } else {
            if (this.dontCrossCorners) {
                this.diagonalMovement = DiagonalMovement.OnlyWhenNoObstacles;
            } else {
                this.diagonalMovement = DiagonalMovement.IfAtMostOneObstacle;
            }
        }
    }
}

/**
 * Find and return the the path.
 * @return {Array<Array<number>>} The path, including both start and
 *     end positions.
 */
DepthFirstFinder.prototype.findPath = function(startX, startY, endX, endY, grid) {
    var bi = this.biDirectional;

 // if(!bi){
    var openlist = [],
        startnode = grid.getNodeAt(startX, startY),
        endnode   = grid.getNodeAt(endX, endY),
        neighbours, neighbour, i, node; 

    openList.push(startnode);
    startnode.opened = true;

    while(openList.length){
        node = openList.pop();
        node.closed = true;

        if(node == endnode) return Util.backtrace(endnode);

        neighbours = grid.getNeighbors(node, this.diagonalMovement);

        for(i=0; i<neighbours.length; i++){
            neighbour = neighbours[i];

            if(!neighbour.opened){
                openList.push(neighbour);
                neighbour.parent = node;
                neighbour.opened =true;
            }
        }
    }

    return []; 
   }

/*
  else{
    var openlist = [],
        endList = [],
        startnode = grid.getNodeAt(startX, startY),
        endnode   = grid.getNodeAt(endX, endY),
        neighbours, neighbour, i, node, 
        by_start = 1, by_end = 2; 

    openList.push(startnode);
    startnode.opened = true;
    startnode.by = by_start;

    endList.push(endnode);
    endnode.opened = true;
    endnode.by = by_end;

    while(openList.length && endList.length){
        node = openList.pop();
        node.closed = true;

        if(node == endnode) return Util.backtrace(endnode);

        neighbours = grid.getNeighbors(node, this.diagonalMovement);

        for(i=0; i<neighbours.length; i++){
            neighbour = neighbours[i];

            if(!neighbour.opened){
                openList.push(neighbour);
                neighbour.parent = node;
                neighbour.opened = true;
                neighbour.by = by_start;
            }

            else if(neighbour.opened == by_end){
                return Util.biBacktrace(node, neighbour);
            }
        }

        node = endList.pop();
        node.closed = true;

        neighbours = grid.getNeighbors(node, this.diagonalMovement);

        for(i=0; i<neighbours.length; i++){
            neighbour = neighbours[i];

            if(!neighbour.opened){
                endList.push(neighbour);
                neighbour.parent = node;
                neighbour.opened = true;
                neighbour.by = by_end;
            }

            else if(neighbour.opened == by_start){
                return Util.biBacktrace(neighbour, node);
            }
        }

    }

    return []; 

   }
 */
};

module.exports = DepthFirstFinder;
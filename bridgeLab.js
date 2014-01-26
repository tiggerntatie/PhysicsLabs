
var GRAVITY = 9.81

var dt;
var calcs = 10;

var GRAPHICS_HEIGHT = document.getElementById("graphics").clientHeight;
var GRAPHICS_WIDTH = document.getElementById("graphics").clientWidth;
document.getElementById("graphics");

var elapsedTime;

var graphics = document.getElementById("graphics");
var gContext = graphics.getContext("2d");
gContext.fillStyle = "black";

var paused = true;

var MAX_TRIES = 100;

function Beam(node1, node2) {
    this.node1 = node1;
    this.node2 = node2;
    
    //stored force. calculation changes this by a tiny bit.
    this.force = 0;
    //this.prevForce = 0;//to reset if change was a mistake
    //if negative, force is a tension force (away from the center of the beam)
    //if positive, force is a compression force (towards the center of the beam)
    this.otherNode = function(node) {
        if (node==this.node1) return this.node2;
        return this.node1;
    }
}

function Node(x, y, fixedX, fixedY, weight) {
    this.x=x;
    this.y=y;
    this.vx=0;
    this.vy=0;
    this.beams = [];
    this.fixedX=fixedX;
    this.fixedY=fixedY;
    if (weight) {
        this.weight=weight;//weight of load, regardless of tension forces
    } else {
        this.weight=0;
    }
    
    this.directionToNode = function(otherNode) {
        return Math.atan2(otherNode.y-this.y, otherNode.x-this.x);
    }
    
    //each node has two or more tension forces
    //they must sum to 0 for the bridge to be in equilibrium
    //this function, therefore, will return zero when the node is in equilibrium
    //returns force vector {"x":0, "y":0}
    this.netForce = function() {
        var force = {"x":0., "y":0.-this.weight};
        for (beamI in this.beams) {
            var beamForce = this.beams[beamI].force;
            var node = this.beams[beamI].node1;
            if (node==this) node = this.beams[beamI].node2;
            var direction = this.directionToNode(node);
            force.x-=beamForce*Math.cos(direction);
            force.y-=beamForce*Math.sin(direction);
        }
        if (this.fixedX) {
            force.x=0;
        }
        if (this.fixedY) {
            force.y=0;
        }
        return force;
    }
    
    this.netForceMagnitude = function() {
        var force = this.netForce();
        return Math.sqrt(force.x*force.x+force.y*force.y);
    }
}

function Bridge(nodes, beams) {
    this.nodes = nodes;
    this.beams=beams;
    
    this.calculateToDistributeWeight = function() {
        //go through the nodes to see which one is weighted
        var weightedNode;
        var weight;
        for (nodeI in this.nodes) {
            var node = this.nodes[nodeI];
            if (node.weight) {
                weightedNode=node;
                weight=node.weight;
            }
        }
        //Xs of beams have to sum to 0
        //Ys of beams have to sum to -weight
        //assume weighted node has only 2 beams (any more and it gets to confusing. Just picking random changes seems to work in that situation, though)
        var beam1 = node.beams[0];
        var beam2 = node.beams[1];
        var beam1UnitX = Math.cos(node.directionToNode(beam1.otherNode(node)));
        var beam1UnitY = Math.sin(node.directionToNode(beam1.otherNode(node)));
        var beam2UnitX = Math.cos(node.directionToNode(beam2.otherNode(node)));
        var beam2UnitY = Math.sin(node.directionToNode(beam2.otherNode(node)));
        //beam1forceX = -beam2forceX
        //beam1forceY + beam2forceY = -weight
        //beam1UnitY*force1 + beam2UnitY*force2 = -weight
        //beam1UnitX*force1 + beam2UnitX*force2 = 0
        //force1 = -beam2UnitX*force2/beam1UnitX
        //beam1UnitY*(-beam2UnitX*force2/beam1UnitX) + beam2UnitY*force2 = -weight
        var force2 = -weight/(-beam2UnitX*beam1UnitY/beam1UnitX + beam2UnitY);
        var force1 = (-weight - beam2UnitY*force2)/beam1UnitY;
        beam1.force = force1;
        beam2.force = force2;
    }
    
    this.calculateBeamForces = function(iterations) {
        if (!iterations) {
            iterations=100;
        }
        for (var i=0; i<iterations; i++) {
            
        }
    }
    
    this.averageNodeForce = function() {
        var sum = 0.;
        for (nodeI in this.nodes) {
            sum+=this.nodes[nodeI].netForceMagnitude();
        }
        return sum/this.nodes.length;
    }
}

function connectNodes(node1, node2) {
    var beam = new Beam(node1, node2);
    node1.beams.push(beam);
    node2.beams.push(beam);
    return beam;
}

var bridge;

function restart () {
    dt = .01;
    elapsedTime=0.;
    paused = true;
    var movingNode = new Node(-0.1,-0.5,false,false,40);
    var nodes=[new Node(-1,0,true, true,0), new Node(0,0,false,false,0), new Node(1,0,false,true,0), new Node(-.5,1), new Node(.5, 1), movingNode];
    var beams = [connectNodes(nodes[0], movingNode), connectNodes(movingNode, nodes[1]), connectNodes(nodes[1], nodes[2]), connectNodes(nodes[0],nodes[3]),connectNodes(nodes[1],nodes[3]),connectNodes(nodes[3], nodes[4]), connectNodes(nodes[4], nodes[2]),connectNodes(nodes[4],nodes[1])];
    bridge = new Bridge(nodes, beams);
    bridge.calculateToDistributeWeight();
}

restart();

//source for graphics: diveintohtml5.info/canvas.html

var interceptY = GRAPHICS_HEIGHT/2;
var slopeY = -100;
var interceptX = GRAPHICS_WIDTH/2;
var slopeX = 100;

function Draw() {
    gContext.clearRect(0, 0, GRAPHICS_WIDTH, GRAPHICS_HEIGHT);
    
    //draw beams
    gContext.beginPath();
    gContext.lineWidth=4;
    gContext.font = "bold 12px sans-serif";
    for (beamI in bridge.beams) {
        var p1 = [interceptX+bridge.beams[beamI].node1.x*slopeX, interceptY+bridge.beams[beamI].node1.y*slopeY];
        var p2 = [interceptX+bridge.beams[beamI].node2.x*slopeX, interceptY+bridge.beams[beamI].node2.y*slopeY];
        gContext.moveTo(p1[0], p1[1]);
        gContext.lineTo(p2[0], p2[1]);
        gContext.fillText(bridge.beams[beamI].force.toFixed(0), (p1[0]+p2[0])/2., (p1[1]+p2[1])/2.);
    }
    gContext.strokeStyle="gray";
    gContext.stroke();
    gContext.lineWidth=1;
    
    //draw weights
    gContext.fillStyle="black";
    for (nodeI in bridge.nodes) {
        gContext.beginPath();
        var node = bridge.nodes[nodeI];
        gContext.arc(interceptX+node.x*slopeX, interceptY+node.y*slopeY, 5, 0, 2*Math.PI, true);
        gContext.closePath();
        gContext.fill();
        gContext.fillText(node.netForceMagnitude().toFixed(0), interceptX+node.x*slopeX, interceptY+node.y*slopeY-10);
    }
    
    //start at equilibrium, so no moving until dropped
    if (!paused) {
        elapsedTime+=dt;
    }
    
    bridge.calculateBeamForces(1);
    console.log(bridge.averageNodeForce());
    //console.log(bridge.nodes[3].netForce());
    
    /*
    //now the scale
    gContext.beginPath();
    var x = GRAPHICS_WIDTH/2+20.5;
    gContext.moveTo(x, 0);
    var yOffset = 0;
    var arrowSize = 10;
    gContext.lineTo(x, GRAPHICS_HEIGHT/2-10+yOffset);
    gContext.moveTo(x, GRAPHICS_HEIGHT/2+10+yOffset);
    gContext.lineTo(x, GRAPHICS_HEIGHT);
    gContext.moveTo(x-arrowSize, arrowSize);
    gContext.lineTo(x, 0);
    gContext.lineTo(x+arrowSize, arrowSize);
    gContext.moveTo(x-arrowSize, GRAPHICS_HEIGHT-arrowSize);
    gContext.lineTo(x, GRAPHICS_HEIGHT);
    gContext.lineTo(x+arrowSize, GRAPHICS_HEIGHT-arrowSize);
    gContext.strokeStyle="black";
    gContext.stroke();
    gContext.font = "bold 12px sans-serif";
    gContext.textAlign = "center";
    gContext.textBaseline = "middle";
    gContext.fillText(size, x, GRAPHICS_HEIGHT/2+yOffset);
    */
    //window.setTimeout("Draw();", 50);
}

function start() {
    Draw();
}


var GRAVITY = 9.81

var dt = .005;//1.;
var iterations = 2000.;//calculations per frame
var calcs = 10;

var GRAPHICS_HEIGHT = document.getElementById("graphics").clientHeight;
console.log(GRAPHICS_HEIGHT);
var GRAPHICS_WIDTH = document.getElementById("graphics").clientWidth;
document.getElementById("graphics");

var elapsedTime = 0.;

var graphics = document.getElementById("graphics");
var gContext = graphics.getContext("2d");
gContext.fillStyle = "black";

var paused = true;
var started= false;

//density = mass/volume
function Beam(node1, node2, density, elasticModulus, width) {
    this.node1 = node1;
    this.node2 = node2;
    
    this.length = function() {
        return this.node1.distanceToNode(this.node2);
    }
    this.restLength = this.length();
    this.elasticModulus=elasticModulus;
    
    this.width=width;
    if (!width) {
        this.width=1;
    }
    //cross section area
    //function exclusively of this.width
    //assume square cross section with side of this.width
    this.area = function() {
        return this.width*this.width;
    }
    
    //http://en.wikipedia.org/wiki/Elastic_modulus
    //elastic modulus = stress/strain
    //stress is restoring force (this.force()) divided by cross sectional area
    //strain is ratio of change caused by stress to original state of object
    //force = stress * area
    //x = this.length() - this.restLength
    //strain = x / this.restLength
    //stress = elasticModulus*strain
    //stress = elasticModulus*x/restLength
    //force = (elasticModulus*x/restLength)*area
    //k = elasticModulus/restLength*area
    this.k=(elasticModulus/this.restLength)*this.area();//used for calculating critical damping and force
    console.log("k: "+this.k);
    
    var volume = this.area()*this.restLength;
    this.mass=volume*density;
    console.log("mass:"+this.mass);
    node1.mass+=this.mass/2;
    node2.mass+=this.mass/2;
    
    //if positive, force is a tension force (towards the center of the beam, because beam is pulled)
    //if negative, force is a compression force (away from the center of the beam, because beam is compressed)
    //F=kx
    /*this.force = function() {
        return this.k*(this.length()-this.restLength);
    }*/
    
    
    
    this.force = function() {
        var extension = this.length()-this.restLength;
        var force = this.k*extension;
        
        return force;
    }
    
    //find othernode. this is a convenience method, for example when a node wants to know the location of the othernode when trying to find beam force direction
    this.otherNode = function(node) {
        if (node==this.node1) return this.node2;
        return this.node1;
    }
}

function Node(x, y, fixedX, fixedY, weight) {
    this.x=x;
    this.y=y;
    //nodes start off not moving
    this.vx=0;
    this.vy=0;
    //no acceleration to start with. This is used in damping
    this.ax=0;
    this.ay=0;
    this.beams = [];
    this.fixedX=fixedX;
    this.fixedY=fixedY;
    
    this.isMoving = function() {
        return this.velocity()>1e-4;
    }
    
    if (weight) {
        this.weight=weight;//weight of load, regardless of tension forces
    } else {
        this.weight=0;
    }
    this.mass = this.weight/GRAVITY;
    
    //does not deep copy beams. instead, sets them to []
    this.copy = function() {
        var node = new Node(this.x, this.y, this.fixedX, this.fixedY, this.weight);
        node.mass=this.mass;
        node.vx=this.vx;
        node.vy=this.vy;
        node.ax=this.ax;
        node.ay=this.ay;
        node.beams=[];
        return node;
    }
    
    this.directionToNode = function(otherNode) {
        return Math.atan2(otherNode.y-this.y, otherNode.x-this.x);
    }
    
    this.distanceToNode = function(otherNode) {
        return Math.sqrt((otherNode.x-this.x)*(otherNode.x-this.x)+(otherNode.y-this.y)*(otherNode.y-this.y));
    }
    
    this.velocity = function() {
        return Math.sqrt(this.vx*this.vx+this.vy*this.vy);
    }
    
    this.acceleration = function() {
        return Math.sqrt(this.ax*this.ax+this.ay*this.ay);
    }
    
    //each node has two or more tension forces
    //they must sum to 0 for the bridge to be in equilibrium
    //this function, therefore, will return zero when the node is in equilibrium
    //returns force vector {"x":0, "y":0}
    this.netForce = function() {
        var force = {"x":0., "y":0.};
        var dampingForce = {"x":0., "y":0.};
        for (beamI in this.beams) {
            var beam = this.beams[beamI];
            //critical damping
            var beamForce = beam.force();
            var damping = beam.mass*Math.sqrt(beam.k/(beam.mass/2));
            dampingForce.x += this.vx*damping;
            dampingForce.y += this.vy*damping;
            var node = beam.otherNode(this);
            var direction = this.directionToNode(node);
            force.x+=beamForce*Math.cos(direction);
            force.y+=beamForce*Math.sin(direction);
        }
        
        //dampen, but only to 0. Otherwise can create an oscillation by counteracting the force too much
        var oldForceX = force.x;
        var oldForceY = force.y;
        if (/*document.getElementById("damping").checked*/true) {
            force.x-=dampingForce.x;
            force.y-=dampingForce.y;
        }
        //if dampening has changed force sign, set force to 0
        if (force.x>0 != oldForceX>0) {
            force.x=0;
        }
        if (force.y>0 != oldForceY>0) {
            force.y=0;
        }
        
        force.y-=this.mass*GRAVITY;
        force.y-=this.weight;
        if (this.fixedX) force.x=0;
        if (this.fixedY) force.y=0;
        
        return force;
    }
    
    this.netForceMagnitude = function() {
        var force = this.netForce();
        return Math.sqrt(force.x*force.x+force.y*force.y);
    }
    
    this.pushState = function() {
        this.storedX = this.x;
        this.storedY = this.y;
        this.storedVx = this.vx;
        this.storedVy = this.vy;
        this.storedAx = this.ax;
        this.storedAy = this.ay;
    }
    
    this.restoreState = function() {
        this.x=this.storedX;
        this.y=this.storedY;
        this.vx=this.storedVx;
        this.vy = this.storedVy;
        this.ax=this.storedAx;
        this.ay=this.storedAy;
    }
    
    this.moveForTime = function(timestep) {
        var netForce = this.netForce();
        
        this.ax = netForce.x/this.mass;
        this.ay = netForce.y/this.mass;
        //if (badNum(this.ax)||badNum(this.ay)) {dt = .05; timestep=dt/iterations;}
        //console.log(this.ax);
        this.x+=this.vx*timestep+this.ax*timestep*timestep/2.;
        this.y+=this.vy*timestep+this.ay*timestep*timestep/2.;
        this.vx+=timestep*this.ax;
        this.vy+=timestep*this.ay;
    }
}

function badNum(num) {
    return isNaN(num)||(num>1e10)||(num<-1e10);
}

function Bridge(nodes, beams) {
    this.nodes = nodes;
    this.beams=beams;
    
    this.averageNodeForce = function() {
        var sum = 0.;
        for (nodeI in this.nodes) {
            sum+=this.nodes[nodeI].netForceMagnitude();
        }
        return sum/this.nodes.length;
    }
    
    
    this.moveForTime = function(timestep) {
        for (nodeI in this.nodes) {
            var node = this.nodes[nodeI];
            node.moveForTime(timestep);
        }
    }
}

//since coordinates are the only thing that don't change, I want a set distance between coordinate changes.
//var A_CUTOFF = .07153034;
//A_CUTOFF = 1000;
var DELTA_X_CUTOFF = .01;

function connectNodes(node1, node2) {
    var beam = new Beam(node1, node2, parseFloat(document.getElementById("density").value), parseFloat(document.getElementById("elasticModulus").value)*1000000., parseFloat(document.getElementById("width").value));
    
    node1.beams.push(beam);
    node2.beams.push(beam);
    return beam;
}

var bridge;

var bridgeLength = parseFloat(document.getElementById("length").value);
//user-defined nodes (and possibly support nodes). car drives along y=0 nodes
var userNodes=[new Node(-bridgeLength/2.,0,true,true,0), new Node(bridgeLength/2,0,false,true,0), new Node(0, 0, false, false, 0)];
//when using this, make a deep copy

//lists of indices in userNodes (or a copy of user nodes)
var userBeams=[];

var mouseIsDown = false;
var startingCoord;
var movingCoord;
var unitsPerLength = 10;
function coord(event, obj) {
    var units = bridgeLength/unitsPerLength;
    return [Math.round((event.pageX-obj.offsetLeft-interceptX)/slopeX/units)*units,Math.round( (event.pageY-obj.offsetTop-interceptY)/slopeY/units)*units];
}

function mouseUp(event,obj) {
    movingCoord = coord(event,obj);
    var startNode;
    var startI = userNodes.length;
    for (i in userNodes) {
        if (userNodes[i].x==startingCoord[0] && userNodes[i].y==startingCoord[1]) {
            startNode=userNodes[i];
            startI=i;
        }
    }
    if (!startNode) {
        startNode = new Node(startingCoord[0], startingCoord[1]);
        userNodes.push(startNode);
    }
    var endNode;
    var endI = userNodes.length;
    for (i in userNodes) {
        if (userNodes[i].x==movingCoord[0] && userNodes[i].y==movingCoord[1]) {
            endNode=userNodes[i];
            endI=i;
        }
    }
    if (!endNode) {
        endNode = new Node(movingCoord[0], movingCoord[1]);
        userNodes.push(endNode);
    }
    userBeams.push([startI,endI]);
    console.log(userNodes);
    
    mouseIsDown=false;
    resetBridge();
}

function mouseDown(event,obj) {
    mouseIsDown=true;
    startingCoord = coord(event,obj);
    console.log(startingCoord);
    movingCoord=startingCoord;
}

function mouseMoved(event,obj) {
    if (mouseIsDown) {
        movingCoord = coord(event,obj);
    }
}

function mouseOver() {
    document.body.style.overflow="hidden";
}

function mouseOut() {
    document.body.style.overflow="auto";
}

function mouseWheel(event, obj) {
    var down = event.wheelDelta<0;
    var factor = .001*Math.abs(event.wheelDelta)+1;
    if (down) {
        factor = 1./factor;
    }
    console.log(factor);
    slopeY*=factor;
    slopeX*=factor;
}

function startSimulation () {
    elapsedTime=0.;
    paused = false;
    started=true;
    resetBridge();
}

function reset () {
    var newBridgeLength = parseFloat(document.getElementById("length").value);
    if (newBridgeLength!=bridgeLength) {
        bridgeLength=newBridgeLength;
        
        userNodes=[new Node(-bridgeLength/2.,0,true,true,0), new Node(bridgeLength/2,0,false,true,0), new Node(0, 0, false, false, 0)];
        //when using this, make a deep copy
        
        //lists of indices in userNodes (or a copy of user nodes)
        userBeams=[];
    }
    
    
    paused=true;
    started=false;
    resetBridge();
}

//Basswood has a compressive strength of 15,300 kPa
//Modulus of Elasticity: 10,067 MPa

function resetBridge() {
    var nodes=[];
    for (i in userNodes) {
        nodes.push(userNodes[i].copy());
    }
    
    var weight = parseFloat(document.getElementById("weight").value);
    
    //find nodes on bottom
    var bottomNodes = [];
    for (i in nodes) {
        if (nodes[i].y==0 && nodes[i].x==0) {
            nodes[i].weight=weight;
            console.log(nodes[i]);
            //nodes[i].mass+=weight/GRAVITY;
        }
    }
    var beams = [];
    for (i in userBeams) {
        var leftI = userBeams[i][0];
        var rightI = userBeams[i][1];
        var beam = connectNodes(nodes[leftI], nodes[rightI]);
        beams.push(beam);
    }
    bridge = new Bridge(nodes, beams);
}

//source for graphics: diveintohtml5.info/canvas.html

var interceptY = GRAPHICS_HEIGHT/2;
var slopeY = -500;
var interceptX = GRAPHICS_WIDTH/2;
var slopeX = -slopeY;
resetBridge();

function pause() {
    paused=!paused;
}

var WIDTH_FACTOR = 1000;

function Draw() {
    gContext.clearRect(0, 0, GRAPHICS_WIDTH, GRAPHICS_HEIGHT);
    
    //draw beam currently being drawn by user
    if (mouseIsDown) {
        gContext.beginPath();
        gContext.lineWidth=parseFloat(document.getElementById("width").value)*WIDTH_FACTOR;
        gContext.moveTo(startingCoord[0]*slopeX+interceptX, startingCoord[1]*slopeY+interceptY);
        gContext.lineTo(movingCoord[0]*slopeX+interceptX, movingCoord[1]*slopeY+interceptY);
        gContext.stroke();
    }
    
    //draw beams
    gContext.strokeStyle="gray";
    gContext.lineWidth=1;
    gContext.font = "bold 12px sans-serif";
    for (beamI in bridge.beams) {
        gContext.beginPath();
        var p1 = [interceptX+bridge.beams[beamI].node1.x*slopeX, interceptY+bridge.beams[beamI].node1.y*slopeY];
        var p2 = [interceptX+bridge.beams[beamI].node2.x*slopeX, interceptY+bridge.beams[beamI].node2.y*slopeY];
        gContext.moveTo(p1[0], p1[1]);
        gContext.lineTo(p2[0], p2[1]);
        gContext.lineWidth=Math.min(bridge.beams[beamI].width*WIDTH_FACTOR,10);
        gContext.stroke();
        gContext.fillText(bridge.beams[beamI].force().toFixed(0), (p1[0]+p2[0])/2., (p1[1]+p2[1])/2.);
    }
    gContext.lineWidth=1;
    
    //draw weights
    gContext.fillStyle="black";
    var reachedEquilibrium = true;
    for (nodeI in bridge.nodes) {
        gContext.beginPath();
        var node = bridge.nodes[nodeI];
        gContext.arc(interceptX+node.x*slopeX, interceptY+node.y*slopeY, 5, 0, 2*Math.PI, true);
        if (node.isMoving()) {
            gContext.fillStyle="red";
            reachedEquilibrium=false;
        } else {
            gContext.fillStyle="black";
        }
        gContext.closePath();
        gContext.fill();
        //gContext.fillText(node.netForceMagnitude().toFixed(0), interceptX+node.x*slopeX, interceptY+node.y*slopeY-10);
    }
    if (reachedEquilibrium) {
        gContext.fillStyle="black";
    } else {
        gContext.fillStyle="red";
    }
    
    if (!paused) {
        elapsedTime+=dt;
        for (var i=0; i<iterations; i++) {
            bridge.moveForTime(dt/iterations);
        }
    }
    //console.log(bridge.averageNodeForce());
    //console.log(bridge.nodes[3].netForce());
    
    window.setTimeout("Draw();", 10);
}

function start() {
    Draw();
}

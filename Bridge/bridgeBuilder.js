
var GRAVITY = 9.81

//dt is directly proportional to user satisfaction
//iterations just makes it run right.
//tForEachCalculation is inversely proportional to how well it runs.
var dt = .002;
var iterations = 2000.;//calculations per frame
var tForEachCalculation = dt/iterations;

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
    
    this.type="Beam";
    
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
    
    this.calculateForce = function() {
        this.storedForce = this.force();
    }
    
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
    
    this.type="Node";
    
    this.isMoving = function() {
        return this.velocity()>1e-3;
    }
    
    //mass is stored completely separately from weight. When using mass, though, make sure to add the weight/GRAVITY
    this.mass = 0;
    
    if (weight) {
        this.weight = weight;//weight of load, regardless of tension forces
    } else {
        this.weight = 0;
    }
    
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
    
    this.calculateNetForce = function() {
        this.storedForce = this.netForce();
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
            var beamForce = beam.storedForce;
            var node = beam.otherNode(this);
            
            var damping = 2.0*Math.sqrt(beam.k * (this.mass + this.weight/GRAVITY));
            var direction = this.directionToNode(node);
            // use dot product of relative node velocity and strut direction
            // to compute the rate at which the strut is elongating (EJD)
            var strainrate = Math.cos(direction)*(this.vx-node.vx) + 
                Math.sin(direction)*(this.vy-node.vy); 
            // now compute the x/y components of the damping force (EJD)
            dampingForce.x += damping*strainrate*Math.cos(direction);
            dampingForce.y += damping*strainrate*Math.sin(direction);
            force.x+=beamForce*Math.cos(direction);
            force.y+=beamForce*Math.sin(direction);
        }
        
        //dampen, but only to 0. Otherwise can create an oscillation by counteracting the force too much
        var oldForceX = force.x;
        var oldForceY = force.y;
        
        force.x-=dampingForce.x;
        force.y-=dampingForce.y;
        
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
    
    //uses stored force
    this.moveForTime = function(timestep) {
        var netForce = this.storedForce;
        
        this.ax = netForce.x/(this.mass + this.weight/GRAVITY);
        this.ay = netForce.y/(this.mass + this.weight/GRAVITY);
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
    
    for (beamI in this.beams) {
        var beam = this.beams[beamI];
        beam.calculateForce();
    }
    
    
    this.moveForTime = function(timestep) {
        for (beamI in this.beams) {
            var beam = this.beams[beamI];
            beam.calculateForce();
        }
        for (nodeI in this.nodes) {
            var node = this.nodes[nodeI];
            node.calculateNetForce();
        }
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

function deleteNode(node) {
    var newUserNodes = [];
    for (i in userNodes) {
        if (userNodes[i]!=node) newUserNodes.push(userNodes[i]);
        else {
            //delete beams that contain i. For every beam that has a coordinate >i, reduce it by 1
            var newUserBeams = [];
            for (beami in userBeams) {
                usrBeam = userBeams[beami];
                if (parseInt(usrBeam[0])!=i && parseInt(usrBeam[1])!=i) {
                    if (usrBeam[0]>i) usrBeam[0]--;
                    if (usrBeam[1]>i) usrBeam[1]--;
                    newUserBeams.push(usrBeam);
                }
            }
            userBeams=newUserBeams;
        }
    }
    userNodes=newUserNodes;
}

function insertNodeIntoBeam(node, beam) {
    var newNodeIndex = userNodes.length;
    userNodes.push(node);
    var node1 = beam.node1;
    var node2 = beam.node2;
    deleteBeam(beam);
    var node1i;
    var node2i;
    for (i in bridge.nodes) {
        if (bridge.nodes[i]==node1) node1i=i;
        else if (bridge.nodes[i]==node2) node2i=i;
    }
    userBeams.push([newNodeIndex, node1i]);
    userBeams.push([newNodeIndex, node2i]);
}

function deleteBeam(beam) {
    //first find the node indices of beam
    var node1 = beam.node1;
    var node2 = beam.node2;
    var node1i;
    var node2i;
    for (i in bridge.nodes) {
        if (bridge.nodes[i]==node1) node1i=i;
        else if (bridge.nodes[i]==node2) node2i=i;
    }
    newUserBeams = [];
    for (i in userBeams) {
        var usrBeam = userBeams[i];
        console.log(usrBeam);
        var usrBeamIsFirst = parseInt(usrBeam[0])==node1i && parseInt(usrBeam[1])==node2i;
        var usrBeamIsSecond = parseInt(usrBeam[1])==node1i && parseInt(usrBeam[0])==node2i;
        if (!usrBeamIsFirst&&!usrBeamIsSecond) {
            newUserBeams.push(usrBeam);
        }
    }
    userBeams=newUserBeams;
}

var bridge;

var bridgeLength = parseFloat(document.getElementById("length").value);
//user-defined nodes (and possibly support nodes). car drives along y=0 nodes
var userNodes=[new Node(-bridgeLength/2.,0,true,true,0), new Node(bridgeLength/2,0,false,true,0), new Node(0, 0, false, false, 0)];
//when using this, make a deep copy

//lists of indices in userNodes (or a copy of user nodes)
var userBeams=[];

//returns coord of an event in model coordinates
function coord(event, obj) {
    return [(event.pageX-obj.offsetLeft-interceptX)/slopeX,(event.pageY-obj.offsetTop-interceptY)/slopeY];
}

//this class represents a point in model coordinates. it responds to intersection methods. Copied from collision lab.

//these constants define how steep a line must be for it to be vertical and how close the intersection must be to the line ends.
var VERTICAL_CUTOFF=.01;
var INTERSECTION_ERROR = 1e-5;

//a point has an x and a y coordinate. It is mutable.
function Point(x,y) {
    this.x=x;
    this.y=y;
    //add vector to point (changes in place). This can be used when moving a point by a certain amount, for example when moving.
    this.addVector = function(vec) {
        this.x+=vec.x;
        this.y+=vec.y;
    }
    //copy so addVector doesn't change anything
    this.copy = function() {
        var pt = new Point(this.x, this.y);
        return pt;
    }
    //returns the angle from this to other points. Angle is in radians, counterclockwise from east
    this.angle = function(other) {
        return Math.atan2(other.y-this.y, other.x-this.x);
    }
    //returns the midpoint between two points.
    this.midpoint = function(other) {
        return new Point((other.x+this.x)/2, (other.y+this.y)/2);
    }
    //returns the distance between two points
    this.distance = function(other) {
        return Math.sqrt((this.x-other.x)*(this.x-other.x) + (this.y-other.y)*(this.y-other.y));
    }
    //mutates point by rotating it a certain amount of radians counterclockwise around a centerOfRotation. Changes are made in place.
    this.rotate = function(angle, center) {
        //calculate the current angle. add the ∆angle. Then use the center to find the new coordinates, keeping distance from this to center constant
        var startAngle = center.angle(this);
        var destAngle = startAngle+angle;
        var dist = this.distance(center);
        this.x=center.x+dist*Math.cos(destAngle);
        this.y=center.y+dist*Math.sin(destAngle);
    }
    
    //intersection code has been ported from python to objective-c and finally to javascript
    //it has been tested exhaustively with ray casting.
    //this helper function can be called when this and b define a vertical segment. it returns this segment's intersection point with the segment between c and d, if one exists.
    this.verticalIntersect = function(b,c,d) {
        var a=this;
        //check if other is vertical
        if (Math.abs(c.x-d.x)<VERTICAL_CUTOFF) {
            //parallel lines never intersect
            return undefined;
        }
        //check to see if the vertical segment's x is between the other segment's endpoint's xs'
        var x = a.x; // the x of the vectical segment
        var minX = Math.min(c.x, d.x)-INTERSECTION_ERROR;
        var maxX = Math.max(c.x, d.x)+INTERSECTION_ERROR;
        var xInDomain = (x>=minX)&&(x<=maxX);
        if (!xInDomain) return undefined;
        
        //find the top and bottom of the vertical segment
        var minY = Math.min(a.y, b.y)-INTERSECTION_ERROR;
        var maxY = Math.max(a.y, b.y)+INTERSECTION_ERROR;
        //find the equation of the other segment.
        var slope = (d.y-c.y)/(d.x-c.x);
        //y-c.y=slope(x-c.x)
        //intercept = c.y-slope*c.x
        var intercept = c.y-slope*c.x;
        //plug in x of vertical segment to find the intersection point with the vertical line.
        var y = slope*x+intercept;
        //check to see if this point lies on the vertical segement
        var yInRange = (y>=minY)&&(y<=maxY);
        if (!yInRange) {
            return undefined;
        }
        //all done
        return new Point(x,y);
    }
    //this function calculates the intersection of the segments defined between (this -> b) and (c -> d)
    this.intersectSegments = function(b,c,d) {
        var a = this;
        //a-b intersect c-d
        //check for vertical-ness
        if (Math.abs(a.x-b.x)<VERTICAL_CUTOFF) {//segment1 is vertical
            if (Math.abs(c.x-d.x)<VERTICAL_CUTOFF) return undefined;//both vertical, parallel
            return a.verticalIntersect(b,c,d);
        }
        if (Math.abs(c.x-d.x)<VERTICAL_CUTOFF) {
            return c.verticalIntersect(d,a,b);
        }
        //neither is vertical, so both have valid slopes
        //find the equtaions of both lines
        var slope1 = (a.y-b.y)/(a.x-b.x);
        //y-a.y=slope1(x-a.x)
        //b=a.y-slope1*a.x
        var intercept1 = a.y-slope1*a.x;
        var slope2 = (c.y-d.y)/(c.x-d.x);
        if (slope1==slope2) return undefined;//parallel
        //y-c.y=slope2(x-c.x)
        //b=c.y-slope2*c.x
        var intercept2 = c.y-slope2*c.x;
        //y=slope1*x+intercept1
        //y=slope2*x+intercept2
        //slope1*x+intercept1=slope2*x+intercept2
        //x(slope1-slope2)=intercept2-intercept1
        //x=(intercept2-intercept1)/(slope1-slope2)
        var x = (intercept2-intercept1)/(slope1-slope2);
        
        //check to see if x is in the domain of both segments
        var minX1 = Math.min(a.x, b.x)-INTERSECTION_ERROR;
        var maxX1 = Math.max(a.x, b.x)+INTERSECTION_ERROR;
        if (x<minX1||x>maxX1) return undefined;
        var minX2 = Math.min(c.x, d.x)-INTERSECTION_ERROR;
        var maxX2 = Math.max(c.x, d.x)+INTERSECTION_ERROR;
        if (x<minX2||x>maxX2) return undefined;
        //find the y coordinate
        //y=slope1*x+intercept1
        var y = slope1*x+intercept1;
        return new Point(x,y);
    }
    //this function finds the intersection of a segment and a circle.
    //circle has center this and radius radius. points 1 and 2 define a segment.
    this.intersectRadiusSegment = function(radius, point1, point2) {
        //http://mathworld.wolfram.com/Circle-LineIntersection.html
        //finds intersection of line and circle centered at (0,0)
        
        var center = this;
        //shift segment to translate circle to (0,0)
        point1=new Point(point1.x-center.x, point1.y-center.y);
        point2=new Point(point2.x-center.x, point2.y-center.y);
        //remember to shift points back at the end
        
        var x1 = point1.x;
        var x2 = point2.x;
        var y1 = point1.y;
        var y2 = point2.y;
        
        //create helper functions
        var squared=function(x) {return x*x;}
        var sign=function(x) {if (x<0) return -1.0; return 1.0;};
        
        var dx = x2-x1;
        var dy = y2-y1;
        var dr = Math.sqrt(squared(dx)+squared(dy));
        var D = x1*y2-x2*y1;//oops, had this being addition for a long time
        
        var discriminant = squared(radius)*squared(dr) - squared(D);
        if (discriminant<0) {//no intersection!
            return undefined;
        }
        var sqrtOfDiscriminant = Math.sqrt(discriminant);
        var denominator = squared(dr);
        
        //x-coords
        var xAddedOrSubtracted = sign(dy)*dx*sqrtOfDiscriminant;
        var xBeforePlusMinus = D*dy;
        var intersectionx1 = (xBeforePlusMinus+xAddedOrSubtracted)/denominator;
        var intersectionx2 = (xBeforePlusMinus-xAddedOrSubtracted)/denominator;
        
        //y-coords
        var yAddedOrSubtracted = Math.abs(dy)*sqrtOfDiscriminant;
        var yBeforePlusMinus = -1*D*dx;
        var intersectiony1 = (yBeforePlusMinus+yAddedOrSubtracted)/denominator;
        var intersectiony2 = (yBeforePlusMinus-yAddedOrSubtracted)/denominator;
        
        var intersection1 = new Point(intersectionx1, intersectiony1);
        var intersection2 = new Point(intersectionx2, intersectiony2);
        
        var firstInBounds = intersection1.betweenPoints(point1, point2);
        var secondInBounds = intersection2.betweenPoints(point1, point2);
        
        intersection1.x+=center.x;
        intersection1.y+=center.y;
        intersection2.x+=center.x;
        intersection2.y+=center.y;
        
        if (firstInBounds) {
            if (secondInBounds) {
                return intersection1.midpoint(intersection2);
            }
            return intersection1;
        } else if (secondInBounds) {
            return intersection2;
        }
    }
    //returns a boolean determining whether this is within the rectangle with corners 1 and 2 (opposite from each other)
    this.betweenPoints = function(corner1, corner2) {//inside of rectangle
        //find the rectangle boundaries
        var minX = Math.min(corner1.x, corner2.x);
        var maxX = Math.max(corner1.x, corner2.x);
        var minY = Math.min(corner1.y, corner2.y);
        var maxY = Math.max(corner1.y, corner2.y);
        //check for domain and range inclusion.
        var xInBetween = (this.x<=maxX) && (this.x>=minX);
        var yInBetween = (this.y<=maxY) && (this.y>=minY);
        return xInBetween&&yInBetween;
    }
    //the following function tells whether this is directly between two other points (with some error margin).
    //this can be used to find if an intersection point is actually on one shape or another.
    //since the collisions each happen independently (now, they originally didn't), this might not actually be used.
    var POINT_ERROR = 1e-3;//if this is too small, errors will occur
    this.directlyBetweenPoints = function(point1, point2) {
        var yInBetween = Math.min(point1.y, point2.y)-POINT_ERROR<=this.y && this.y<=Math.max(point1.y, point2.y)+POINT_ERROR;
        var xInBetween = Math.min(point1.x, point2.x)-POINT_ERROR<=this.x && this.x<=Math.max(point1.x, point2.x)+POINT_ERROR;
        if (!yInBetween) {
            return false;
        }
        if (!xInBetween) {
            return false;
        }
        if (Math.abs(point1.x-point2.x)<POINT_ERROR) {//vertical segment
            return true;
        } else {
            //y-y0=m(x-x0)
            var slope = (point1.y-point2.y)/(point1.x-point2.x);
            var intercept = point1.y-slope*point1.x;
            var yAtMyX = slope*this.x + intercept;
            return Math.abs(yAtMyX-this.y)<POINT_ERROR;
        }
    }
    //for drawing on screen. returns jxPoint
    this.drawnPoint = function() {
        var pt = new jxPoint(this.x*xScale+xOffset, -this.y*yScale+yOffset);
        return pt;
    }
}


//returns the object at a coord in model space. Object is either a Node or a Truss. Returns an array [object, coord on object]
//if a node, returns the one in usernodes
//if a truss, return the one in bridge.beams
var MAX_CLICK_DIST = .03;
function objectAtCoord(coordinate) {
    coordPt = new Point(coordinate[0], coordinate[1]);
    var distToObj = MAX_CLICK_DIST;
    var obj;
    var pointOnObj;
    //prefer to click on node
    for (i in userNodes) {
        var nodeCenter = new Point(userNodes[i].x, userNodes[i].y);
        var distFromNodeToPt = nodeCenter.distance(coordPt);
        if (distToObj>distFromNodeToPt) {
            obj=userNodes[i];
            distToObj = distFromNodeToPt;
            pointOnObj = nodeCenter;
        }
    }
    if (!obj) {
    for (i in bridge.beams) {
        var beam1 = new Point(bridge.beams[i].node1.x,bridge.beams[i].node1.y);
        var beam2 = new Point(bridge.beams[i].node2.x,bridge.beams[i].node2.y);
        var intersection = coordPt.intersectRadiusSegment(distToObj, beam1, beam2);
        if (intersection && intersection.distance(coordPt)<distToObj) {
            distToObj = intersection.distance(coordPt);
            obj = bridge.beams[i];
            pointOnObj = intersection;
        }
    }
    }
    if (!obj) {
        pointOnObj=coordPt;
        obj = undefined;//new Node(pointOnObj.x, pointOnObj.y);
    }
    return [obj, [pointOnObj.x, pointOnObj.y]];
}

var isDragging = false;
var startingCoord;
var selectedObject;
var startingNode;
var mouseIsDown = false;
var movingCoord;
var movingObject;//object that the mouse is currently over

function startDragging() {
    isDragging=true;
    if (!selectedObject) {
        startingNode=new Node(startingCoord[0],startingCoord[1]);
        userNodes.push(startingNode);
    } else if (selectedObject.type=="Beam") {
        startingNode=new Node(startingCoord[0],startingCoord[1]);
        insertNodeIntoBeam(startingNode, selectedObject);
        resetBridge();
    } else {
        startingNode=selectedObject;
    }
}

function endDragging() {
    isDragging=false;
    var endNode;
    var endNodeIndex = userNodes.length;
    if (!movingObject || movingObject.type=="Beam") {
        //create a new node for the endpoint
        endNode = new Node(movingCoord[0], movingCoord[1]);
    } else if (movingObject.type=="Node") {
        endNode=movingObject;
        for (i in userNodes) {
            if (userNodes[i]==endNode) {
                endNodeIndex=i;
            }
        }
    }
    
    if (!movingObject) {
        userNodes.push(endNode);
    } else if (movingObject.type=="Beam") {
        //insert the end node into the beam
        insertNodeIntoBeam(endNode, movingObject);
    }
    
    var startNodeIndex;
    for (i in userNodes) {
        if (userNodes[i]==startingNode) startNodeIndex=i;
    }
    userBeams.push([startNodeIndex, endNodeIndex]);
    
    resetBridge();
}

function mouseDown(event,obj) {
    var objcoord = objectAtCoord(coord(event, obj));
    startingCoord=objcoord[1];
    selectedObject=objcoord[0];
    console.log(selectedObject);
    mouseIsDown=true;
    console.log(startingCoord);
    movingCoord=startingCoord;
}

var MIN_DRAG_DIST = .03;

function mouseMoved(event,obj) {
    if (mouseIsDown) {
        var objcoord = objectAtCoord(coord(event,obj));
        movingCoord = objcoord[1];
        movingObject=objcoord[0];
        var mousePt = new Point(movingCoord[0], movingCoord[1]);
        var startPt = new Point(startingCoord[0], startingCoord[1]);
        if (!isDragging && mousePt.distance(startPt)>MIN_DRAG_DIST) {
            startDragging();
            selectedObject=undefined;
        }
    }
}

function mouseUp(event,obj) {
    //first move to pt
    mouseMoved(event, obj);
    
    mouseIsDown=false;
    if (isDragging) {
        endDragging();
    }
}

function keyPress(event) {
    if (event.keyCode==8 && selectedObject) {
        //delete key
        if (selectedObject.type=="Beam") {
            deleteBeam(selectedObject);
            resetBridge();
        } else if (selectedObject.type=="Node") {
            deleteNode(selectedObject);
            resetBridge();
        }
    }
}

//bind delete key
document.onkeypress=keyPress;

//prevent scrolling when on top. scrolling is hijacked to zoom
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

var nrg=function() {
    var energy=0;
    for (i in bridge.nodes) {
        //mvv/2
        energy+=bridge.nodes[i].velocity()*bridge.nodes[i].velocity()*bridge.nodes[i].mass/2.;
        //mgh
        energy+=bridge.nodes[i].mass*GRAVITY*bridge.nodes[i].y;
    }
    for (i in bridge.beams) {
        //kxx/2
        var x = bridge.beams[i].length()-bridge.beams[i].restLength;
        energy+=bridge.beams[i].k*x*x/2.;
    }
    return energy;
}

function Draw() {
    gContext.clearRect(0, 0, GRAPHICS_WIDTH, GRAPHICS_HEIGHT);
    
    //draw beam currently being drawn by user
    if (mouseIsDown) {
        gContext.beginPath();
        gContext.strokeStyle="gray";
        gContext.lineWidth=parseFloat(document.getElementById("width").value)*WIDTH_FACTOR;
        gContext.moveTo(startingCoord[0]*slopeX+interceptX, startingCoord[1]*slopeY+interceptY);
        gContext.lineTo(movingCoord[0]*slopeX+interceptX, movingCoord[1]*slopeY+interceptY);
        gContext.stroke();
    }
    
    document.getElementById("NRG").innerHTML=nrg().toPrecision(4);
    
    //draw beams
    gContext.lineWidth=1;
    gContext.font = "bold 12px sans-serif";
    for (beamI in bridge.beams) {
        gContext.strokeStyle="gray";
        gContext.beginPath();
        if (bridge.beams[beamI]==selectedObject) gContext.strokeStyle="yellow";
        var p1 = [interceptX+bridge.beams[beamI].node1.x*slopeX, interceptY+bridge.beams[beamI].node1.y*slopeY];
        var p2 = [interceptX+bridge.beams[beamI].node2.x*slopeX, interceptY+bridge.beams[beamI].node2.y*slopeY];
        gContext.moveTo(p1[0], p1[1]);
        gContext.lineTo(p2[0], p2[1]);
        gContext.lineWidth=Math.min(bridge.beams[beamI].width*WIDTH_FACTOR,10);
        gContext.stroke();
        gContext.fillText(bridge.beams[beamI].storedForce.toFixed(0), (p1[0]+p2[0])/2., (p1[1]+p2[1])/2.);
    }
    gContext.lineWidth=1;
    
    //draw weights
    var reachedEquilibrium = true;
    for (nodeI in bridge.nodes) {
        gContext.fillStyle="black";
        gContext.beginPath();
        var node = bridge.nodes[nodeI];
        if (userNodes[nodeI]==selectedObject) gContext.fillStyle="yellow";
        gContext.arc(interceptX+node.x*slopeX, interceptY+node.y*slopeY, 5, 0, 2*Math.PI, true);
        if (node.isMoving()) {
            gContext.fillStyle="red";
            reachedEquilibrium=false;
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
            bridge.moveForTime(tForEachCalculation);
        }
    }
    //console.log(bridge.averageNodeForce());
    //console.log(bridge.nodes[3].netForce());
    
    window.setTimeout("Draw();", 10);
}

function start() {
    Draw();
}

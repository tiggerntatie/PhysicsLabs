//for interface with this model

/*
 Call resetShapes() to reset all shapes. call this at the beginning and every time reset button is clicked
 Enumerate through array called shapes
 For each shape, you can call methods move(timestep, shapes) and draw()
 There is also the public class ShapeInput that should be created and used to its full potential
 shapesInputString() returns displayable html for a list of added shapes
 There are also public functions momentum(), kineticEnergy(), and angularMomentum(), which return displayable strings
 */

//fully documented as of 1/5/14

//http://jsdraw2dx.jsfiction.com
//new (to me) graphics library. let's see how it works out.
//first, connect to the screen
var canvas = new jxGraphics(document.getElementById("graphics"));

//original scale and starting points of graphics.
var xScale = 20;
var yScale = 20;
var xOffset = document.getElementById("graphics").clientWidth/2;
var yOffset = document.getElementById("graphics").clientHeight/2;

//begin model definition
//first define some base classes with convenience methods

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

//this class is for a two-dimensional vector. It is useful for defining forces, velocities, accelerations, etc.
//it is mutable (through properties x and y), but methods do not mutate it.
function Vector(x,y) {
    this.x=x;
    this.y=y;
    //the following functions return new vectors.
    this.minus = function(other) {
        return new Vector(this.x-other.x, this.y-other.y);
    }
    this.add = function(other) {
        return new Vector(this.x+other.x, this.y+other.y);
    }
    this.timesScalar = function(scalar) {
        return new Vector(this.x*scalar, this.y*scalar);
    }
    this.divScalar = function(scalar) {
        return new Vector(this.x/scalar, this.y/scalar);
    }
    this.dot = function(other) {
        return this.x*other.x+this.y*other.y;
    }
    //cross product actually returns a vector, but in the case of two-dimensional vectors (like force and lever arm), the cross product only has one non-zero value (like torque)
    this.cross = function(other) {
        return this.x*other.y-this.y*other.x;
    }
    //magnitude of vector
    this.mag = function() {
        return Math.sqrt(this.x*this.x+this.y*this.y);
    }
    //direction of vector, counterclockwise from east in radians
    this.direc = function() {
        return Math.atan2(this.y, this.x);
    }
}
//creates and returns a vector from point1 to point2
function vectorBetweenPoints(point1, point2) {
    return new Vector(point2.x-point1.x, point2.y-point1.y);
}
//creates a vector with given direction and magnitude
function vectorDirecMag(direc, mag) {
    return new Vector(mag*Math.cos(direc), mag*Math.sin(direc));
}

//takes an arithmetic mean of a list of points. This used to be used for averaging intersection points, but I don't think it's used anymore.
function averagePoints(points) {
    var average = new Point(0, 0);
    for (i in points) {
        average.x+=points[i].x;
        average.y+=points[i].y;
    }
    average.x/=points.length;
    average.y/=points.length;
    return average;
}

//returns a point, or a list of points
//given two objects (PolygonalBody or CircularBody), calculates the intersection point(s) between them
function collisionPoint(obj1, obj2) {
    if (!obj1.polygon && !obj2.polygon) {
        //both are circles
        //returns the average of the intersection points, because the real intersection points don't matter with circles (they can't be very far apart)
        //first find if the objects intersect by looking at the distances between their centers and comparing this to the sum of their radii
        var distance = obj1.center.distance(obj2.center);
        if (distance<=obj1.r+obj2.r) {
            var angle = obj1.center.angle(obj2.center);
            return new Point(obj1.center.x+obj1.r*Math.cos(angle), obj1.center.y+obj1.r*Math.sin(angle));
        }
    } else if (obj1.polygon&&obj2.polygon) {
        //both polygons
        //don't average points, because this could lead to cases where the point falls on neither polygon (for example if a star of david hits a cup.
        var intersections = [];
        var vertices1 = obj1.polygon.points;
        var vertices2 = obj2.polygon.points;
        //this goes through every pair of segments, looking for an intersection. There is a much better way to do this, but it's hard to implement. Good luck with that!
        for (i1 in vertices1) {
            for (i2 in vertices2) {
                //i need a lot of parseInts because for some reason indices occasionally turn out to be strings and I get something like "21" insead of 3 when I concatenate instead of add
                var intersect = vertices1[i1].intersectSegments(vertices1[(parseInt(i1)+1)%vertices1.length], vertices2[i2], vertices2[(parseInt(i2)+1)%vertices2.length]);
                //if intersect is defined, add it to the list
                if (intersect) {
                    intersections.push(intersect);
                }
            }
        }
        //return intersections now, if any. otherwise, return undefined (this is the default)
        if (intersections.length) return intersections;
    } else {
        //one polygon one circle. identify which is which
        var polygon = obj1;
        var circle = obj2;
        if (!polygon.polygon) {
            polygon = obj2;
            circle = obj1;
        }
        var vertices = polygon.polygon.points;
        for (i in vertices) {
            var intersect = circle.center.intersectRadiusSegment(circle.r, vertices[i], vertices[(parseInt(i)+1)%vertices.length]);
            if (intersect) {
                //I was going to say circles can only intersect in one general location with a polygon, but that's not true. Oh well, so far this has worked. If it stops working in a specific case, try adding this intersection to a list and returning that list after all indices have been searched over.
                //in general, circle intersections are easy to detect and deal with. partly because there's no angular momentum involved
                return intersect;
            }
        }
    }
}

var somePoint = new Point(0,0);//for comparisons of angular momentum. This can be any point, but it can't change much
//for example, it could be Point(100, -3). It's just a central point for calculating the total angular momentum of a system

//point must be valid (not undefined or NaN). This is a helper function
//takes two objects (PolygonalBody or CircularBody) and collides them at a given point
function collideObjectsAtPoint(obj1, obj2, point) {
    var angle = obj1.normalAtPoint(point);//calculate the normal angle
    if (!angle || obj2.center) {//circles are better than polygons at this
        var store = obj2;
        obj2=obj1;
        obj1=store;
        angle = obj1.normalAtPoint(point);
    }
    console.log(point);
    console.log(angle);
    //I got the general idea for this from a website. I don't feel like looking it up now. If needed, email me at shipshapemath@me.com and I'll look it up for you.
    var n = vectorDirecMag(angle, 1); // a unit vector at the point of intersection
    var relV = obj1.velocityAtPoint(point).minus(obj2.velocityAtPoint(point));
    var relNormV = relV.dot(n);
    if (relNormV>0.02) {
        console.log("collide");
        var rap = vectorBetweenPoints(obj1.centerOfMass(), point);
        var rbp = vectorBetweenPoints(obj2.centerOfMass(), point);
        var elasticity = (obj1.e+obj2.e)/2; //averaging elasticity of objects here. I'm not really sure if this is correct. all sources I saw said that a collision has elasticity, not objects.
        var numerator = -(1+elasticity)*relNormV;
        var aMOI = obj1.momentOfInertia();
        var bMOI = obj2.momentOfInertia();
        var denominator = 1/obj1.m + 1/obj2.m + rap.cross(n)*rap.cross(n)/aMOI + rbp.cross(n)*rbp.cross(n)/bMOI;
        var impulse = numerator/denominator;
        var jn = n.timesScalar(impulse);
        obj1.v = obj1.v.add(jn.divScalar(obj1.m));
        obj2.v = obj2.v.minus(jn.divScalar(obj2.m));
        obj1.angularV+=rap.cross(jn)/aMOI;
        obj2.angularV-=rbp.cross(jn)/bMOI;
    }
}

//collides two objects.
function collideObjects(obj1, obj2) {
    var point = collisionPoint(obj1, obj2);
    if (point) {//point is not undefined
        if (point.x!=undefined) {
            //a single point
            collideObjectsAtPoint(obj1, obj2, point);
        } else {
            //it's an array of points
            for (i in point) {
                collideObjectsAtPoint(obj1, obj2, point[i]);
            }
        }
    }
}

//create a circular body with starting values and color (as a string like "red")
function CircularBody(x, y, radius, vx, vy, color, elasticity, mass) {
    this.center=new Point(x,y);
    this.r=radius;
    this.v=new Vector(vx,vy);
    this.color = new jxColor(color);
    //this.pen = new jxPen(this.color, '2px');
    this.m=mass
    this.e=elasticity;
    this.angularV=0;//no real reason for this. it doesn't do anything. avoids some undefined and NaN errors, though
    this.centerPoints = [];
    this.drawnCenterPoints = [];
    
    this.drawnCenter=new jxPoint(0,0);
    this.updateCenter = function() {
        this.drawnCenter.x=this.center.x*xScale+xOffset;
        this.drawnCenter.y=-this.center.y*yScale+yOffset;
        //the circle must be recalculated every frame because xScale or yScale may have changed.
        if (this.circle) {
            this.circle.remove();
        }
        this.circle = new jxEllipse(this.drawnCenter, this.drawnRadius*2*xScale, this.drawnRadius*2*yScale, undefined, new jxBrush(this.color));
        
        for (i in this.drawnCenterPoints) {
            this.drawnCenterPoints[i].x=this.centerPoints[i].x*xScale+xOffset;
            this.drawnCenterPoints[i].y=-this.centerPoints[i].y*yScale+yOffset;
        }
    }
    this.updateCenter();
    this.drawnRadius=this.r;
    
    this.circle = new jxEllipse(this.drawnCenter, this.drawnRadius*2*xScale, this.drawnRadius*2*yScale, this.pen);
    this.drawnCenterTracking = new jxPolyline(this.drawnCenterPoints, new jxPen(this.color, "2px"));
    
    //draw takes an argument x. if no argument is provided, the circle will be redrawn.
    this.draw = function(x) {
        this.updateCenter();
        if (!x) {
            this.circle.draw(canvas);
            this.drawnCenterTracking.draw(canvas);
        }
    }
    this.draw(1);
    
    //now for the physics part!
    
    this.momentOfInertia = function() {
        return this.r*this.r*this.m/2;
    }
    
    this.centerOfMass = function() {
        return this.center;
    }
    
    //move circle for a certain amount of time while interacting with other shapes.
    //timestep should be small
    this.move = function(timestep, others) {
        //record center of mass
        this.centerPoints.push(this.centerOfMass().copy());
        this.drawnCenterPoints.push(this.centerOfMass().drawnPoint());
        //collide with all other objects
        //just for fun, calculate acceleration due to gravity. see if anyone notices.
        var acceleration = new Vector(0, 0);
        for (i in others) {
            var otherObj = others[i];
            if (otherObj!=this) {
                collideObjects(this, otherObj);
                var dist = this.center.distance(otherObj.center);
                acceleration = acceleration.add(vectorDirecMag(this.center.angle(otherObj.center), 6.67e-11 * otherObj.m / (dist*dist)));//ag = GM/r^2
            }
        }
        
        //move by v*∆t + a∆t^2/2
        var translation = this.v.timesScalar(timestep).add(acceleration.timesScalar(timestep*timestep/2.0));
        this.v = this.v.add(acceleration.timesScalar(timestep));
        this.center.addVector(translation);
    }
    
    //the normal angle at a certain point. this is really easy for a circle because it's the angle from the center to the point
    this.normalAtPoint = function(point) {
        return Math.atan2(point.y-this.center.y, point.x-this.center.x);
    }
    
    this.translationalEnergy=function() {
        return this.m*this.v.mag()*this.v.mag()/2;
    }
    
    this.kineticEnergy = function() {
        return this.m*this.v.mag()*this.v.mag()/2;
    }
    
    //momentum (only for checking)
    this.p = function() {
        return this.v.timesScalar(this.m);
    }
    
    //this is used for compatibility. circles and polygons both define this method, but it's only difficult for polygons
    this.velocityAtPoint = function(point) {
        return this.v;
    }
    
    this.angularMomentum = function(center) {
        return this.m*vectorBetweenPoints(center, this.center).cross(this.v);
    }
    
    //get rid of circle on screen
    this.clear=function() {
        this.circle.remove();
        this.drawnCenterTracking.remove();
        //this.drawnCenterPoints=[];
    }
}

//assumes counterclockwise polygon
//returns boolean telling whether angle p1->p2->p3 is convex in a counterclockwise polygon. this could be used to determine if a polygon is counterclockwise, for example (but there are exceptions with this method)
function angleConvex(p1, p2, p3) {
    var firstEdgeDirec = vectorBetweenPoints(p1, p2).direc();
    var secondEdgeDirec = vectorBetweenPoints(p2, p3).direc();
    //rotate edges so first edge is at direction 0 (along x axis)
    secondEdgeDirec-=firstEdgeDirec;
    firstEdgeDirec=0;
    //get it in a specific range (from 0 to 2pi)
    while (secondEdgeDirec>Math.PI*2) secondEdgeDirec-=2*Math.PI;
    while (secondEdgeDirec<0) secondEdgeDirec+=2*Math.PI;
    //to be convex, secondedge has to be between 0 and pi
    return secondEdgeDirec<Math.PI;
}

//gives degree angle measure of interior angle of counterclockwise polygon
//this is a good way to determine whether a polygon is defined counterclockwise
function angleMeasure(p1, p2, p3) {
    var firstEdgeDirec = vectorBetweenPoints(p1, p2).direc();
    var secondEdgeDirec = vectorBetweenPoints(p2, p3).direc();
    //rotate edges so first edge is at direction 0 (along x axis)
    secondEdgeDirec-=firstEdgeDirec;
    firstEdgeDirec=0;
    secondEdgeDirec = Math.PI-secondEdgeDirec;
    //get it in a specific range (from 0 to 2pi)
    while (secondEdgeDirec>Math.PI*2) secondEdgeDirec-=2*Math.PI;
    while (secondEdgeDirec<0) secondEdgeDirec+=2*Math.PI;
    return secondEdgeDirec*180/Math.PI;
}

// Array Remove - By John Resig (MIT Licensed)
//http://ejohn.org/blog/javascript-array-remove/
var removeArray = function(array, i) {
    return array.slice(0,i).concat(array.slice(i+1));
};

//a polygon is made of points. Methods can mutate points.
function Polygon(points) {
    //change to counterclockwise
    this.points = points;
    
    //move all points
    this.addVector = function(vec) {
        for (i in this.points) {
            this.points[i].addVector(vec);
        }
    }
    
    //rotate all points around center of mass by given angle (counterclockwise)
    this.rotate = function(angle) {
        var com = this.centerOfMass();
        for (i in this.points) {
            this.points[i].rotate(angle, com);
        }
    }
    
    //this is a pretty important function for computing the component triangles.
    //returns a boolean stating if the polygon intersects itself.
    this.selfIntersects = function() {
        //if a triangle, self intersection is impossible.
        var length = this.points.length;
        if (length<=3) {
            return false;
        }
        //go through each possible pair of intersecting segments
        for (i in this.points) {
            pointi = parseInt(i);//sometimes i acts like a string (for instance when adding 1, can become 21
            var segmentStart = this.points[pointi];
            var segmentEndIndex = (pointi+1)%length;
            var segmentEnd = this.points[segmentEndIndex];
            for (var otherPointi=(pointi+2)%length; (otherPointi+1)%length!=pointi; otherPointi=(otherPointi+1)%length) {
                var otherSegmentStart = this.points[otherPointi];
                var oEndI = (otherPointi+1)%length;
                var otherSegmentEnd = this.points[oEndI];
                var intersects = segmentStart.intersectSegments(segmentEnd, otherSegmentStart, otherSegmentEnd);
                if (intersects) {
                    return true;
                }
            }
        }
        return false;
    }
    
    //calculates if shape is defined counterclockwise, based on the interior angle sum
    this.isCounterClockwise = function() {
        var totalAngle=0;
        for (i in this.points) {
            var p1 = this.points[i];
            var p2 = this.points[(parseInt(i)+1)%this.points.length];
            var p3 = this.points[(parseInt(i)+2)%this.points.length];
            var angle = angleMeasure(p1, p2, p3);
            totalAngle += angle;
        }
        var angleShouldBe = 180*(this.points.length-2);
        return Math.abs(angleShouldBe-totalAngle)<1;//degree sum of interior angles can only be one away (for error)
    }
    
    //now make polygon counterclockwise
    if (this.points) {
        if (!this.isCounterClockwise()) {
            console.log("reverse");
            this.points.reverse();
        }
    }
    
    //divides polygon into component triangles.
    //this is very useful for things like area, center of mass, and moment of inertia
    //returns list of Triangles
    this.triangles = function() {
        //store triangles so repeated calculation is unnecessary.
        if (this.storedTriangles) {
            return this.storedTriangles;
        }
        //recursive base case
        if (this.points.length<=3) {
            return [new Triangle(this.points[0], this.points[1], this.points[2])];
        }
        //recursive step setup
        var simplifiedPolygon = new Polygon();
        var p1; var p2; var p3;
        var shouldRepeat = true;
        var indicesTried = {};//don't want to keep removing the same one over and over.
        while (shouldRepeat) {
            var removedIndex;
            //find a convex angle. remove the middle vertex. if the resulting polygon still works, recurse.
            for (var startPointIndex=0; startPointIndex<this.points.length; startPointIndex++) {
                removedIndex = (startPointIndex+1)%this.points.length;
                if (indicesTried[removedIndex]) {
                    
                } else {
                    p1=this.points[startPointIndex];
                    p2=this.points[removedIndex];
                    p3=this.points[(startPointIndex+2)%this.points.length];
                    if (angleConvex(p1, p2, p3)) {
                        indicesTried[removedIndex]=true;
                        break;//it worked! stop looping
                    }
                }
            }
            simplifiedPolygon.points=removeArray(this.points, removedIndex);
            //check to see if the resulting polygon is valid
            var isCCW = simplifiedPolygon.isCounterClockwise();
            var selfIntersects = simplifiedPolygon.selfIntersects();
            shouldRepeat = selfIntersects || !isCCW;
        }
        //recurse with a smaller polygon
        var subdivide = simplifiedPolygon.triangles();
        subdivide.push(new Triangle(p1, p2, p3));
        this.storedTriangles=subdivide;
        return subdivide;
    }
    //calculates area of polygon by summing areas of triangles
    this.area = function() {
        var totalArea = 0;
        triangles = this.triangles();
        for (i in triangles) {
            triangle = triangles[i];
            totalArea+=triangle.area();
        }
        //this is much simpler is Haskell
        //totalArea = sum ( map area triangles )
        return totalArea;
    }
    //calculates center of mass by averaging triangle centroids over their area (weighted average)
    this.centerOfMass = function() {
        var centerOfMass = new Point(0,0);//a starting point. does not matter. will be changed
        var totalArea = this.area();
        var accumulatedArea = 0;
        var triangles = this.triangles();
        for (i in triangles) {
            var triangle = triangles[i];
            var triangleArea = triangle.area();
            var fractionalArea = triangleArea/totalArea;
            //this is the percentage of mass in the triangle. since COM is independent of actual mass, fractionalArea can be called the mass in the triangle
            //find center of mass of triangle, which is where lines to midpoints intersect
            var triangleCOM = triangle.centerOfMass();
            //shift center of mass
            //COMx = (m1*x1+m2*x2)/(m1+m2). m1 is accumulated mass, m2 is mass of triangle
            if (!triangleCOM) {
                triangleCOM=triangle.p1;//if two points are really close together, choose one
                console.log("triangle center of mass"+JSON.stringify(triangle));
            }
            var changedX = (accumulatedArea*centerOfMass.x+fractionalArea*triangleCOM.x)/(accumulatedArea+fractionalArea);
            var changedY = (accumulatedArea*centerOfMass.y+fractionalArea*triangleCOM.y)/(accumulatedArea+fractionalArea);
            centerOfMass = new Point(changedX, changedY);
            
            accumulatedArea+=fractionalArea;
        }
        return centerOfMass;
    }
    //moment of inertia. center is optional. by default, center of mass is the center.
    this.momentOfInertia = function(mass, center) {
        if (!center) {
            center = this.centerOfMass();
        }
        //from wikipedia page on parallel axis theorem
        var momentOfInertia=0;
        var totalArea = this.area();
        var triangles = this.triangles();
        for (i in triangles) {
            var triangle = triangles[i];
            var triangleArea = triangle.area();
            var triangleMOI = triangle.momentOfInertia(1.0*mass*triangleArea/totalArea, center);
            momentOfInertia+=triangleMOI;
        }
        return momentOfInertia;
    }
    //goes through each segment and sees which segment contains the point. then return the angle away from the segment
    this.normalAtPoint = function(point) {
        for (i in this.points) {
            var vertex1 = this.points[i];
            var vertex2 = this.points[(parseInt(i)+1)%this.points.length];
            if (point.directlyBetweenPoints(vertex1, vertex2)) {
                //return normal angle. just add (or subtract) 90 degrees to segment angle
                var angle = vertex1.angle(vertex2);
                if (this.isCounterClockwise()) {
                    return angle-Math.PI/2;
                } else {
                    return angle+Math.PI/2;
                }
            }
        }
    }
}

//only used for dividing up polygon. do not use directly for polygon (even if polygon only has three vertices)
function Triangle(p1, p2, p3) {
    //points are never copied, so changing a polygon changes its component triangles
    this.p1=p1;
    this.p2=p2;
    this.p3=p3;
    
    this.area = function() {
        var a = this.p1.distance(this.p2);
        var b = this.p1.distance(this.p3);
        var c = this.p2.distance(this.p3);
        //heron's formula
        var s = (a+b+c)/2;
        return Math.sqrt(s*(s-a)*(s-b)*(s-c));
    }
    
    this.centerOfMass = function() {
        //center of mass is at intersection of midlines
        var midpoint1 = this.p1.midpoint(this.p2);
        var midpoint2 = this.p1.midpoint(this.p3);
        var center = midpoint1.intersectSegments(this.p3, midpoint2, this.p2);
        if (!center) {
            center = this.p1; //if segments don't work out, the triangle is very thin/small. anywhere will do.
        }
        return center;
    }
    
    this.momentOfInertia = function(mass, center) {
        //http://www.wolframalpha.com/input/?i=triangular+plate+moment+of+inertia
        var a = this.p1.distance(this.p2);
        var b = this.p1.distance(this.p3);
        var c = this.p2.distance(this.p3);
        var momentOfInertia = mass * (a*a+b*b+c*c) / 36.0;
        
        //http://en.wikipedia.org/wiki/Parallel_axis_theorem
        var r = center.distance(this.centerOfMass());
        var parallel = momentOfInertia + mass*r*r;
        return parallel;
    }
}

//a polygonal body can be drawn on screen. it reacts to timesteps and collides with other objects
function PolygonalBody(points, vx, vy, angularV, color, elasticity, mass) {
    this.polygon = new Polygon(points);
    this.v=new Vector(vx,vy);
    this.color = new jxColor(color)
    this.m=mass
    this.e=elasticity;
    this.angularV=angularV;
    //center is just for output of coordinates. Not actually used for calculation.
    this.center=new Point(0, 0); // this will be changed soon after object creation.
    
    this.centerPoints = [];//for keeping track of center of mass
    this.drawnCenterPoints = [];//for tracking center of mass. update this every time from center points to allow for screen changes.
    
    //graphics
    this.drawnPoints=[];
    for (i in points) {
        this.drawnPoints.push(new jxPoint(0,0));
    }
    this.updatePoints = function() {
        for (i in this.drawnPoints) {
            this.drawnPoints[i].x=this.polygon.points[i].x*xScale+xOffset;
            this.drawnPoints[i].y=-this.polygon.points[i].y*yScale+yOffset;
        }
        for (i in this.drawnCenterPoints) {
            this.drawnCenterPoints[i].x=this.centerPoints[i].x*xScale+xOffset;
            this.drawnCenterPoints[i].y=-this.centerPoints[i].y*yScale+yOffset;
        }
    }
    this.updatePoints();
    
    var brush = new jxBrush(this.color);
    this.drawnPolygon = new jxPolygon(this.drawnPoints, undefined, brush);
    this.drawnCenterTracking = new jxPolyline(this.drawnCenterPoints, new jxPen(this.color, "2px"));
    
    this.draw = function(x) {
        this.updatePoints();
        
        
        
        if (!x) {
            //this.clear();
            //this.drawnPolygon = new jxPolygon(this.drawnPoints, undefined, new jxBrush(this.color));//if color changes, this is the only way to reflect those changes
            this.drawnPolygon.draw(canvas);
            this.drawnCenterTracking.draw(canvas);
        }
        
    }
    this.draw(1);
    
    //now physics stuff
    
    //some things can be calculated by the internal polygon.
    this.momentOfInertia = function() {
        return this.polygon.momentOfInertia(this.m);
    }
    
    this.centerOfMass = function() {
        return this.polygon.centerOfMass();
    }
    
    //move for a given length of time while interacting with others.
    this.move = function(timestep, others) {
        //store center
        this.centerPoints.push(this.centerOfMass());
        this.drawnCenterPoints.push(this.centerOfMass().drawnPoint());
        //now collide with all other objects
        //if timestep is small enough, it doesn't matter if this comes before or after motion
        //just for fun, calculate acceleration due to gravity. see if anyone notices. (masses of 1000000000000000 kg at 10 meters away work pretty well, kinda)
        var acceleration = new Vector(0, 0);
        for (i in others) {
            var otherObj = others[i];
            if (otherObj!=this) {
                collideObjects(this, otherObj);
                var dist = this.center.distance(otherObj.center);
                acceleration = acceleration.add(vectorDirecMag(this.center.angle(otherObj.center), 6.67e-11 * otherObj.m / (dist*dist)));//ag = GM/r^2
            }
        }
        
        //move polygon and center (for output) by v*∆t + a∆t^2/2
        var translation = this.v.timesScalar(timestep).add(acceleration.timesScalar(timestep*timestep/2.0));
        this.v = this.v.add(acceleration.timesScalar(timestep));
        this.polygon.addVector(translation);
        this.polygon.rotate(this.angularV*timestep);
        //center is just used for reference.
        this.center.addVector(translation);
        this.angle+=this.angularV*timestep;
    }
    
    //pass along another function to the helpful polygon.
    this.normalAtPoint = function(point) {
        return this.polygon.normalAtPoint(point);
    }
    
    this.translationalEnergy=function() {
        return this.m*this.v.mag()*this.v.mag()/2;
    }
    
    //for checking purposes only
    this.kineticEnergy = function() {
        var translational = this.m*this.v.mag()*this.v.mag()/2;
        var rotational = this.momentOfInertia(this.m) * this.angularV * this.angularV / 2.;
        return translational+rotational;
    }
    
    //momentum (only for checking)
    this.p = function() {
        return this.v.timesScalar(this.m);
    }
    
    //uses lever arm, etc, to calculate relative velocity at point. Adds that to general velocity.
    this.velocityAtPoint = function(point) {
        var leverArm = vectorBetweenPoints(this.centerOfMass(), point);
        var velocityDirection = leverArm.direc() + Math.PI/2;//for positive angular velocities, this will be the direction. Make sure negative angular velocity creates negative magnitude
        //theta = arc length / radius
        //dtheta/dt = (darclength/dt) / radius
        //velocity = angularvelocity * radius
        var velocityMagnitude = this.angularV * leverArm.mag();
        var relativeVelocity = vectorDirecMag(velocityDirection, velocityMagnitude);
        return this.v.add(relativeVelocity);
    }
    
    //get rid of polygon graphic
    this.clear = function() {
        this.drawnPolygon.remove();
        this.drawnCenterTracking.remove();
        //this.drawnCenterPoints=[];
    }
    
    //for checking, calculates angular momentum with reference to point
    this.angularMomentum = function(center) {
        var spinning = this.momentOfInertia()*this.angularV;
        var rotating = this.m * vectorBetweenPoints(center, this.centerOfMass()).cross(this.v);
        return spinning+rotating;
    }
}

//now start making shapes
var shapes;
var addedShapes = [];

var intrinsicCount = 0;

//optional argument. resets the center of the screen if argument is given
var resetShapes = function(a) {
    if (a) {
        xOffset = document.getElementById("graphics").clientWidth/2;
        yOffset = document.getElementById("graphics").clientHeight/2;
    }
    
    //clear the screen
    for (i in shapes) {
        if (shapes[i]) {
            shapes[i].clear();
        }
    }
    
    //if you want default shapes, put them in here.
    shapes = [];
    intrinsicCount=shapes.length;
    for (i in addedShapes) {
        shapes.push(addedShapes[i].shapeOutput());
    }
}

//storage for all added shapes.
function txt() {
    var text = "";
    for (i in addedShapes) {
        text+=addedShapes[i].text();
        text+="|";
    }
    return text;
}

//loading added shapes from stored string
function loadText(text) {
    var shapeTexts = text.split("|");
    var newShapes = [];
    var error;
    for (i in shapeTexts) {
        var shapeText = shapeTexts[i];
        if (shapeText.length) {
            var shape = shapeForText(shapeText);
            if (shape) newShapes.push(shape);
            else error="Invalid File";
        }
    }
    if (error) alert(error);
    addedShapes=newShapes;
    //resetShapes();
}

//this is a public class
//this is something that shows up in the table. it has inputs and outputs.
function ShapeInput(isCircle) {
    this.isCircle=isCircle;
    
    //changeable properties
    this.elasticity = 1;
    this.mass = 1;
    this.color = "black";
    this.vx = 0;
    this.vy = 0;
    this.x=0;
    this.y=0;
    this.size=1;
    if (isCircle) {
    } else {
        this.shapeName = "triangle";
        this.angularV = 0;
        this.angle=0;//important: this angle is in degrees counterclockwise
    }
    
    this.storedOutput;
    
    //this function creates a new shape
    this.shapeOutput = function() {
        var newShape;
        if (this.isCircle) {
            newShape = new CircularBody(this.x, this.y, this.size, this.vx, this.vy, this.color, this.elasticity, this.mass);
        } else {
            var points = [];
            if (this.shapeName=="triangle") {
                var angle=Math.PI/2;
                for (var pointI=0; pointI<3; pointI++) {
                    points.push(new Point(this.size*Math.cos(angle), this.size*Math.sin(angle)));
                    angle+=Math.PI*2/3;
                }
            } else if (this.shapeName=="square") {
                var angle=Math.PI/4;
                for (var pointI=0; pointI<4; pointI++) {
                    points.push(new Point(this.size*Math.cos(angle), this.size*Math.sin(angle)));
                    angle+=Math.PI/2
                }
            } else if (this.shapeName=="star") {
                var big = 2.6;
                var small=1;
                //points (big, small), (small, big)
                //y-small = (big-small)/(small-big) (x-big)
                var dist=big;
                var angle=Math.PI/10;
                for (var pointI=0; pointI<10; pointI++) {
                    dist = (big-small)/(small-big) * (dist-big) + small;
                    points.push(new Point(this.size*dist*Math.cos(angle), this.size*dist*Math.sin(-angle)));
                    angle+=Math.PI/5;
                }
            } else if (this.shapeName=="pentagon") {
                var angle=Math.PI/2;
                for (var pointI=0; pointI<5; pointI++) {
                    points.push(new Point(this.size*Math.cos(angle), this.size*Math.sin(angle)));
                    angle+=Math.PI*2/5;
                }
            } else if (this.shapeName=="hexagon") {
                var angle=0;
                for (var pointI=0; pointI<6; pointI++) {//want only this many points. If you enumerate through the angle, you can get near-identical points (when you come back around to the start point). This creates some nasty NaN bugs.
                    points.push(new Point(this.size*Math.cos(angle), this.size*Math.sin(angle)));
                    angle+=Math.PI/3;
                }
            } else if (this.shapeName=="octagon") {
                var angle=Math.PI/8;
                for (var pointI=0; pointI<8; pointI++) {
                    points.push(new Point(this.size*Math.cos(angle), this.size*Math.sin(angle)));
                    angle+=Math.PI/4;
                }
            } else if (this.shapeName=="star of david") {
                var big = 2;
                var small=1.15;
                //points (big, small), (small, big)
                //y-small = (big-small)/(small-big) (x-big)
                var dist=big;
                var angle=0;
                for (var pointI=0; pointI<12; pointI++) {
                    dist = (big-small)/(small-big) * (dist-big) + small;
                    points.push(new Point(this.size*dist*Math.cos(angle), this.size*dist*Math.sin(angle)));
                    angle+=Math.PI/6;
                }
            } else if (this.shapeName=="crescent") {
                console.log("crescent");
                var farRadius = 1;
                var closeRadius = 1.5;
                var topAngle = Math.PI/2;
                var bottomAngle = Math.PI+topAngle;
                var closeCenter = Math.sqrt(closeRadius*closeRadius-farRadius*farRadius);//a quick doodle will show that these three values form a right triangle (as long as top angle is 90 degrees)
                var closeTopAngle = Math.PI-Math.asin(farRadius/closeRadius);
                console.log(closeTopAngle);
                var closeBottomAngle = 2*Math.PI-closeTopAngle;
                for (var angle=topAngle; angle<=bottomAngle+.01; angle+=Math.PI/16) {
                    points.push(new Point(this.size*farRadius*Math.cos(angle), this.size*farRadius*Math.sin(angle)));
                }
                for (var angle=closeBottomAngle-Math.PI/16; angle>closeTopAngle; angle-=Math.PI/16) {
                    points.push(new Point(this.size*(closeCenter + closeRadius*Math.cos(angle)), this.size*closeRadius*Math.sin(angle)));
                }
                console.log(JSON.stringify(points));
            } else if (this.shapeName="cup") {
                points.push(new Point(-.5*this.size, this.size));
                points.push(new Point(-.5*this.size, 0));
                points.push(new Point(.5*this.size, 0));
                points.push(new Point(.5*this.size, this.size));
                points.push(new Point(.3*this.size, this.size));
                points.push(new Point(.3*this.size, .2*this.size));
                points.push(new Point(-.3*this.size, .2*this.size));
                points.push(new Point(-.3*this.size, this.size));
            }
            console.log(this.shapeName);
            for (i in points) {
                points[i].x+=this.x;
                points[i].y+=this.y;
            }
            newShape = new PolygonalBody(points, this.vx, this.vy, this.angularV*Math.PI/180, this.color, this.elasticity, this.mass);
            newShape.angle = this.angle*Math.PI/180; // rotate shape a bit (radians)
            newShape.center = new Point(this.x, this.y); //this is important for outputs
            newShape.polygon.rotate(this.angle*Math.PI/180);
        }
        this.storedOutput=newShape;
        return newShape;
    }
    
    //when finalized, use this to add shape to arrays.
    this.display = function() {
        addedShapes.push(this);
        shapes.push(this.shapeOutput());
    }
    
    this.description = function(i) {//returns html for in list
        var name = this.shapeName;
        if (this.isCircle) {
            name = "circle";
        }
        var unit = "x";
        if (this.isCircle) {
            unit = "m";
        }
        var size = "scale";
        if (this.isCircle) {
            size = "radius";
        }
        var av = "";
        var avOutput = "";
        if (!this.isCircle) {
            av = "angle: <input class='skinny' type='text' value='"+this.angle+"' id='a0"+i+"' onChange='editShape(this);' />°<br />angular velocity: <input class=\"skinny\" type=\"text\" value=\""+this.angularV+"\" id=\"av"+i+"\" onChange=\"editShape(this);\"> °/s<br />";
            avOutput = "angle<sub>t</sub>: <span id='ac"+i+"'>"+this.angle+"</span>°<br />angular velocity<sub>t</sub>: <span id='aV"+i+"'>"+this.angularV+"</span>°/s<br />";
        }
        var positionInput = "position<sub>0</sub>: (<input class=\"skinny\" type=\"text\" value=\""+this.x+"\" id=\"0x"+i+"\" onChange=\"editShape(this);\">, <input class=\"skinny\" type=\"text\" value=\""+this.y+"\" id=\"0y"+i+"\" onChange=\"editShape(this);\">) m";
        var velocityInput = "velocity<sub>0</sub>: (<input class=\"skinny\" type=\"text\" value=\""+this.vx+"\" id=\"vx"+i+"\" onChange=\"editShape(this);\">, <input class=\"skinny\" type=\"text\" value=\""+this.vy+"\" id=\"vy"+i+"\" onChange=\"editShape(this);\">) <sup>m</sup>/<sub>s</sub>";
        var positionOutput = "position<sub>t</sub>: (<span id='px"+i+"'>"+coordNumberOutput(this.x, POSITION_SIGFIGS)+"</span>, <span id='py"+i+"'>"+coordNumberOutput(this.y, POSITION_SIGFIGS)+"</span>) m";
        var velocityOutput = "velocity<sub>t</sub>: (<span id='Vx"+i+"'>"+coordNumberOutput(this.vx, VELOCITY_SIGFIGS)+"</span>, <span id='Vy"+i+"'>"+coordNumberOutput(this.vy, VELOCITY_SIGFIGS)+"</span>) <sup>m</sup>/<sub>s</sub>";
        return this.color+" "+name+"; "+size+":"+this.size+unit+"; elasticity:"+this.elasticity+"; mass:"+this.mass.toPrecision(4)+" kg;<br />"+positionInput+"<br />"+velocityInput+"<br />"+av+positionOutput+"<br />"+velocityOutput+"<br />"+avOutput;
    }
    
    //encoded text for storage in txt file
    this.text = function() {
        var txt = ""+this.isCircle+";";
        txt+=this.elasticity+";"+this.mass+";"+this.color+";"+this.vx+";"+this.vy+";"+this.x+";"+this.y+";"+this.size;
        if (!this.isCircle) {
            txt+=";"+this.shapeName+";"+this.angularV+";"+this.angle;
        }
        return txt;
    }
}

//changes encoded shape into ShapeInput
function shapeForText(text) {
    var info = text.split(";");
    var shape = new ShapeInput(info[0]=="true");
    shape.elasticity=parseFloat(info[1]);
    shape.mass=parseFloat(info[2]);
    shape.color=info[3];
    shape.vx=parseFloat(info[4]);
    shape.vy=parseFloat(info[5]);
    shape.x=parseFloat(info[6]);
    shape.y=parseFloat(info[7]);
    if (!info[8]) return undefined;
    shape.size=parseFloat(info[8]);
    if (info[0]!="true") {
        shape.shapeName=info[9];
        shape.angularV=parseFloat(info[10]);
        if (!info[11]) return undefined;
        shape.angle=parseFloat(info[11]);
    }
    console.log(JSON.stringify(shape));
    return shape;
}

//called from shape's delete button. id is used to determine which shape to delete.
function deleteShape(shapeButton) {
    var index = shapeButton.id;
    var shape = addedShapes[parseInt(index)];
    shape.storedOutput.clear();
    addedShapes = removeArray(addedShapes, parseInt(index));
    shapes = removeArray(shapes, parseInt(index)+intrinsicCount);
    updateShapes();
}

//called from change button of shape. Takes shape's input and changes the shape.
function editShape(shapeInput) {
    var index = parseInt(shapeInput.id.slice(2));
    var shape = addedShapes[index];
    shape.x=parseFloat(document.getElementById("0x"+index).value);
    shape.y=parseFloat(document.getElementById("0y"+index).value);
    shape.vx=parseFloat(document.getElementById("vx"+index).value);
    shape.vy=parseFloat(document.getElementById("vy"+index).value);
    if (document.getElementById("av"+index)) {
        shape.angle = parseFloat(document.getElementById("a0"+index).value);
        shape.angularV =parseFloat(document.getElementById("av"+index).value);
    }
}

function shapesInputString() {
    allCells=[];
    str = "<table border=\"1\">";
    for (i in addedShapes) {
        str+="<tr><td id=\"c"+i+"\">";
        shape = addedShapes[i];
        str+=shape.description(i);
        str+="<input type=\"button\" value=\"change\" id=\"cc"+i+"\" onclick=\"editShape(this);reset();\" /><input type=\"button\" value=\"delete\" id=\""+i+"\" onclick=\"deleteShape(this);\" />";
        str+="</td></tr>";
    }
    str += "</table>";
    return str;
}

//helper function to get a nice readable output from a number that can go in something like a coordinate (0, 0). (4.4259398283, 3829284902) is bad because it's too long. (3.5e-16, 3.2) is bad because the x coordinate is misleading (it should be 0)
function coordNumberOutput(number, sigFigs) {
    if (Math.abs(number)<1e-5) {
        return "0.000";
    }
    return number.toPrecision(sigFigs)
}

//total sum of all momentums
function momentum() {
    var sum = new Vector(0,0);
    for (i in shapes) {
        sum = sum.add(shapes[i].p());
    }
    return "("+coordNumberOutput(sum.x,3)+", "+coordNumberOutput(sum.y,3)+")";
}

//sum of all angular momentums
function angularMomentum() {
    var sum = 0;
    for (i in shapes) {
        sum+=shapes[i].angularMomentum(somePoint);
    }
    return coordNumberOutput(sum, 3);
}

//sum of all kinetic energy
function kineticEnergy() {
    var sum = 0;
    for (i in shapes) {
        sum+=shapes[i].kineticEnergy();
    }
    return coordNumberOutput(sum, 3);
}

function translationalEnergy() {
    var sum = 0;
    for (i in shapes) {
        sum+=shapes[i].translationalEnergy();
    }
    return coordNumberOutput(sum, 3);
}

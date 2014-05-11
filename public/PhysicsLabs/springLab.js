
DAMPING = 1
var GRAVITY = 9.81

function SlinkyPart(mass, coord) {
    this.mass=mass;
    this.coord = coord;
    this.netForce=0.;
    this.velocity=0.;
    
    this.move = function(g, timestep, k, dampen) {
        var criticalDamping = 2*this.mass*Math.sqrt(k/this.mass);
        if (!dampen) {
            criticalDamping = 0;
        }
        var a = (this.netForce-criticalDamping*this.velocity)/this.mass - g;
        this.coord += a*timestep*timestep/2. + this.velocity*timestep;
        this.velocity += a*timestep;
    }
}

function determinant(e1, e2, e3) {
    return e1[0]*e2[1]*e3[2]+e1[1]*e2[2]*e3[0]+e1[2]*e2[0]*e3[1]-(e1[2]*e2[1]*e3[0]+e1[1]*e2[0]*e3[2]+e1[0]*e2[2]*e3[1]);
}

//returns coefficients [a, b, c, error]
function quadraticRegression(values) {
    //source: http://www.youtube.com/watch?v=b1Q79DbfR_8
    //values are an array of [x, y] arrays;
    if (values.length<=2) {
        return undefined;
    }
    var sumOfXs = 0;
    var sumOfX2s = 0;
    var sumOfX3s = 0;
    var sumOfX4s = 0;
    var sumOfYs = 0;
    var sumOfXYs = 0;
    var sumOfX2Ys = 0;
    for (i in values) {
        xi = values[i][0];
        yi = values[i][1];
        sumOfXs += xi;
        sumOfX2s += xi*xi;
        sumOfX3s += xi*xi*xi;
        sumOfX4s += xi*xi*xi*xi;
        sumOfYs += yi;
        sumOfXYs += xi*yi;
        sumOfX2Ys += xi*xi*yi;
    }
    var n = values.length;
    //store coefficient matrix vertically. each list is a column of the matrix. Actually, this matrix is the same as its transpose, but it'll be much easier to calculate this way.
    var e1 = [n,        sumOfXs,  sumOfX2s];
    var e2 = [sumOfXs,  sumOfX2s, sumOfX3s];
    var e3 = [sumOfX2s, sumOfX3s, sumOfX4s];
    var c = [sumOfYs, sumOfXYs, sumOfX2Ys];
    //use kramer's rule
    var D = determinant(e1, e2, e3)*1.0;
    var Dc = determinant(c, e2, e3);
    var Db = determinant(e1, c, e3);
    var Da = determinant(e1, e2, c);
    var a = Da/D;
    var b = Db/D;
    var c = Dc/D;
    var error = 0;
    for (i in values) {
        xi = values[i][0];
        yi = values[i][1];
        error+= (yi-(a*xi*xi+b*xi+c))*(yi-(a*xi*xi+b*xi+c));
    }
    //average error so it doesn't look like error is constantly increasing
    error/=values.length;
    return [a, b, c, error];
}

function Spring(k, topPart, bottomPart, restLength) {
    this.k = k;
    this.topPart = topPart;
    this.bottomPart = bottomPart;
    this.restLength = restLength;
    this.length = function() {
        return Math.abs(this.topPart.coord-this.bottomPart.coord);
    }
    this.force = function () {
        return this.k*(this.length()-this.restLength)
    }
    this.act = function() {
        if (this.topPart.coord<this.bottomPart.coord) {
            if (this.bottomPart.coord>topY) {
                this.bottomPart.coord=topY;
                this.bottomPart.velocity=0.;
            } else {
                
                //momentum before and after is equal.
                if (elastic) {
                	var topVelocity = this.topPart.velocity;
                	this.topPart.velocity = this.bottomPart.velocity;
                	this.bottomPart.velocity = topVelocity;
                	this.topPart.coord = this.bottomPart.coord;
                } else {
            		var newVelocity = -1*Math.sqrt(this.bottomPart.velocity*this.bottomPart.velocity/2. + this.topPart.velocity*this.topPart.velocity/2.);
                	//var newVelocity = -1*Math.sqrt(this.bottomPart.velocity*this.bottomPart.velocity/2. + this.topPart.velocity*this.topPart.velocity/2. - GRAVITY*this.bottomPart.coord + GRAVITY*this.topPart.coord);
                	//var newVelocity = (this.bottomPart.velocity+this.topPart.velocity)/2.;
                	this.bottomPart.velocity = newVelocity;
                	this.topPart.velocity = newVelocity;
                	var newCoord = (this.topPart.coord+this.bottomPart.coord)/2.;
                	this.topPart.coord = newCoord;
                	this.bottomPart.coord = newCoord;
                }
                
            }
        }
        this.topPart.netForce-=this.force()
        this.bottomPart.netForce+=this.force()
    }
    
}

function Slinky(parts, mass, k, topY, aY) {
    this.N = parts;
    this.M = mass;
    this.K = k;
    this.topY = topY;
    this.parts = [];
    var length = mass*aY/(2*k);
    console.log(length);
    var y = 2./(parts*parts-parts);
    var currentY = topY;
    for (var part=0; part<parts; part++) {
        var ratio = ((parts-part-1)*y);
        var s = length*ratio;
        //console.log(currentY);
        this.parts.push(new SlinkyPart(this.M/this.N, currentY));
        currentY-=s;
    }
    this.aY = aY;
    this.springs = [];
    for (var springI=0; springI<parts-1; springI++) {
        spring = new Spring(k*(this.N-1), this.parts[springI], this.parts[springI+1], 0)
        this.springs.push(spring);
    }
    
    var lastPart =this.parts[this.parts.length-1];
    this.bottomY = lastPart.coord;
    
    this.length = function() {
        var sum=0;
        for (spring in this.springs) {
            sum+=this.springs[spring].length();
        }
        return sum;
    }
    
    this.move = function(timestep, topFixed) {
        for (part in this.parts) {
            this.parts[part].netForce=0.;
        }
        for (spring in this.springs) {
            this.springs[spring].act();
        }
        var first = true;
        for (part in this.parts) {
            if (first && topFixed) {
                
            } else {
                this.parts[part].move(this.aY, timestep, this.springs[0].k, (topFixed&&dampenBefore)||(!topFixed&&dampenAfter));
            }
            first=false;
        }
    }
    //gives coords of top, bottom, and center of mass
    this.places = function() {
        var topCoord = this.parts[0].coord;
        var bottomCoord = this.parts[this.parts.length-1].coord;
        var coordSum = 0.;
        for (partI in this.parts) {
            var part = this.parts[partI];
            if (part.coord>topCoord) {
                topCoord = part.coord;
            }
            if (part.coord<bottomCoord) {
                bottomCoord = part.coord;
            }
            coordSum+=part.coord;
        }
        var center = coordSum/this.parts.length;
        return [topCoord, bottomCoord, center];
    }
}

var parts;
var totalMassOfSpring;
var springConstant;
var topY;
var slowMo;//float(raw_input("Slow motion factor (1-50): "))
var slinker;

var dt;
var calcs = 10;

var GRAPHICS_HEIGHT = document.getElementById("graphics").clientHeight;
var GRAPHICS_WIDTH = document.getElementById("graphics").clientWidth;


var elapsedTime;
var storedTops;
var storedBottoms;
var storedCenters;

var graphics = document.getElementById("graphics");
var gContext = graphics.getContext("2d");
gContext.fillStyle = "black";
var held;
var indexWhenLetGo;
var maxY;
var minY;
//maxY -> 0
//minY -> SCREEN_HEIGHT
var slope;
var intercept;

function drop(element) {
    if (held) {
        indexWhenLetGo = storedTops.length;
        held=false;
        dt/=slowMo;
        //print slinker.length()
        //print slinker.parts[len(slinker.parts)-1].coord
        element.value="Pause";
    } else {
    	paused=!paused;
    	if (paused) {
    		element.value="Play";
    	} else {
    		element.value="Pause";
    	}
    }
}

var paused = false;

function restart () {
    dt = .01;
    elapsedTime=0.;
    storedTops = [];
    storedBottoms = [];
    storedCenters = [];
    held = true;
    indexWhenLetGo = 0;
    paused = false;
    document.getElementById("drop").value="Drop";
    
    parts = parseFloat(document.getElementById("N").value);
    totalMassOfSpring = parseFloat(document.getElementById("M").value);
    springConstant = parseFloat(document.getElementById("K").value);
    topY = 2.;
    slowMo = 5.;//float(raw_input("Slow motion factor (1-50): "))
    slinker = new Slinky(parts, totalMassOfSpring, springConstant, topY, 9.81);
    
    //dampenBefore = document.getElementById("dBefore").checked;
    //dampenAfter = document.getElementById("dAfter").checked;
    elastic = document.getElementById("elastic").checked;
    
    maxY = slinker.topY;
    minY = slinker.bottomY;
    if (doubleLength) {
        minY=maxY-2*(maxY-minY)
    }
    //maxY -> 0
    //minY -> SCREEN_HEIGHT
    slope = -GRAPHICS_HEIGHT/(maxY-minY);
    intercept = -slope*maxY;
    
    document.getElementById("regression").innerHTML="";
    document.getElementById("regressionB").innerHTML="";
    document.getElementById("regressionT").innerHTML="";
}

dampenBefore = true;
dampenAfter = false;
var doubleLength = true;
var elastic = false;

restart();

//source for graphics: diveintohtml5.info/canvas.html

//if always_dampen is true, the center of mass drops at a constant speed. If this is false, the bottom accelerates toward equilibrium upon drop, but the center of mass drops.
//if never_dampen is true, equilibrium will never be reached.

function Draw() {
    gContext.clearRect(0, 0, GRAPHICS_WIDTH, GRAPHICS_HEIGHT);
    
    //draw springs
    gContext.beginPath();
    gContext.lineWidth=4;
    gContext.moveTo(GRAPHICS_WIDTH/2, intercept+slinker.springs[0].topPart.coord*slope);
    for (springI in slinker.springs) {
        gContext.lineTo(GRAPHICS_WIDTH/2, intercept+slinker.springs[springI].bottomPart.coord*slope);
    }
    gContext.strokeStyle="gray";
    gContext.stroke();
    gContext.lineWidth=1;
    
    //draw weights
    gContext.fillStyle="black";
    for (partI in slinker.parts) {
        gContext.beginPath();
        var part = slinker.parts[partI];
        gContext.arc(GRAPHICS_WIDTH/2, intercept+part.coord*slope, 5, 0, 2*Math.PI, true);
        gContext.closePath();
        gContext.fill();
    }
    
    
    
    //start at equilibrium, so no moving until dropped
    if (!held) {
    	if (!paused) {
        	var stats = slinker.places();
        	storedTops.push([elapsedTime, stats[0]]);
        	storedBottoms.push([elapsedTime, stats[1]]);
        	storedCenters.push([elapsedTime, stats[2]]);
        }
        
        var x = 300;
        var minT = storedTops[0][0]*x;
        //if it goes out of range, it's probably already out of domain
        /*while (storedTops[storedTops.length-1][0]*x-minT>GRAPHICS_WIDTH) {
            //x/=2.;
            minT+=1;
        }*/
        
        gContext.lineWidth = 5;
        for (var line=0; line<3; line++) {
            var list = [storedTops, storedBottoms, storedCenters][line];
            gContext.beginPath();
            gContext.moveTo(-minT, intercept+list[0]*slope);
            gContext.strokeStyle="blue";
            for (i in storedTops) {
                gContext.lineTo(list[i][0]*x-minT, intercept+list[i][1]*slope);
            }
            gContext.stroke();
        }
        gContext.lineWidth=1;
        
        slownessFactor = document.getElementById("dt").value;
        dt = slownessFactor/1000.;
        if (!paused) {
        	for (var i=0; i<calcs; i++) {
        	    slinker.move(dt/calcs, held);
        	}
        }
        
        function regressData(data, outputID) {
            gContext.lineWidth=2;
            var coefficients = quadraticRegression(data);
            if (coefficients) {
                document.getElementById(outputID).innerHTML = "y="+coefficients[0].toPrecision(3)+"t^2+"+coefficients[1].toPrecision(3)+"t+"+coefficients[2].toPrecision(3)+" (error:"+coefficients[3].toPrecision(3)+")";
                gContext.beginPath();
                gContext.moveTo(-minT, intercept+coefficients[2]*slope);
                for (var t=0.; t<=elapsedTime; t+=dt) {
                    gContext.lineTo(t*x-minT, intercept+(coefficients[0]*t*t+coefficients[1]*t+coefficients[2])*slope);
                }
                gContext.strokeStyle="red";
                gContext.stroke();
            }
            gContext.lineWidth=1;
        }
        
        regressData(storedCenters, "regression");
        regressData(storedBottoms, "regressionB");
        regressData(storedTops, "regressionT");
        
        if (!paused) {
        	elapsedTime+=dt;
        }
    }
    
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
    size = (maxY-minY).toPrecision(2)+"m";
    gContext.font = "bold 12px sans-serif";
    gContext.textAlign = "center";
    gContext.textBaseline = "middle";
    gContext.fillText(size, x, GRAPHICS_HEIGHT/2+yOffset);
    
    window.setTimeout("Draw();", 50);
}

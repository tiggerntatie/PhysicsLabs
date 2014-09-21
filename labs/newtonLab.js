// get the DOM element to attach to
// - assume we've got jQuery to hand
var container = document.getElementById( 'canvas' );

var keyboard = new THREEx.KeyboardState();

// set the scene size to fit the browser window
var WIDTH = $("#canvas").width();
var HEIGHT = $("#canvas").height();


// set some camera attributes
var VIEW_ANGLE = 45,
  ASPECT = WIDTH / HEIGHT,
  NEAR = 0.1,
  FAR = 10000;

// create a WebGL renderer, camera
// and a scene
var renderer = new THREE.WebGLRenderer({antialiasing:true, antialias:true});

var camera =
  new THREE.PerspectiveCamera(
    VIEW_ANGLE,
    ASPECT,
    NEAR,
    FAR);

var scene = new THREE.Scene();

// EVENTS
//THREEx.WindowResize(renderer, camera);
//THREEx.FullScreen.bindKey({ charCode : 'm'.charCodeAt(0) });
// CONTROLS
controls = new THREE.OrbitControls( camera, renderer.domElement );



// add the camera to the sceneay
scene.add(camera);

// the camera starts at 0,0,0
// so pull it back
camera.position.z = 300;

// start the renderer
renderer.setSize(WIDTH, HEIGHT);

// attach the render-supplied DOM element
container.appendChild( renderer.domElement );


	// must enable shadows on the renderer 
renderer.shadowMapEnabled = false;//true;
	
	// "shadow cameras" show the light source and direction
	
	// spotlight #1 -- yellow, dark shadow
	var spotlight = new THREE.DirectionalLight(0xffffff);
	spotlight.position.set(10,500,200);
	//spotlight.shadowCameraVisible = false;
	//spotlight.shadowDarkness = 0.3;
	spotlight.intensity = 2;
	// must enable shadow casting ability for the light
spotlight.castShadow = false;//true;
	scene.add(spotlight);

var ambientLight = new THREE.AmbientLight(0x666666);
scene.add(ambientLight);

//this function creates text at a certain point and size and color on screen
var makeText = function(text, asize, aheight, x, y, z, acolor) {
    var textGeo = new THREE.TextGeometry(text, {size:asize, height:aheight, curveSegments:0, font:"helvetiker", weight:"normal"});
    var textMat = new THREE.MeshPhongMaterial({color:acolor, ambient:acolor});
    var textObj = new THREE.Mesh(textGeo, textMat);
    textObj.position.x=x;
    textObj.position.y=y;
    textObj.position.z=z;
    scene.add(textObj);
    return textObj;
}

//makes a rectangular prism on screen
var makePrism = function(x, y, z, width, height, depth, acolor) {
    var prismgeo = new THREE.CubeGeometry(width, height, depth);
    var prismmat = new THREE.MeshPhongMaterial({color:acolor, ambient:acolor});
    var prism = new THREE.Mesh(prismgeo, prismmat);
    prism.position.x=x;
    prism.position.y=y;
    prism.position.z=z;
    prism.castShadow=false;//true;
    prism.receiveShadow=false;//true;
    scene.add(prism);
    return prism;
}

//makes a cylinder on screen
var makeCylinder = function(radius1, radius2, length, x, y, z, rx, ry, rz, acolor) {
    var cylinderGeo = new THREE.CylinderGeometry(radius1, radius2, length, 100);
    var cylinderMat = new THREE.MeshPhongMaterial({color:acolor,ambient:acolor});
    var cylinder = new THREE.Mesh(cylinderGeo, cylinderMat);
    cylinder.position.set(x,y,z);
    cylinder.rotation.set(rx,ry,rz);
    cylinder.castShadow=false;//true;
    cylinder.receiveShadow=false;//true;
    scene.add(cylinder);
    return cylinder;
}

//amount to move everything to the right.
var moveRight = 100;

//constants
var platformRightX = 103+moveRight;
var platformLength = 300+moveRight;
var platformHeight = 20;
var platformDepth = 50;
var stringRadius = 1;
var stringColor = 0x000000;
var blockLength = 50;
var pulleyX = 120+moveRight;
var pulleyY = 30;
var pulleyRadius = 20;
var blockLeftX = platformRightX-platformLength;

var density = .000005; //kg / cubic pixel. larger density makes weights smaller

var weightHeight = 20;
var hookHeight = 12;//hook goes on top of weight

//uses density to find radius of hangingweight from mass
function radiusForMass(mass) {
//V = 1/3πr^2*hh + πr^2*wh; D = m / V; V/π = r^2(hh/3+wh); r = sqrt(V/π /(hh/3+wh));
    var V = mass/density;
	return Math.sqrt(V/Math.PI / (hookHeight/3+weightHeight));
}

//uses density to find a dimension of a rectangular prism
function dimensionForMass(dimension1, dimension2, mass) {
    //V = d1*d2*d3; D=m/V; d3 = m/(D*d1*d2);
    return mass/(density*dimension1*dimension2);
}

//weight consants
var startWeightStringLength = 110;
var weightStringTop = pulleyY;
var weightX = pulleyX+pulleyRadius-stringRadius/2.0;
var weightColor = 0x313131;

var segments = 50,
    rings = 50;
//create weight and hook
var weight = makeCylinder(1, 1, weightHeight, weightX, weightStringTop-startWeightStringLength-weightHeight/2, 0, 0, 0, 0, weightColor);
var hook = makeCylinder(0, 1, hookHeight, weightX, weightStringTop-startWeightStringLength+hookHeight/2, 0, 0, 0, 0, weightColor);//actually a cone

//create functions for string to test for prefix and suffix
String.prototype.startsWith = function(prefix) {
    return this.indexOf(prefix) === 0;
}

String.prototype.endsWith = function(suffix) {
    return this.slice(this.length-suffix.length, this.length) == suffix;
};

//create string
var stringMaterial = new THREE.MeshBasicMaterial({color:stringColor, ambient:stringColor});
var stringToWeightGeo = new THREE.CylinderGeometry( stringRadius, stringRadius, 1, 100 );
var stringToWeight = new THREE.Mesh( stringToWeightGeo, stringMaterial );
stringToWeight.position.x = weightX;
stringToWeight.position.y = weightStringTop;
stringToWeight.scale.y = startWeightStringLength;
stringToWeight.position.y -= startWeightStringLength/2;
stringToWeight.castShadow = false;//true;
stringToWeight.receiveShadow = false;//true;
scene.add( stringToWeight );

//physical info. to change
var force = 0;
var aY = 0;
var vY = 0;

//gravitational constant on earth
var g = 9.80665;

//stopping point for block.
var MAX_BLOCK_POSITION = 75+moveRight;//pixel units

//amount block and weight have moved, in meters
var totalMeterChange = 0;

//finds a number from a value input
function numFromUI(id) {
    return parseFloat(document.getElementById(id).value, 10);
}

//graph constants
var maxGraphScale = 2;
var GRAPH_PIXELS_PER_UNITS = 90;
var GRAPH_MAX = maxGraphScale*GRAPH_PIXELS_PER_UNITS;
var graphicalConversion = GRAPH_MAX/maxGraphScale;

//graph scale is changed as needed so each bar will fit nicely. everything needs to be scaled down or up when that happens
function setGraphScale() {
    var startPos = blockLeftX + blockLength/2;//pixel units
    var currentPos = startPos + totalMeterChange/METERS_PER_PIXEL;//pixel units
    var remainingDist = (MAX_BLOCK_POSITION-currentPos)*METERS_PER_PIXEL;//meters
    //var maxPosit = totalMeterChange+remainingDist;
    //remainingDist = 1/2a*t*t + v*t;
    //if v=0, remainingDist = 1/2*a*t*t; t=sqrt(2remainingDist/a);
    var timeRemaining = (-vY + Math.sqrt(vY*vY + 2*aY*remainingDist))/(aY);//time = sqrt(2*a*remainingDist)/a
    console.log('timeremaining'+timeRemaining+' distremaining'+remainingDist);
    var maxForce = force;
    var maxAccel = aY;
    var maxVeloc = vY+aY*timeRemaining;
    console.log(maxVeloc);
    maxGraphScale = Math.ceil(Math.max(maxForce, maxAccel, maxVeloc/*, maxPosit,2*/));
    graphicalConversion = GRAPH_MAX/maxGraphScale;
    updateLabels();
}

//updates stuff from inputs, including equation and starting values
function updateFromUI() {
    //update size of hanging weight from mass
	var radius = radiusForMass(numFromUI("mass"));
	weight.scale.set(radius, 1, radius);
    hook.scale.set(radius, 1, radius);
    //equations
    forceText = document.getElementById("F=").value;
    accelText = document.getElementById("a=").value;
    if (forceText.length && accelText.length && forceBar) {
        //evaluates force and acceleration (which stay constant)
        var hangingMass = numFromUI("mass");
        var systemMass = hangingMass+numFromUI("cartmass");
        var fric = numFromUI("friction");
        var forceInput = evaluateExpression(forceText, {"m":hangingMass, "M":systemMass, "g":g, "Ffr":fric});
        var accelInput = evaluateExpression(accelText, {"m":hangingMass, "M":systemMass, "g":g, "Ffr":fric, "Fnet":forceInput})
        if (forceInput>0 && accelInput>0) {
            //valid force and acceleration. store it, change graph scale, store it again to graph force and acceleration with new graph scale.
            setForce( forceInput );
            setAcceleration( accelInput );
            setGraphScale();
            setForce( forceInput );
            setAcceleration( accelInput );
        }
    }
}

updateFromUI();

//not sure what this does. doesn't hurt, though
weight.geometry.dynamic = true;

//scale factor for movement
var METERS_PER_PIXEL = .01;

//make a meterstick platform
var meterStickTexture = THREE.ImageUtils.loadTexture( 'meterstick.png' );
var meterStickMaterial = new THREE.MeshPhongMaterial({map:meterStickTexture});
var platformGeometry = new THREE.CubeGeometry(platformLength,platformHeight,platformDepth);
var platformMaterial = new THREE.MeshPhongMaterial( { color: 0x00ff00,ambient: 0x00ff00} );
var platform = new THREE.Mesh( platformGeometry, meterStickMaterial );  // was cubeMaterial or boxMaterial
//no shadow
platform.castShadow = false;//true;
platform.receiveShadow = false;//true;
platform.position.y=10;
platform.position.x=platformRightX-(platformLength/2);//sets center x

scene.add( platform );

//create the string to the block from the pulley
var stringToBlockGeo = new THREE.CylinderGeometry( stringRadius, stringRadius, 1, 100 );
var stringToBlock = new THREE.Mesh( stringToBlockGeo, stringMaterial );
//length is 1 until change scale.
stringToBlock.rotation.z = 3.141592653589/2;
stringToBlock.position.y = pulleyY+pulleyRadius-stringRadius/2.0;
var startBlockStringLength = pulleyX-blockLeftX-blockLength;
stringToBlock.position.x = blockLeftX + blockLength + startBlockStringLength;
stringToBlock.scale.y = startBlockStringLength;
stringToBlock.position.x -= startBlockStringLength/2;
stringToBlock.castShadow = false;//true;
stringToBlock.receiveShadow = false;//true;
scene.add( stringToBlock );

//create block (cart to be dragged)
var blockGeo = new THREE.CubeGeometry(blockLength, 40, 25);
var blockMaterial = new THREE.MeshPhongMaterial( {color: 0xC6E4A5,ambient:0xC6E4A5});
var block = new THREE.Mesh( blockGeo, blockMaterial);
block.position.y = 40;
block.position.x = blockLeftX + blockLength/2;
block.castShadow=false;//true;
block.receiveShadow=false;//true;
scene.add(block);

//create pulley
var pulleyGeometry = new THREE.CylinderGeometry( pulleyRadius, pulleyRadius, 10, 1000 );
var pulleyMaterial = new THREE.MeshBasicMaterial({color: 0x444444,ambient:0x0000ff});
var pulley = new THREE.Mesh( pulleyGeometry, pulleyMaterial );
pulley.position.x = pulleyX;
pulley.position.y = pulleyY;
pulley.rotation.x = Math.PI/2;
pulley.castShadow = false;//true;
pulley.receiveShadow = false;//true;
scene.add( pulley );

//position for origin (where axes come from)
var centerOfAxis = {"x":blockLeftX, "y":platformHeight, "z":-platformDepth/2};

//bar graph constants
var minBar = .1;
var bottomX = 30;
var graphCenterY = -60;
var bottomThickness = 6;
var bottomDepth = 30;
var barSize = 20;
var bottomLength = 100;
var bottomOfBarGraph = makePrism(bottomX-bottomThickness/2, graphCenterY, 0, bottomThickness, bottomLength, bottomDepth, 0x000000);

var barCategoryTextSize = 10;
var barCategoryTextDepth = 1;
var barCategoryTextColor = 0x000000;
var barCategoryTextDisplacement = 165;
var barValueTextDisplacement = 83;

//velocity bar changes only every few frames for performance
var VELOCITY_FRAMES_PER_CHANGE = 4;

var velocityBarY = graphCenterY+30;
var velocityBar = makePrism(bottomX, velocityBarY, 0, 1, barSize, barSize, 0xC8C446);
var velocityValue = 0;
var frameCounter = -1;//start at frame (frame will increment quickly)

var velocityUnit = makeText("m/s", barCategoryTextSize, barCategoryTextDepth, bottomX-35, velocityBarY-barCategoryTextSize/2, 0, barCategoryTextColor);
function setVelocity(v) {
    frameCounter++;
    vY=v;
    var graphicalV = Math.max(v*graphicalConversion,minBar);
    velocityBar.scale.x=graphicalV;
    velocityBar.position.x=bottomX+graphicalV/2;
    if (frameCounter%VELOCITY_FRAMES_PER_CHANGE==0) {
        scene.remove(velocityValue);
        velocityValue = makeText(v.toFixed(4), barCategoryTextSize, barCategoryTextDepth, bottomX-barValueTextDisplacement, velocityBarY-barCategoryTextSize/2, 0, barCategoryTextColor);
    }
}
var velocityText = makeText("velocity:", barCategoryTextSize, barCategoryTextDepth, bottomX-barCategoryTextDisplacement+30, velocityBarY-barCategoryTextSize/2, 0, barCategoryTextColor);

//acceleration bar
var accelBarY = graphCenterY;
var accelBar = makePrism(bottomX, accelBarY, 0, 1, barSize, barSize, 0xC2A5E4);
var accelValue = 0;
function setAcceleration(a) {
    aY=a;
    var graphicalA = Math.max(a*graphicalConversion, minBar);
    accelBar.scale.x=graphicalA;
    accelBar.position.x=bottomX+graphicalA/2;
    scene.remove(accelValue);
    accelValue = makeText(a.toPrecision(4)+" m/s²", barCategoryTextSize, barCategoryTextDepth, bottomX-barValueTextDisplacement, accelBarY-barCategoryTextSize/2, 0, barCategoryTextColor);
}
var accelText = makeText("acceleration:", barCategoryTextSize, barCategoryTextDepth, bottomX-barCategoryTextDisplacement, accelBarY-barCategoryTextSize/2, 0, barCategoryTextColor);

//when force changes, change ui and everything else too
var forceBarY = graphCenterY-30;
var forceBar = makePrism(bottomX, forceBarY, 0, 1, barSize, barSize, 0xC8468B);
var forceValue = 0;
function setForce(f) {
    force=f;
    var graphicalF = Math.max(f*graphicalConversion, minBar);
    forceBar.scale.x=graphicalF;
    forceBar.position.x=bottomX+graphicalF/2;
    scene.remove(forceValue);
    forceValue = makeText(f.toPrecision(4)+" N", barCategoryTextSize, barCategoryTextDepth, bottomX-barValueTextDisplacement, forceBarY-barCategoryTextSize/2, 0, barCategoryTextColor);
}
var forceText = makeText("force:", barCategoryTextSize, barCategoryTextDepth, bottomX-barCategoryTextDisplacement+45, forceBarY-barCategoryTextSize/2, 0, barCategoryTextColor);
/*
 //no position bar
var posBarY = graphCenterY+38;
var posBar = makePrism(bottomX, posBarY, 0, 1, barSize, barSize, 0x999999);
function setPos(p) {
    //force=f;
    var graphicalP = Math.max(p*graphicalConversion, minBar);
    posBar.scale.x=graphicalP;
    posBar.position.x=bottomX+graphicalP/2;
}
var posText = makeText("position (m)", barCategoryTextSize, barCategoryTextDepth, bottomX-barCategoryTextDisplacement, posBarY, 0, barCategoryTextColor);
*/

//stopwatch needs to be rotated towards user as a group
var stopwatchGroup = new THREE.Object3D();

//stopwatch constants
var stopwatchCenterX = -250;
var stopwatchCenterY = 60;
var stopwatchRadius = 30;
var stopwatchThickness = 5;

var stopWatchGeo = new THREE.CylinderGeometry( stopwatchRadius, stopwatchRadius, stopwatchThickness, 100 );
var stopwatchTexture = THREE.ImageUtils.loadTexture('stopwatchFace.png');
var stopWatchMat = new THREE.MeshBasicMaterial({color: 0x46C8C4,ambient:0x46C8C4});//new THREE.MeshPhongMaterial({map:stopwatchTexture});
var stopwatch = new THREE.Mesh( stopWatchGeo, stopWatchMat );
stopwatch.position.x = stopwatchCenterX;
stopwatch.position.y = stopwatchCenterY;
stopwatch.rotation.x = Math.PI/2;
//stopwatch.rotation.y = Math.atan(camera.position.z/-centerOfAxis.x);
console.log("rotation"+stopwatch.rotation.y+"z"+camera.position.z+"x"+(-centerOfAxis.x));
stopwatch.castShadow = false;//true;
stopwatch.receiveShadow = false;//true;
stopwatchGroup.add( stopwatch );

//stopwatch hands
var stopwatchHandStartAngle = 0;
var stopwatchHandThickness = 2;
var stopWatchHandGeo = new THREE.CylinderGeometry( 0, stopwatchHandThickness, stopwatchRadius, 100);
var stopWatchHandMat = new THREE.MeshBasicMaterial({color: 0x000000,ambient:0x000000});
var stopwatchHand = new THREE.Mesh( stopWatchHandGeo, stopWatchHandMat );
stopwatchHand.position.z = stopwatchThickness/2;
stopwatchHand.rotation.z = stopwatchHandStartAngle;
stopwatchHand.castShadow = false;//true;
stopwatchHand.receiveShadow = false;//true;
stopwatchGroup.add( stopwatchHand );

//ticks go around stopwatch
var tickLength = 3;

for (var angle = 0; angle<2*Math.PI-.1; angle+=Math.PI/4) {
    var stopWatchTickGeo = new THREE.CylinderGeometry( 1, 1, tickLength, 100);
    var stopWatchTickMat = new THREE.MeshBasicMaterial({color: 0x000000,ambient:0x000000});
    var stopWatchTick = new THREE.Mesh(stopWatchTickGeo, stopWatchTickMat);
    stopWatchTick.position.set(stopwatchCenterX+(stopwatchRadius-tickLength/2)*Math.cos(angle), stopwatchCenterY+(stopwatchRadius-tickLength/2)*Math.sin(angle), stopwatchThickness/2);
    stopWatchTick.rotation.z = angle+Math.PI/2;
    stopwatchGroup.add(stopWatchTick);
}
//speed
RADIANS_PER_SECOND = Math.PI / 2;//4 seconds for one rotation

//t= text above stopwatch
var timeElapsedText = new THREE.Mesh();
stopwatchGroup.add(timeElapsedText);

timeText = makeText("time=       s", 10, 2, stopwatchCenterX-30, stopwatchCenterY+35, 0, 0x000000);
scene.remove(timeText);
stopwatchGroup.add(timeText);

//when elapsed time changes, move stopwatch and change text
var prevElapsedTime = -1;
function setElapsedTime(elapsedTime) {
    totalElapsedTime = elapsedTime;
    stopwatchHand.rotation.z=elapsedTime*-RADIANS_PER_SECOND;
    stopwatchHand.position.x = stopwatchCenterX-stopwatchRadius/2*Math.sin(stopwatchHand.rotation.z-stopwatchHandStartAngle);
    stopwatchHand.position.y = stopwatchCenterY+stopwatchRadius/2*Math.cos(stopwatchHand.rotation.z-stopwatchHandStartAngle);
    if (totalElapsedTime.toFixed(1)!=prevElapsedTime) {
        stopwatchGroup.remove(timeElapsedText);
        timeElapsedText = makeText(totalElapsedTime.toFixed(1), 10, 2, stopwatchCenterX+10, stopwatchCenterY+35, 0, 0x000000);//makeText("time="+totalElapsedTime.toFixed(1)+" s", 10, 2, stopwatchCenterX-30, stopwatchCenterY+35, 0, 0x000000);
        scene.remove(timeElapsedText);
        stopwatchGroup.add(timeElapsedText);
        prevElapsedTime=elapsedTime;
    }
}

setElapsedTime(0);//start time

//rotate stopwatch group
var angle = Math.atan(-centerOfAxis.x/camera.position.z);
var xChange = Math.cos(angle)*stopwatchCenterX;
var zChange = Math.sin(angle)*stopwatchCenterX;
stopwatchGroup.position.set(stopwatchCenterX - xChange, 0,zChange);
stopwatchGroup.rotation.y=angle;

scene.add(stopwatchGroup);


//graph has a grid for scale
var gridUIs = [];

var labelSize = 6;
function updateLabels() {
    for (label in gridUIs) {
        scene.remove(gridUIs[label]);
    }
    gridUIs = [];
    
    //make gridlines
    var maxGrid = maxGraphScale;
    var gridSize = maxGrid/10.;
    for (var size=gridSize; size<maxGrid+gridSize/2; size+=gridSize) {
        var x = bottomX+size*graphicalConversion;
        var grid = makePrism(x, graphCenterY, -barSize/2, 2, bottomLength, 2, 0xaaaaaa);
        gridUIs.push(grid);
    }
    
    var labelIncrement = maxGrid/2.0;
    for (var size=0; size<=maxGrid; size+=labelIncrement) {
        var x = bottomX+size*graphicalConversion-labelSize/2;
        var gridLabel = makeText(size, labelSize, 2, x, graphCenterY+bottomLength/2+labelSize/2, -barSize/2, 0x111111);
        gridUIs.push(gridLabel);
    }
}

updateLabels();

//create axes
//constants
var axisRadius = 2;
var axisColor = 0x444444;
var arrowLength = 10;
var arrowRadius = axisRadius*2;
var textSize = 10;
var textHeight = 2;
var textColor = axisColor;
//x
var xLength = 180;
var xAxis = makeCylinder(axisRadius, axisRadius, xLength, centerOfAxis.x+xLength/2, centerOfAxis.y, centerOfAxis.z, 0, 0, Math.PI/2, axisColor);
var xArrow = makeCylinder(arrowRadius, 0, arrowLength, centerOfAxis.x+xLength+arrowLength/2, centerOfAxis.y, centerOfAxis.z, 0, 0, Math.PI/2, axisColor);
var xText = makeText("X", textSize, textHeight, centerOfAxis.x+xLength/2, centerOfAxis.y+axisRadius, centerOfAxis.z, textColor);
//y
var yLength = 100;
var yAxis = makeCylinder(axisRadius, axisRadius, yLength, centerOfAxis.x+axisRadius, centerOfAxis.y+yLength/2, centerOfAxis.z, 0, 0, 0, axisColor);
var yArrow = makeCylinder(arrowRadius, 0, arrowLength, centerOfAxis.x+axisRadius, centerOfAxis.y+yLength+arrowLength/2, centerOfAxis.z, 0, 0, Math.PI, axisColor);
var yText = makeText("Y", textSize, textHeight, centerOfAxis.x+2*axisRadius, centerOfAxis.y+yLength-20, centerOfAxis.z, textColor);
//z
/*
 //no z axis
var zLength = 100;
var zAxis = makeCylinder(axisRadius, axisRadius, zLength, centerOfAxis.x, centerOfAxis.y, centerOfAxis.z+zLength/2, Math.PI/2, 0, 0, axisColor);
var zArrow = makeCylinder(0, arrowRadius, arrowLength, centerOfAxis.x, centerOfAxis.y, centerOfAxis.z+zLength+arrowLength/2, Math.PI/2, 0, 0, axisColor);
var zText = makeText("Z", textSize, textHeight, centerOfAxis.x-textSize/2, centerOfAxis.y+axisRadius, centerOfAxis.z+zLength-15, textColor);
 */

var paused = true;

//move to a set amount of meters
function MoveTo(totalMeters) {
    var meterChange = totalMeters-totalMeterChange;
    totalMeterChange=totalMeters;
    //setPos(totalMeterChange);
	var positionChange = meterChange/METERS_PER_PIXEL;
	weight.position.y -= positionChange;
    hook.position.y -= positionChange;
	stringToBlock.scale.y -= positionChange;
	stringToBlock.position.x += positionChange/2;
	block.position.x += positionChange;
	stringToWeight.position.y -= positionChange/2;
	stringToWeight.scale.y += positionChange;
}

var totalElapsedTime = 0;//seconds

//set everything back to the way it was
function reset() {
    console.log(' time'+totalElapsedTime+' moved'+totalMeterChange+'endv'+vY);
    console.log('elapsed seconds: '+(new Date() - startTime)/1000);
    MoveTo(0);
    setElapsedTime(0);
    setVelocity(0);
    
    paused=true;
    updateFromUI();
    setAcceleration(0);
    setForce(0);
    started=false;
    document.getElementById("start").disabled = false;
    document.getElementById("start").value = " Start ";
}

//runtime constants
var timePerFrame = .05;//simulated time
var timeBetweenFrames = .02;
var startTime = new Date();//used to keep time between frames constant

function Draw()
{
    var startFrameTime = new Date();
	if (paused==false && block.position.x<=MAX_BLOCK_POSITION) {
        var previous = aY*totalElapsedTime*totalElapsedTime/2;
		var elapsedTime = timePerFrame;
        setElapsedTime(totalElapsedTime + elapsedTime);
        
		MoveTo( aY*totalElapsedTime*totalElapsedTime/2 );
        if (block.position.x>MAX_BLOCK_POSITION) {
            MoveTo (previous);
            var startPos = blockLeftX + blockLength/2;//pixel units
            var currentPos = startPos + totalMeterChange/METERS_PER_PIXEL;//pixel units
            var remainingDist = (MAX_BLOCK_POSITION-currentPos)*METERS_PER_PIXEL;//meters
            var timeRemaining = (-vY + Math.sqrt(vY*vY + 2*aY*remainingDist))/(aY);
            MoveTo( totalMeterChange+remainingDist );
            setElapsedTime(totalElapsedTime - elapsedTime + timeRemaining);
            paused=true;
            document.getElementById("start").disabled = true;
            document.getElementById("start").value = " Start ";
        } else {
            setVelocity( aY*totalElapsedTime );
        }
	}
    
    if (block.position.x>MAX_BLOCK_POSITION) {
        paused=true;
        document.getElementById("start").disabled = true;
        document.getElementById("start").value = " Start ";
    }
    
    //stopwatchGroup.rotation.y+=.1;
	
	// draw THREE.JS scene
    renderer.render(scene, camera);
    controls.update();
    
    var endFrameTime = new Date();
    var secondsToWait = Math.max(timeBetweenFrames-(endFrameTime-startFrameTime)/1000.0, 0);
    //console.log(secondsToWait);
    
	// loop the draw() function
	window.setTimeout( "requestAnimationFrame(Draw)" , secondsToWait*1000) ;
}

function Start()
{
	Draw();
}

var started = false;

function play() {
    if (!started) {
        startTime = new Date();
        updateFromUI();
    }
    started=true;
    
    paused = !paused;
    if (paused) {
        document.getElementById("start").value = " Play  ";
    } else {
        document.getElementById("start").value = "Pause";
    }
}

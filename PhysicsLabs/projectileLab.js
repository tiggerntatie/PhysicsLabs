// get the DOM element to attach to
// - assume we've got jQuery to hand
//this is the black box for simulating
var container = document.getElementById( 'canvas' );

//get width and height
var WIDTH = $("#canvas").width();
var HEIGHT = $("#canvas").height();

//meshes is used to store all objects displayed. It is used so panning and zooming moves all objects. Otherwise, there would be nothing to pan and zoom.
var meshes = [];
//offsets are used to store how far the meshes have been moved by panning and zooming.
var yOffset = 0;
var xOffset = 0;
var zOffset = 0;

// set some camera attributes
var VIEW_ANGLE = 45,
  ASPECT = WIDTH / HEIGHT,
  NEAR = 0.1,
  FAR = 10000;

// create a WebGL renderer, camera
// and a scene
var renderer = new THREE.WebGLRenderer({antialiasing:true, antialias:true});

//this is what the user will see out of.
var camera =
  new THREE.PerspectiveCamera(
    VIEW_ANGLE,
    ASPECT,
    NEAR,
    FAR);

var scene = new THREE.Scene();//this scene is what I will add cameras, lights, and meshes to.

//orbit controls
//controls = new THREE.OrbitControls( camera, renderer.domElement );

//http://stackoverflow.com/questions/11170952/threejs-orthographic-camera-adjusting-size-of-scene-to-window
var camFactor = 1;
$(window).on('resize', function () {
    WIDTH = $("#canvas").width();
    HEIGHT = $("#canvas").height();
     
    renderer.setSize(WIDTH, HEIGHT);
});
 
// add the camera to the scene
scene.add(camera);

// the camera starts at 0,0,0
// so pull it back
camera.position.z = 300;

// start the renderer
renderer.setSize(WIDTH, HEIGHT);

// attach the render-supplied DOM element
container.appendChild( renderer.domElement );

// no shadows
renderer.shadowMapEnabled = false;

//store texts to look at user
var texts = new Array();
//this function puts text on screen.
//text is a string, asize is the text point size, aheight is the depth of the text, xyz are coordinates, and acolor is a color tuple.
var makeText = function(text, asize, aheight, x, y, z, acolor) {
    //create geometry for text. Must import font in html file.
    var textGeo = new THREE.TextGeometry(text, {size:asize, height:aheight, curveSegments:0, font:"helvetiker", weight:"normal"});
    //material with given color
    var textMat = new THREE.MeshPhongMaterial({color:acolor, ambient:acolor});
    var textObj = new THREE.Mesh(textGeo, textMat);
    //set text position
    textObj.position.x=x;
    textObj.position.y=y;
    textObj.position.z=z;
    //add to scene and return
    scene.add(textObj);
    meshes.push(textObj);
    texts.push(textObj);
    return textObj;
}

//this function puts a cylinder on screen. or a cone.
//rx, ry, rz are rotations around each axis.
var makeCylinder = function(radius1, radius2, length, x, y, z, rx, ry, rz, acolor) {
    //geometry has radii and length. 100 is the number of facets rendered.
    var cylinderGeo = new THREE.CylinderGeometry(radius1, radius2, length, 100);
    var cylinderMat = new THREE.MeshPhongMaterial({color:acolor,ambient:acolor});
    var cylinder = new THREE.Mesh(cylinderGeo, cylinderMat);
    //set position and rotation
    cylinder.position.set(x,y,z);
    cylinder.rotation.set(rx,ry,rz);
    //add to scene and return
    scene.add(cylinder);
    meshes.push(cylinder);
    return cylinder;
}


//equations could start out blank, with wrong equations, or with correct equations
var START_WRONG = true;
var START_RIGHT = false;

if (START_WRONG) {
    document.getElementById("fx").value = "10t";
    document.getElementById("fvx").value = "10";
    document.getElementById("fy").value = "15-abs(10t-15.01)";
    document.getElementById("fvy").value =  "-10(10t-15.01)/abs(10t-15.01)";
    document.getElementById("ax").value="0";
    document.getElementById("ay").value="-9.81";
    document.getElementById("v0x").value="15";
    document.getElementById("v0y").value="18";
    
} else if (START_RIGHT) {
    document.getElementById("fx").value = "x0+vx*t+ax*t^2/2";
    document.getElementById("fvx").value = "vx+ax*t";
    document.getElementById("fy").value = "y0+vy*t+ay*t^2/2";
    document.getElementById("fvy").value =  "vy+ay*t";
    document.getElementById("ax").value="0";
    document.getElementById("ay").value="-9.81";
    document.getElementById("v0x").value="15";
    document.getElementById("v0y").value="18";
    
}

//this is the scale factor to convert between meters and pixels (actually WebGL units)
//higher number here makes everything smaller
var METERS_PER_PIXEL = .1;

//textures do not work when I run this locally. To avoid black bodies, I will have a basic color material when running locally.
var useTextures=true;
if (document.location.href.indexOf("file")===0) {//if running locally.
    useTextures=false;//don't use textures.
}

function dataNumber(num) {
    if (num<1e-6 && num>-1e-4) return "0.00";
    return num.toPrecision(3);
}

var maxY = 0;
var xAtMaxY = 0;
var shouldUpdateMaxY = true;

//this is actually a class!
//the Body class represents a sphere in uniform earth gravity
//a Body is created with mass, coordinates, color, segments (number of facets to render), and the name of a texture (like sun.jpg)
function Body(mass, x, y, color1, segments, textureName) {
    
    //bodies start off not moving.
    this.vx=0;
    this.vy=0;
    
    //store gravitational constant. If user enters this, change it upon Start.
    this.g=9.81;
    
    //density is the same for all heavenly bodies. This should probably not be the case. Make density a constructor input?
    var density = 0.001; //kg / cubic pixel. larger density makes weights smaller
    
    //simple fuction to convert mass into radius using density.
    function radiusForMass(mass1) {
        //V = 4/3πr^3; D = m / V; r = cuberoot(3/4 V /π);
        var V = mass1/density;
        return Math.pow(V/Math.PI * 3 / 4,1/3.0);
    }
    
    //create body material.
    //default is boring color
    var material = new THREE.MeshPhongMaterial({color:color1, ambient:color1});
    //if I have a texturename and useTextures is true, change material to texture loaded from textureName.
    if (textureName && useTextures) {
        var texture = THREE.ImageUtils.loadTexture(textureName);
        material = new THREE.MeshPhongMaterial( { map: texture } );
    }
    
    //create sphere geometry
    var geometry = new THREE.SphereGeometry(1, segments, segments);
    //create a mesh and store it. put it on screen.
    this.view = new THREE.Mesh(geometry, material);
    this.view.position.set(0,0,0);
    scene.add(this.view);
    meshes.push(this.view);
    
    //change mass and, by extension, radius.
    this.setMass = function(mass1) {
        this.m=mass1;
        var rad = radiusForMass(mass1);
        this.view.scale.set(rad, rad, rad);
    }
    
    //set initial mass and position
    this.setMass(mass);
    
    //when set coordinates, move obj
    //if x or y is isolated, this may get complicated
    this.setX = function(x) {
        this.x=x;
        this.theoreticalPosition.x = x/METERS_PER_PIXEL+xOffset;
        this.view.position = positionForTheoreticalPosition(this.theoreticalPosition);
    }
    this.setY = function(y) {
        this.y=y;
        if (y>maxY && shouldUpdateMaxY) {
            xAtMaxY=this.x;
            maxY=y;
        }
        this.theoreticalPosition.y=y/METERS_PER_PIXEL+yOffset;
        this.view.position = positionForTheoreticalPosition(this.theoreticalPosition);
    }
    
    this.theoreticalPosition=new THREE.Vector3(0,0,0);
    
    //in meters
    this.setX(x);
    this.setY(y);
    
    //calculates gravitational potential energy.
    //gpe=mgh
    this.gpe = function() {
        return this.m*this.g*this.y;
    }
    
    //calculates kinetic energy of Body.
    this.ke = function() {
        //calculate magnitude of velocity
        var v = Math.sqrt(this.vx*this.vx+this.vy*this.vy);
        //KE = mv^2/2
        return this.m*v*v/2.0
    }
    
    this.t = 0;
    
    //moves a body for a given timestep.
    this.move = function(timestep) {
        this.t+=timestep;
        //x=fx(t); fx(t)=x0+vx0*t+ax*t*t/2
        //y=fy(t); fy(t)=y0+vy0*t+ay*t*t/2
        //vx=fvx(t); fvx(t)=vx0+ax*t
        //vy=fvy(t); fvy(t)=vy0+ay*t
        
        this.setX(evaluateExpression(stringFromUI("fx"), {"t":this.t, "x0":numFromUI("x0"), "v0x":numFromUI("v0x"), "ax":numFromUI("ax"), "y0":numFromUI("y0"), "v0y":numFromUI("v0y"), "ay":numFromUI("ay")}));
        this.setY(evaluateExpression(stringFromUI("fy"), {"t":this.t, "y0":numFromUI("y0"), "v0y":numFromUI("v0y"), "ay":numFromUI("ay"), "x0":numFromUI("x0"), "v0x":numFromUI("v0x"), "ax":numFromUI("ax")}));
        
        this.vx = evaluateExpression(stringFromUI("fvx"), {"t":this.t, "y0":numFromUI("y0"), "v0y":numFromUI("v0y"), "ay":numFromUI("ay"), "x0":numFromUI("x0"), "v0x":numFromUI("v0x"), "ax":numFromUI("ax")});
        this.vy = evaluateExpression(stringFromUI("fvy"), {"t":this.t, "y0":numFromUI("y0"), "v0y":numFromUI("v0y"), "ay":numFromUI("ay"), "x0":numFromUI("x0"), "v0x":numFromUI("v0x"), "ax":numFromUI("ax")});
        
        console.log("moved to x:"+this.x+" y:"+this.y+" vx:"+this.vx+" vy:"+this.vy);
    };
    
    //copies (images) are meshes dropped in a trail. keep track of them so you can search through them and delete them later.
    this.copies = new Array();
    
    //this method drops a copy (image). Time elapsed is used so the copy knows all about itself (for when the user selects it).
    this.dropCopy = function(timeElapsed) {
        //create mesh with current everything (not as good resolution).
        var copy = new THREE.Mesh(new THREE.SphereGeometry(1,segments/2,segments/2), material);
        copy.rotation.x=this.view.rotation.x;
        copy.rotation.y=this.view.rotation.y;
        var scale = this.view.scale.x*0.95;//slightly smaller.
        copy.scale.set(scale, scale, scale);
        copy.position.set(this.view.position.x, this.view.position.y, this.view.position.z);
        //stored values for display when clicked.
        copy.x=this.x;
        copy.y=this.y;
        copy.vx=this.vx;
        copy.vy=this.vy;
        copy.t=this.t;
        //add to screen
        scene.add(copy);
        meshes.push(copy);
        this.copies.push(copy);
        
        //add to data table.
        document.getElementById("timetable").innerHTML+="<br />"+dataNumber(this.t);
        document.getElementById("positiontable").innerHTML+="<br />("+dataNumber(this.x)+", "+dataNumber(this.y)+")";
        document.getElementById("velocitytable").innerHTML+="<br />("+dataNumber(this.vx)+", "+dataNumber(this.vy)+")";
    }
    
    //gets rid of all images (upon reset)
    this.removeAllCopies = function() {
        //remove from screen
        for (copy in this.copies) {
            scene.remove(this.copies[copy]);
        }
        //remove completely
        this.copies=new Array();
        
        //reset data table
        document.getElementById("timetable").innerHTML="Time (s)";
        document.getElementById("positiontable").innerHTML="Position (m)";
        document.getElementById("velocitytable").innerHTML="Velocity (m/s)";
    }
}

//calculates the energy of all bodies. kinetic energy and gpe between bodies.
var calculateEnergy = function(bodies) {
    var totalEnergy = 0;
    //add energies of all bodies
    for (bodyindex in bodies) {
        totalEnergy+=bodies[bodyindex].ke();
        totalEnergy+=bodies[bodyindex].gpe();
    }
    return totalEnergy;
}

//create object
//Body(mass, x, y, color1, segments, textureName)
var ball = new Body(10, 0, 0, 0xffff00, 100, "soccerball.jpg");

// create an ambient light to see the dark side of the ball.
var ambientLight = new THREE.AmbientLight(0x999999);
scene.add(ambientLight);

//create a light from above
var aboveLight = new THREE.DirectionalLight(0xffffff);
aboveLight.position.set(0, 1000, 0);
aboveLight.intensity=2;
scene.add(aboveLight);

//this function searches the document and finds a number input.
function numFromUI(id) {
    return parseFloat(document.getElementById(id).value, 10);//base ten.
}

//this function just gives the value of an id as a string.
function stringFromUI(id) {
    return document.getElementById(id).value;
}

//origin is (0,0,0).
//set axis constants
var axisRadius = 1;
var axisColor = 0x111111;
var arrowLength = 10;
var arrowRadius = axisRadius*2;
var textSize = 8;
var textHeight = 2;
var textColor = axisColor;
//x axis
var xLength = 80;
var xAxis = makeCylinder(axisRadius, axisRadius, xLength, xLength/2+xOffset, yOffset, zOffset, 0, 0, Math.PI/2, axisColor);
var xArrow = makeCylinder(arrowRadius, 0, arrowLength, xLength+arrowLength/2, 0, 0, 0, 0, Math.PI/2, axisColor);
var xText = makeText("X", textSize, textHeight, xLength/2+xOffset, axisRadius+yOffset, zOffset, textColor);
//y axis
var yLength = 80;
var yAxis = makeCylinder(axisRadius, axisRadius, yLength, xOffset, yLength/2+yOffset, zOffset, 0, 0, 0, axisColor);
var yArrow = makeCylinder(arrowRadius, 0, arrowLength, xOffset, yLength+arrowLength/2+yOffset, zOffset, 0, 0, Math.PI, axisColor);
var yText = makeText("Y", textSize, textHeight, axisRadius+xOffset, yLength/2+yOffset, zOffset, textColor);

//this variable is a boolean storing the state of the simulation.
var paused = true;

var totalElapsedTime = 0;//seconds in simulation units

//reset the orbit. this gets called from start as well as Reset button.
function resetFreefall() {
    maxY=0;
    //set ball initial conditions according to inputs.
    ball.setMass(numFromUI('mass'));
    ball.vx = numFromUI('v0x');
    ball.vy = numFromUI('v0y');
    ball.setX(numFromUI('x0'));
    ball.setY(numFromUI('y0'));
    ball.t=0;
    
    //reset time and frame counters
    totalElapsedTime=0;
    drawnFrameIndex=0;
    
    //have not started; paused. change buttons accordingly
    started=false;
    paused=true;
    document.getElementById("start").disabled = false;
    document.getElementById("start").value = " Start ";
    document.getElementById("reset").disabled= true;
    
    //don't display any images or image data.
    ball.removeAllCopies();
    scene.remove(selectedTexts.pos);
    scene.remove(selectedTexts.vel);
    scene.remove(selectedTexts.time);
}

var timePerFrame = .01;//this is the speed of the simulation. There should be no error, because forces are constant.
var timeBetweenFrames = .01;//to leave the processor idle for a while

//start off with 0J of energy.
var startEnergy = 0;

//start at frame 0 with 20 frames per image
var drawnFrameIndex = 0;
var framesPerCopyDrop = 50;
document.getElementById("copydrop").innerHTML=""+framesPerCopyDrop;
//functions to change the frames per image. Updates internal variable and UI.
function moreFrames() {
    framesPerCopyDrop++;
    document.getElementById("copydrop").innerHTML=""+framesPerCopyDrop;
    document.getElementById("fewerFrames").disabled=false;
}
function fewerFrames() {
    framesPerCopyDrop--;
    document.getElementById("copydrop").innerHTML=""+framesPerCopyDrop;
    if (framesPerCopyDrop<=1) {//1 is minimum
        document.getElementById("fewerFrames").disabled=true;
    }
}

//storing whether adjustment buttons are being pressed.
var zoomingIn = false;
var zoomingOut= false;
var movingLeft= false;
var movingRight=false;
var movingUp=   false;
var movingDown= false;

var stopAtY0 = true;//if true, will stop when hits y=0 from above

function Draw()
{
    // loop the draw() function after some time
	window.setTimeout( "requestAnimationFrame(Draw)" , timeBetweenFrames*1000) ;
    
	if (paused==false) {//if playing, change UI
        
        //drop image if frame counter is a multiple of framespercopydrop.
        if (drawnFrameIndex%framesPerCopyDrop==0) {
            ball.dropCopy();
        }
        
        var prevYWasPositive = ball.y>0;
        ball.move(timePerFrame);
        
        if (stopAtY0 && prevYWasPositive && ball.y<0) {
            paused=true;
            document.getElementById("start").disabled = true;
            document.getElementById("start").value = " Start ";
        }
        
        //totalElapsedTime+=timePerFrame;
        var currentEnergy = calculateEnergy(new Array(ball));
        //log calculated error
        console.log("error:"+Math.abs(currentEnergy-startEnergy)+"J. Total NRG:"+currentEnergy+"J. Percent:"+((currentEnergy-startEnergy)/startEnergy)*100+"%.");
        
        drawnFrameIndex++;
	}
    //rotate slowly.
    ball.view.rotation.y+=.003;
    ball.view.rotation.y+=.005;
    ball.view.rotation.z-=.004;
    
    //if buttons are being pressed, react.
    if (zoomingIn) {
        zoomIn();
    } else if (zoomingOut) {
        zoomOut();
    }
    if (movingLeft) {
        moveLeft();
    } else if (movingRight) {
        moveRight();
    }
    if (movingUp) {
        moveUp();
    } else if (movingDown) {
        moveDown();
    }
    
    //look at all texts
    for (i in texts) {
        texts[i].lookAt(camera.position);
    }
	
	// draw THREE.JS scene
    renderer.render(scene, camera);
    //controls.update();
    
    
}

//called at page load
function Start()
{
    //start drawing (then loop)
	Draw();
}

//keep track of whether start has been pressed
var started=false;

function play() {
    if (!stringFromUI('x0').length||!stringFromUI('y0').length) { // if coordinate is not entered (length of either is zero), alert and nothing else.
        alert("Please input coordinates");
    } else if (!stringFromUI('v0x').length||!stringFromUI('v0y').length) {// if velocity is not entered (length of either is zero), ask for it
        alert("Please input velocity");
    } else if (!stringFromUI('fx').length||!stringFromUI('fy').length||!stringFromUI('fvx').length||!stringFromUI('fvy').length) {
        alert("Please input equation");
    } else if (!stringFromUI('ax').length||!stringFromUI('ay').length) {
        alert("Please input acceleration");
    } else {
        //allow reset
        document.getElementById('reset').disabled=false;
        if (!started) {
            // not started yet. load from ui (checkbox and text inputs)
            ball.setMass(numFromUI('mass'));
            ball.setX(numFromUI('x0'));
            ball.setY(numFromUI('y0'));
            ball.vx = numFromUI('v0x');
            ball.vy = numFromUI('v0y');
            startEnergy=calculateEnergy(new Array(ball));//calculate starting energy.
            started=true;
        }
        paused = !paused;//flip pause
        //change button text
        if (paused) {
            document.getElementById("start").value = " Play  ";
        } else {
            document.getElementById("start").value = "Pause";
        }
        
        //after five seconds, check if equations are correct for launched projectile
        var timeBeforeCheck = 2;
        window.setTimeout("checkEquations();", timeBeforeCheck*1000);
    }
    
}

//just checks equations.
//if accelerations are wrong, this will detect that.
//inputs for velocity and coordinates and acceleration.
function checkEquations() {
    var correctX = numFromUI("x0")+numFromUI("v0x")*ball.t+numFromUI("ax")*ball.t*ball.t/2.;
    var correctY = numFromUI("y0")+numFromUI("v0y")*ball.t+numFromUI("ay")*ball.t*ball.t/2.;
    var correctVx = numFromUI("v0x")+numFromUI("ax")*ball.t;
    var correctVy = numFromUI("v0y")+numFromUI("ay")*ball.t;
    
    //error
    var allowedXError = 0.1;
    var allowedYError = 0.1;
    var allowedVXError = 0.1;
    var allowedVYError = 0.1;
    var errors=[];
    if (Math.abs(correctX-ball.x)>allowedXError) {
        errors.push("X Equation is incorrect");
    }
    if (Math.abs(correctY-ball.y)>allowedYError) {
        errors.push("Y Equation is incorrect");
    }
    if (Math.abs(correctVx-ball.vx)>allowedVXError) {
        errors.push("Vx Equation is incorrect");
    }
    if (Math.abs(correctVy-ball.vy)>allowedVYError) {
        errors.push("Vy Equation is incorrect");
    }
    if (errors.length) {
        var theAlert="";
        for (i in errors) {
            theAlert+=errors[i];
            if (i!=errors.length-1) {
                theAlert+="\n";
            }
        }
        alert(theAlert);
    }
}

//http://www.hiteshagrawal.com/javascript/calculating-div-position-in-javascript
//finds coordinates of div position
function getPosition(obj){
    var topValue= 0,leftValue= 0;
    while(obj){
        leftValue+= obj.offsetLeft;
        topValue+= obj.offsetTop;
        obj= obj.offsetParent;
    }
    finalvalue = {"x":leftValue, "y":topValue};
    return finalvalue;
}

var selectedGhost;
var ballMaterial = ball.view.material;
var selectedMaterial=new THREE.MeshPhongMaterial({color:0x0000ff,ambient:0xffffff});
var selectedTexts=new Object();
var INFO_SIZE = 7;

var selectedXOffset = 20;

//respond to clicks by looking for image at click
var projector = new THREE.Projector();
//view-source:http://mrdoob.github.io/three.js/examples/canvas_interactive_cubes.html
function onDocumentMouseDown( event ) {
    
    var clickableObjects = ball.copies.slice(0);
    event.preventDefault();
    
    var divLocation = getPosition(container);
    
    mouseX = event.clientX - container.offsetLeft;
    mouseY = event.clientY - container.offsetTop + $(window).scrollTop();
    
    var vector = new THREE.Vector3( ( mouseX / container.offsetWidth )*2-1, - ( mouseY / container.offsetHeight )*2+1, 0.5 );
    projector.unprojectVector( vector, camera );
    
    var raycaster = new THREE.Raycaster( camera.position, vector.sub( camera.position ).normalize() );
    
    var intersects = raycaster.intersectObjects( clickableObjects );
    
    if ( intersects.length > 0) {
        
        //clear text from screen
        scene.remove(selectedTexts.pos);
        scene.remove(selectedTexts.vel);
        scene.remove(selectedTexts.time);
        
        if (intersects[0].object==selectedGhost) {
            //clicked on selected. deselect and set material back.
            selectedGhost.material=ballMaterial;
            selectedGhost=undefined;
        } else {
            //clicked on new image
            if (selectedGhost) {
                //reset material on selected.
                selectedGhost.material=ballMaterial;
            }
            selectedGhost=intersects[0].object;
            selectedGhost.material=selectedMaterial;
            
            console.log("clicked on ghost x:"+selectedGhost.x+" y:"+selectedGhost.y+" t:"+selectedGhost.t);
            
            //set info in imageview (top right)
            document.getElementById('coordinates').innerHTML="("+selectedGhost.x.toPrecision(4)+", "+selectedGhost.y.toPrecision(4)+")";
            document.getElementById('velocity').innerHTML="("+selectedGhost.vx.toPrecision(4)+", "+selectedGhost.vy.toPrecision(4)+")";
            document.getElementById('time').innerHTML=selectedGhost.t.toPrecision(4);
            
            //display info.
            selectedTexts.pos = makeText("(x,y): ("+selectedGhost.x.toPrecision(4)+", "+selectedGhost.y.toPrecision(4)+") m", INFO_SIZE, .5, selectedGhost.position.x+selectedXOffset, selectedGhost.position.y+12, selectedGhost.position.z, 0x000000);
            
            selectedTexts.vel = makeText("v: ("+selectedGhost.vx.toPrecision(4)+", "+selectedGhost.vy.toPrecision(4)+") m/s", INFO_SIZE, .5, selectedGhost.position.x+selectedXOffset, selectedGhost.position.y, selectedGhost.position.z, 0x000000);
            
            selectedTexts.time=makeText("t: "+selectedGhost.t.toPrecision(4)+" s", INFO_SIZE, .5, selectedGhost.position.x+selectedXOffset, selectedGhost.position.y-12, selectedGhost.position.z, 0x000000);
        }
        
        
    } else {
        console.log("nothing clicked");
    }
}

//for moving.
//SCALE_FACTOR is for zooming speed
var SCALE_FACTOR = 1.04;
//speed of moving
var DXDT = 5;
var DYDT = 4;
//pan factor is for how much to move.
//if zoomed out move faster.
var panFactor = 1;

//buttons call these functions
function startZoomIn() {
    zoomingIn=true;
}
function stopZoomIn() {
    zoomingIn=false;
}
function startZoomOut() {
    zoomingOut=true;
}
function stopZoomOut() {
    zoomingOut=false;
}
function startMoveLeft() {
    movingLeft=true;
}
function stopMoveLeft() {
    movingLeft=false;
}
function startMoveUp() {
    movingUp=true;
}
function stopMoveUp() {
    movingUp=false;
}
function startMoveDown() {
    movingDown=true;
}
function stopMoveDown() {
    movingDown=false;
}
function startMoveRight() {
    movingRight=true;
}
function stopMoveRight() {
    movingRight=false;
}

//called every frame when button pressed
function zoomIn() {
    //when moving, move more if zoomed in
    panFactor/=SCALE_FACTOR;
    var allObjects = meshes;
    var cameraZ = camera.position.z;
    var distanceFromCameraToSimulation = cameraZ-zOffset;
    distanceFromCameraToSimulation/=SCALE_FACTOR;
    
    var newZ = cameraZ-distanceFromCameraToSimulation;
    var change = newZ-zOffset;
    zOffset=newZ;
    for (i in allObjects) {
        allObjects[i].position.z+=change;
    }
}

function zoomOut() {
    panFactor*=SCALE_FACTOR;
    var allObjects = meshes;
    var cameraZ = camera.position.z;
    var distanceFromCameraToSimulation = cameraZ-zOffset;
    distanceFromCameraToSimulation*=SCALE_FACTOR;
    var newZ = cameraZ-distanceFromCameraToSimulation;
    var change = newZ-zOffset;
    zOffset=newZ;
    for (i in allObjects) {
        allObjects[i].position.z+=change;
    }
}

function moveLeft() {
    var allObjects = meshes;
    xOffset-=DXDT*panFactor;
    for (i in allObjects) {
        allObjects[i].position.x-=DXDT*panFactor;
    }
}

function moveRight() {
    var allObjects = meshes;
    xOffset+=DXDT*panFactor;
    for (i in allObjects) {
        allObjects[i].position.x+=DXDT*panFactor;
    }
}

function moveUp() {
    var allObjects = meshes;
    yOffset+=DYDT*panFactor;
    for (i in allObjects) {
        allObjects[i].position.y+=DYDT*panFactor;
    }
}

function moveDown() {
    var allObjects = meshes;
    yOffset-=DYDT*panFactor;
    for (i in allObjects) {
        allObjects[i].position.y-=DYDT*panFactor;
    }
}

//move down and to the left
for (count=0;count<50;count++) {
    moveLeft();
    if (count%3==0) moveDown();
}

//account for isolating of x and y
//returns a copy
function positionForTheoreticalPosition(pos) {
    var copy = new THREE.Vector3(pos.x, pos.y, pos.z);//{"x":pos.x, "y":pos.y, "z":pos.z};
    if (document.getElementById("isolatex").checked) {
        copy.y=0;
        var centerX = xAtMaxY/METERS_PER_PIXEL+xOffset;
        //translate centerX to be 0
        copy.x-=centerX;
        copy.z=pos.y-yOffset+zOffset;
    } else if (document.getElementById("isolatey").checked) {
        copy.z=zOffset-(pos.x-xOffset);
        copy.x=0;//xOffset;
    }
    return copy;
}

//when reversing isolation, use this
function theoreticalPositionForPosition(pos, xWasIsolated, yWasIsolated) {
    var copy = new THREE.Vector3(pos.x, pos.y, pos.z);//{"x":pos.x, "y":pos.y, "z":pos.z};
    if (xWasIsolated) {
        copy.y=pos.z-zOffset+yOffset
        copy.z=zOffset;
        var centerX = xAtMaxY/METERS_PER_PIXEL+xOffset;
        //translate 0 to be centerX
        copy.x+=centerX;
    } else if (yWasIsolated) {
        copy.x=zOffset-pos.z+xOffset;
        copy.z=zOffset;
        //copy.x=0;//xOffset;
    }
    return copy;
}

//called when checkbox clicked. must wait until changes have taken effect
function isolateX() {
    window.setTimeout("isolateXDelayed();", 100);
}

//rotate so only x motion can be seen
function isolateXDelayed() {
    if (document.getElementById("isolatex").checked) {
        if (document.getElementById("isolatey").checked) {
            document.getElementById("isolatey").checked=false;//can't isolate both at once
            //un-isolate y
            isolateYDelayed();
        }
        shouldUpdateMaxY=false;
        //rotate all objects around x axis 90 degrees
        //z coord becomes y coord
        for (i in meshes) {
            meshes[i].position=positionForTheoreticalPosition(meshes[i].position);
            meshes[i].rotation.x+=Math.PI/2;
        }
    } else {
        //undo
        shouldUpdateMaxY=true;
        for (i in meshes) {
            meshes[i].position=theoreticalPositionForPosition(meshes[i].position, true, false);
            meshes[i].rotation.x-=Math.PI/2;
        }
    }
}

//called when checkbox clicked. must wait until changes have taken effect
function isolateY() {
    window.setTimeout("isolateYDelayed();", 100);
}

//rotate so only y motion can be seen
function isolateYDelayed() {
    if (document.getElementById("isolatey").checked) {
        if (document.getElementById("isolatex").checked) {
            document.getElementById("isolatex").checked=false;//can't isolate both at once
            //un-isolate x
            isolateXDelayed();
        }
        
        //rotate all objects around y axis 90 degrees
        //z coord becomes x coord
        for (i in meshes) {
            meshes[i].position=positionForTheoreticalPosition(meshes[i].position);
            meshes[i].rotation.y+=Math.PI/2;
        }
    } else {
        //undo
        for (i in meshes) {
            meshes[i].position=theoreticalPositionForPosition(meshes[i].position, false, true);
            meshes[i].rotation.y-=Math.PI/2;
        }
    }
}

//responds to clicks
container.addEventListener( 'mousedown', onDocumentMouseDown, false );
//start with disabled reset button
document.getElementById('reset').disabled=true;
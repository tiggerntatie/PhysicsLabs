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


//http://stackoverflow.com/questions/11170952/threejs-orthographic-camera-adjusting-size-of-scene-to-window
var camFactor = 1;
$(window).on('resize', function () {
             WIDTH = $("#canvas").width();
             HEIGHT = $("#canvas").height();
             
             renderer.setSize(WIDTH, HEIGHT);
             /*
             var newrenderer = new THREE.WebGLRenderer({antialiasing:true, antialias:true});
             newrenderer.setSize(WIDTH, HEIGHT);
             newrenderer.shadowMapEnabled=false;
             
             container.replaceChild(newrenderer.domElement, renderer.domElement);
             renderer=newrenderer;
              */
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

//resize
//THREEx.WindowResize(renderer, camera);

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

//this is the scale factor to convert between meters and pixels (actually WebGL units)
var METERS_PER_PIXEL = .7;

//textures do not work when I run this locally. To avoid black planet and sun, I will have a basic color material when running locally.
var useTextures=true;
if (document.location.href.indexOf("file")===0) {//if running locally.
    useTextures=false;//don't use textures.
}

//equation inputed (like "GMm/r^2")
var equation = "";

function equationIsKnownCorrect() {
    return 'GmM/r^2'==equation||'GMm/r^2'==equation||'G*M*m/r^2'==equation||'G*m*M/r^2'==equation||'GmM/(r*r)'==equation||'GMm/(r*r)'==equation||'G*M*m/(r*r)'==equation||'MmG/r^2'==equation||'mMG/r^2'==equation;
}

//record minimum and maximum distance from sun points for equation of ellipse
//only check these values before creating ellipse equation
//on reset, set them to 0 again
var periapsis = undefined;
var apoapsis = [0, 0];

//this is actually a class!
//the Body class represents a heavenly body (sun and planet are Bodies)
//a Body is created with mass, coordinates, color, segments (number of facets to render), and the name of a texture (like sun.jpg)
//a body also stores the position it would be in if the equations were correct
function Body(mass, x, y, color1, segments, textureName) {
    
    //bodies start off not moving.
    this.vx=0;
    this.vy=0;
    this.shouldVx=0;
    this.shouldVy=0;
    
    //store gravitational constant. If user enters this, change it upon Start.
    this.G=6.672;
    
    //density is the same for all heavenly bodies. This should probably not be the case. Make density a constructor input?
    var density = .2; //kg / cubic pixel. larger density makes weights smaller
    
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
    
    //this is a method to calculate the distance to another Body object.
    this.distance = function(otherBody) {
        //uses the distance formula.
        return Math.sqrt((this.x-otherBody.x)*(this.x-otherBody.x) + (this.y-otherBody.y)*(this.y-otherBody.y));
    };
    
    //this method calculates the hypothetical distance to another body. uses shouldX and shouldY
    this.shouldDistance = function(otherBody) {
        return Math.sqrt((this.shouldX-otherBody.shouldX)*(this.shouldX-otherBody.shouldX) + (this.shouldY-otherBody.shouldY)*(this.shouldY-otherBody.shouldY));
    }
    
    //array of objects to move when sun moves
    this.setMoveWith = function(moveWith) {
        this.moveWith=moveWith;
    }
    
    //run changes on screen made by setting x and y. only call once per frame
    this.runChanges = function() {
        var newX = this.x/METERS_PER_PIXEL+xOffset;
        var newY = this.y/METERS_PER_PIXEL+yOffset;
        var xChange = newX-this.view.position.x;
        var yChange = newY-this.view.position.y;
        this.view.position.x+=xChange;
        this.view.position.y+=yChange;
        if (this.moveWith) {
            for (i in this.moveWith) {
                this.moveWith[i].position.x+=xChange;
                this.moveWith[i].position.y+=yChange;
            }
        }
    }
    
    //change mass and, by extension, radius.
    this.setMass = function(mass1) {
        this.m=mass1;
        var rad = radiusForMass(mass1);
        this.view.scale.set(rad, rad, rad);
    }
    
    //set initial mass and position
    this.setMass(mass);
    
    //in meters
    this.x=x;
    this.y=y;
    
    this.shouldX = x;//where object should be, as if equations were correct
    this.shouldY = y;
    
    this.runChanges();
    
    //calculates gravitational potential energy between this and otherBody. DO NOT also calculate the gravitational potential energy between otherBody and this (do not do sun.gpe(planet)+planet.gpe(sun)). There is only one gpe between two Bodies.
    this.gpe = function(otherBody) {
        //distance between bodies.
        var r = this.distance(otherBody);
        //U=-G*m*M/r
        return -this.G*this.m*otherBody.m/r;
    }
    
    //calculates kinetic energy of Body.
    this.ke = function() {
        //calculate magnitude of velocity
        var v = Math.sqrt(this.vx*this.vx+this.vy*this.vy);
        //KE = mv^2/2
        return this.m*v*v/2.0
    }
    
    //moves a body for a given timestep with relation to another body.
    this.move = function(otherBody, timestep) {
        //distance between
        var r = this.distance(otherBody);
        //only continue if not overlapping return 0. otherwise return -1.
        if (r>((this.view.scale.x+otherBody.view.scale.x)*METERS_PER_PIXEL)) {//not overlapping
            var f;
            if (equationIsKnownCorrect()) {
                f = this.G*this.m*otherBody.m/(r*r);
            } else {
                f = evaluateExpression(equation, {"G":this.G, "m":this.m, "M":otherBody.m, "r":r});
            }
            
            //now account for angle of force
            var fx = f/r * (otherBody.x-this.x);//force x is proportional to x difference.
            var fy = f/r * (otherBody.y-this.y);//force y is proportional to y difference.
            //F=ma
            var ax = fx/this.m;
            var ay = fy/this.m;
            //change position and velocity
            this.x += this.vx*timestep + ax*timestep*timestep/2;
            this.y += this.vy*timestep + ay*timestep*timestep/2;
            this.vx += ax*timestep;
            this.vy += ay*timestep;
            //sun is at 0, 0 (assume). move will not get called on sun, and if it does, orbit will not be complete
            if (!periapsis || Math.sqrt(periapsis[0]*periapsis[0]+periapsis[1]*periapsis[1])>Math.sqrt(this.x*this.x+this.y*this.y)) {
                periapsis = [this.x, this.y];
            }
            if (Math.sqrt(apoapsis[0]*apoapsis[0]+apoapsis[1]*apoapsis[1])<Math.sqrt(this.x*this.x+this.y*this.y)) {
                apoapsis = [this.x, this.y];
            }
            
            //as if equation was correct, calculate new values
            r = this.shouldDistance(otherBody);
            f = this.G*this.m*otherBody.m/(r*r);
            //now account for angle of force
            fx = f/r * (otherBody.shouldX-this.shouldX);//force x is proportional to x difference.
            fy = f/r * (otherBody.shouldY-this.shouldY);//force y is proportional to y difference.
            //F=ma
            ax = fx/this.m;
            ay = fy/this.m;
            //change position and velocity
            this.shouldX += this.shouldVx*timestep + ax*timestep*timestep/2;
            this.shouldY += this.shouldVy*timestep + ay*timestep*timestep/2;
            this.shouldVx += ax*timestep;
            this.shouldVy += ay*timestep;
            
            return 0;
        } else {
            return -1;
        }
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
        copy.t=timeElapsed;
        //add to screen
        scene.add(copy);
        meshes.push(copy);
        this.copies.push(copy);
        
        //add to data table.
        document.getElementById("datatable").innerHTML+="<tr><td>"+timeElapsed.toPrecision(3)+"</td><td>("+this.x.toPrecision(3)+", "+this.y.toPrecision(3)+")</td><td>("+this.vx.toPrecision(3)+", "+this.vy.toPrecision(3)+")</td></tr>";
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
        document.getElementById("datatable").innerHTML="<tr><td>Time (s)</td><td>Position (m)</td><td>Velocity (m/s)</td></tr>";
    }
}

//calculates the energy of all bodies. kinetic energy and gpe between bodies.
var calculateEnergy = function(bodies) {
    var totalEnergy = 0;
    //add kinetic energies of all bodies
    for (bodyindex in bodies) {
        totalEnergy+=bodies[bodyindex].ke();
    }
    //add gravitational potential energies between all pairs of bodies.
    var pairsCalculated = {};
    for (bodyindex1 in bodies) {
        var body1 = bodies[bodyindex1];
        for (bodyindex2 in bodies) {
            if (bodyindex1!=bodyindex2) {
                var body2 = bodies[bodyindex2];
                //if pair of bodies has not already been calculated
                if (pairsCalculated[bodyindex1]!=bodyindex2) {
                    pairsCalculated[bodyindex2]=bodyindex1;//when continue searching for pairs, don't do this one again.
                    //gravitational potential energy
                    totalEnergy+=bodies[bodyindex1].gpe(bodies[bodyindex2]);
                }
            }
        }
    }
    return totalEnergy;
}

//create sun and planet.
//Body(mass, x, y, color1, segments, textureName)
var sun = new Body(10000, 0, 0, 0xffff00, 100, "sun.jpg", sunLights);
var planet = new Body(100, 100, 0, 0x0000ff, 30, 'earth.jpg');
//rotate planet north-pole-up
planet.view.rotation.x=Math.PI/2;

//store for moving when sun moves
var sunLights = new Array();

//function to create a point light. I will make point lights all around the sun.
function makePointLight(x, y, z) {
    var pointLight =
    new THREE.PointLight(0xFFFFFF);//white light.
    
    // set its position
    pointLight.position.x = x+xOffset;
    pointLight.position.y = y+yOffset;
    pointLight.position.z = z+zOffset;
    
    pointLight.intensity=.3;
    
    // add to the scene
    scene.add(pointLight);
    meshes.push(pointLight);
    sunLights.push(pointLight);
}

//create lights all around the sun. This makes it look like the sun is lit up. At the center of the sun the light does not actually alluminate the sun. This alluminates the sun and the planet but creates a tic-tac-toe pattern on the sun.
var radius = sun.view.scale.x+40;
makePointLight(0, radius, 0);
makePointLight(0, -radius, 0);
makePointLight(0, 0, radius);
makePointLight(0, 0, -radius);
makePointLight(-radius, 0, 0);
makePointLight(radius, 0, 0);

sun.setMoveWith(sunLights);

// create an ambient light to see the dark side of the planet.
var ambientLight = new THREE.AmbientLight(0x999999);
scene.add(ambientLight);

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
var axisColor = 0xffffff;
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


var GRIDCOUNT = 30;
var horizontalGrids = [];
var verticalGrids = [];
for (var i=0; i<GRIDCOUNT; i++) {
    verticalGrids.push(makeCylinder(.9, .9, 50, 0, 0, sun.view.position.z, 0, 0, 0, 0x555555));
    horizontalGrids.push(makeCylinder(.9, .9, 50, 0, 0, sun.view.position.z, 0, 0, Math.PI/2, 0x555555));
}
//coord system goes to min and max of size in x and y
//call when grid display should change

//define it up here to start with a grid
var panFactor=1;
//text
var xScaleText = makeText("60", 10, 1, xArrow.position.x-5, 5, 0, 0xffffff);
var yScaleText = makeText("60", 10, 1, 5, yArrow.position.y-5, 0, 0xffffff);

function drawGrid(gridIncrement) {
    if (xScaleText) {
        scene.remove(xScaleText)
        scene.remove(yScaleText);
    }
    
    var textSize = gridIncrement/2;
    xScaleText = makeText(gridIncrement*3+"", textSize, 1, xOffset+gridIncrement*3/METERS_PER_PIXEL-10, yOffset-5-textSize, xArrow.position.z+5, 0xffffff);
    yScaleText = makeText(gridIncrement*3+"", textSize, 1, xOffset+5, yOffset+gridIncrement*3/METERS_PER_PIXEL-textSize/2, yArrow.position.z+5, 0xffffff);
    
    var gridSize=gridIncrement*GRIDCOUNT/2;
    var i=0;
    for (var x=-gridSize; x<=gridSize; x+=gridIncrement) {
        var grid = verticalGrids[i];
        if (grid) {
            grid.position.z=sun.view.position.z;
            grid.position.x=x/METERS_PER_PIXEL+xOffset;
            grid.position.y=yOffset;
            grid.scale.y=gridSize/METERS_PER_PIXEL*2;
            //width of grid should be the same always
            grid.scale.z=panFactor;
            grid.scale.x=panFactor;
        }
        
        i+=1;
    }
    var i=0;
    for (var y=-gridSize; y<=gridSize; y+=gridIncrement) {
        var grid = horizontalGrids[i];
        if (grid) {
            grid.position.z=sun.view.position.z;
            grid.position.x=xOffset;
            grid.position.y=y/METERS_PER_PIXEL+yOffset;
            grid.scale.y=gridSize/METERS_PER_PIXEL*2;
            grid.scale.x=panFactor;
            grid.scale.z=panFactor;
        }
        
        i++;
    }
}

drawGrid(20);


//this variable is a boolean storing the state of the simulation.
var paused = true;

var totalElapsedTime = 0;//seconds in simulation units

//reset the orbit. this gets called from start as well as Reset button.
function resetOrbit() {
    periapsis=undefined;
    apoapsis = [0, 0];
    scene.remove(storedEllipse);
    //move sun back to origin
    sun.x=0;
    sun.y=0;
    sun.vx=0;
    sun.vy=0;
    sun.shouldX=0;
    sun.shouldY=0;
    sun.shouldVx=0;
    sun.shouldVy=0;
    
    //set planet initial conditions according to inputs.
    planet.setMass(numFromUI('planetmass'));
    planet.vx = numFromUI('vx');
    planet.vy = numFromUI('vy');
    planet.shouldVx=planet.vx;
    planet.shouldVy=planet.vy;
    planet.x = numFromUI('x');
    planet.y = numFromUI('y');
    planet.shouldX=planet.x;
    planet.shouldY=planet.y;
    
    sun.runChanges();
    planet.runChanges();
    
    //reset time and frame counters
    totalElapsedTime=0;
    drawnFrameIndex=0;
    
    //have not started; paused. change buttons accordingly
    started=false;
    paused=true;
    document.getElementById("start").disabled = false;
    document.getElementById("start").value = " Start ";
    document.getElementById("reset").disabled= true;
    document.getElementById("drawEllipse").disabled = true;
    
    //don't display any images or image data.
    planet.removeAllCopies();
    sun.removeAllCopies();
    scene.remove(selectedTexts.pos);
    scene.remove(selectedTexts.vel);
    scene.remove(selectedTexts.time);
}

var storedEllipse;

function displayEllipse() {
    //r=a(1-e^2)/(1-ecos(theta-phi))
    var x2 = Math.sqrt(apoapsis[0]*apoapsis[0]+apoapsis[1]*apoapsis[1]);
    var x1 = Math.sqrt(periapsis[0]*periapsis[0]+periapsis[1]*periapsis[1]);
    var a = (x2+x1)/2.;
    var c = (x2-x1)/2.;
    console.log(apoapsis[0]+", "+apoapsis[1]);
    console.log(periapsis[0]+", "+periapsis[1]);
    var e = c/a;
    var phi = Math.atan2(apoapsis[1], apoapsis[0]);
    var r = function(theta) {
        return a*(1-e*e)/(1-e*Math.cos(theta-phi));
    }
    var xy = function(theta) {
        var rt = r(theta);
        return [rt*Math.cos(theta), rt*Math.sin(theta)];
    }
    var material = new THREE.LineBasicMaterial({color: 0xffffff});
    var geometry = new THREE.Geometry();
    for (var t=0; t<=2*Math.PI; t+=.01) {
        var coord = xy(t);
        console.log("("+coord[0]+", "+coord[1]+")");
        geometry.vertices.push(new THREE.Vector3(coord[0]/METERS_PER_PIXEL+xOffset, coord[1]/METERS_PER_PIXEL+yOffset, planet.view.position.z));
    }
    var line = new THREE.Line(geometry, material);
    scene.add(line);
    meshes.push(line);
    storedEllipse=line;
    document.getElementById("drawEllipse").disabled = true;
}

var timePerFrame = .2;//this is the speed of the simulation. it is directly proportional to the error
var timeBetweenFrames = .03;//to leave the processor idle for a while
var highCalculationsPerFrame = 100000;//this is the accuracy of the simulation. it is inversely proportional to the error. This is a really big number. make sure nothing within a loop of this size is doing much.
var lowCalculationsPerFrame = 1000;//when the equation isn't known to be correct, calculations are very inefficient

//start off with 0J of energy.
var startEnergy = 0;

//start at frame 0 with 3 frames per image
var drawnFrameIndex = 0;
var framesPerCopyDrop = 3;
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

//start off with an anchored sun. Unchecking this box can be really cool.
document.getElementById("anchorsun").checked=true;
var movesun=false;

function Draw()
{
	if (paused==false) {//if playing, change UI
        
        //drop image if frame counter is a multiple of framespercopydrop.
        if (drawnFrameIndex%framesPerCopyDrop==0) {
            planet.dropCopy(totalElapsedTime);
        }
        
        //get initial x and y to check if planet is back where it started.
        var x = numFromUI('x');
        var y = numFromUI('y');
        function closeEnough() {
            return x<planet.x+0.1 && x>planet.x-0.1 && y<planet.y+0.1 && y>planet.y-0.1;
        }
        
        //run this calculation loop many times.
        var count = lowCalculationsPerFrame;
        if (equationIsKnownCorrect()) count=highCalculationsPerFrame;
        for (var calculation=0; calculation<count; calculation++) {
            totalElapsedTime += timePerFrame/count;//increment time a tiny bit.
            
            //move planet due to sun's gravity. planet.move will be -1 if it crashed into the sun. If the simulation's been running for a while, check to see if the planet has completed an orbit. If either of these happened, stop.
            if (planet.move(sun, timePerFrame/count) || (drawnFrameIndex>10 && closeEnough())) {
                //stop now
                planet.runChanges();
                planet.dropCopy(totalElapsedTime);
                paused=true;
                document.getElementById("start").disabled = true;
                document.getElementById("start").value = " Start ";
                document.getElementById("drawEllipse").disabled = false;
                break;
            }
            if (movesun) sun.move(planet, timePerFrame/count);
        }
        planet.runChanges();
        sun.runChanges();
        //totalElapsedTime+=timePerFrame;
        var currentEnergy = calculateEnergy(new Array(sun, planet));
        //log calculated error
        console.log("error:"+Math.abs(currentEnergy-startEnergy)+"J. Total NRG:"+currentEnergy+"J. Percent:"+((currentEnergy-startEnergy)/startEnergy)*100+"%.");
        
        drawnFrameIndex++;
	}
    //rotate planet and sun slowly.
    planet.view.rotation.y+=.01;
    sun.view.rotation.y-=.001;
    
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
	
	// draw THREE.JS scene
    renderer.render(scene, camera);
    //controls.update();
    
	// loop the draw() function after some time
	window.setTimeout( "requestAnimationFrame(Draw)" , timeBetweenFrames*1000) ;
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
    if (!stringFromUI('x').length||!stringFromUI('y').length) { // if coordinate is not entered (length of either is zero), alert and nothing else.
        alert("Please input coordinates");
    } else if (!stringFromUI('vx').length||!stringFromUI('vy').length) {// if velocity is not entered (length of either is zero), ask for it
        alert("Please input velocity");
    } else if (!stringFromUI('equation').length) {
        alert("Please input equation");
    } else {
        //allow reset
        document.getElementById('reset').disabled=false;
        if (!started) {
            // not started yet. load from ui (checkbox and text inputs)
            movesun = !document.getElementById("anchorsun").checked;
            planet.setMass(numFromUI('planetmass'));
            planet.vx = numFromUI('vx');
            planet.vy = numFromUI('vy');
            planet.shouldVx=planet.vx;
            planet.shouldVy=planet.vy;
            planet.x = numFromUI('x');
            planet.y = numFromUI('y');
            planet.shouldX=planet.x;
            planet.shouldY=planet.y;
            equation = stringFromUI('equation');
            planet.runChanges();
            startEnergy=calculateEnergy(new Array(sun, planet));//calculate starting energy.
            started=true;
        }
        paused = !paused;//flip pause
        //change button text
        if (paused) {
            document.getElementById("start").value = " Play  ";
        } else {
            document.getElementById("start").value = "Pause";
        }
        
        //after 2 seconds check equations
        window.setTimeout("checkEquation();", 2*1000);
    }
    
}

//just checks equation.
//uses shouldX, shouldY etc. from Bodies to check if equation is correct
function checkEquation() {
    
    //error
    var allowedXError = 0.1;
    var allowedYError = 0.1;
    var allowedVXError = 0.1;
    var allowedVYError = 0.1;
    var error = "Equation is incorrect";
    if (Math.abs(planet.shouldX-planet.x)>allowedXError) {
        alert(error);
    } else if (Math.abs(planet.shouldY-planet.y)>allowedYError) {
        alert(error);
    } else if (Math.abs(planet.shouldVx-planet.vx)>allowedVXError) {
        alert(error);
    } else if (Math.abs(planet.shouldVy-planet.vy)>allowedVYError) {
        alert(error);
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
var planetMaterial = planet.view.material;
var selectedMaterial=new THREE.MeshPhongMaterial({color:0xffffff,ambient:0xffffff});
var selectedTexts=new Object();
var INFO_SIZE = 7;

//respond to clicks by looking for image at click
var projector = new THREE.Projector();
//view-source:http://mrdoob.github.io/three.js/examples/canvas_interactive_cubes.html
function onDocumentMouseDown( event ) {
    
    var clickableObjects = planet.copies.slice(0);
    //clickableObjects.push(planet.view);
    
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
            selectedGhost.material=planetMaterial;
            selectedGhost=undefined;
        } else {
            //clicked on new image
            if (selectedGhost) {
                //reset material on selected.
                selectedGhost.material=planetMaterial;
            }
            selectedGhost=intersects[0].object;
            selectedGhost.material=selectedMaterial;
            
            console.log("clicked on ghost x:"+selectedGhost.x+" y:"+selectedGhost.y+" t:"+selectedGhost.t);
            
            //set info in imageview (top right)
            document.getElementById('coordinates').innerHTML="("+selectedGhost.x.toPrecision(4)+", "+selectedGhost.y.toPrecision(4)+")";
            document.getElementById('velocity').innerHTML="("+selectedGhost.vx.toPrecision(4)+", "+selectedGhost.vy.toPrecision(4)+")";
            document.getElementById('time').innerHTML=selectedGhost.t.toPrecision(4);
            
            //display info.
            selectedTexts.pos = makeText("(x,y): ("+selectedGhost.x.toPrecision(4)+", "+selectedGhost.y.toPrecision(4)+") m", INFO_SIZE, .5, selectedGhost.position.x+10, selectedGhost.position.y+12, selectedGhost.position.z, 0xffffff);
            
            selectedTexts.vel = makeText("v: ("+selectedGhost.vx.toPrecision(4)+", "+selectedGhost.vy.toPrecision(4)+") m/s", INFO_SIZE, .5, selectedGhost.position.x+10, selectedGhost.position.y, selectedGhost.position.z, 0xffffff);
            
            selectedTexts.time=makeText("t: "+selectedGhost.t.toPrecision(4)+" s", INFO_SIZE, .5, selectedGhost.position.x+10, selectedGhost.position.y-12, selectedGhost.position.z, 0xffffff);
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

function calcGridIncrement() {
    //at panfactor 1, return 20
    //at panfactor .5, return 40
    //at panfactor 2, return 10
    var factor = Math.round(Math.log(panFactor)/Math.log(2));
    var roundedPanFactor = Math.pow(2, factor);
    return 20*roundedPanFactor;
}

function resetZ() {
    for (i in storedEllipse.geometry.vertices) {
        var vertex = storedEllipse.geometry.vertices[i];
        vertex.z=planet.view.position.z;
    }
}

//called every frame when button pressed
function zoomIn() {
    var prevGridIncrement = calcGridIncrement();
    panFactor/=SCALE_FACTOR;
    var allObjects = meshes;
    var cameraZ = camera.position.z;
    zOffset = cameraZ-distance;
    for (i in allObjects) {
        var currentZ = allObjects[i].position.z;
        var distance = cameraZ-currentZ;
        distance/=SCALE_FACTOR;
        allObjects[i].position.z=cameraZ-distance;
    }
    if (storedEllipse) {
        resetZ();
        console.log(planet.view.position.z+", "+storedEllipse.position.z);
    }
    
    //change grid scale?
    if (Math.abs(prevGridIncrement-calcGridIncrement())<.001) {
        console.log(panFactor);
        drawGrid(calcGridIncrement());
    }
}

function zoomOut() {
    var prevGridIncrement = calcGridIncrement();
    panFactor*=SCALE_FACTOR;
    var allObjects = meshes;
    var cameraZ = camera.position.z;
    zOffset = cameraZ-distance;
    for (i in allObjects) {
        var currentZ = allObjects[i].position.z;
        var distance = cameraZ-currentZ;
        distance*=SCALE_FACTOR;
        allObjects[i].position.z=cameraZ-distance;
    }
    if (storedEllipse) {
        resetZ();
        console.log(planet.view.position.z+", "+storedEllipse.position.z);
    }
    if (Math.abs(prevGridIncrement-calcGridIncrement())<.001) {
        console.log(panFactor);
        drawGrid(calcGridIncrement());
    }
}

function moveLeft() {
    var allObjects = meshes;
    xOffset-=DXDT*panFactor;
    for (i in allObjects) {
        allObjects[i].position.x-=DXDT*panFactor;
    }
    if (storedEllipse) {
        resetZ();
        console.log(planet.view.position.z+", "+storedEllipse.position.z);
    }
}

function moveRight() {
    var allObjects = meshes;
    xOffset+=DXDT*panFactor;
    for (i in allObjects) {
        allObjects[i].position.x+=DXDT*panFactor;
    }
    if (storedEllipse) {
        resetZ();
        console.log(planet.view.position.z+", "+storedEllipse.position.z);
    }
}

function moveUp() {
    var allObjects = meshes;
    yOffset+=DYDT*panFactor;
    for (i in allObjects) {
        allObjects[i].position.y+=DYDT*panFactor;
    }
    if (storedEllipse) {
        resetZ();
        console.log(planet.view.position.z+", "+storedEllipse.position.z);
    }
}

function moveDown() {
    var allObjects = meshes;
    yOffset-=DYDT*panFactor;
    for (i in allObjects) {
        allObjects[i].position.y-=DYDT*panFactor;
    }
    if (storedEllipse) {
        resetZ();
        console.log(planet.view.position.z+", "+storedEllipse.position.z);
    }
}

function printDataTable() {
    //from http://www.boutell.com/newfaq/creating/printpart.html
    var pw = window.open("about:blank", "_new");
    pw.document.open();
    var dataTableSite = "<html>\n" +
    "<head>\n" +
    "<title>Kepler Data Table</title>\n" +
    "<style>\n"+
    "#data {\n"+
    "width:100%;\n"+
    "}\n"+
    ".wide {\n"+
    "width:calc(100% - 120px);\n"+
    "}\n"+
    "@media print {.noPrint{display: none !important;}}\n"+
    "</style>\n"+
    "</head>\n" +
    "<body>\n" +
    "<h3><center>Kepler Data Table</center></h3>\n"+
    "<p class='noPrint'><input type='button' value='Print' onclick='window.print();' /></p>\n"+
    "Names: <input type='text' class='wide' placeholder='your names here' /><br />\n"+
    "Class: <select><option>1</option><option>2</option><option>3</option><option>4</option><option>5</option><option>6</option><option>7</option></select><!--<input type='text' class='wide' placeholder='class period here' />--><br />\n"+
    "Challenge: <select><option>1</option><option>2</option></select><!--<input type='text' class='wide' placeholder='challenge number here' />-->\n"+
    "<table border='2' id='data'>" + document.getElementById("datatable").innerHTML + "</table>\n" +
    "</body>\n" +
    "</html>\n";
    pw.document.write(dataTableSite);
    //pw.document.close();
}

function printGraphics() {
    //from http://www.boutell.com/newfaq/creating/printpart.html
    var pw = window.open("about:blank", "_new");
    pw.document.open();
    var graphicsSite = "<html>\n" +
    "<head>\n" +
    "<title>Kepler Graphics</title>\n" +
    "<style>\n"+
    "#data {\n"+
    "width:100%;\n"+
    "}\n"+
    "</style>\n"+
    "</head>\n" +
    "<body>\n" +
    "<h3><center>Kepler Graphics</center></h3>\n"+
    "Names: <input type='text' placeholder='your names here' /><br />\n"+
    "Class: <input type='text' placeholder='class period here' />\n"+
    "<div id='canvas' style='border:1px solid white;background:#000;width:100%;height:500px;'></div>\n" +
    "</body>\n" +
    "</html>\n";
    pw.document.write(graphicsSite);
}

//responds to clicks
container.addEventListener( 'mousedown', onDocumentMouseDown, false );
//start with disabled reset button
document.getElementById('reset').disabled=true;
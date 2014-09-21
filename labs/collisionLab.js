//for model interface, see beginning of collisionLabModel.js
//create initial shapes and change center of screen to origin
resetShapes(1);

var NAP_TIME = 1000/30.;//this is the frame rate. it should probably stay at around 30 frames per second
var TIME_PER_FRAME = .05;//this is the calculation time per frame
var CALCULATIONS_PER_FRAME = 8;//more calculations per frame = better simulation, but more calculation time

var paused=true;

//start/play/pause button clicked
function play() {
    paused=!paused;
    if (paused) {
        document.getElementById("start").value = "  Play ";
    } else {
        document.getElementById("start").value = "Pause";
    }
}

//storing whether adjustment buttons are being pressed.
var zoomingIn = false;
var zoomingOut= false;
var movingLeft= false;
var movingRight=false;
var movingUp=   false;
var movingDown= false;

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

var mouseIsDown = false;
var coordMoving = [0, 0];

function pointForTouch(event, obj) {
    return [(event.pageX-obj.offsetLeft-xOffset)/xScale,-(event.pageY-obj.offsetTop-yOffset)/yScale];
}

function mouseDownOnGraphics(event, obj) {
    mouseIsDown=true;
    coordMoving = pointForTouch(event, obj);
}

function mouseUpOnGraphics(event, obj) {
    mouseIsDown=false;
}

var ZOOM_FACTOR = .001;
function scroll(event, obj) {
    //wheeldelta is something like -3 or 3. -3 is down
    var factor = ZOOM_FACTOR*Math.abs(event.wheelDelta)+1;
    var panFactor = ZOOM_FACTOR;
    if (event.wheelDelta<0) {
        factor = 1./factor;
        panFactor=1./panFactor;
    }
    zoom(factor, panFactor, event.pageX-obj.offsetLeft,event.pageY-obj.offsetTop);
    gridChange();
    for (i in shapes) {
        shapes[i].draw();
    }
}

function mouseover(event, obj) {
    document.body.style.overflow="hidden";
}

function mouseout(event, obj) {
    document.body.style.overflow="auto";
}

function mouseMoveOnGraphics(event, obj) {
    if (mouseIsDown) {
        coordOnTopNow = pointForTouch(event, obj);
        xOffset+=(coordOnTopNow[0]-coordMoving[0])*xScale;
        yOffset-=(coordOnTopNow[1]-coordMoving[1])*yScale;
        gridChange();
        //reset all graphics with new position
        for (i in shapes) {
            shapes[i].draw();
        }
    }
}

//zoom by a certain amount. Change the pan factor by a different amount.
function zoom(scale, panChangeFactor, centerX, centerY) {
    if (!centerY && !centerX) {
        var centerX = document.getElementById("graphics").clientWidth/2;
        var centerY = document.getElementById("graphics").clientHeight/2;
    }
    
    yScale*=scale;
    xScale*=scale;
    var differenceX = xOffset-centerX;
    var differenceY = yOffset-centerY;
    var newDifX = scale*differenceX;
    var newDifY = scale*differenceY;
    xOffset = centerX + newDifX;
    yOffset = centerY + newDifY;
    panFactor*=panChangeFactor;
}
//calculate how far apart the x grid lines should be.
function calculatedIncrementX() {
    //use xScale to calculate grid increment
    //xScale 20: increment 10
    //xScale 40: increment 5
    var powerOf2 = Math.round(Math.log(xScale/20)/Math.log(2));
    var roundedScale = Math.pow(2, powerOf2);
    //roundedScale 1: increment 5
    //roundedScale 2: increment 10
    return 5/roundedScale;
}
//calculate how far apart the y grid lines should be
function calculatedIncrementY() {
    var powerOf2 = Math.round(Math.log(yScale/20)/Math.log(2));
    var roundedScale = Math.pow(2, powerOf2);
    return 5/roundedScale;
}
//change the grid to fit scale and offset
function gridChange() {
    resetGrid(calculatedIncrementX(), calculatedIncrementY());
}

var POSITION_SIGFIGS = 4;
var VELOCITY_SIGFIGS = 4;

//main draw function. repeats forever.
var elapsedTime=0;
function draw() {
    
    if (!paused) {
        //playing simulation
        //run calculations
        for (var i=0; i<CALCULATIONS_PER_FRAME; i++) {
            for (shapei in shapes) {
                shapes[shapei].move(TIME_PER_FRAME/CALCULATIONS_PER_FRAME,shapes);
            }
        }
        //for all shapes, display new information in table.
        for (shapei in shapes) {
            var shape = shapes[shapei];
            document.getElementById("px"+shapei).innerHTML=coordNumberOutput(shape.center.x, POSITION_SIGFIGS);
            document.getElementById("py"+shapei).innerHTML=coordNumberOutput(shape.center.y, POSITION_SIGFIGS);
            document.getElementById("Vx"+shapei).innerHTML=coordNumberOutput(shape.v.x, VELOCITY_SIGFIGS);
            document.getElementById("Vy"+shapei).innerHTML=coordNumberOutput(shape.v.y, VELOCITY_SIGFIGS);
            if (document.getElementById("aV"+shapei)) {
                //since these are in degrees and degrees/s, they won't be really big and tiny values won't matter
                document.getElementById("aV"+shapei).innerHTML=(shape.angularV*180./Math.PI).toFixed(1);
                document.getElementById("ac"+shapei).innerHTML=(shape.angle*180./Math.PI).toFixed(2);
            }
            
        }
        //time has passed.
        elapsedTime+=TIME_PER_FRAME;
    }
    
    //if buttons are being pressed, change origin or scale
    if (movingRight) {
        xOffset+=DXDT*NAP_TIME*panFactor;
        gridChange();
    }
    if (movingLeft) {
        xOffset-=DXDT*NAP_TIME*panFactor;
        gridChange();
    }
    if (movingUp) {
        yOffset-=DYDT*NAP_TIME*panFactor;
        gridChange();
    }
    if (movingDown) {
        yOffset+=DYDT*NAP_TIME*panFactor;
        gridChange();
    }
    if (zoomingIn) {
        zoom(SCALE_FACTOR, 1./PAN_FACTOR);
        gridChange();
    }
    if (zoomingOut) {
        zoom(1./SCALE_FACTOR, PAN_FACTOR);
        gridChange();
    }
    
    //draw all shapes. this could be called only when simulation is running, but then everything would have to be drawn whenever a shape is added, changed, or deleted.
    for (i in shapes) {
        shapes[i].draw();
    }
    
    //reset readouts for totals
    document.getElementById("momentum").innerHTML=momentum();
    document.getElementById("angular momentum").innerHTML=angularMomentum();
    document.getElementById("kinetic energy").innerHTML=kineticEnergy();
    document.getElementById('translational energy').innerHTML=translationalEnergy();
    document.getElementById("time").innerHTML=elapsedTime.toFixed(1);
    
    //repeat
    window.setTimeout("draw();", NAP_TIME);
}

//called on page load. starts the run loop
function Start() {
    draw();
}

//resets all graphics and simulation
function reset() {
    resetShapes();
    resetGrid();
    document.getElementById("start").value = " Start ";
    paused=true;
    elapsedTime=0;
    updateShapes();
}

//called from button. Not only resets shapes, but also resets origin to center.
function resetButton() {
    resetShapes(1);
    reset();
}

//create drop down of polygon choices.
polygonChoices = ["triangle", "square", "pentagon", "hexagon", "octagon", "star", "crescent", "cup", "star of david"];
var choicesHTML = "";
for (i in polygonChoices) {
    choicesHTML+="<option>"+polygonChoices[i]+"</option>";
}
document.getElementById("polygontype").innerHTML = choicesHTML;

var shapeInput = new ShapeInput(true);
//create a new shape to stop referencing a shape that's just been added.
//also, called from radio button circ to reset options when changed between Circle and Polygon
function changeShape() {
    shapeInput = new ShapeInput(document.getElementById("circ").checked);
    if (document.getElementById("circ").checked) {
        document.getElementById("r-text").innerHTML="Radius";
        document.getElementById("r-unit").innerHTML="m";
        document.getElementById("polygontype").hidden=true;
    } else {
        document.getElementById("r-text").innerHTML="Scale";
        document.getElementById("r-unit").innerHTML="x";
        document.getElementById("polygontype").hidden=false;
    }
}

changeShape();

//called from add shape button.
//creates a new shape based on inputs and adds it to the table
function addShape() {
    shapeInput.elasticity=parseFloat(document.getElementById("elasticity").value);
    shapeInput.mass = parseFloat(document.getElementById("mass").value);
    shapeInput.color = document.getElementById("color").value;
    shapeInput.size = parseFloat(document.getElementById('size').value);
    if (document.getElementById("circ").checked) {
    } else {
        shapeInput.shapeName = document.getElementById("polygontype").value;
    }
    shapeInput.display();
    changeShape();
    updateShapes();
}

//reset table of shapes
function updateShapes() {
    document.getElementById("shapesInput").innerHTML=shapesInputString();
}

//load shapes from string (from txt file)
function loadFromText(text) {
    loadText(text);
    reset();
    updateShapes();
}

//text to save into txt
function savableText() {
    return txt();
}

//when file has been chosen, use it.
function readFile(evt) {
    //Retrieve the first (and only!) File from the FileList object
    var f = evt.target.files[0];
    
    if (f) {
        var r = new FileReader();
        r.onload = function(e) {
            var contents = e.target.result;
            console.log(contents);
            loadFromText(contents);
        }
        r.readAsText(f);
    } else {
        alert("Failed to load file");
    }
}

//when chosen file changes, react
document.getElementById('fileinput').addEventListener('change', readFile, false);

//called from save button. This doesn't work amazingly. In chrome it downloads a file called collision.txt to the downloads folder. In safari it goes to a new page where you can do command-s and call it "*.txt" wherever you want to save it.
function save() {
    var blob = new Blob([savableText()], {type: "text/plain;charset=utf-8"});
    saveAs(blob, "collision.txt");
}

//coordinate system
var GRIDCOUNT = 16;//ten grid lines horizontal, ten vertical. must be even number
var pen = new jxPen(new jxColor("gray"), "1px");
horizantalGridLines = [];
verticalGridLines=[];
for (var n=0;n<GRIDCOUNT; n++) {
    horizantalGridLines.push( new jxLine(new jxPoint(undefined, undefined), new jxPoint(undefined, undefined), pen) );
    verticalGridLines.push( new jxLine(new jxPoint(undefined, undefined), new jxPoint(undefined, undefined), pen) );
}

function resetGrid(xIncrement, yIncrement) {
    
    var xSize = xIncrement*GRIDCOUNT/2;
    var ySize = yIncrement*GRIDCOUNT/2;
    var i=0;
    for (var x=-xSize; x<=xSize; x+=xIncrement) {
        var line = verticalGridLines[i];
        if (line) {
            line.fromPoint.x=x*xScale+xOffset;
            line.fromPoint.y=ySize*yScale+yOffset;
            line.toPoint.x=x*xScale+xOffset;
            line.toPoint.y=-ySize*yScale+yOffset;
            line.draw(canvas);
        }
        
        i++;
    }
    var i=0;
    for (var y=-ySize; y<=ySize; y+=yIncrement) {
        var line = horizantalGridLines[i];
        if (line) {
            line.fromPoint.x=xSize*xScale+xOffset;
            line.fromPoint.y=y*yScale+yOffset;
            line.toPoint.x=-xSize*xScale+xOffset;
            line.toPoint.y=y*yScale+yOffset;
            line.draw(canvas);
        }
        
        i++;
    }
}
resetGrid(5,5);
//grid lines should probably be labelled.
//for drawing text, do this:
//var text = new jxText(new jxPoint(75, 165), 'Welcome to jsDraw2DX!', font, penGreen, brushBlue, 347);
//text.draw(gr);

//for moving.
//SCALE_FACTOR is for zooming speed
var SCALE_FACTOR = 1.04;
//pan factor changes the speed of panning (when zoomed in, pan slower)
var PAN_FACTOR = 1.01;
//speed of moving
var DXDT = .1;
var DYDT = .1;
//pan factor is for how much to move.
//if zoomed out move faster.
var panFactor = 1;


#Functional Specs

**A bridge can be created and tested. A bridge consists of interconnected beams, which can be drawn and edited by the user on the canvas before being simulated, analyzed, and printed.**

###Bridge display
* Nodes (beam connection points) are displayed as circles
    * Nodes are black when stationary
    * Nodes are red when moving with a velocity greater than a certain constant
    * Nodes not created to be within a beam can only exist in integer coordinates on a grid of set size
* Beams are displayed as gray lines connecting nodes
    * Beam width ( sqrt(cross section area) ) is represented proportionally by line width
    * Above each beam is a number expressing the force exerted by the beam
        * Positive forces indicate tension (pulling)
        * Negative forces indicate compression (pushing)
        * Forces are black if entire bridge is stationary; otherwise, they are red
* Canvas is as big as possible for screen size

###Bridge creating and editing
* Drag to make beams
    * Drag to/from node
    * Drag to/from beam: insert node in beam
* Click on beam or node to select
    * Delete selected beam with delete key
    * Delete selected node and its connecting beams with delete key
    * Move selected node by dragging after selecting
* Nodes snap to visible grid

###Bridge simulating
* Buttons Play, Pause, and Reset above the simulation canvas are for controlling state and the flow of time
    * Begin simulation by pressing Play button
    * Pause/Resume simulation by pressing Pause button
    * While simulating or paused, no bridge parts can be manually created, moved, or deleted
    * Stop simulation and revert to editing mode by pressing Reset button
* Simulated bridge moves at a reasonable speed and reaches equilibrium quickly
* When a beam's compression or tension limit is exceeded, it disconnects from one of its nodes
* Variable hanging weight (in Newtons) is simulated from center node
* Left node is fixed in X and Y directions
* Right node is fixed in Y direction
    
###Bridge analyzing and printing
* The Analysis button opens a new page with analysis
* Each beam (identified with a numbered diagram) is listed with its width, length, mass, force, and strength
* An efficiency value for the entire bridge is clearly displayed
* The analysis page can be printed cleanly with Cmd-P.

##Customer Specs

* **Move nodes**
* Snap *to* grid
* Break beams when Tension Force > Tensile Strength * Cross Section Area
* Break beams when Compression Force > Compression Strength * Cross Section Area
* Custom thickness for each beam
* Printable schematic with all beams' force and strength
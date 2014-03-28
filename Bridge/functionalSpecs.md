#Functional Specs

* Nodes (beam connection points) are displayed as circles
    * Nodes are black when stationary
    * Nodes are red when moving with a velocity greater than a certain constant
* Beams are displayed as gray lines connecting nodes
    * Beam width ( sqrt(cross section area) ) is represented proportionally by line width
    * Above each beam is a number expressing the force exerted by the beam
        * Positive forces indicate tension (pulling)
        * Negative forces indicate compression (pushing)
        * Forces are black if entire bridge is stationary; otherwise, they are red
* Drag to make beams
    * Drag to/from node
    * Drag to/from beam: insert node
* Click on beam or node to select
    * Delete selected beam
    * Delete selected node and its connecting beams
    * Move selected node by dragging after selecting
* Variable hanging weight (in Newtons) is simulated from center node
* Left node is fixed in X and Y directions
* Right node is fixed in Y direction
* Buttons Play, Pause, and Reset above the simulation canvas are for controlling state and the flow of time
    * Begin simulation by pressing Play button
    * Pause/Resume simulation by pressing Pause button
    * While simulating or paused, no bridge parts can be manually created, moved, or deleted
    * Stop simulation and revert to editing mode by pressing Reset button

##Customer Specs

* **Move nodes**
* Snap to grid
* Break beams when Tension Force > Tensile Strength * Cross Section Area
* Break beams when Compression Force > Compression Strength * Cross Section Area
* Custom thickness for each beam
* Printable schematic with all beams' force and strength
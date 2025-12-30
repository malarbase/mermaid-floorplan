grammar Floorplans

// Entry rule - defines, config, floors, then connections
entry Floorplan:
    'floorplan' 
    defines+=DefineStatement*
    config=ConfigBlock?
    floors+=Floor* 
    connections+=Connection*;

// Variable definitions for dimensions
DefineStatement:
    'define' name=ID value=Dimension;

// Global configuration block
ConfigBlock:
    'config' '{' 
        properties+=ConfigProperty (',' properties+=ConfigProperty)* 
    '}';

ConfigProperty:
    name=CONFIG_KEY ':' value=NUMBER;

// Config property keys
CONFIG_KEY returns string:
    'wall_thickness' | 'floor_thickness' | 'default_height' |
    'door_width' | 'door_height' |
    'window_width' | 'window_height' | 'window_sill';

// Floor definition
Floor:
    'floor' id=ID ('height' height=NUMBER)? '{' 
        rooms+=Room*
    '}';

// Room definition
// Position can be explicit (at x,y) OR relative (right-of RoomA)
// Both can optionally be present, but at least one is required for rendering
// Size can be an inline dimension or a variable reference
Room:
    type=('room' | 'sub-room') name=ID 
    ('at' position=Coordinate)?
    'size' (size=Dimension | sizeRef=ID)
    ('height' height=NUMBER)?
    ('elevation' elevation=SIGNED_NUMBER)?
    'walls' walls=WallSpec
    relativePosition=RelativePosition?
    ('label' label=STRING)?
    ('composed' 'of' '[' subRooms+=Room* ']')?;

// Relative positioning - places room relative to another room
RelativePosition:
    direction=RelativeDirection reference=ID
    ('gap' gap=NUMBER)?
    ('align' alignment=AlignmentDirection)?;

// Relative direction keywords
RelativeDirection returns string:
    'right-of' | 'left-of' | 'above' | 'below' |
    'above-right-of' | 'above-left-of' | 'below-right-of' | 'below-left-of';

// Alignment options for relative positioning
AlignmentDirection returns string:
    'top' | 'bottom' | 'left' | 'right' | 'center';

// Wall specification
WallSpec:
    '[' specifications+=WallSpecification (',' specifications+=WallSpecification)* ']';

WallSpecification:
    direction=WallDirection ':' type=WallType 
    ('at' position=NUMBER unit=('%')?)?
    ('size' size=Dimension)?
    ('height' height=NUMBER)?;

// Connection statements  
Connection:
    'connect' from=WallReference 'to' to=WallReference 
    doorType=DoorType
    ('at' position=NUMBER '%')?
    ('door' 'opens' 'into' opensInto=RoomReference | 'opens' 'into' opensInto=RoomReference)?
    ('swing' ':' swing=SwingDirection)?;

// Wall reference (room.wall or just room)
WallReference:
    room=RoomReference ('.' wall=WallDirection)?;

// Room reference (can be room name or 'outside')
RoomReference:
    name=ID | 'outside';

// Coordinate (x,y)
Coordinate:
    '(' x=NUMBER ',' y=NUMBER ')';

// Dimension (width x height)  
Dimension:
    '(' width=NUMBER 'x' height=NUMBER ')';

// Wall directions
WallDirection returns string:
    'top' | 'right' | 'bottom' | 'left';

// Wall types
WallType returns string:
    'solid' | 'door' | 'window' | 'open';

// Door types
DoorType returns string:
    'door' | 'double-door';

// Swing directions
SwingDirection returns string:
    'left' | 'right';

// Terminal rules
terminal ID: /[_a-zA-Z][\w]*/;
terminal NUMBER returns number: /[0-9]+(\.[0-9]+)?/;
terminal SIGNED_NUMBER returns number: /-?[0-9]+(\.[0-9]+)?/;
terminal STRING: /"[^"]*"|'[^']*'/;

// Comments
hidden terminal WS: /\s+/;
hidden terminal ML_COMMENT: /\/\*[\s\S]*?\*\//;
hidden terminal SL_COMMENT: /#[^\r\n]*/;

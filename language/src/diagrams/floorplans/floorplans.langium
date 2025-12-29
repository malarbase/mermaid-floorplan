grammar Floorplans

// Entry rule
entry Floorplan:
    'floorplan' floors+=Floor* connections+=Connection*;

// Floor definition
Floor:
    'floor' id=ID '{' 
        rooms+=Room*
    '}';

// Room definition
// Position can be explicit (at x,y) OR relative (right-of RoomA)
// Both can optionally be present, but at least one is required for rendering
Room:
    type=('room' | 'sub-room') name=ID 
    ('at' position=Coordinate)?
    'size' size=Dimension 
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

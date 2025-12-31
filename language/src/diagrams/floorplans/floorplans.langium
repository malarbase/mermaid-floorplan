grammar Floorplans

// Entry rule - defines, styles, config, floors, then connections
entry Floorplan:
    'floorplan' 
    defines+=DefineStatement*
    styles+=StyleBlock*
    config=ConfigBlock?
    floors+=Floor* 
    connections+=Connection*;

// Style block for material definitions
StyleBlock:
    'style' name=ID '{' 
        properties+=StyleProperty (',' properties+=StyleProperty)* 
    '}';

StyleProperty:
    name=STYLE_KEY ':' (stringValue=STRING | numberValue=NUMBER);

// Style property keys
STYLE_KEY returns string:
    'floor_color' | 'wall_color' | 'floor_texture' | 'wall_texture' | 'roughness' | 'metalness';

// Variable definitions for dimensions
DefineStatement:
    'define' name=ID value=Dimension;

// Global configuration block
ConfigBlock:
    'config' '{' 
        properties+=ConfigProperty (',' properties+=ConfigProperty)* 
    '}';

ConfigProperty:
    name=CONFIG_KEY ':' (value=NUMBER | dimension=Dimension | styleRef=ID | unitRef=LENGTH_UNIT | areaUnitRef=AREA_UNIT);

// Config property keys - includes default_unit for specifying measurement unit
// door_size and window_size use Dimension type (width x height)
CONFIG_KEY returns string:
    'wall_thickness' | 'floor_thickness' | 'default_height' |
    'door_width' | 'door_height' | 'door_size' |
    'window_width' | 'window_height' | 'window_sill' | 'window_size' |
    'default_style' | 'default_unit' | 'area_unit';

// Length unit types for dimensions
LENGTH_UNIT returns string:
    'm' | 'ft' | 'cm' | 'in' | 'mm';

// Area unit types for metrics display
AREA_UNIT returns string:
    'sqft' | 'sqm';

// Value with optional unit (e.g., 10, 10m, 10ft)
ValueWithUnit:
    value=NUMBER unit=LENGTH_UNIT?;

// Floor definition
Floor:
    'floor' id=ID ('height' height=ValueWithUnit)? '{' 
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
    ('height' height=ValueWithUnit)?
    ('elevation' elevation=SignedValueWithUnit)?
    'walls' walls=WallSpec
    relativePosition=RelativePosition?
    ('label' label=STRING)?
    ('composed' 'of' '[' subRooms+=Room* ']')?
    ('style' styleRef=ID)?;

// Signed value with optional unit (for elevations which can be negative)
// Uses NUMBER for the magnitude and a separate negative flag
SignedValueWithUnit:
    negative?='-'? value=NUMBER unit=LENGTH_UNIT?;

// Relative positioning - places room relative to another room
RelativePosition:
    direction=RelativeDirection reference=ID
    ('gap' gap=ValueWithUnit)?
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
    ('size' size=ConnectionSize)?
    ('door' 'opens' 'into' opensInto=RoomReference | 'opens' 'into' opensInto=RoomReference)?
    ('swing' ':' swing=SwingDirection)?;

// Connection size (supports 'full' keyword for height)
ConnectionSize:
    '(' width=ValueWithUnit 'x' (height=ValueWithUnit | fullHeight?='full') ')';

// Wall reference (room.wall or just room)
WallReference:
    room=RoomReference ('.' wall=WallDirection)?;

// Room reference (can be room name or 'outside')
RoomReference:
    name=ID | 'outside';

// Coordinate (x,y) with optional units
Coordinate:
    '(' x=ValueWithUnit ',' y=ValueWithUnit ')';

// Dimension (width x height) with optional units
Dimension:
    '(' width=ValueWithUnit 'x' height=ValueWithUnit ')';

// Wall directions
WallDirection returns string:
    'top' | 'right' | 'bottom' | 'left';

// Wall types
WallType returns string:
    'solid' | 'door' | 'window' | 'open';

// Door types
// 'opening' creates a doorless passage (archway) between rooms
DoorType returns string:
    'door' | 'double-door' | 'opening';

// Swing directions
SwingDirection returns string:
    'left' | 'right';

// Terminal rules
terminal ID: /[_a-zA-Z][\w]*/;
terminal NUMBER returns number: /[0-9]+(\.[0-9]+)?/;
terminal STRING: /"[^"]*"|'[^']*'/;

// Comments
hidden terminal WS: /\s+/;
hidden terminal ML_COMMENT: /\/\*[\s\S]*?\*\//;
hidden terminal SL_COMMENT: /#[^\r\n]*/;

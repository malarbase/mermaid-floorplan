grammar Floorplans

// Entry rule - optional version declaration, then floorplan content
entry Floorplan:
    (frontmatter=YamlFrontmatter | versionDirective=VersionDirective)?
    'floorplan'
    defines+=DefineStatement*
    styles+=StyleBlock*
    config=ConfigBlock?
    floors+=Floor*
    connections+=Connection*
    verticalConnections+=VerticalConnection*;

// YAML frontmatter block (optional, at start of file)
YamlFrontmatter:
    '---'
    properties+=YamlProperty+
    '---';

YamlProperty:
    key=YamlKey ':' value=YamlValue;

YamlKey returns string:
    ID | 'version' | 'title' | 'description' | 'author';

YamlValue:
    stringValue=STRING | numberValue=NUMBER | boolValue=BOOLEAN | versionValue=VERSION_STRING;

// Inline version directive (alternative to frontmatter)
// Accepts both quoted strings ("1.0") and unquoted numbers (1.0)
VersionDirective:
    '%%{' 'version' ':' (version=VERSION_STRING | versionNumber=NUMBER) '}%%';

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
    name=CONFIG_KEY ':' (
        value=NUMBER | 
        dimension=Dimension | 
        styleRef=ID | 
        unitRef=LENGTH_UNIT | 
        areaUnitRef=AREA_UNIT |
        boolValue=BOOLEAN |
        stringValue=STRING |
        themeRef=THEME_NAME |
        stairCodeRef=STAIR_CODE
    );

// Stair building code options
STAIR_CODE returns string:
    'residential' | 'commercial' | 'ada' | 'none';

// Boolean values for config properties
BOOLEAN returns string:
    'true' | 'false';

// Theme name values
THEME_NAME returns string:
    'default' | 'dark' | 'blueprint';

// Config property keys - includes both snake_case (legacy) and camelCase (Mermaid-aligned)
// door_size and window_size use Dimension type (width x height)
CONFIG_KEY returns string:
    // Dimension properties (snake_case + camelCase)
    'wall_thickness' | 'wallThickness' |
    'floor_thickness' | 'floorThickness' |
    'default_height' | 'defaultHeight' |
    'door_width' | 'doorWidth' |
    'door_height' | 'doorHeight' |
    'door_size' | 'doorSize' |
    'window_width' | 'windowWidth' |
    'window_height' | 'windowHeight' |
    'window_sill' | 'windowSill' |
    'window_size' | 'windowSize' |
    // Style and unit properties
    'default_style' | 'defaultStyle' |
    'default_unit' | 'defaultUnit' |
    'area_unit' | 'areaUnit' |
    // Theme properties (Mermaid-aligned)
    'theme' |
    'darkMode' | 'dark_mode' |
    // Font properties (Mermaid-aligned)
    'fontFamily' | 'font_family' |
    'fontSize' | 'font_size' |
    // Display toggle properties
    'showLabels' | 'show_labels' |
    'showDimensions' | 'show_dimensions' |
    // Stair building code compliance
    'stair_code' | 'stairCode';

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
        stairs+=Stair*
        lifts+=Lift*
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

// ============================================================================
// Stair and Lift Elements
// ============================================================================

// Stair definition - vertical circulation via stairs
Stair:
    'stair' name=ID
    ('at' position=Coordinate)?
    'shape' shape=StairShape
    'rise' rise=ValueWithUnit
    ('width' width=ValueWithUnit)?
    ('riser' riser=ValueWithUnit)?
    ('tread' tread=ValueWithUnit)?
    ('nosing' nosing=ValueWithUnit)?
    ('headroom' headroom=ValueWithUnit)?
    ('handrail' '(' handrail=HandrailSpec ')')?
    ('stringers' stringers=StringerStyle)?
    ('material' material=StairMaterial)?
    relativePosition=RelativePosition?
    ('label' label=STRING)?
    ('style' styleRef=ID)?;

// Stair shape variants
StairShape:
    StraightStair | LShapedStair | UShapedStair | DoubleLStair | 
    SpiralStair | CurvedStair | WinderStair | SegmentedStair;

// Straight stair: single flight
interface StraightStair {
    shapeType: 'straight';
    direction: string;
}
StraightStair returns StraightStair:
    shapeType='straight' 'direction' direction=CompassDirection;

// L-shaped stair: two flights with one 90° turn
interface LShapedStair {
    shapeType: 'L-shaped';
    entry: string;
    turn: string;
    runs: number[];
    landing?: Dimension;
}
LShapedStair returns LShapedStair:
    shapeType='L-shaped' 'entry' entry=CompassDirection 'turn' turn=TurnDirection
    ('runs' runs+=NUMBER (',' runs+=NUMBER)+)?
    ('landing' landing=Dimension)?;

// U-shaped stair: two flights with one 180° turn (switchback)
interface UShapedStair {
    shapeType: 'U-shaped';
    entry: string;
    turn: string;
    runs: number[];
    landing?: Dimension;
}
UShapedStair returns UShapedStair:
    shapeType='U-shaped' 'entry' entry=CompassDirection 'turn' turn=TurnDirection
    ('runs' runs+=NUMBER (',' runs+=NUMBER)+)?
    ('landing' landing=Dimension)?;

// Double-L stair: three flights with two 90° turns
interface DoubleLStair {
    shapeType: 'double-L';
    entry: string;
    turn: string;
    runs: number[];
    landing?: Dimension;
}
DoubleLStair returns DoubleLStair:
    shapeType='double-L' 'entry' entry=CompassDirection 'turn' turn=TurnDirection
    ('runs' runs+=NUMBER (',' runs+=NUMBER (',' runs+=NUMBER)?)?)?
    ('landing' landing=Dimension)?;

// Spiral stair: helical stair around a center pole
interface SpiralStair {
    shapeType: 'spiral';
    rotation: string;
    innerRadius?: ValueWithUnit;
    outerRadius: ValueWithUnit;
}
SpiralStair returns SpiralStair:
    shapeType='spiral' 'rotation' rotation=RotationDirection
    ('inner-radius' innerRadius=ValueWithUnit)?
    'outer-radius' outerRadius=ValueWithUnit;

// Curved stair: arc-shaped stair (non-helical)
interface CurvedStair {
    shapeType: 'curved';
    entry: string;
    arc?: number;
    radius: ValueWithUnit;
}
CurvedStair returns CurvedStair:
    shapeType='curved' 'entry' entry=CompassDirection
    ('arc' arc=NUMBER '°')?
    'radius' radius=ValueWithUnit;

// Winder stair: stair with triangular winder treads at corners
interface WinderStair {
    shapeType: 'winder';
    entry: string;
    turn: string;
    winders: number;
    runs: number[];
}
WinderStair returns WinderStair:
    shapeType='winder' 'entry' entry=CompassDirection 'turn' turn=TurnDirection
    'winders' winders=NUMBER
    ('runs' runs+=NUMBER (',' runs+=NUMBER)+)?;

// Segmented stair: composable custom stair from flight/turn segments
interface SegmentedStair {
    shapeType: 'custom';
    entry: string;
    segments: StairSegment[];
}
SegmentedStair returns SegmentedStair:
    shapeType='custom' 'entry' entry=CompassDirection
    '[' segments+=StairSegment (',' segments+=StairSegment)* ']';

// Stair segment: either a flight or a turn
StairSegment:
    FlightSegment | TurnSegment;

// Flight segment: a run of steps
interface FlightSegment {
    segmentType: 'flight';
    steps: number;
    width?: ValueWithUnit;
    wallRef?: WallAlignmentRef;
}
FlightSegment returns FlightSegment:
    segmentType='flight' steps=NUMBER
    ('width' width=ValueWithUnit)?
    ('along' wallRef=WallAlignmentRef)?;

// Turn segment: a landing or winder turn
interface TurnSegment {
    segmentType: 'turn';
    direction: string;
    landing?: Dimension;
    winders?: number;
    angle?: number;
}
TurnSegment returns TurnSegment:
    segmentType='turn' direction=TurnDirection
    (('landing' landing=Dimension) | ('winders' winders=NUMBER))
    (angle=NUMBER '°')?;

// Wall alignment reference for perimeter stairs
WallAlignmentRef:
    room=ID '.' wall=WallDirection;

// Compass directions for stair orientation
CompassDirection returns string:
    'north' | 'south' | 'east' | 'west';

// Turn direction (left or right)
TurnDirection returns string:
    'left' | 'right';

// Rotation direction for spiral stairs
RotationDirection returns string:
    'clockwise' | 'counterclockwise';

// Handrail specification
HandrailSpec returns string:
    'left' | 'right' | 'both' | 'inner' | 'outer' | 'none';

// Stringer style (riser appearance)
StringerStyle returns string:
    'open' | 'closed' | 'glass';

// Stair material specification
StairMaterial:
    '{' properties+=StairMaterialProperty (',' properties+=StairMaterialProperty)* '}';

StairMaterialProperty:
    name=STAIR_MATERIAL_KEY ':' value=STRING;

STAIR_MATERIAL_KEY returns string:
    'tread' | 'riser' | 'stringer' | 'handrail';

// ============================================================================
// Lift (Elevator) Element
// ============================================================================

// Lift definition - elevator shaft
Lift:
    'lift' name=ID
    ('at' position=Coordinate)?
    'size' size=Dimension
    ('doors' '(' doors+=CompassDirection (',' doors+=CompassDirection)* ')')?
    relativePosition=RelativePosition?
    ('label' label=STRING)?
    ('style' styleRef=ID)?;

// ============================================================================
// Vertical Connection
// ============================================================================

// Vertical connection linking circulation elements across floors
VerticalConnection:
    'vertical' links+=VerticalLink ('to' links+=VerticalLink)+;

// Reference to a floor element (FloorName.ElementName)
VerticalLink:
    floor=ID '.' element=ID;

// Terminal rules
// VERSION_STRING only matches quoted version strings to avoid conflicts with NUMBER
terminal VERSION_STRING: /"[0-9]+\.[0-9]+(\.[0-9]+)?"/;
terminal ID: /[_a-zA-Z][\w]*/;
terminal NUMBER returns number: /[0-9]+(\.[0-9]+)?/;
terminal STRING: /"[^"]*"|'[^']*'/;

// Comments
hidden terminal WS: /\s+/;
hidden terminal ML_COMMENT: /\/\*[\s\S]*?\*\//;
hidden terminal SL_COMMENT: /#[^\r\n]*/;

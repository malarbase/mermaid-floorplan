# Patterns Library

Reusable layout fragments the agent can drop into a new floorplan
during authoring. Each pattern is a tiny composition of rooms and
connections, expressed in valid DSL, designed to be glued onto a
larger plan with the right `at` or `RelativePosition` clauses.

When generating a floorplan, prefer composing 1-2 patterns from this
library over inventing layout from scratch. Patterns here are
guaranteed to validate, render cleanly, and pass the design critic.

Conventions used below:

- 1 unit = 1 foot.
- All wall openings come from `connect` statements; walls between
  rooms are `solid` unless they're explicitly open-plan.
- Each pattern is anchored at `(0, 0)`. When dropping it into a
  larger plan, replace the anchor `at (0, 0)` with the desired
  position.

## Open-plan public zone (foyer + living + kitchen)

Use as the front of a 2BR/3BR apartment or small house. Single open
volume, kitchen on one end with a wet wall, living in the middle with
windows.

```text
room Foyer at (0,0) size (6 x 10) walls [top: solid, right: open, bottom: solid, left: solid] label "Entry"
room LivingRoom size (16 x 10) walls [top: window, right: open, bottom: solid, left: open] right-of Foyer align top label "Living"
room Kitchen   size (12 x 10) walls [top: window, right: solid, bottom: solid, left: open] right-of LivingRoom align top label "Kitchen"

connect Foyer.top to outside door at 50%
```

## Hallway backbone (4-door horizontal hall)

Use to thread bedrooms / baths off a single corridor.

```text
room Hall size (28 x 4) walls [top: solid, right: solid, bottom: solid, left: solid] label "Hall"

# Wire connect statements from Hall.bottom to each bedroom/bath:
# connect Hall.bottom to Bedroom1.top door at 15%
# connect Hall.bottom to Bath.top      door at 40%
# connect Hall.bottom to Bedroom2.top  door at 65%
# connect Hall.bottom to MasterBR.top  door at 90%
```

## Master suite cluster

Master bedroom + ensuite + walk-in closet. Designed to anchor at one
corner of the private zone. Wet wall is on the right.

```text
room MasterBedroom at (0,0) size (14 x 14) walls [top: solid, right: solid, bottom: window, left: solid] label "Master"
room MasterCloset size (4 x 6) walls [top: solid, right: solid, bottom: solid, left: solid] right-of MasterBedroom align top label "WIC"
room MasterBath size (10 x 8) walls [top: solid, right: window, bottom: solid, left: solid] below MasterCloset align right label "Ensuite"

connect MasterBedroom.right to MasterCloset.left door at 50%
connect MasterBedroom.right to MasterBath.left door at 80%
```

## Galley kitchen

Compact kitchen, two parallel counters, single entry. Position next to
a dining or living room.

```text
room Kitchen at (0,0) size (10 x 8) walls [top: window, right: solid, bottom: open, left: solid] label "Kitchen"

# Pair with: connect Kitchen.bottom to Dining.top opening at 50%
```

## L-shaped kitchen with island

Use when the brief calls for an open-plan family kitchen.

```text
room Kitchen at (0,0) size (14 x 12) walls [top: window, right: solid, bottom: open, left: solid] label "Kitchen"

# The island is implied by leaving an open wall toward dining/living.
# Pair with: connect Kitchen.bottom to Dining.top opening at 50%
```

## Half bath off the entry

Compact powder room near the foyer. Plumbing wall on the left.

```text
room PowderRoom at (0,0) size (4 x 6) walls [top: solid, right: solid, bottom: solid, left: solid] label "WC"

# Wire from a hall: connect Hall.right to PowderRoom.left door at 50%
```

## Stacked bedrooms

Two bedrooms sharing a wall, both with exterior windows on opposite
sides.

```text
room Bedroom1 at (0,0) size (12 x 12) walls [top: solid, right: solid, bottom: window, left: window] label "Bedroom 1"
room Bedroom2 size (12 x 12) walls [top: window, right: window, bottom: solid, left: solid] above Bedroom1 align left label "Bedroom 2"
```

## Hotel suite

Single-room suite with vestibule, sleeping area, and ensuite. Sized
for a typical four-star hotel.

```text
room SuiteEntry at (0,0) size (4 x 8) walls [top: door, right: open, bottom: solid, left: solid] label "Entry"
room Bedroom size (14 x 14) walls [top: window, right: solid, bottom: solid, left: open] right-of SuiteEntry align top label "Bedroom"
room Bath size (8 x 10) walls [top: solid, right: solid, bottom: solid, left: solid] below SuiteEntry align left label "Bath"

connect SuiteEntry.top to outside door at 50%
connect SuiteEntry.bottom to Bath.top door at 50%
```

## Retail shop with back of house

Sales floor on the public side, stock room and staff WC at the back.

```text
room SalesFloor at (0,0) size (24 x 30) walls [top: window, right: window, bottom: solid, left: window] label "Sales"
room StockRoom size (12 x 12) walls [top: solid, right: solid, bottom: solid, left: solid] below SalesFloor align right label "Stock"
room StaffWC size (4 x 6) walls [top: solid, right: solid, bottom: solid, left: solid] left-of StockRoom align top label "Staff WC"
room BackHall size (24 x 4) walls [top: solid, right: solid, bottom: door, left: solid] below StaffWC align left label "Back"

connect SalesFloor.bottom to BackHall.top opening at 50%
connect BackHall.right to StockRoom.left door at 50%
connect BackHall.left to StaffWC.right door at 50%
connect SalesFloor.top to outside door at 50%
connect BackHall.bottom to outside door at 50%
```

## Office bullpen with private offices

Open bullpen flanked by perimeter offices and a meeting room.

```text
room Bullpen at (0,0) size (24 x 18) walls [top: window, right: open, bottom: solid, left: solid] label "Bullpen"
room Office1 size (12 x 12) walls [top: window, right: solid, bottom: solid, left: solid] right-of Bullpen align top label "Office 1"
room Office2 size (12 x 12) walls [top: solid, right: solid, bottom: window, left: solid] below Office1 align right label "Office 2"
room MeetingRoom size (12 x 14) walls [top: solid, right: solid, bottom: window, left: solid] below Bullpen align left label "Meeting"

connect Bullpen.right to Office1.left door at 30%
connect Bullpen.right to Office2.left door at 70%
connect Bullpen.bottom to MeetingRoom.top door at 50%
```

## Multi-floor stair core

Drop into each floor's `floor` block. Stack identically across floors
and link with a `vertical` statement.

```text
floor GroundFloor {
  room StairCore at (0,0) size (12 x 16) walls [top: solid, right: solid, bottom: solid, left: solid] label "Stair Core"
  stair MainStair at (1, 1) shape U-shaped from bottom turn left runs 8,8 landing (4ft x 4ft) rise 10ft width 4ft handrail (both)
  lift MainElevator at (8, 2) size (5 x 5) doors (bottom) label "Elevator"
}

floor FirstFloor {
  room StairCore at (0,0) size (12 x 16) walls [top: solid, right: solid, bottom: solid, left: solid] label "Stair Core"
  stair MainStair at (1, 1) shape U-shaped from bottom turn left runs 8,8 landing (4ft x 4ft) rise 10ft width 4ft
  lift MainElevator at (8, 2) size (5 x 5) doors (bottom)
}

vertical GroundFloor.MainStair to FirstFloor.MainStair
vertical GroundFloor.MainElevator to FirstFloor.MainElevator
```

## How to compose patterns

1. Pick a "skeleton" pattern (open-plan public zone, hallway backbone,
   stair core).
2. Anchor it at `(0, 0)`.
3. Append additional patterns using `at (x, y)` if you want strict
   control, or `RelativePosition` clauses for flexibility.
4. Add `connect` statements that wire pattern boundaries together.
5. Run `node scripts/validate.mjs` and then `node scripts/design_critic.mjs`.

When in doubt, use the `two-br.floorplan` template as the canonical
example of how patterns combine.

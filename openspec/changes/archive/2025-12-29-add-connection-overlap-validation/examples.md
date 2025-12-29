# Connection Overlap Examples

This document illustrates the connection overlap issue and how the validation will address it.

## Example 1: Bidirectional Connection Overlap

**Current Behavior (INVALID):**
```
floorplan
  floor f1 {
    room Office at (0,0) size (10 x 10) walls [top: solid, right: solid, bottom: solid, left: solid]
    room Kitchen at (10,0) size (10 x 10) walls [top: solid, right: solid, bottom: solid, left: solid]
  }
  
  # Both connections reference the same shared wall
  connect Office.right to Kitchen.left door at 50%
  connect Kitchen.left to Office.right door at 50%
```

**Problem:** Both statements attempt to render a door at the same physical location (the shared wall between Office and Kitchen at 50%).

**Expected Error:** 
```
Error: Overlapping bidirectional connections detected
  Line 8: connect Office.right to Kitchen.left door at 50%
  Line 9: connect Kitchen.left to Office.right door at 50%
  
Both connections render doors at the same position on the shared wall between Office and Kitchen.
Suggestion: Remove one of the connections (only one is needed).
```

## Example 2: Multiple Connections on Same Wall at Same Position

**Current Behavior (INVALID):**
```
floorplan
  floor f1 {
    room Lobby at (0,0) size (13 x 10) walls [top: solid, right: solid, bottom: solid, left: solid]
    room StairLift at (13,0) size (8 x 10) walls [top: solid, right: solid, bottom: solid, left: solid]
    room Terrace at (13,10) size (8 x 20) walls [top: solid, right: solid, bottom: solid, left: solid]
  }
  
  # Lobby.right wall has two different connections at 50%
  connect StairLift.left to Lobby.right door at 50%
  connect Lobby.right to Terrace.left double-door at 50%
```

**Problem:** Lobby.right wall is referenced twice at the same position (50%), attempting to render two different doors.

**Expected Error:**
```
Error: Multiple connections on same wall at overlapping positions
  Line 8: connect StairLift.left to Lobby.right door at 50%
  Line 9: connect Lobby.right to Terrace.left double-door at 50%

Both connections reference Lobby.right wall at position 50%.
Suggestion: Use different position percentages (e.g., 30% and 70%) if space allows.
```

## Example 3: Valid - Separate Positions

**Current Behavior (VALID):**
```
floorplan
  floor f1 {
    room Office at (0,0) size (20 x 10) walls [top: solid, right: solid, bottom: solid, left: solid]
    room Kitchen at (20,0) size (10 x 10) walls [top: solid, right: solid, bottom: solid, left: solid]
    room Pantry at (30,0) size (10 x 10) walls [top: solid, right: solid, bottom: solid, left: solid]
  }
  
  # Office.right wall has two connections at different positions - this is OK
  connect Office.right to Kitchen.left door at 25%
  connect Office.right to Pantry.left door at 75%
```

**Result:** ✅ Validation passes - the two doors are at different positions and don't physically overlap.

## Example 4: Valid - Different Walls

**Current Behavior (VALID):**
```
floorplan
  floor f1 {
    room Office at (0,0) size (10 x 10) walls [top: solid, right: solid, bottom: solid, left: solid]
    room Kitchen at (10,0) size (10 x 10) walls [top: solid, right: solid, bottom: solid, left: solid]
    room Hallway at (0,10) size (10 x 5) walls [top: solid, right: solid, bottom: solid, left: solid]
  }
  
  # Office has connections on different walls - no conflict
  connect Office.right to Kitchen.left door at 50%
  connect Office.bottom to Hallway.top door at 50%
```

**Result:** ✅ Validation passes - different walls cannot physically overlap.

## Fix for ImprovedTriplexVilla.floorplan

In the Second Floor section (lines 159-162), there are potential overlapping connections on `Lobby_2.right` wall:

```floorplan
connect StairLift_2.left to Lobby_2.right door at 50%        # Line 159
connect Lobby_2.right to Terrace.left double-door at 50%      # Line 162
```

**Resolution:** Check if these rooms physically align. If they don't share adjacent positions, one or both connections may need different positioning or removal.


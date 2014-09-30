# Coda Lisa

An online collaborative art playground.

## Concepts

The canvas is divided into Cells. Each cells is controlled by one small
JavaScript agent, that paints to the pixels in that cell. Agents can read from
the previous state of their own cell, their neighbour's cells, or some external
world signals to alter their behaviour and do something interesting.

## API

### Agent

An agent must have the following functions:

    function setup(t, cell) {
    }

    function draw(t, cell, signals) {
    }

The parameters are as follows:

- `t`, the current time in seconds as a floating point number. Use this to
  change over time in a predicatable fashion. You can't make any assumptions
  about the absolute value of this number, only the relative difference between
  two calls.
- `cell`, a cell object representing the cell the agent is supposed to draw
  itself in. The methods of the cell object are described below.
- `signals`, an object with "signals" from the outside world that the agent can
  respond to.

### Global Functions

- `new Color(r, g, b)`, create a new color with the given r, g, b values.
- `clip(x, low, hi)`, constrain the value of x to be between `low` and `hi`.
- `dist(x0, y0, x1, y0)`, calculate the distance between two points. 

### Cell object

The coordinate space of a cell ranges from `(0, 0)` in its top-left corner to
`(cell.w, cell.h)` in its bottom right corner. All coordinates are of the form
`(x, y)`.

Functions on the Cell object:

- `cell.w`, `cell.h`, the dimensions of the cell.
- `cell.get(x, y)`, returns a Color objects of the current cell in the
  *previous* frame. May go outside the cell (i.e., coordinates < 0 or larger
  than the cell bounds will return values from neighbouring cells).
- `cell.set(x, y, color)`, set the indicated pixel to the given color in the
  current frame.
- `cell.rect(x, y, w, h, color)`, fill a rectangle in the cell.
- `cell.fill(color)`, fill the entire cell with a color.

### Signals object

The `signals` object contains other signals than the values of the adjacent
cells.

- `cell.dist`, 0..100, distance to distance sensor.
- `cell.btn, 0 or 100, whether the button is pressed.
- `cell.light`, 0..100, the light sensor.
- `cell.sound`, 0..100, loudness measured on the sound sensor.
- `cell.mouse.x`, `cell.mouse.y`, location of the mouse cursor with respect to
  the top-left corner of the cell.
- `cell.mouse.click`, 0, 1 or 2, if the mouse button is pressed.

### Color object

- `new Color(r, g, b)`, constructor.
- `color.r`, `color.g`, `color.b`, fields for the Red, Green, Blue components.
- `color.mix(other, frac)`, mix two colors. Fraction should be in the range
  `0..1`.
- `color.avg()`, return the average of all R, G, B fields (interpret as
  grayscale).
- `color.inv()`, invert the color.
- `color.scale(a)`, scale the color with the given factor (multiply all
  components with `a`).
- `color.add(other)`, `color.sub(other)`, add or subtract other color.

Note: You *can* try to work with HSV colors, but I've found that doing that for
every pixel becomes *waaaaay* too slow. So don't do that :).

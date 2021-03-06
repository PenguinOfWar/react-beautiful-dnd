// @flow
import { isPointWithinDroppable, isDraggableWithin } from '../../../src/state/is-within-visible-bounds-of-droppable';
import { getDroppableDimension, getDraggableDimension } from '../../../src/state/dimension';
import { add, subtract } from '../../../src/state/position';
import getClientRect from '../../../src/state/get-client-rect';
import getDroppableWithDraggables from '../../utils/get-droppable-with-draggables';
import type { Result } from '../../utils/get-droppable-with-draggables';
import type {
  Spacing,
  Position,
  DraggableDimension,
  DroppableDimension,
} from '../../../src/types';

const margin: Spacing = {
  top: 10, left: 10, right: 10, bottom: 10,
};

const noSpacing: Spacing = {
  top: 0, left: 0, right: 0, bottom: 0,
};

describe('is within visible bounds of a droppable', () => {
  const clientSpacing: Spacing = {
    top: 10,
    left: 10,
    right: 90,
    bottom: 90,
  };
  const getDroppableDimensionArgs = {
    id: 'droppable',
    margin,
    // 100 x 100 box with margin's
    clientRect: getClientRect(clientSpacing),
  };
  const droppable = getDroppableDimension(getDroppableDimensionArgs);

  describe('is point within', () => {
    describe('basic behaviour', () => {
      const isPointWithinTestDroppable = isPointWithinDroppable(droppable);
      const { top, left, right, bottom } = droppable.page.withMargin;

      it('should return true if a point is within a droppable', () => {
        expect(isPointWithinTestDroppable(droppable.page.withMargin.center)).toBe(true);
      });

      it('should return true if a point is on any of the droppable boundaries', () => {
        const corners = [
          { x: left, y: top },
          { x: left, y: bottom },
          { x: right, y: top },
          { x: right, y: bottom },
        ];

        corners.forEach((corner: Position) => {
          expect(isPointWithinTestDroppable(corner)).toBe(true);
        });
      });

      it('should return false if the point is not within the droppable on any side', () => {
        const outside = [
          subtract({ x: left, y: top }, { x: 0, y: 10 }), // too far top
          subtract({ x: left, y: bottom }, { x: 10, y: 0 }), // too far left
          add({ x: right, y: top }, { x: 10, y: 0 }), // too far right
          add({ x: right, y: bottom }, { x: 0, y: 10 }), // too far bottom
        ];

        outside.forEach((point: Position) => {
          expect(isPointWithinTestDroppable(point)).toBe(false);
        });
      });

      it('should be based on the page coordinates of the droppable', () => {
        const windowScroll: Position = {
          x: 200, y: 200,
        };
        const custom = getDroppableDimension({
          id: 'with-scroll',
          windowScroll,
          clientRect: getClientRect({
            top: 0,
            left: 0,
            right: 100,
            bottom: 100,
          }),
        });
        const isWithinCustom = isPointWithinDroppable(custom);

        // custom points
        expect(isWithinCustom({ x: 10, y: 10 })).toBe(false);
        expect(isWithinCustom({ x: 210, y: 210 })).toBe(true);

        // checking with the center position of the dimension itself
        expect(isWithinCustom(custom.client.withMargin.center)).toBe(false);
        expect(isWithinCustom(custom.page.withMargin.center)).toBe(true);
      });
    });

    describe('dimension clipping', () => {
      const clientSpacingNoMargin = {
        top: 0, right: 100, bottom: 100, left: 0,
      };
      const clientRect = getClientRect(clientSpacingNoMargin);
      const { top, right, bottom, left } = clientSpacingNoMargin;
      const points = {
        'top-left': { x: left, y: top },
        'top-right': { x: right, y: top },
        'bottom-left': { x: left, y: bottom },
        'bottom-right': { x: right, y: bottom },
        top: { x: right / 2, y: top },
        right: { x: right, y: bottom / 2 },
        bottom: { x: right / 2, y: bottom },
        left: { x: left, y: bottom / 2 },
        center: { x: right / 2, y: bottom / 2 },
        outside: { x: right + 5, y: top },
      };

      it('should not be clipped if the droppable is fully contained by its scroll container', () => {
        const fullyContainedDroppable = getDroppableDimension({
          id: 'droppable',
          margin: noSpacing,
          clientRect,
          containerRect: getClientRect({
            top: 0,
            right: 100,
            bottom: 100,
            left: 0,
          }),
        });
        const isWithinClippedDroppable = isPointWithinDroppable(fullyContainedDroppable);
        Object.keys(points).forEach(
          (point) => {
            const expected = point !== 'outside';
            expect(isWithinClippedDroppable(points[point])).toBe(expected);
          }
        );
      });

      it('should be completely clipped if the droppable is outside the scroll container\'s bounds', () => {
        const fullyClippedDroppable = getDroppableDimension({
          id: 'droppable',
          margin: noSpacing,
          clientRect,
          containerRect: getClientRect({
            top,
            right: 210,
            bottom,
            left: 110,
          }),
        });
        const isWithinClippedDroppable = isPointWithinDroppable(fullyClippedDroppable);
        Object.keys(points).forEach(
          point => expect(isWithinClippedDroppable(points[point])).toBe(false)
        );
      });

      it('should be clipped on the top edge', () => {
        const partiallyClippedDroppable = getDroppableDimension({
          id: 'droppable',
          margin: noSpacing,
          clientRect,
          containerRect: getClientRect({
            top: 10,
            right,
            bottom,
            left,
          }),
        });
        const isWithinClippedDroppable = isPointWithinDroppable(partiallyClippedDroppable);
        Object.keys(points).forEach(
          (point) => {
            const expected = !['top-left', 'top', 'top-right', 'outside'].includes(point);
            expect(isWithinClippedDroppable(points[point])).toBe(expected);
          }
        );
      });

      it('should be clipped on the right edge', () => {
        const partiallyClippedDroppable = getDroppableDimension({
          id: 'droppable',
          margin: noSpacing,
          clientRect,
          containerRect: getClientRect({
            top,
            right: right - 10,
            bottom,
            left,
          }),
        });
        const isWithinClippedDroppable = isPointWithinDroppable(partiallyClippedDroppable);
        Object.keys(points).forEach(
          (point) => {
            const expected = !['top-right', 'right', 'bottom-right', 'outside'].includes(point);
            expect(isWithinClippedDroppable(points[point])).toBe(expected);
          }
        );
      });

      it('should be clipped on the bottom edge', () => {
        const partiallyClippedDroppable = getDroppableDimension({
          id: 'droppable',
          margin: noSpacing,
          clientRect,
          containerRect: getClientRect({
            top,
            right,
            bottom: bottom - 10,
            left,
          }),
        });
        const isWithinClippedDroppable = isPointWithinDroppable(partiallyClippedDroppable);
        Object.keys(points).forEach(
          (point) => {
            const expected = !['bottom-left', 'bottom', 'bottom-right', 'outside'].includes(point);
            expect(isWithinClippedDroppable(points[point])).toBe(expected);
          }
        );
      });

      it('should be clipped on the left edge', () => {
        const partiallyClippedDroppable = getDroppableDimension({
          id: 'droppable',
          margin: noSpacing,
          clientRect,
          containerRect: getClientRect({
            top,
            right,
            bottom,
            left: 10,
          }),
        });
        const isWithinClippedDroppable = isPointWithinDroppable(partiallyClippedDroppable);
        Object.keys(points).forEach(
          (point) => {
            const expected = !['top-left', 'left', 'bottom-left', 'outside'].includes(point);
            expect(isWithinClippedDroppable(points[point])).toBe(expected);
          }
        );
      });

      it('should account for container scroll', () => {
        const partiallyClippedDroppable = getDroppableDimension({
          id: 'droppable',
          margin: noSpacing,
          clientRect: getClientRect({
            top: top + 200,
            right,
            bottom: bottom + 200,
            left,
          }),
          containerRect: getClientRect({ top, right, bottom, left }),
        });
        const isWithinClippedDroppable = isPointWithinDroppable(partiallyClippedDroppable);
        // Before we scroll the droppable should be fully clipped
        Object.keys(points).forEach(
          point => expect(isWithinClippedDroppable(points[point])).toBe(false)
        );

        // Simulating a scroll...
        const scrolledDroppable = {
          ...partiallyClippedDroppable,
          container: {
            ...partiallyClippedDroppable.container,
            scroll: {
              ...partiallyClippedDroppable.container.scroll,
              current: { x: 0, y: 200 },
            },
          },
        };
        const isPointWithinScrolledDroppable = isPointWithinDroppable(scrolledDroppable);
        // Now the droppable should catch all the points
        Object.keys(points).forEach(
          (point) => {
            const expected = point !== 'outside';
            expect(isPointWithinScrolledDroppable(points[point])).toBe(expected);
          }
        );
      });
    });
  });

  describe('is draggable within', () => {
    it('should return true if the draggable is within the droppable', () => {
      const result: Result = getDroppableWithDraggables({
        droppableRect: { top: 0, left: 0, bottom: 100, right: 100 },
        draggableRects: [
          // on the boundaries
          { top: 0, left: 0, bottom: 100, right: 100 },
        ],
      });
      const isWithinDroppable =
        isDraggableWithin(result.droppable.container.bounds);

      expect(isWithinDroppable(result.draggableDimensions[0])).toBe(true);
    });

    it('should return true if the draggable is within the margin of the droppable', () => {
      const myDroppable: DroppableDimension = getDroppableDimension({
        id: 'custom',
        clientRect: getClientRect({ top: 10, left: 10, right: 90, bottom: 90 }),
        margin: { top: 10, left: 10, right: 10, bottom: 10 },
      });
      const draggable: DraggableDimension = getDraggableDimension({
        id: 'draggable',
        droppableId: myDroppable.id,
        // would normally not be within the droppable clientRect, but is within the margin
        clientRect: getClientRect({ top: 0, left: 0, right: 100, bottom: 100 }),
      });
      const isWithinDroppable = isDraggableWithin(myDroppable.container.bounds);

      const result: boolean = isWithinDroppable(draggable);

      expect(result).toBe(true);
    });

    it('should not consider the margins of the draggable when comparing because the margins may bleed outside the container', () => {
      const draggable: DraggableDimension = getDraggableDimension({
        id: 'drag-1',
        droppableId: droppable.id,
        clientRect: getClientRect(clientSpacing),
        // would normally push draggable outside of bounds
        margin,
      });
      const isWithinDroppable = isDraggableWithin(droppable.container.bounds);

      const result: boolean = isWithinDroppable(draggable);

      expect(result).toBe(true);
    });

    it('should return false if there is overlap on any side', () => {
      const result: Result = getDroppableWithDraggables({
        droppableRect: { top: 0, left: 0, bottom: 100, right: 100 },
        draggableRects: [
          { top: -10, left: 0, bottom: 20, right: 100 }, // too far top
          { top: 0, left: -10, bottom: 20, right: 100 }, // too far left
          { top: 0, left: 0, bottom: 20, right: 110 }, // too far right
          { top: 0, left: 0, bottom: 120, right: 100 }, // too far bottom
        ],
      });
      const isWithinThisDroppable =
        isDraggableWithin(result.droppable.container.bounds);

      result.draggableDimensions.forEach((draggable: DraggableDimension) => {
        expect(isWithinThisDroppable(draggable)).toBe(false);
      });
    });

    it('should allow a small affordance to compensate for margin capturing inaccuracy', () => {
      const result: Result = getDroppableWithDraggables({
        droppableRect: { top: 0, left: 0, bottom: 100, right: 100 },
        draggableRects: [
          { top: -1, left: 0, bottom: 20, right: 100 }, // not too far top
          { top: 0, left: -1, bottom: 20, right: 100 }, // not too far left
          { top: 0, left: 0, bottom: 20, right: 101 }, // not too far right
          { top: 0, left: 0, bottom: 101, right: 100 }, // not too far bottom
        ],
      });
      const isWithinThisDroppable =
        isDraggableWithin(result.droppable.container.bounds);

      result.draggableDimensions.forEach((draggable: DraggableDimension) => {
        expect(isWithinThisDroppable(draggable)).toBe(true);
      });
    });
  });
});

const classes = [
  'drag',
  'resizeHorizontal', 'resizeDiagonal2',
  'resizeVertical'  , 'resizeDiagonal1'
].map(c => 'interact-' + c);

const cursors = [
  'move',
  'w-resize', 'nesw-resize',
  's-resize', 'nwse-resize'
];

export class Interact {

  interact : Interaction | null = null
  boxes    : HTMLElement[]
  topBox   : HTMLElement
  minSize  : number
  snapRange: number
  graspClassName: string

  constructor(
    interactClassName: string, graspClassName: string,
    minSize = 64, snapDist = 32
  ) {
    const style = document.createElement('style');
    // Set cursor styles for each mouse state.
    style.innerHTML = (
      classes.map((c, i) => `body.${c}{cursor:${cursors[i]}}`).join('') +
      'body.interact-drag{cursor:move;cursor:grab}' +
      'body.interact-drag:active{cursor:grabbing}'
    );
    style.classList.add('interact-cursors');
    document.head.appendChild(style);
    const sel = '.' + interactClassName;
    this.boxes = [...document.querySelectorAll<HTMLElement>(sel)];
    this.topBox = this.boxes.reverse()[0];
    this.graspClassName = graspClassName;
    this.minSize = minSize;
    this.snapRange = snapDist;
  }

  /* 0    0    0    0    0
     0    4    3    2    0
     0    1    0   -1    0
     0   -2   -3   -4    0
     0    0    0    0    0 */
  mouseMove(event: MouseEvent) {
    const { clientX: mx, clientY: my } = event;
    // The mouse is down and is ready to interact with the element.
    // The cursor has been set so it's unnecessary to set it again.
    if (this.interact) {
      const { box, x, y, w, h } = this.interact;
      this.resizeAxe(box, mx, x, w, 'left', 'width');
      this.resizeAxe(box, my, y, h, 'top', 'height');
      // Only move the top element.
      event.preventDefault();
      return {
        element: box,
        // Inverse function for getting mouse state from the interaction data.
        state: (6 * +!!y - 3 * +!!h + 2 * +!!x - +!!w) % 8
      };
    }
    // Change the cursor based on the relative position of the mouse with any
    // element inside DOM.
    const body = document.body;
    body.classList.remove(...classes);
    for (const box of this.boxes) {
      const {
        offsetLeft: x, offsetWidth : w,
        offsetTop : y, offsetHeight: h
      } = box;
      const state = this.mouseEdge(mx, my, x, y, w, h, 16);
      // The mouse is hovering on the element's edge.
      if (state) {
        body.classList.add(classes[Math.abs(state)]);
        event.preventDefault();
        return { element: box, state };
      }
      // The mouse is inside the element.
      if (!this.mouseIsInside(mx, my, x, y, w, h)) continue;
      this.mouseIsGraspable(mx, my, box) && body.classList.add(classes[0]);
      // Set the cursor based on the top element instead of the below ones.
      event.preventDefault();
      return { element: box, state: 0 };
    }
    return null;
  }

  mouseDown({ clientX: mx, clientY: my }: MouseEvent) {
    for (const box of this.boxes) {
      const {
        offsetLeft: x, offsetWidth : w,
        offsetTop : y, offsetHeight: h
      } = box;
      const state = this.mouseEdge(mx, my, x, y, w, h, 16);
      // The mouse is hovering on the element's edge.
      if (state) {
        const interact = this.interact = {box} as Interaction;
        // x: 4, 1, -2
        // y: 4  3,  2
        // w: 4, 1, -2,  2, -1, -4
        // h: 4, 3,  2, -2, -3, -4
        // Add size and/or position to interaction data for later resizing.
        (state - 1) % 3 === 0 && (interact.x = mx - x, interact.w = mx + w);
        (state + 1) % 3 === 0 && (interact.w = mx - w);
        state >  1 && (interact.y = my - y, interact.h = my + h);
        state < -1 && (interact.h = my - h);
        return { element: box, state };
      }
      if (!this.mouseIsInside(mx, my, x, y, w, h)) continue;
      if (!this.mouseIsGraspable(mx, my, box)) return null;
      // The mouse is inside and is ready to grasp the element.
      // Move the element to the front.
      this.topBox !== box && (
        box.style.zIndex = this.topBox.style.zIndex + 1,
        this.topBox = box,
        this.boxes.sort((b1, b2) => +b2.style.zIndex - +b1.style.zIndex)
      );
      // Add position to interaction data for later dragging.
      this.interact = { box, x: mx - x, y: my - y };
      return { element: box, state: 0 };
    }
    return null;
  }

  mouseUp() { this.interact = null }

  resizeAxe(
    box : HTMLElement,
    ratPos : number,
    pos : number | undefined,
    size: number | undefined,
    posStr : 'left' | 'top',
    sizeStr: 'width' | 'height'
  ) {
    const posCamel = posStr[0].toUpperCase() + posStr.slice(1) as PosCamel;
    const sizeCamel = sizeStr[0].toUpperCase() + sizeStr.slice(1) as SizeCamel;
    const posOffsetStr = 'offset' + posCamel as `offset${PosCamel}`;
    const sizeOffsetStr = 'offset' + sizeCamel as `offset${SizeCamel}`;
    const sizeInnerStr = 'inner' + sizeCamel as `inner${SizeCamel}`;
    const abs = Math.abs, minSize = this.minSize, snapRange = this.snapRange;
    if (!size) {
      if (!pos) return;
      // Dragging.
      const edges = [0].concat(...this.boxes.map(bbox => (
        bbox === box
          ? [0, window[sizeInnerStr]]
          : [bbox[posOffsetStr], bbox[posOffsetStr] + bbox[sizeOffsetStr]]
      )));
      // The viewport's edge close enough to snap the element's left/top to.
      let snapEdge = edges.find(edge => abs(ratPos - pos - edge) < snapRange);
      if (typeof snapEdge === 'number') {
        box.style[posStr] = snapEdge + 'px';
        return;
      }
      const dim = box[sizeOffsetStr];
      // The viewport's edge close enough to snap the element's right/bottom to.
      snapEdge = edges.find(edge => abs(ratPos - pos + dim - edge) < snapRange);
      if (typeof snapEdge === 'number') {
        box.style[posStr] = snapEdge - dim + 'px';
        return;
      }
      box.style[posStr] = ratPos - pos + 'px';
      return;
    }
    // Resizing left/top edge, which changes the element's position and size.
    if (pos) {
      let dist = size - ratPos;
      const edges = ([] as number[]).concat(...this.boxes.map(bbox => (
        bbox !== box
          ? 0
          : [bbox[posOffsetStr], bbox[posOffsetStr] + bbox[sizeOffsetStr]]
      )));
      // The viewport's edge close enough to snap the element's edge to.
      const snapEdge = edges.find(edge => abs(ratPos - pos - edge) < snapRange);
      typeof snapEdge === 'number' && (dist = size - pos - snapEdge);
      if (dist > minSize) {
        box.style[posStr] = size - pos - dist + 'px';
        box.style[sizeStr] = dist + 'px';
        return;
      }
    }
    // Resizing right/bottom edge, which only changes the element's size.
    if (!pos) {
      let dist = ratPos - size;
      const loc = box[posOffsetStr];
      const snapEdges = ([] as number[]).concat(...this.boxes.map(bbox => (
        bbox === box
          ? (window as K)['inner' + sizeCamel]
          : [bbox[posOffsetStr], bbox[posOffsetStr] + bbox[sizeOffsetStr]]
      )));
      const snapEdge = snapEdges.find(edge => abs(ratPos - edge) < snapRange);
      typeof snapEdge === 'number' && (dist = snapEdge - loc);
      if (dist > minSize) { box.style[sizeStr] = dist + 'px'; return }
    }
    // Current size is less than minimum.
    pos && (box.style[posStr] = size - pos - minSize + 'px');
    box.style[sizeStr] = minSize + 'px';
  }

  mouseIsInside(
    mx: number, my: number,
    x : number, y : number,
    w : number, h : number
  ) { return mx > x && mx < x + w && my > y && my < y + h }

  // If the mouse is within r distance away from the element's edges, return the
  // state corresponding to the relative position of the mouse to the element.
  mouseEdge(
    mx: number, my: number,
    x : number, y : number,
    w : number, h : number,
    r : number
  ) {
    const abs = Math.abs;
    // = 3 * vertical + horizontal
    return +this.mouseIsInside(mx, my, x - r, y - r, w + 2 * r, h + 2 * r) * (
      3 * +(abs(y - my) < r) - 3 * +(abs(y + h - my) < r) +
      +(abs(x - mx) < r) - +(abs(x + w - mx) < r)
    );
  }

  // TODO: Use mouseDown target instead.
  // Check whether the element has any hovered child nodes that are graspable.
  mouseIsGraspable(mx: number, my: number, box: HTMLElement) {
    const children = [...box.querySelectorAll('*')].reverse();
    for (const child of children) {
      const { x, y, width: w, height: h } = child.getBoundingClientRect();
      if (!this.mouseIsInside(mx, my, x, y, w, h)) continue;
      return child.classList.contains(this.graspClassName);
    }
    return true;
  }
}
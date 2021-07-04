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

  interact: { [key: string]: any } | null = null
  boxes: HTMLElement[]
  topBox: HTMLElement
  graspClassName: string
  minSize: number
  snapDist: number

  constructor(
    interactClassName: string, graspClassName: string,
    minSize = 64, snapDist = 32
  ) {
    const style = document.createElement('style');
    style.innerHTML = (
      classes.map((c, i) => `body.${c}{cursor:${cursors[i]}}`).join('') +
      'body.interact-drag{cursor:move;cursor:grab}' +
      'body.interact-drag:active{cursor:grabbing}'
    );
    
    style.classList.add('interact-cursors');
    document.head.appendChild(style);
    const elements = document.querySelectorAll('.' + interactClassName);
    this.boxes = [...elements] as HTMLElement[];
    this.topBox = this.boxes.reverse()[0];
    this.graspClassName = graspClassName;
    this.minSize = minSize;
    this.snapDist = snapDist;
  }

  /* 0    0    0    0    0
     0    4    3    2    0
     0    1    0   -1    0
     0   -2   -3   -4    0
     0    0    0    0    0 */
  mouseMove(e: MouseEvent) {
    const { clientX: mx, clientY: my } = e;
    if (this.interact) {
      const { box, x, y, w, h } = this.interact;
      this.resizeAxe(box, mx, x, w, 'left', 'width');
      this.resizeAxe(box, my, y, h, 'top', 'height');
      e.preventDefault();
      return {
        element: box,
        state: (6 * +!!y - 3 * +!!h + 2 * +!!x - +!!w) % 8
      };
    }
    const body = document.body;
    body.classList.remove(...classes);
    for (const box of this.boxes) {
      const {
        offsetLeft: x, offsetWidth : w,
        offsetTop : y, offsetHeight: h
      } = box;
      const state = this.mouseEdge(mx, my, x, y, w, h, 16);
      if (state) {
        body.classList.add(classes[Math.abs(state)]);
        e.preventDefault();
        return { element: box, state };
      }
      if (!this.mouseIsInside(mx, my, x, y, w, h)) continue;
      this.mouseIsGraspable(mx, my, box) && body.classList.add(classes[0]);
      e.preventDefault();
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
      if (state) {
        const interact = this.interact = {box} as K;
        // x: 4, 1, -2
        // y: 4  3,  2
        // w: 4, 1, -2,  2, -1, -4
        // h: 4, 3,  2, -2, -3, -4
        (state - 1) % 3 === 0 && (interact.x = mx - x, interact.w = mx + w);
        (state + 1) % 3 === 0 && (interact.w = mx - w);
        state >  1 && (interact.y = my - y, interact.h = my + h);
        state < -1 && (interact.h = my - h);
        return { element: box, state };
      }
      if (!this.mouseIsInside(mx, my, x, y, w, h)) continue;
      if (!this.mouseIsGraspable(mx, my, box)) return null;
      this.topBox !== box && (
        box.style.zIndex = this.topBox.style.zIndex + 1,
        this.topBox = box,
        this.boxes.sort((b1, b2) => +b2.style.zIndex - +b1.style.zIndex)
      );
      this.interact = { box, x: mx - x, y: my - y };
      return { element: box, state: 0 };
    }
    return null;
  }

  mouseUp() { this.interact = null }

  resizeAxe(
    box: HTMLElement,
    ratPos: number,
    pos: number | undefined,
    size: number | undefined,
    posStr: string,
    sizeStr: string
  ) {
    const locOffset = 'offset' + posStr[0].toUpperCase() + posStr.slice(1);
    const dimStrCamel = sizeStr[0].toUpperCase() + sizeStr.slice(1);
    const abs = Math.abs, minSize = this.minSize, snapDist = this.snapDist;
    if (!size) {
      if (!pos) return;
      // Dragging
      const edges = [].concat.apply([], (this.boxes as K[]).map(bbox => (
        bbox === box
          ? [0, (window as K)['inner' + dimStrCamel]]
          : [bbox[locOffset], bbox[locOffset] + bbox['offset' + dimStrCamel]]
      ) as never)) as number[];
      let snapEdge = edges.find(edge => abs(ratPos - pos - edge) < snapDist);
      if (!isNaN(snapEdge as any)) {
        (box.style as K)[posStr] = snapEdge! + 'px';
        return;
      }
      const dim = (box as K)['offset' + dimStrCamel];
      snapEdge = edges.find(edge => abs(ratPos - pos + dim - edge) < snapDist);
      if (!isNaN(snapEdge as any)) {
        (box.style as K)[posStr] = snapEdge! - dim + 'px';
        return
      }
      (box.style as K)[posStr] = ratPos - pos + 'px';
      return;
    }
    // Resizing
    if (pos) {
      let dist = size - ratPos;
      const edges = [].concat.apply([], (this.boxes as K[]).map(bbox => (
        bbox === box
          ? 0
          : [bbox[locOffset], bbox[locOffset] + bbox['offset' + dimStrCamel]]
      ) as never)) as number[];
      const snapEdge = edges.find(edge => abs(ratPos - pos - edge) < snapDist);
      !isNaN(snapEdge as any) && (dist = size - pos - snapEdge!);
      if (dist > minSize) {
        (box.style as K)[posStr] = size - pos - dist + 'px';
        (box.style as K)[sizeStr] = dist + 'px';
        return;
      }
    }
    if (!pos) {
      let dist = ratPos - size;
      const loc = (box as K)[locOffset];
      const snapEdges = [].concat.apply([], (this.boxes as K[]).map(bbox => (
        bbox === box
        ? (window as K)['inner' + dimStrCamel]
        : [bbox[locOffset], bbox[locOffset] + bbox['offset' + dimStrCamel]]
      ) as never)) as number[];
      const snapEdge = snapEdges.find(edge => abs(ratPos - edge) < snapDist);
      !isNaN(snapEdge as any) && (dist = snapEdge! - loc);
      if (dist > minSize) { (box.style as K)[sizeStr] = dist + 'px'; return }
    }
    // Current size is less than minimum
    pos && ((box.style as K)[posStr] = size - pos - minSize + 'px');
    (box.style as K)[sizeStr] = minSize + 'px';
  }

  mouseIsInside(
    mx: number, my: number,
    x : number, y : number,
    w : number, h : number
  ) { return mx > x && mx < x + w && my > y && my < y + h }

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
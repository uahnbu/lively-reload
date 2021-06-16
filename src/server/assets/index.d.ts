interface WebSocket {
  events: { [task: string]: (data: any) => void }
  on: (event: any, handler: any) => {}
}

interface IframeDoc extends Document {
  iframe: HTMLIFrameElement
  oldDOM: DiffDOMNode
  oldHTML: string
}

interface DiffDOMNode {
  nodeName: string
  data?: string
  childNodes?: DiffDOMNode[]
  isIgnored?: boolean
  oldData?: DiffDOMNode
  attributes?: {
    id?: string
    class?: string
  }
}

interface DiffDOMDiff {
  action: string
  route: number[]
  name?: string
  value?: string
  oldValue?: string | DiffDOMNode
  newValue?: string | DiffDOMNode
  element?: DiffDOMNode
}

interface DiffDomConstructor {
  diff(
    node1: HTMLElement | DiffDOMNode,
    node2: HTMLElement | DiffDOMNode
  ): DiffDOMDiff[]
  apply(node: HTMLElement | DiffDOMNode, diff: DiffDOMDiff[]): boolean
  new(): DiffDomConstructor
}

interface DiffDOMObject {
  nodeToObj(node: HTMLElement): DiffDOMNode
  DiffDOM: DiffDomConstructor
}

interface MarkedRoute {
  route: number[]
  start: number
  end: number
}
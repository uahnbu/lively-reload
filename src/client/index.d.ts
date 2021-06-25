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
  childNodes?: DiffDOMNode[]
  data?: string
  attributes?: {
    id?: string
    class?: string
  }
}

interface DiffDOMDiff {
  action: string
  route: number[]
  groupLength: number
  from: number
  to: number
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
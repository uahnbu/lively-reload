type K = { [key: string]: any }

type HtmlMainTag = 'html' | 'body' | 'head'

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

declare module 'diff-dom' {
  export const DiffDOM: DiffDomConstructor
  export function nodeToObj(node: HTMLElement): DiffDOMNode
}

type MsgType = 'info' | 'error' | 'warn'

interface MsgData { msg: string, type: MsgType }

interface RelativeData {
  content: string
  fileRel: string
}

interface AbsoluteData {
  content?: string
  filePath: string
  messages: MsgData[]
  highlightIds: (number | string)[]
}

interface HighlightData {
  highlightIds: (number | string)[]
  filePath?: string
  fileRel?: string
}

interface MessagePane extends HTMLElement {
  originalSize: [number, number] | null
  holdTimer: NodeJS.Timeout
}

interface Highlight extends HTMLDivElement {
  target?: HTMLElement
}

interface Bound {
  width: number
  height: number
  left: number
  top: number
}

type HighlightPart = '' | '-horizontal' | '-vertical'

type PosCamel = 'Left' | 'Top'
type SizeCamel = 'Width' | 'Height'

interface Interaction {
  [key: string]: any
  box: HTMLElement
  x?: number
  y?: number
  w?: number
  h?: number
}
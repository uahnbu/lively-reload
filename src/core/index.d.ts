type K = { [key: string]: any };

type ChangeType = 'file' | 'tab'

type MessageType = 'info' | 'error' | 'warn'

/*
DISTRIBUTIVE CONDITIONAL TYPES

type Id = string | number | boolean;
type Arrays<T> = T extends T ? T[] : never;
type Ids = Arrays<Id>
-> Ids: string[] | number[] | false[] | true[]

type Id = string | number | boolean;
type Arrays<T> = boolean extends T ?
    boolean[] | Arrays<Exclude<T, boolean>> :
    T extends T ? T[] : never
type Ids = Arrays<Id>
-> Ids: boolean[] | string[] | number[]
*/

type Pack<T extends DomExtCamel | StyleExtCamel> = `pack${T}`
type GenerateExtension<T extends string> = `.${Lowercase<T>}`

type DomExtCamel        = 'Pug' | 'Html'
type StyleExtCamel      = 'Css' | 'Scss' | 'Sass'
type ExportableExtCamel = 'Pug' | 'Scss' | 'Sass' | 'Ts'

type DomExtension        = GenerateExtension<DomExtCamel>
type StyleExtension      = GenerateExtension<StyleExtCamel>
type ExportableExtension = GenerateExtension<ExportableExtCamel>

interface HtmlPack {
  filePath: string
  messages: { msg: string, type: string }[]
  fileRel: string
  content: string
  highlightIds: (number | string)[]
}

type HtmlError = Omit<HtmlPack, 'fileRel' | 'content' | 'highlightIds'>

interface HtmlHighlight {
  content: string
  highlightIds: (number | string)[]
}

interface TagNode {
  leftStart: number
  leftEnd: number
  rightStart: number
  rightEnd: number
  children: TagNode[]
}

interface ShiftedSelection {
  start: number
  end: number
}
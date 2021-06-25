export class YAML {
  tab: number = 2
  seen: Set<object> = new Set
  yamlify(node: any, tab?: number) {
    this.tab = tab || 2;
    this.seen = new Set;
    return this.dfs(node, 0, false);
  }
  dfs(node: any, lvl: number, feed: boolean) {
    const gap = feed ? ' ' : '';
    if (this.seen.has(node)) return gap + '{circular}';
    if (this.isSpecialString(node)) return gap + '\'' + node + '\'';
    if (node === void 0) return gap + 'null';
    if (this.isLeaf(node)) return gap + node;
    this.seen.add(node);
    if (Array.isArray(node)) return this.handleArray(node, lvl, feed);
    return this.handleObject(node, lvl, feed);
  }
  isSpecialString(node: any) {
    return typeof node === 'string' && /[[\]{}:',-]/.test(node);
  }
  isLeaf(node: any) {
    return typeof node === 'boolean' ||
      typeof node === 'string' ||
      typeof node === 'number' ||
      typeof node === 'bigint' ||
      node === void 0 || node === null;
  }
  handleArray(node: any, lvl: number, feed: boolean) {
    const gap = feed ? ' ' : '';
    if (node.length === 0) return gap + '[]';
    const isPetiole = node.every((e: any) => this.isLeaf(e));
    let str = '', bond = ', ';
    !isPetiole && (
      str = '- ', bond = '\n' + ' '.repeat(this.tab * lvl) + str,
      feed && (str = bond)
    );
    str += this.dfs(node[0], ++lvl, false);
    for (let i = 1; i < node.length; i++) {
      str += bond + this.dfs(node[i], lvl, false);
    }
    return isPetiole ? gap + '[' + str + ']' : str;
  }
  handleObject(node: any, lvl: number, feed: boolean) {
    const gap = feed ? ' ' : '';
    let keys = 0;
    for (const key in node) { node[key] !== void 0 && ++keys }
    if (keys === 0) return gap + '{}';
    const bond = '\n' + ' '.repeat(this.tab * lvl++);
    let str = '';
    for (const key in node) {
      if (!feed && str === '') str += this.handleProp(node, key, '', lvl);
      else str += this.handleProp(node, key, bond, lvl);
    }
    return str;
  }
  handleProp(node: any, key: string, bond: string, lvl: number) {
    if (node[key] === void 0) return '';
    return bond + key + ':' + this.dfs(node[key], lvl, true);
  }
}

export class YAMLDOM extends YAML {
  handleProp(node: any, key: string, bond: string, lvl: number) {
    if (key === 'toString' || key === 'setValue') return '';
    if (key === 'attributes') {
      const attributes = node.attributes;
      let keys = 0;
      for (const _key in attributes) { ++keys }
      if (keys === 1 && (attributes.id || attributes.class)) return '';
      if (keys === 2 && attributes.id && attributes.class) return '';
      let str = '';
      for (const key in attributes) {
        if (key === 'id' || key === 'class') continue;
        const val = this.dfs(attributes[key], lvl, true);
        str += bond + '\x1b[35m' + key + '\x1b[39m:' + val;
      }
      return str;
    }
    const prop = bond + '\x1b[35m' + key + '\x1b[39m:';
    if (key === 'nodeName') {
      const { nodeName, attributes } = node;
      let str = prop + ' ' + nodeName;
      attributes?.class && (str += '.' + attributes.class.replace(/\s/g, '.'));
      attributes?.id && (str += '#' + attributes.id);
      return str;        
    }
    if (
      key === 'childNodes' &&
      node.childNodes.length === 1 &&
      node.childNodes[0].nodeName === '#text'
    ) return bond + '\x1b[35mdata\x1b[39m: ' + node.childNodes[0].data;
    return prop + this.dfs(node[key], lvl, true);
  }
}
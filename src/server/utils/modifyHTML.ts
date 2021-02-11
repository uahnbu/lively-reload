export default function modifyHTML(html: string) {
  html = html.replace(/(^|[\n\r])\s*|\s+$/g, '');

  const containerTag = '<div id="lively-container" style="position:absolute;left:0;top:0;width:100%;height:100%">';
  const headStyles = html.match(/<style.*?<\/style>(?=.*<\/head>)/g) || [];
  html = html.replace(/<style.+?<\/style>(?=.*<\/head>)/g, '');

  const bodyStart = html.match(/(?<=<body>)./)?.index || 0;
  html = addAtIndex(html, containerTag + headStyles.join(''), bodyStart);

  const bodyScriptStart = html.match(/((?<=<body>.*)|(?<!<head>.*))<script|<\/body>/)?.index || html.length;
  html = addAtIndex(html, '</div>', bodyScriptStart);

  return html;
}

function addAtIndex(str: string, subStr: string, index: number) {
  return str.slice(0, index) + subStr + str.slice(index);
}
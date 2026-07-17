export function unwrapPlaceholders(latex) {
  const marker = String.raw`\placeholder`;
  let output = latex;
  let searchFrom = 0;

  while (true) {
    const start = output.indexOf(marker, searchFrom);
    if (start === -1) return output;

    let cursor = start + marker.length;
    if (output[cursor] === '[') {
      const idEnd = output.indexOf(']', cursor + 1);
      if (idEnd === -1) return output;
      cursor = idEnd + 1;
    }

    if (output[cursor] !== '{') {
      searchFrom = cursor;
      continue;
    }

    let depth = 1;
    let end = cursor + 1;
    for (; end < output.length && depth > 0; end += 1) {
      if (output[end] === '\\') {
        end += 1;
      } else if (output[end] === '{') {
        depth += 1;
      } else if (output[end] === '}') {
        depth -= 1;
      }
    }

    if (depth !== 0) return output;
    const content = output.slice(cursor + 1, end - 1);
    output = output.slice(0, start) + content + output.slice(end);
    searchFrom = start;
  }
}

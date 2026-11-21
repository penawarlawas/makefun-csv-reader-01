// Fast drop-in for csv-reader 1.0.0: same answer for every input, far less CPU.
// The reference builds each field one character at a time (value += c) and calls a
// closure per character. This reads the text once in runs: for each field it finds
// the next delimiter with charCode comparisons, then slices the whole run in one
// allocation. Semantics are the reference's, branch for branch.

const COMMA = 0;
const LINE_BREAK = 1;
const END = 2;

const QUOTE = 34; // "
const COMMA_C = 44; // ,
const LF = 10;
const CR = 13;
const BOM = 0xfeff;

// Field result, written by the readers below instead of an object per field.
let ended = END;
let added = 0;

export function run(input) {
  const text = String(input.text);
  const header = input.header === true;
  const n = text.length;
  const errors = [];
  const rows = [];
  let columns = null;
  let width = -1;

  let pos = n > 0 && text.charCodeAt(0) === BOM ? 1 : 0;
  let line = 1;
  let recordLine = 1;
  let recordRow = null;

  // Reads unquoted characters onto `value` up to the next comma or line break.
  // Sets `ended` and `added` (characters kept). A CR not followed by LF is dropped
  // with a stray_cr error.
  function readUnquoted(value) {
    let kept = 0;
    for (;;) {
      let i = pos;
      while (i < n) {
        const c = text.charCodeAt(i);
        if (c === COMMA_C || c === LF || c === CR) break;
        i++;
      }
      if (i > pos) {
        value += text.slice(pos, i);
        kept += i - pos;
        pos = i;
        if (pos >= n) break;
      }
      const c = text.charCodeAt(pos);
      if (c === COMMA_C) {
        pos++;
        ended = COMMA;
        added = kept;
        return value;
      }
      if (c === LF) {
        pos++;
        line++;
        ended = LINE_BREAK;
        added = kept;
        return value;
      }
      // CR: CRLF ends the record, a lone CR is dropped.
      if (pos + 1 < n && text.charCodeAt(pos + 1) === LF) {
        pos += 2;
        line++;
        ended = LINE_BREAK;
        added = kept;
        return value;
      }
      errors.push({ code: 'stray_cr', line: recordLine, row: recordRow });
      pos++;
      if (pos >= n) break;
    }
    ended = END;
    added = kept;
    return value;
  }

  // Reads a quoted field whose opening quote is at pos.
  function readQuoted() {
    const open = pos;
    const openLine = line;
    let value = '';
    pos++;
    let closed = false;
    for (;;) {
      let i = pos;
      while (i < n) {
        const c = text.charCodeAt(i);
        if (c === QUOTE || c === LF || c === CR) break;
        i++;
      }
      if (i > pos) {
        value += text.slice(pos, i);
        pos = i;
      }
      if (pos >= n) break;
      const c = text.charCodeAt(pos);
      if (c === QUOTE) {
        if (pos + 1 < n && text.charCodeAt(pos + 1) === QUOTE) {
          value += '"';
          pos += 2;
          continue;
        }
        pos++;
        closed = true;
        break;
      }
      // CRLF and a lone CR inside quotes are each one LF.
      if (c === CR) {
        value += '\n';
        line++;
        pos += pos + 1 < n && text.charCodeAt(pos + 1) === LF ? 2 : 1;
        continue;
      }
      value += '\n';
      line++;
      pos++;
    }
    if (!closed) {
      // The quote never closes: it is literal, and the rest is read as unquoted.
      pos = open + 1;
      line = openLine;
      errors.push({ code: 'unterminated_quote', line: recordLine, row: recordRow });
      return readUnquoted('"');
    }
    if (pos >= n) {
      ended = END;
      added = 0;
      return value;
    }
    const c = text.charCodeAt(pos);
    if (c === COMMA_C) {
      pos++;
      ended = COMMA;
      added = 0;
      return value;
    }
    if (c === LF) {
      pos++;
      line++;
      ended = LINE_BREAK;
      added = 0;
      return value;
    }
    if (c === CR && pos + 1 < n && text.charCodeAt(pos + 1) === LF) {
      pos += 2;
      line++;
      ended = LINE_BREAK;
      added = 0;
      return value;
    }
    // What follows the closing quote is appended as it stands.
    const junk = readUnquoted(value);
    if (added > 0) errors.push({ code: 'quote_junk', line: recordLine, row: recordRow });
    added = 0;
    return junk;
  }

  for (;;) {
    // Lines with no characters are no records.
    while (pos < n) {
      const c = text.charCodeAt(pos);
      if (c === LF) {
        pos++;
        line++;
      } else if (c === CR && pos + 1 < n && text.charCodeAt(pos + 1) === LF) {
        pos += 2;
        line++;
      } else {
        break;
      }
    }
    if (pos >= n) break;

    recordLine = line;
    recordRow = header && columns === null ? null : rows.length;
    const fields = [];
    let quoted;
    for (;;) {
      quoted = text.charCodeAt(pos) === QUOTE;
      fields.push(quoted ? readQuoted() : readUnquoted(''));
      if (ended !== COMMA) break;
    }

    // A line that held only stray CRs is left with no characters: no record.
    if (fields.length === 1 && fields[0] === '' && !quoted) continue;

    if (width < 0) width = fields.length;
    if (header && columns === null) {
      columns = fields;
      continue;
    }
    if (fields.length < width) {
      errors.push({ code: 'short_row', line: recordLine, row: recordRow, fields: fields.length });
      while (fields.length < width) fields.push('');
    } else if (fields.length > width) {
      errors.push({ code: 'long_row', line: recordLine, row: recordRow, extra: fields.splice(width) });
    }
    rows.push(fields);
  }
  return { columns: header ? (columns ?? []) : null, rows, errors };
}

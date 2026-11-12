import { describe, expect, it } from "vitest";
import { detectDelimiter, parseCsv } from "@/lib/import/csv";

describe("parseCsv", () => {
  it("gestisce virgolette, virgolette doppie e a capo nei campi", () => {
    const text = 'a,b,c\n1,"x, y","he said ""hi"""\n2,"multi\nline",z\n';
    expect(parseCsv(text)).toEqual([
      ["a", "b", "c"],
      ["1", "x, y", 'he said "hi"'],
      ["2", "multi\nline", "z"],
    ]);
  });

  it("rimuove il BOM e le righe vuote, supporta CRLF", () => {
    expect(parseCsv("﻿a;b\r\n1;2\r\n\r\n")).toEqual([
      ["a", "b"],
      ["1", "2"],
    ]);
  });

  it("rileva il separatore dall'intestazione", () => {
    expect(detectDelimiter("a;b;c\n1,2;3")).toBe(";");
    expect(detectDelimiter("a\tb\tc")).toBe("\t");
    expect(detectDelimiter('"a,b";c')).toBe(";");
  });
});

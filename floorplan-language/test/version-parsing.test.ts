import { beforeAll, describe, expect, test } from "vitest";
import { EmptyFileSystem, type LangiumDocument } from "langium";
import { parseHelper } from "langium/test";
import type { Floorplan } from "floorplan-language";
import { createFloorplansServices } from "floorplan-language";
import { extractVersionFromAST, parseVersion, resolveVersion } from "../src/diagrams/floorplans/version-resolver.js";

let services: ReturnType<typeof createFloorplansServices>;
let parse: ReturnType<typeof parseHelper<Floorplan>>;

function expectNoErrors(document: LangiumDocument): void {
  if (document.parseResult.parserErrors.length) {
    console.error(document.parseResult.parserErrors);
  }
  expect(document.parseResult.parserErrors).toHaveLength(0);
  expect(document.parseResult.value).toBeDefined();
}

beforeAll(async () => {
  services = createFloorplansServices(EmptyFileSystem);
  parse = parseHelper<Floorplan>(services.Floorplans);
});

describe("Version Declaration Parsing", () => {
  test("should parse inline version directive", async () => {
    const input = `
      %%{version: 1.0}%%
      floorplan
        floor f1 {
          room TestRoom at (1,2) size (10 x 12) walls [top: solid, right: solid, bottom: solid, left: solid]
        }
    `;

    const document = await parse(input);
    expectNoErrors(document);

    const model = document.parseResult.value;
    expect(model.versionDirective).toBeDefined();
    // Unquoted versions are parsed as NUMBER
    expect(model.versionDirective?.versionNumber).toBe(1.0);
  });

  test("should parse inline version directive with patch", async () => {
    const input = `
      %%{version: "1.0.0"}%%
      floorplan
        floor f1 {
          room TestRoom at (1,2) size (10 x 12) walls [top: solid, right: solid, bottom: solid, left: solid]
        }
    `;

    const document = await parse(input);
    expectNoErrors(document);

    const model = document.parseResult.value;
    expect(model.versionDirective).toBeDefined();
    // Quoted versions are parsed as VERSION_STRING
    expect(model.versionDirective?.version).toBe('"1.0.0"');
  });

  test("should parse YAML frontmatter with version", async () => {
    const input = `
      ---
      version: "1.0"
      title: "My Floorplan"
      ---
      floorplan
        floor f1 {
          room TestRoom at (1,2) size (10 x 12) walls [top: solid, right: solid, bottom: solid, left: solid]
        }
    `;

    const document = await parse(input);
    expectNoErrors(document);

    const model = document.parseResult.value;
    expect(model.frontmatter).toBeDefined();
    expect(model.frontmatter?.properties).toBeDefined();

    const versionProp = model.frontmatter?.properties.find(p => p.key === 'version');
    expect(versionProp).toBeDefined();
    // VERSION_STRING terminal includes quotes
    expect(versionProp?.value.versionValue).toBe('"1.0"');
  });

  test("should parse floorplan without version declaration", async () => {
    const input = `
      floorplan
        floor f1 {
          room TestRoom at (1,2) size (10 x 12) walls [top: solid, right: solid, bottom: solid, left: solid]
        }
    `;

    const document = await parse(input);
    expectNoErrors(document);

    const model = document.parseResult.value;
    expect(model.versionDirective).toBeUndefined();
    expect(model.frontmatter).toBeUndefined();
  });

  test("should handle quoted version in frontmatter", async () => {
    const input = `
      ---
      version: "1.2.3"
      ---
      floorplan
        floor f1 {
          room TestRoom at (1,2) size (10 x 12) walls [top: solid, right: solid, bottom: solid, left: solid]
        }
    `;

    const document = await parse(input);
    expectNoErrors(document);

    const model = document.parseResult.value;
    const versionProp = model.frontmatter?.properties.find(p => p.key === 'version');
    // VERSION_STRING terminal includes quotes
    expect(versionProp?.value.versionValue).toBe('"1.2.3"');
  });
});

describe("Version Resolution", () => {
  test("should extract version from inline directive", async () => {
    const input = `
      %%{version: 1.0}%%
      floorplan
        floor f1 {
          room TestRoom at (1,2) size (10 x 12) walls [top: solid, right: solid, bottom: solid, left: solid]
        }
    `;

    const document = await parse(input);
    const model = document.parseResult.value;

    const versionStr = extractVersionFromAST(model);
    expect(versionStr).toBe("1.0"); // Converted from NUMBER 1 to "1.0"

    const parsed = parseVersion(versionStr!);
    expect(parsed.major).toBe(1);
    expect(parsed.minor).toBe(0);
    expect(parsed.patch).toBe(0);
  });

  test("should extract version from frontmatter", async () => {
    const input = `
      ---
      version: "2.1.0"
      ---
      floorplan
        floor f1 {
          room TestRoom at (1,2) size (10 x 12) walls [top: solid, right: solid, bottom: solid, left: solid]
        }
    `;

    const document = await parse(input);
    const model = document.parseResult.value;

    const versionStr = extractVersionFromAST(model);
    expect(versionStr).toBe("2.1.0");

    const parsed = parseVersion(versionStr!);
    expect(parsed.major).toBe(2);
    expect(parsed.minor).toBe(1);
    expect(parsed.patch).toBe(0);
  });

  test("should default to 1.0.0 when no version declared", async () => {
    const input = `
      floorplan
        floor f1 {
          room TestRoom at (1,2) size (10 x 12) walls [top: solid, right: solid, bottom: solid, left: solid]
        }
    `;

    const document = await parse(input);
    const model = document.parseResult.value;

    const result = resolveVersion(model);
    expect(result.version.major).toBe(1);
    expect(result.version.minor).toBe(0);
    expect(result.version.patch).toBe(0);
    expect(result.warnings.length).toBeGreaterThan(0);
    expect(result.warnings[0]).toContain("No grammar version declared");
  });

  test("should prefer inline directive over frontmatter", async () => {
    const input = `
      %%{version: 2.0}%%
      ---
      version: "1.0"
      ---
      floorplan
        floor f1 {
          room TestRoom at (1,2) size (10 x 12) walls [top: solid, right: solid, bottom: solid, left: solid]
        }
    `;

    const document = await parse(input);
    const model = document.parseResult.value;

    const versionStr = extractVersionFromAST(model);
    expect(versionStr).toBe("2.0"); // Converted from NUMBER 2 to "2.0"
  });

  test("should error on future version", async () => {
    const input = `
      %%{version: 99.0}%%
      floorplan
        floor f1 {
          room TestRoom at (1,2) size (10 x 12) walls [top: solid, right: solid, bottom: solid, left: solid]
        }
    `;

    const document = await parse(input);
    const model = document.parseResult.value;

    const result = resolveVersion(model);
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors[0]).toContain("Unsupported grammar version");
  });
});

describe("Version Parsing Utilities", () => {
  test("should parse version with major and minor", () => {
    const version = parseVersion("1.5");
    expect(version.major).toBe(1);
    expect(version.minor).toBe(5);
    expect(version.patch).toBe(0);
  });

  test("should parse version with major, minor, and patch", () => {
    const version = parseVersion("2.3.7");
    expect(version.major).toBe(2);
    expect(version.minor).toBe(3);
    expect(version.patch).toBe(7);
  });

  test("should parse version from quoted string", () => {
    const version = parseVersion('"1.0.0"');
    expect(version.major).toBe(1);
    expect(version.minor).toBe(0);
    expect(version.patch).toBe(0);
  });

  test("should throw error on invalid format", () => {
    expect(() => parseVersion("invalid")).toThrow();
    expect(() => parseVersion("1")).toThrow();
    expect(() => parseVersion("1.2.3.4")).toThrow();
  });
});

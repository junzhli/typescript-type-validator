import { describe, it, expect } from "vitest";
import { Validator, field, objectField, arrayField, Type, InferFromRule } from "../src/index.js";
import { FieldTypeMismatchError, UnexpectedFieldError, ValidationError } from "../src/error.js";

describe("typescript-validator", () => {
  it("should infer types correctly with InferFromRule", () => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const rule = {
      a: field(Type.String),
      b: field(Type.Number, true),
      c: objectField({
        d: field(Type.Bool),
        e: field(Type.String, true),
      }),
      f: arrayField(field(Type.Number)),
      g: arrayField(objectField({ h: field(Type.String) }), true),
    } as const;

    type Expected = {
      a: string;
      b?: number;
      c: { d: boolean; e?: string };
      f: number[];
      g?: { h: string }[];
    };

    // Type assertion: should not error
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const _assert: InferFromRule<typeof rule> = {} as Expected;
  });

  it("should validate simple flat objects", () => {
    const rule = {
      a: field(Type.String),
      b: field(Type.Number, true),
      c: field(Type.Bool),
    } as const;

    const valid = { a: "foo", c: true };
    const result = Validator.validate(rule, valid);
    expect(result).toEqual(valid);

    // Optional field present
    const valid2 = { a: "foo", b: 42, c: false };
    expect(Validator.validate(rule, valid2)).toEqual(valid2);

    // Missing required field
    try {
        Validator.validate(rule, { a: "foo" });
        throw new Error("Expected validation to fail");
    } catch (e) {
        expect(e).toBeInstanceOf(ValidationError);
        expect(e.error).toBeInstanceOf(FieldTypeMismatchError);
        expect(e.error.key).toBe("c");
    }

    // Wrong type
    try {
        Validator.validate(rule, { a: "foo", c: "not-a-bool" });
        throw new Error("Expected validation to fail");
    } catch (e) {
        expect(e).toBeInstanceOf(ValidationError);
        expect(e.error).toBeInstanceOf(FieldTypeMismatchError);
        expect(e.error.key).toBe("c");
    }
  });

  it("should validate nested objects", () => {
    const rule = {
      a: field(Type.String),
      b: objectField({
        c: field(Type.Number),
        d: field(Type.Bool, true),
      }),
    } as const;

    const valid = { a: "bar", b: { c: 1 } };
    expect(Validator.validate(rule, valid)).toEqual(valid);

    // Optional nested field present
    const valid2 = { a: "bar", b: { c: 1, d: false } };
    expect(Validator.validate(rule, valid2)).toEqual(valid2);

    // Missing nested required field
    try {
        Validator.validate(rule, { a: "bar", b: {} });
        throw new Error("Expected validation to fail");
    } catch (e) {
        expect(e).toBeInstanceOf(ValidationError);
        expect(e.error).toBeInstanceOf(FieldTypeMismatchError);
        expect(e.error.key).toBe("b.c");
    }
  });

  it("should validate arrays of primitives and objects", () => {
    const rule = {
      a: arrayField(field(Type.String)),
      b: arrayField(objectField({ c: field(Type.Number) }), true),
    } as const;

    const valid = { a: ["x", "y"], b: [{ c: 1 }, { c: 2 }] };
    expect(Validator.validate(rule, valid)).toEqual(valid);

    // Optional array omitted
    expect(Validator.validate(rule, { a: ["z"] })).toEqual({ a: ["z"] });

    // Wrong type in array
    try {
        Validator.validate(rule, { a: ["x", 2] });
        throw new Error("Expected validation to fail");
    } catch (e) {
        expect(e).toBeInstanceOf(ValidationError);
        expect(e.error).toBeInstanceOf(FieldTypeMismatchError);
        expect(e.error.key).toBe("a[1]");
    }

    // Wrong type in array of objects
    try {
        Validator.validate(rule, { a: ["x"], b: [{ c: "not-a-number" }] });
        throw new Error("Expected validation to fail");
    } catch (e) {
        expect(e).toBeInstanceOf(ValidationError);
        expect(e.error).toBeInstanceOf(FieldTypeMismatchError);
        expect(e.error.key).toBe("b[0].c");
    }
  });

  it("should throw on unexpected fields in strict mode", () => {
    const rule = {
      a: field(Type.String),
    } as const;

    const valid = { a: "foo" };
    expect(Validator.validate(rule, valid, true)).toEqual(valid);

    // Unexpected field
    try {
        Validator.validate(rule, { a: "foo", b: 1 }, true);
        throw new Error("Expected validation to fail");
    } catch (e) {
        expect(e).toBeInstanceOf(ValidationError);
        expect(e.error).toBeInstanceOf(UnexpectedFieldError);
        expect(e.error.key).toBe("b");
    }
  });

  it("should wrap field errors in ValidationError", () => {
    const rule = { a: field(Type.Number) } as const;
    try {
      Validator.validate(rule, { a: "not-a-number" });
    } catch (e) {
      expect(e).toBeInstanceOf(ValidationError);
      expect(e.error).toBeInstanceOf(FieldTypeMismatchError);
    }
  });
});
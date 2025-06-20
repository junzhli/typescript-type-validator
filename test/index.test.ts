import { describe, it, expect } from "vitest";
import { Validator, field, objectField, arrayField, Type, TypeFromSchema, customField, ValidateOptions } from "../src/index.js";
import { FieldTypeMismatchError, UnexpectedFieldError, ValidationError } from "../src/error.js";

describe("typescript-validator", () => {
  it("should infer types correctly with TypeFromSchema", () => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const schema = {
      custom: customField(() => { return true as const;  }),
      optionalCustom: customField(() => { return true as const;  }, { optional: true }),
      customArray: arrayField(customField(() => { return true as const;  })),
      optionalArray: arrayField(customField(() => { return true as const;  }), { optional: true }),
      a: field(Type.String),
      b: field(Type.Number, { optional: true }),
      c: objectField({
        d: field(Type.Bool),
        e: field(Type.String, { optional: true }),
        customField: customField(() => { return true as const;  }),
        optionalCustomField: customField(() => { return true as const;  }, { optional: true }),
      }),
      f: arrayField(field(Type.Number)),
      g: arrayField(objectField({ h: field(Type.String) }), { optional: true }),
    } as const;

    type Expected = {
      custom: true;
      customArray: true[];
      a: string;
      b?: number;
      c: { d: boolean; e?: string, customField: true };
      f: number[];
      g?: { h: string }[];
    };

    // Type assertion: should not error
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const _assert: TypeFromSchema<typeof schema> = {} as Expected;
  });

  it("should validate simple flat objects", () => {
    const schema = {
      a: field(Type.String),
      b: field(Type.Number, { optional: true }),
      c: field(Type.Bool),
    } as const;

    const valid = { a: "foo", c: true };
    const result = Validator.validate(schema, valid);
    expect(result).toEqual(valid);

    // Optional field present
    const valid2 = { a: "foo", b: 42, c: false };
    expect(Validator.validate(schema, valid2)).toEqual(valid2);

    // Missing required field
    try {
        Validator.validate(schema, { a: "foo" });
        throw new Error("Expected validation to fail");
    } catch (e) {
        expect(e).toBeInstanceOf(ValidationError);
        expect(e.error).toBeInstanceOf(FieldTypeMismatchError);
        expect(e.error.key).toBe("c");
    }

    // Wrong type
    try {
        Validator.validate(schema, { a: "foo", c: "not-a-bool" });
        throw new Error("Expected validation to fail");
    } catch (e) {
        expect(e).toBeInstanceOf(ValidationError);
        expect(e.error).toBeInstanceOf(FieldTypeMismatchError);
        expect(e.error.key).toBe("c");
    }
  });

  it("should validate nested objects", () => {
    const schema = {
      a: field(Type.String),
      b: objectField({
        c: field(Type.Number),
        d: field(Type.Bool, { optional: true }),
      }),
    } as const;

    const valid = { a: "bar", b: { c: 1 } };
    expect(Validator.validate(schema, valid)).toEqual(valid);

    // Optional nested field present
    const valid2 = { a: "bar", b: { c: 1, d: false } };
    expect(Validator.validate(schema, valid2)).toEqual(valid2);

    // Missing nested required field
    try {
        Validator.validate(schema, { a: "bar", b: {} });
        throw new Error("Expected validation to fail");
    } catch (e) {
        expect(e).toBeInstanceOf(ValidationError);
        expect(e.error).toBeInstanceOf(FieldTypeMismatchError);
        expect(e.error.key).toBe("b.c");
    }
  });

  it("should validate arrays of primitives and objects", () => {
    const schema = {
      a: arrayField(field(Type.String)),
      b: arrayField(objectField({ c: field(Type.Number) }), { optional: true }),
    } as const;

    const valid = { a: ["x", "y"], b: [{ c: 1 }, { c: 2 }] };
    expect(Validator.validate(schema, valid)).toEqual(valid);

    // Optional array omitted
    expect(Validator.validate(schema, { a: ["z"] })).toEqual({ a: ["z"] });

    // Wrong type in array
    try {
        Validator.validate(schema, { a: ["x", 2] });
        throw new Error("Expected validation to fail");
    } catch (e) {
        expect(e).toBeInstanceOf(ValidationError);
        expect(e.error).toBeInstanceOf(FieldTypeMismatchError);
        expect(e.error.key).toBe("a[1]");
    }

    // Wrong type in array of objects
    try {
        Validator.validate(schema, { a: ["x"], b: [{ c: "not-a-number" }] });
        throw new Error("Expected validation to fail");
    } catch (e) {
        expect(e).toBeInstanceOf(ValidationError);
        expect(e.error).toBeInstanceOf(FieldTypeMismatchError);
        expect(e.error.key).toBe("b[0].c");
    }
  });

  it("should throw on unexpected fields in strict mode", () => {
    const schema = {
      a: field(Type.String),
    } as const;

    const valid = { a: "foo" };
    expect(Validator.validate(schema, valid, { strict: true })).toEqual(valid);

    // Unexpected field
    try {
        Validator.validate(schema, { a: "foo", b: 1 }, { strict: true });
        throw new Error("Expected validation to fail");
    } catch (e) {
        expect(e).toBeInstanceOf(ValidationError);
        expect(e.error).toBeInstanceOf(UnexpectedFieldError);
        expect(e.error.key).toBe("b");
    }
  });

  it("should wrap field errors in ValidationError", () => {
    const schema = { a: field(Type.Number) } as const;
    try {
      Validator.validate(schema, { a: "not-a-number" });
    } catch (e) {
      expect(e).toBeInstanceOf(ValidationError);
      expect(e.error).toBeInstanceOf(FieldTypeMismatchError);
    }
  });

  it("should work with ValidateOptions object", () => {
    const schema = {
      a: field(Type.String),
      b: field(Type.Number, { optional: true }),
    } as const;

    const options: ValidateOptions = { strict: true };
    const valid = { a: "foo" };
    expect(Validator.validate(schema, valid, options)).toEqual(valid);

    // Test strict mode with ValidateOptions
    try {
      Validator.validate(schema, { a: "foo", unexpected: "field" }, options);
      throw new Error("Expected validation to fail");
    } catch (e) {
      expect(e).toBeInstanceOf(ValidationError);
      expect(e.error).toBeInstanceOf(UnexpectedFieldError);
    }
  });

  it("should prepend rootKey to error paths", () => {
    const schema = {
      user: objectField({
        name: field(Type.String),
        age: field(Type.Number),
      }),
    } as const;

    const options: ValidateOptions = { rootKey: "request.body" };
    
    try {
      Validator.validate(schema, { user: { name: "John", age: "invalid" } }, options);
      throw new Error("Expected validation to fail");
    } catch (e) {
      expect(e).toBeInstanceOf(ValidationError);
      expect(e.error).toBeInstanceOf(FieldTypeMismatchError);
      expect(e.error.key).toBe("request.body.user.age");
    }
  });

  it("should work with ValidateOptions defaults", () => {
    const schema = { a: field(Type.String) } as const;
    
    // Test with explicit options
    expect(Validator.validate(schema, { a: "test" }, { strict: true })).toEqual({ a: "test" });
    expect(Validator.validate(schema, { a: "test" }, { strict: false })).toEqual({ a: "test" });
    expect(Validator.validate(schema, { a: "test" }, {})).toEqual({ a: "test" });
    expect(Validator.validate(schema, { a: "test" })).toEqual({ a: "test" });
  });
});
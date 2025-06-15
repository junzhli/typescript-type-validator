import { describe, it, expect } from "vitest";
import {
  FieldTypeMismatchError,
  FieldNonNullableError,
  UnexpectedFieldError,
  ValidationError,
  isFieldValidationError,
} from "../src/error.js";
import { Type } from "../src/index.js";

describe("error classes", () => {
  it("FieldTypeMismatchError sets properties and message", () => {
    const err = new FieldTypeMismatchError("foo", Type.Number, 123);
    expect(err).toBeInstanceOf(FieldTypeMismatchError);
    expect(err.key).toBe("foo");
    expect(err.type).toBe(Type.Number);
    expect(err.value).toBe(123);
    expect(err.message).toContain('foo');
    expect(err.message).toContain('Number');
    expect(err.name).toBe("FieldValidationError");
  });

  it("FieldNonNullableError sets properties and message", () => {
    const err = new FieldNonNullableError("bar");
    expect(err).toBeInstanceOf(FieldNonNullableError);
    expect(err.key).toBe("bar");
    expect(err.message).toContain('bar');
    expect(err.name).toBe("FieldNonNullableError");
  });

  it("UnexpectedFieldError sets properties and message", () => {
    const err = new UnexpectedFieldError("baz");
    expect(err).toBeInstanceOf(UnexpectedFieldError);
    expect(err.key).toBe("baz");
    expect(err.message).toContain('baz');
    expect(err.name).toBe("UnexpectedFieldError");
  });

  it("isFieldValidationError type guard works", () => {
    const mismatch = new FieldTypeMismatchError("a", Type.String, 1);
    const nonnull = new FieldNonNullableError("b");
    const unexpected = new UnexpectedFieldError("c");
    expect(isFieldValidationError(mismatch)).toBe(true);
    expect(isFieldValidationError(nonnull)).toBe(true);
    expect(isFieldValidationError(unexpected)).toBe(true);
    expect(isFieldValidationError(new Error("nope"))).toBe(false);
    expect(isFieldValidationError({})).toBe(false);
  });

  it("ValidationError wraps a FieldValidationError", () => {
    const inner = new FieldTypeMismatchError("foo", Type.Bool, "bad");
    const err = new ValidationError(inner);
    expect(err).toBeInstanceOf(ValidationError);
    expect(err.error).toBe(inner);
    expect(err.message).toContain(inner.message);
    expect(err.name).toBe("ValidationError");
  });
});
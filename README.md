# Typescript type validator
[![NPM Version](https://img.shields.io/npm/v/typescript-type-validator)](https://www.npmjs.com/package/typescript-type-validator)
[![Build the project](https://github.com/junzhli/typescript-type-validator/actions/workflows/build.yaml/badge.svg?branch=main)](https://github.com/junzhli/typescript-type-validator/actions/workflows/build.yaml)

A fully TypeScript-supported type validator that enables type checks at both transpile time and runtime using a flexible schema and input validation.

## Features
* Type-Safe Schema Definition
* Automatic Type Inference
* Runtime Validation
* Optional Field Configuration with `fieldOptions`
* Nested Objects and Arrays
* Reusable Validators
* Flexible Validation Options (`ValidateOptions`)
* Strict Mode Validation with Enhanced Error Context
* Custom Type Field Validation

## Installation
```shell
# yarn
yarn add typescript-type-validator
# npm
npm install typescript-type-validator
```

## Usage

### 1. Define a Schema

```typescript
import { field, objectField, arrayField, customField, Type, Validator, TypeFromSchema, FieldOptions } from "typescript-type-validator";

// Define a schema for your data
const userSchema = {
  id: field(Type.Number),                             // required field (default)
  name: field(Type.String),                           // required field (default)
  email: field(Type.String, { optional: true }),      // optional field
  profile: objectField({
    age: field(Type.Number),                          // required field
    verified: field(Type.Bool, { optional: true }),   // optional field
  }),
  tags: arrayField(field(Type.String)),               // required array of strings
  posts: arrayField(objectField({
    title: field(Type.String),
    content: field(Type.String),
    published: field(Type.Bool, { optional: true }),
  }), { optional: true }),                            // optional array of objects
  // Custom field: must be a string that starts with "user_"
  customId: customField((val) => {
    if (typeof val !== "string" || !val.startsWith("user_")) throw new Error("customId must start with 'user_'");
    return val as `user_${string}`;
  }, { optional: true }),
} as const;
```

### 2. Get Inferred Type

```typescript
// TypeFromSchema gives you the TypeScript type for your schema
type User = TypeFromSchema<typeof userSchema>;
// User is:
// {
//   id: number;
//   name: string;
//   email?: string;
//   profile: { age: number; verified?: boolean };
//   tags: string[];
//   posts?: { title: string; content: string; published?: boolean }[];
//   customId?: `user_${string}`; // inferred from the custom field
// }
```

### 3. Validate Data at Runtime

```typescript
const userData = {
  id: 1,
  name: "Alice",
  profile: { age: 30 },
  tags: ["admin", "editor"],
};

const validated = Validator.validate(userSchema, userData);
// validated is now strongly typed as User

// Throws ValidationError if invalid:
try {
  Validator.validate(userSchema, { id: "not-a-number", name: "Bob", profile: { age: 20 }, tags: [] });
} catch (e) {
  console.error(e); // ValidationError with details
}
```

### 4. Use with Validation Options

```typescript
import { ValidateOptions } from "typescript-type-validator";

// Basic validation options
const options: ValidateOptions = {
  strict: true,           // throws on unexpected fields
  rootKey: "request.body" // prefixes all error keys
};

const userData = {
  id: 2,
  name: "Charlie",
  profile: { age: 25 },
  tags: ["user"],
  extra: "not allowed",
};

try {
  Validator.validate(userSchema, userData, options);
} catch (e) {
  console.error(e); // ValidationError: UnexpectedFieldError for key "request.body.extra"
}

// You can also use individual options
Validator.validate(userSchema, userData, { strict: true });
Validator.validate(userSchema, userData, { rootKey: "api.input" });
Validator.validate(userSchema, userData, {}); // default options
Validator.validate(userSchema, userData);     // default options
```

### 5. Enhanced Error Context with Root Key

The `rootKey` option is particularly useful for API validation where you want to provide clear error paths:

```typescript
const apiSchema = {
  user: objectField({
    profile: objectField({
      name: field(Type.String),
      age: field(Type.Number),
    })
  })
};

try {
  Validator.validate(apiSchema, {
    user: { profile: { name: "John", age: "invalid" } }
  }, { rootKey: "request.body" });
} catch (e) {
  console.error(e.error.key); // "request.body.user.profile.age"
  // Instead of just: "user.profile.age"
}
```

### 6. Use as a Class

```typescript
const userValidator = new Validator(userSchema);

// Same API as static method
const validUser = userValidator.validate({
  id: 3,
  name: "Dana",
  profile: { age: 40, verified: true },
  tags: [],
});

// With options
const validUserStrict = userValidator.validate(userData, { strict: true });
```

### 7. Custom Type Field Validation

You can define custom fields using your own resolver functions. The resolver receives the input value and must return the validated value. The return type will be inferred automatically.

```typescript
import { customField, Validator, TypeFromSchema } from "typescript-type-validator";

const schema = {
  evenNumber: customField((val, key) => {
    if (typeof val !== "number" || val % 2 !== 0) throw new Error(`Not an even number under key: ${key}`);
    return val; // must return the original value
  }),
  optionalEvenNumber: customField((val, key) => {
    if (typeof val !== "number" || val % 2 !== 0) throw new Error(`Not an even number under key: ${key}`);
    return val;
  }, { optional: true }),
};

type CustomType = TypeFromSchema<typeof schema>;
// CustomType is: { evenNumber: number; optionalEvenNumber?: number }

Validator.validate(schema, { evenNumber: 4 }); // OK
Validator.validate(schema, { evenNumber: 3 }); // Throws error
```

## Field Options

All field functions (`field`, `objectField`, `arrayField`, `customField`) support the `FieldOptions` parameter:

```typescript
type FieldOptions = { optional?: boolean };

// Examples:
field(Type.String)                     // required (default)
field(Type.String, {})                 // required (explicit)
field(Type.String, { optional: false }) // required (explicit)
field(Type.String, { optional: true })  // optional

objectField(schema)                    // required (default)
objectField(schema, { optional: true }) // optional

arrayField(innerField)                 // required (default)
arrayField(innerField, { optional: true }) // optional

customField(resolver)                  // required (default)
customField(resolver, { optional: true }) // optional
```

## Validation Options

The `ValidateOptions` type provides flexible validation configuration:

```typescript
type ValidateOptions = {
  strict?: boolean;   // Default: false - throws on unexpected fields when true
  rootKey?: string;   // Default: undefined - prefixes all error keys
};

// Usage examples:
Validator.validate(schema, data)                                    // defaults
Validator.validate(schema, data, {})                               // explicit defaults
Validator.validate(schema, data, { strict: true })                 // strict mode only
Validator.validate(schema, data, { rootKey: "api.request" })       // error context only
Validator.validate(schema, data, { strict: true, rootKey: "body" }) // both options
```

---

**Exports available:**
- `field`, `objectField`, `arrayField`, `customField` — for schema definition
- `Type` — enum for field types
- `FieldOptions` — type for field configuration options
- `ValidateOptions` — type for validation configuration options
- `TypeFromSchema` — type inference from schema
- `Validator` — class and static method for validation

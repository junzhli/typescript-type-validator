# Typescript type validator
![NPM Version](https://img.shields.io/npm/v/typescript-type-validator)

A fully TypeScript-supported type validator that enables type checks at both transpile time and runtime using a flexible schema and input validation.

## Features
* Type-Safe Schema Definition
* Automatic Type Inference
* Runtime Validation
* Optional and Required Fields
* Nested Objects and Arrays
* Reusable Validators
* Strict Mode Validation
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
import { field, objectField, arrayField, customField, Type, Validator, TypeFromSchema } from "typescript-type-validator";

// Define a schema for your data
const userSchema = {
  id: field(Type.Number),
  name: field(Type.String),
  email: field(Type.String, true), // optional
  profile: objectField({
    age: field(Type.Number),
    verified: field(Type.Bool, true), // optional
  }),
  tags: arrayField(field(Type.String)), // array of strings
  posts: arrayField(objectField({
    title: field(Type.String),
    content: field(Type.String),
    published: field(Type.Bool, true),
  }), true), // optional array of objects
  // Custom field: must be a string that starts with "user_"
  customId: customField((val) => {
    if (typeof val !== "string" || !val.startsWith("user_")) throw new Error("customId must start with 'user_'");
    return val as `user_${string}`;
  }, true),
} as const;
```

## 2. Get Inferred Type

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

## 3. Validate Data at Runtime

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

## 4. Use with Strict Mode

```typescript
const userData = {
  id: 2,
  name: "Charlie",
  profile: { age: 25 },
  tags: ["user"],
  extra: "not allowed",
};

try {
  Validator.validate(userSchema, userData, true); // strict mode: throws on unexpected fields
} catch (e) {
  console.error(e); // ValidationError: UnexpectedFieldError
}
```

## 5. Use as a Class

```typescript
const userValidator = new Validator(userSchema);

const validUser = userValidator.validate({
  id: 3,
  name: "Dana",
  profile: { age: 40, verified: true },
  tags: [],
});
```

## 6. Custom Type Field Validation

You can define custom fields using your own resolver functions. The resolver receives the input value and must return the validated value. The return type will be inferred automatically.

```typescript
import { customField, Validator, TypeFromSchema } from "typescript-type-validator";

const schema = {
  evenNumber: customField((val, key) => {
    if (typeof val !== "number" || val % 2 !== 0) throw new Error(`Not an even number under key: ${key}`);
    return val; // must return the original value
  }),
};

type CustomType = TypeFromSchema<typeof schema>;
// CustomType is: { evenNumber: number }

Validator.validate(schema, { evenNumber: 4 }); // OK
Validator.validate(schema, { evenNumber: 3 }); // Throws error
```

---

**Exports available:**
- `field`, `objectField`, `arrayField`, `customField` — for schema definition
- `Type` — enum for field types
- `TypeFromSchema` — type inference from schema
- `Validator` — class and static method for validation

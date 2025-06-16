
# Typescript type validator

A fully TypeScript-supported type validator that enables type checks at both transpile time and runtime using a flexible schema and input validation.

## Features
* Type-Safe Schema Definition
* Automatic Type Inference
* Runtime Validation
* Optional and Required Fields
* Nested Objects and Arrays
* Reusable Validators
* Strict Mode Validation

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
import { field, objectField, arrayField, Type, Validator, TypeFromSchema } from "typescript-type-validator";

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

---

**Exports available:**
- `field`, `objectField`, `arrayField` — for schema definition
- `Type` — enum for field types
- `TypeFromSchema` — type inference from schema
- `Validator` — class and static method for validation
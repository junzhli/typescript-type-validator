import { FieldTypeMismatchError, isFieldValidationError, UnexpectedFieldError, ValidationError } from "./error.js";

function _isString(val: unknown, key: string) {
    if (typeof val !== "string") {
        throw new FieldTypeMismatchError(key, Type.String, val);
    }
    return val;
}

const _isNumber = (val: unknown, key: string) => {
    if (typeof val !== "number") {
        throw new FieldTypeMismatchError(key, Type.Number, val);
    }
    return val;
}

const _isBool = (val: unknown, key: string) => {
    if (typeof val !== "boolean") {
        throw new FieldTypeMismatchError(key, Type.Bool, val);
    }
    return val;
}

const _isArray = <T>(obj: unknown, key: string, next: (item: T extends (infer U)[] ? U : never, index: number) => T extends (infer U)[] ? U : never) => {
    if (!Array.isArray(obj)) {
        throw new FieldTypeMismatchError(key, Type.Array, obj);
    }

    for (let i = 0; i < obj.length; i++) {
        const v = obj[i];
        obj[i] = next(v, i);
    }
    return obj as T;
}

const _isObject = <T>(obj: ObjectAny, key: string, next: (obj: ObjectAny) => T) => {
    if (typeof obj !== "object") {
        throw new FieldTypeMismatchError(key, Type.Object, obj);
    }
    return next(obj);
}

export enum Type {
    String = "String",
    Number = "Number",
    Bool = "Bool",
    Object = "Object",
    Array = "Array",
    Custom = "Custom",
}

type NotVoid<T> = Exclude<T, void>;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Resolver<T extends NotVoid<any>> = (val: unknown, key: string) => T;

type FieldTypesWithObjectAndCustom = FieldTypes | Type.Object | Type.Custom;

type Optional<T extends FieldTypesWithObjectAndCustom, U extends Schema = never, X extends Resolver<unknown> = never> = { __optional: true; type: T, schema: U, resolver: X }
type Required<T extends FieldTypesWithObjectAndCustom, U extends Schema = never, X extends Resolver<unknown> = never> = { __optional: false; type: T; schema: U, resolver: X }
type Field<T extends FieldTypesWithObjectAndCustom, U extends Schema = never, X extends Resolver<unknown> = never> = { __optional: boolean; type: T; schema: U, resolver: X }


type OptionalArray<T extends FieldTypesWithObjectAndCustom, U extends Schema = never, X extends Resolver<unknown> = never> = { __optional: true; type: Type.Array, field: Required<T, U, X> };
type RequiredArray<T extends FieldTypesWithObjectAndCustom, U extends Schema = never, X extends Resolver<unknown> = never> = { __optional: false; type: Type.Array, field: Required<T, U, X> };
type ArrayField<T extends FieldTypesWithObjectAndCustom, U extends Schema = never, X extends Resolver<unknown> = never> = { __optional: boolean; type: Type.Array, field: Required<T, U, X> };

function customField<X extends Resolver<unknown>>(resolver: X, optional: true): Optional<Type.Custom, never, X>;
function customField<X extends Resolver<unknown>>(resolver: X, optional?: false): Required<Type.Custom, never, X>;
function customField<X extends Resolver<unknown>>(resolver: X, optional: boolean = false): Field<Type.Custom, never, X> {
    return { __optional: optional, type: Type.Custom, schema: undefined as never, resolver };
}

type FieldTypes = Type.Bool | Type.Number | Type.String;

function field<T extends FieldTypes>(type: T, optional?: false): Required<T>;
function field<T extends FieldTypes>(type: T, optional: true): Optional<T>;
function field<T extends FieldTypes>(type: T, optional: boolean = false): Field<T> {
    return { __optional: optional, type, schema: undefined as never, resolver: undefined as never };
}

function objectField<T extends Schema>(schema: T, optional?: false): Required<Type.Object, T>;
function objectField<T extends Schema>(schema: T, optional: true): Optional<Type.Object, T>;
function objectField<T extends Schema>(schema: T, optional: boolean = false): Field<Type.Object, T> {
    return { __optional: optional, type: Type.Object, schema, resolver: undefined as never };
}

function arrayField<V extends Schema, U extends FieldTypesWithObjectAndCustom, X extends Resolver<unknown>, T extends Required<U, V, X>>(field: T, optional: true): OptionalArray<T["type"], T["schema"], T["resolver"]>;
function arrayField<V extends Schema, U extends FieldTypesWithObjectAndCustom, X extends Resolver<unknown>, T extends Required<U, V, X>>(field: T, optional?: false): RequiredArray<T["type"], T["schema"], T["resolver"]>;
function arrayField<V extends Schema, U extends FieldTypesWithObjectAndCustom, X extends Resolver<unknown>, T extends Required<U, V, X>>(field: T, optional: boolean = false): ArrayField<T["type"], T["schema"], T["resolver"]> {
    return { __optional: optional, type: Type.Array, field };
}

interface Schema {
    [key: string]: 
        Field<FieldTypes> |
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        Field<Type.Custom, never, Resolver<any>> |
        Field<Type.Object, Schema> |
        ArrayField<FieldTypes> |
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ArrayField<Type.Custom, never, Resolver<any>> |
        ArrayField<Type.Object, Schema>;
}

type TypeMap = {
    [Type.String]: string;
    [Type.Number]: number;
    [Type.Bool]: boolean;
    [Type.Object]: never;
    [Type.Array]: never;
}

type TypeFromSchema<R> = {
    // Optional properties
    [K in keyof R as R[K] extends { __optional: true } ? K : never]?:
        R[K] extends { field: infer U }
            ? U extends { type: infer U2, schema: infer Q, resolver: infer X }
                ? U2 extends Type.Object
                    ? TypeFromSchema<Q>[]
                : U2 extends FieldTypes
                    ? (TypeMap[U2])[]
                : U2 extends Type.Custom
                    ? X extends Resolver<infer Y>
                        ? Y[]
                        : never
                : never
            : U extends { type: infer U, resolver: infer X }
                ? U extends FieldTypes
                    ? (TypeMap[U])[]
                : U extends Type.Custom
                    ? X extends Resolver<infer Y>
                        ? Y[]
                    : never
                : never
            : never
        : R[K] extends { type: infer U, schema: infer Q, resolver: infer X }
            ? U extends Type.Object
                ? TypeFromSchema<Q>
            : U extends FieldTypes
                ? TypeMap[U]
            : U extends Type.Custom
                ? X extends Resolver<infer Y>
                    ? Y
                    : never
            : never
        : R[K] extends { type: infer U, resolver: infer X }
            ? U extends FieldTypes
                ? TypeMap[U]
                : U extends Type.Custom
                    ? X extends Resolver<infer Y>
                        ? Y
                    : never
                : never
            : never;
} & {
    // Required properties
    [K in keyof R as R[K] extends { __optional: false } ? K : never]:
        R[K] extends { field: infer U }
            ? U extends { type: infer U2, schema: infer Q, resolver: infer X }
                ? U2 extends Type.Object
                    ? TypeFromSchema<Q>[]
                : U2 extends FieldTypes
                    ? (TypeMap[U2])[]
                : U2 extends Type.Custom
                    ? X extends Resolver<infer Y>
                        ? Y[]
                        : never
                : never
            : U extends { type: infer U, resolver: infer X }
                ? U extends FieldTypes
                    ? (TypeMap[U])[]
                : U extends Type.Custom
                    ? X extends Resolver<infer Y>
                        ? Y[]
                    : never
                : never
            : never
        : R[K] extends { type: infer U, schema: infer Q, resolver: infer X }
            ? U extends Type.Object
                ? TypeFromSchema<Q>
            : U extends FieldTypes
                ? TypeMap[U]
            : U extends Type.Custom
                ? X extends Resolver<infer Y>
                    ? Y
                    : never
            : never
        : R[K] extends { type: infer U, resolver: infer X }
            ? U extends FieldTypes
                ? TypeMap[U]
                : U extends Type.Custom
                    ? X extends Resolver<infer Y>
                        ? Y
                    : never
                : never
            : never;
};

const _fieldChecker = <T extends Schema>(value: unknown, key: string, type: Type, strict: boolean, schema: T) => {
    switch (type) {
        case Type.String:
            return _isString(value, key);
        case Type.Number:
            return _isNumber(value, key);
        case Type.Bool:
            return _isBool(value, key);
        case Type.Object:
            if (schema) {
                return _isObject(value as ObjectAny, key, (o) => _objectFieldChecker(schema, o, strict, key));
            } else {
                throw new Error(`Object type for key ${key} must have a schema defined`);
            }
        default:
            throw new Error(`Unknown type for key ${key}`);
    }
}

type ObjectAny = { [key: string]: unknown };

const _objectFieldChecker = <T extends Schema>(schema: T, obj: ObjectAny, strict: boolean = false, rootKey?: string) => {
    if (strict) {
        const expectedKeys = Object.keys(schema);
        const actualKeys = Object.keys(obj);
        const unexpectedKeys = actualKeys.filter(key => !expectedKeys.includes(key));
        if (unexpectedKeys.length > 0) {
            throw new UnexpectedFieldError(unexpectedKeys[0]);
        }
    }
    for (const key of Object.keys(schema)) {
        const { __optional: isOptional, type } = schema[key];
        if (isOptional === true && obj?.[key] === undefined) {
            continue;
        }
        const _key = rootKey ? `${rootKey}.${key}` : key;
        switch (type) {
            case Type.String:
            case Type.Number:
            case Type.Bool:
            case Type.Object:
                _fieldChecker(obj?.[key], _key, type, strict, schema[key].schema);
                break;
            case Type.Array:
                { const field = schema[key].field;
                _isArray<
                    (typeof field extends { type: infer O; schema: infer P } 
                        ? O extends Type.Object
                            ? TypeFromSchema<P>
                        : O extends FieldTypes
                            ? TypeMap[O]
                            : never
                        : never)[]
                    >(obj?.[key], _key, (o, index) => {
                    return _fieldChecker(o, `${_key}[${index}]`, field.type, strict, field.schema);
                });
                break; }
            case Type.Custom:
                { const resolver = schema[key].resolver;
                if (typeof resolver !== "function") {
                    throw new Error(`Resolver for key ${key} must be a function`);
                }
                const result = resolver(obj?.[key], _key);
                if (result !== obj?.[key]) {
                    throw new Error(`Custom resolver for key ${key} did not return the origin value, which is not allowed`);
                }
                break; }
            default:
                throw new Error(`Unknown type for schema key ${key}`);
        }
    }
    return obj as TypeFromSchema<T>;
}



const _checkObject = <T>(obj: ObjectAny, checker: (obj: ObjectAny) => T): T => {
    return checker(obj);
}

class Validator<T extends Schema> {
    private schema: T;

    public static validate<T extends Schema>(schema: T, obj: ObjectAny, strict: boolean = false) {
        try {
            return _checkObject<TypeFromSchema<T>>(obj, (o) => _objectFieldChecker(schema, o, strict));
        } catch (error) {
            if (isFieldValidationError(error)) {
                throw new ValidationError(error);
            }
            throw error;
        }
    }

    constructor(schema: T) {
        this.schema = schema;
    }

    public validate(obj: ObjectAny, strict: boolean = false): TypeFromSchema<T> {
        return Validator.validate(this.schema, obj, strict);
    }
}

export {
    Validator,
    TypeFromSchema,
    objectField,
    field,
    arrayField,
    customField,
}

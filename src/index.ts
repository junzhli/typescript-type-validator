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

const _isObject = <T>(obj: ObjectAny, next: (obj: ObjectAny) => T) => {
    if (typeof obj !== "object") {
        throw new FieldTypeMismatchError("object", Type.Object, obj);
    }
    return next(obj);
}

export enum Type {
    String,
    Number,
    Bool,
    Object,
    Array,
}

type FieldTypesWithObject = FieldTypes | Type.Object;

type Optional<T extends FieldTypesWithObject, U extends Rule = never> = { __optional: true; type: T, rule: U }
type Required<T extends FieldTypesWithObject, U extends Rule = never> = { __optional: false; type: T; rule: U }
type Field<T extends FieldTypesWithObject, U extends Rule = never> = { __optional: boolean; type: T; rule: U }



type OptionalArray<T extends FieldTypesWithObject, U extends Rule = never> = { __optional: true; type: Type.Array, field: Required<T, U> };
type RequiredArray<T extends FieldTypesWithObject, U extends Rule = never> = { __optional: false; type: Type.Array, field: Required<T, U> };
type ArrayField<T extends FieldTypesWithObject, U extends Rule = never> = { __optional: boolean; type: Type.Array, field: Required<T, U> };


type FieldTypes = Type.Bool | Type.Number | Type.String;

function field<T extends FieldTypes>(type: T, optional?: false): Required<T>;
function field<T extends FieldTypes>(type: T, optional: true): Optional<T>;
function field<T extends FieldTypes>(type: T, optional: boolean = false): Field<T> {
    return { __optional: optional, type, rule: undefined as never };
}

function objectField<T extends Rule>(rule: T, optional?: false): Required<Type.Object, T>;
function objectField<T extends Rule>(rule: T, optional: true): Optional<Type.Object, T>;
function objectField<T extends Rule>(rule: T, optional: boolean = false): Field<Type.Object, T> {
    return { __optional: optional, type: Type.Object, rule };
}

function arrayField<V extends Rule, U extends FieldTypesWithObject, T extends Required<U, V>>(field: T, optional: true): OptionalArray<T["type"], T["rule"]>;
function arrayField<V extends Rule, U extends FieldTypesWithObject, T extends Required<U, V>>(field: T, optional?: false): RequiredArray<T["type"], T["rule"]>;
function arrayField<V extends Rule, U extends FieldTypesWithObject, T extends Required<U, V>>(field: T, optional: boolean = false): ArrayField<T["type"], T["rule"]> {
    return { __optional: optional, type: Type.Array, field };
}

interface Rule {
    [key: string]: Field<FieldTypes> | Field<Type.Object, Rule> | ArrayField<FieldTypes> | ArrayField<Type.Object, Rule>;
}

type TypeMap = {
    [Type.String]: string;
    [Type.Number]: number;
    [Type.Bool]: boolean;
    [Type.Object]: Rule;
    [Type.Array]: never;
}

type InferFromRule<R> = {
    // Optional properties
    [K in keyof R as R[K] extends { __optional: true } ? K : never]?:
        R[K] extends { field: infer U }
            ? U extends { type: infer U2, rule: infer Q }
                ? U2 extends Type.Object
                    ? InferFromRule<Q>[]
                : U2 extends FieldTypes
                    ? (TypeMap[U2])[]
                : never
            : U extends { type: infer U }
                ? U extends FieldTypes
                    ? (TypeMap[U])[]
                    : never
            : never
        : R[K] extends { type: infer U, rule: infer Q }
            ? U extends Type.Object
                ? InferFromRule<Q>
            : U extends FieldTypes
                ? TypeMap[U]
            : never
        : R[K] extends { type: infer U }
            ? U extends FieldTypes
                ? TypeMap[U]
                : never
            : never;
} & {
    // Required properties
    [K in keyof R as R[K] extends { __optional: false } ? K : never]:
        R[K] extends { field: infer U }
            ? U extends { type: infer U2, rule: infer Q }
                ? U2 extends Type.Object
                    ? InferFromRule<Q>[]
                : U2 extends FieldTypes
                    ? TypeMap[U2][]
                : never
            : U extends { type: infer U }
                ? U extends FieldTypes
                    ? TypeMap[U][]
                    : never
            : never
        : R[K] extends { type: infer U, rule: infer Q }
            ? U extends Type.Object
                ? InferFromRule<Q>
            : U extends FieldTypes
                ? TypeMap[U]
            : never
        : R[K] extends { type: infer U }
            ? U extends FieldTypes
                ? TypeMap[U]
                : never
            : never;
};

const _fieldChecker = <T extends Rule>(value: unknown, key: string, type: Type, strict: boolean, rule: T) => {
    switch (type) {
        case Type.String:
            return _isString(value, key);
        case Type.Number:
            return _isNumber(value, key);
        case Type.Bool:
            return _isBool(value, key);
        case Type.Object:
            if (rule) {
                return _isObject(value as ObjectAny, (o) => _objectFieldChecker(rule, o, strict, key));
            } else {
                throw new Error(`Object type for key ${key} must have a rule defined`);
            }
        default:
            throw new Error(`Unknown type for key ${key}`);
    }
}

type ObjectAny = { [key: string]: unknown };

const _objectFieldChecker = <T extends Rule>(rule: T, obj: ObjectAny, strict: boolean = false, rootKey?: string) => {
    if (strict) {
        const expectedKeys = Object.keys(rule);
        const actualKeys = Object.keys(obj);
        const unexpectedKeys = actualKeys.filter(key => !expectedKeys.includes(key));
        if (unexpectedKeys.length > 0) {
            throw new UnexpectedFieldError(unexpectedKeys[0]);
        }
    }
    const result: ObjectAny = {};
    for (const key of Object.keys(rule)) {
        const { __optional: isOptional, type } = rule[key];
        if (isOptional === true && obj?.[key] === undefined) {
            continue;
        }
        const _key = rootKey ? `${rootKey}.${key}` : key;
        switch (type) {
            case Type.String:
            case Type.Number:
            case Type.Bool:
            case Type.Object:
                result[key] = _fieldChecker(obj?.[key], _key, type, strict, rule[key].rule);
                break;
            case Type.Array:
                { const field = rule[key].field;
                result[key] = _isArray<
                    (typeof field extends { type: infer O; rule: infer P } 
                        ? O extends Type.Object
                            ? InferFromRule<P>
                        : O extends FieldTypes
                            ? TypeMap[O]
                            : never
                        : never)[]
                    >(obj?.[key], _key, (o, index) => {
                    return _fieldChecker(o, `${_key}[${index}]`, field.type, strict, field.rule);
                });
                break; }
            default:
                throw new Error(`Unknown type for rule key ${key}`);
        }
    }
    return result as InferFromRule<T>;
}



const _checkObject = <T>(obj: ObjectAny, checker: (obj: ObjectAny) => T): T => {
    return checker(obj);
}

class Validator<T extends Rule> {
    private rule: T;
    private strict: boolean;

    public static validate<T extends Rule>(rule: T, obj: ObjectAny, strict: boolean = false) {
        try {
            return _checkObject<InferFromRule<T>>(obj, (o) => _objectFieldChecker(rule, o, strict));
        } catch (error) {
            if (isFieldValidationError(error)) {
                throw new ValidationError(error);
            }
            throw error;
        }
    }

    constructor(rule: T, strict: boolean = false) {
        this.rule = rule;
        this.strict = strict;
    }

    public validate(obj: ObjectAny): InferFromRule<T> {
        return Validator.validate(this.rule, obj, this.strict);
    }
}

export {
    Validator,
    InferFromRule,
    objectField,
    field,
    arrayField,
}

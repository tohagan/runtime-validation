import {
  Validator,
  Result,
  isValidatorError,
  tString,
  tNumber,
  tBoolean,
  tAny,
  tUnknown,
  constant,
  tObject,
  tObjectStrict,
  tArray,
  tDict,
  optional,
  oneOf,
  union,
  intersection,
  withDefault,
  valueAt,
  succeed,
  tuple,
  fail,
  lazy
} from '../src/index';

describe('tString', () => {
  const validator = tString();

  it('succeeds when given a string', () => {
    expect(validator.run('hey')).toEqual({ok: true, result: 'hey'});
  });

  it('fails when given a number', () => {
    expect(validator.run(1)).toMatchObject({
      ok: false,
      error: {at: 'input', message: 'expected a string, got a number'}
    });
  });

  it('fails when given null', () => {
    expect(validator.run(null)).toMatchObject({
      ok: false,
      error: {at: 'input', message: 'expected a string, got null'}
    });
  });

  it('fails when given a boolean', () => {
    expect(validator.run(true)).toMatchObject({
      ok: false,
      error: {at: 'input', message: 'expected a string, got a boolean'}
    });
  });
});

describe('tNumber', () => {
  const validator = tNumber();

  it('succeeds when given a number', () => {
    expect(validator.run(5)).toEqual({ok: true, result: 5});
  });

  it('fails when given a string', () => {
    expect(validator.run('hey')).toMatchObject({
      ok: false,
      error: {at: 'input', message: 'expected a number, got a string'}
    });
  });

  it('fails when given a symbol', () => {
    expect(validator.run(Symbol())).toMatchObject({
      ok: false,
      error: {at: 'input', message: 'expected a number, got a symbol'}
    });
  });

  it('fails when given boolean', () => {
    expect(validator.run(true)).toMatchObject({
      ok: false,
      error: {at: 'input', message: 'expected a number, got a boolean'}
    });
  });
});

describe('tBoolean', () => {
  const validator = tBoolean();

  it('succeeds when given a boolean', () => {
    expect(validator.run(true)).toEqual({ok: true, result: true});
  });

  it('fails when given a string', () => {
    expect(validator.run('hey')).toMatchObject({
      ok: false,
      error: {at: 'input', message: 'expected a boolean, got a string'}
    });
  });

  it('fails when given a number', () => {
    expect(validator.run(1)).toMatchObject({
      ok: false,
      error: {at: 'input', message: 'expected a boolean, got a number'}
    });
  });
});

describe('tAny', () => {
  it('bypasses type validation', () => {
    // in a real use case this could be a deeply nested object
    type ComplexType = number;

    interface User {
      name: string;
      complexUserData: ComplexType;
    }

    const userValidator: Validator<User> = tObject({
      name: tString(),
      complexUserData: tAny()
    });

    expect(userValidator.run({name: 'Wanda', complexUserData: true})).toEqual({
      ok: true,
      result: {name: 'Wanda', complexUserData: true}
    });

    expect(userValidator.run({name: 'Willard', complexUserData: 'trash data'})).toEqual({
      ok: true,
      result: {name: 'Willard', complexUserData: 'trash data'}
    });

    expect(userValidator.run({name: 73, complexUserData: []})).toMatchObject({
      ok: false,
      error: {at: 'input.name', message: 'expected a string, got a number'}
    });
  });
});

describe('tUnknown', () => {
  it('accepts any values', () => {
    expect(tUnknown().run(1)).toEqual({ok: true, result: 1});
    expect(tUnknown().run(false)).toEqual({ok: true, result: false});
    expect(tUnknown().run({boots: 'n cats'})).toEqual({ok: true, result: {boots: 'n cats'}});
  });
});

describe('constant', () => {
  it('works for string-literals', () => {
    const validator: Validator<'zero'> = constant('zero');

    expect(validator.run('zero')).toEqual({ok: true, result: 'zero'});
  });

  it('fails when given two different values', () => {
    const validator: Validator<42> = constant(42);

    expect(validator.run(true)).toMatchObject({
      ok: false,
      error: {at: 'input', message: 'expected 42, got true'}
    });
  });

  it('can validate the true-literal type', () => {
    interface TrueValue {
      x: true;
    }
    const validator: Validator<TrueValue> = tObject({x: constant(true)});

    expect(validator.run({x: true})).toEqual({ok: true, result: {x: true}});
  });

  it('can validate the false-literal type', () => {
    interface FalseValue {
      x: false;
    }
    const validator: Validator<FalseValue> = tObject({x: constant(false)});

    expect(validator.run({x: false})).toEqual({ok: true, result: {x: false}});
  });

  it('can validate the null-literal type', () => {
    interface NullValue {
      x: null;
    }
    const validator: Validator<NullValue> = tObject({x: constant(null)});

    expect(validator.run({x: null})).toEqual({ok: true, result: {x: null}});
  });

  it('can validate a constant array', () => {
    const validator: Validator<[1, 2, 3]> = constant([1, 2, 3]);

    expect(validator.run([1, 2, 3])).toEqual({ok: true, result: [1, 2, 3]});
    expect(validator.run([1, 2, 3, 4])).toMatchObject({
      ok: false,
      error: {at: 'input', message: 'expected [1,2,3], got [1,2,3,4]'}
    });
  });

  it('can validate a constant object', () => {
    const validator: Validator<{a: true; b: 12}> = constant({a: true, b: 12});

    expect(validator.run({a: true, b: 12})).toEqual({ok: true, result: {a: true, b: 12}});
    expect(validator.run({a: true, b: 7})).toMatchObject({
      ok: false,
      error: {at: 'input', message: 'expected {"a":true,"b":12}, got {"a":true,"b":7}'}
    });
  });
});

describe('tObject', () => {
  describe('when given valid JSON', () => {
    it('can validate a simple object', () => {
      const validator = tObject({x: tNumber()});

      expect(validator.run({x: 5})).toMatchObject({ok: true, result: {x: 5}});
    });

    it('can validate a nested object', () => {
      const validator = tObject({
        payload: tObject({x: tNumber(), y: tNumber()}),
        error: constant(false)
      });
      const data = {payload: {x: 5, y: 2}, error: false};

      expect(validator.run(data)).toEqual({ok: true, result: data});
    });
  });

  describe('when given incorrect JSON', () => {
    it('fails when not given an object', () => {
      const validator = tObject({x: tNumber()});

      expect(validator.run('true')).toMatchObject({
        ok: false,
        error: {at: 'input', message: 'expected an object, got a string'}
      });
    });

    it('fails when given an array', () => {
      const validator = tObject({x: tNumber()});

      expect(validator.run([])).toMatchObject({
        ok: false,
        error: {at: 'input', message: 'expected an object, got an array'}
      });
    });

    it('reports a missing key', () => {
      const validator = tObject({x: tNumber()});

      expect(validator.run({})).toMatchObject({
        ok: false,
        error: {at: 'input', message: "the key 'x' is required but was not present"}
      });
    });

    it('reports invalid values', () => {
      const validator = tObject({name: tString()});

      expect(validator.run({name: 5})).toMatchObject({
        ok: false,
        error: {at: 'input.name', message: 'expected a string, got a number'}
      });
    });

    it('properly displays nested errors', () => {
      const validator = tObject({
        hello: tObject({
          hey: tObject({
            'Howdy!': tString()
          })
        })
      });

      const error = validator.run({hello: {hey: {'Howdy!': {}}}});
      expect(error).toMatchObject({
        ok: false,
        error: {at: 'input.hello.hey.Howdy!', message: 'expected a string, got an object'}
      });
    });
  });

  it('ignores optional fields that validate to undefined', () => {
    const validator = tObject({
      a: tNumber(),
      b: optional(tString())
    });

    expect(validator.run({a: 12, b: 'hats'})).toEqual({ok: true, result: {a: 12, b: 'hats'}});
    expect(validator.run({a: 12})).toEqual({ok: true, result: {a: 12}});
  });

  it('validates any object when the object shape is not specified', () => {
    const objectKeysValidator: Validator<string[]> = tObject().map(Object.keys);

    expect(objectKeysValidator.run({n: 1, i: [], c: {}, e: 'e'})).toEqual({
      ok: true,
      result: ['n', 'i', 'c', 'e']
    });
  });
});

describe('tObjectStrict', () => {

  describe('when given valid JSON', () => {
    it('can validate a simple object', () => {
      const validator = tObjectStrict({x: tNumber()});

      expect(validator.run({x: 5})).toMatchObject({ok: true, result: {x: 5}});
    });

    it('can validate a nested object', () => {
      const validator = tObjectStrict({
        payload: tObjectStrict({x: tNumber(), y: tNumber()}),
        error: constant(false)
      });
      const data = {payload: {x: 5, y: 2}, error: false};

      expect(validator.run(data)).toEqual({ok: true, result: data});
    });
  });

  describe('when given incorrect JSON', () => {
    it('fails when not given an object', () => {
      const validator = tObjectStrict({x: tNumber()});

      expect(validator.run('true')).toMatchObject({
        ok: false,
        error: {at: 'input', message: 'expected an object, got a string'}
      });
    });

    it('fails when given an array', () => {
      const validator = tObjectStrict({x: tNumber()});

      expect(validator.run([])).toMatchObject({
        ok: false,
        error: {at: 'input', message: 'expected an object, got an array'}
      });
    });

    it('reports a missing key', () => {
      const validator = tObjectStrict({x: tNumber()});

      expect(validator.run({})).toMatchObject({
        ok: false,
        error: {at: 'input', message: "the key 'x' is required but was not present"}
      });
    });

    it('reports an added (non-strict) key', () => {
      const validator = tObjectStrict({x: tNumber()});

      expect(validator.run({x: 3, added: 7})).toMatchObject({
        ok: false,
        error: {at: 'input', message: "an undefined key 'added' is present in the object"}
      });
    });

    it('reports invalid values', () => {
      const validator = tObjectStrict({name: tString()});

      expect(validator.run({name: 5})).toMatchObject({
        ok: false,
        error: {at: 'input.name', message: 'expected a string, got a number'}
      });
    });

    it('properly displays nested errors', () => {
      const validator = tObjectStrict({
        hello: tObjectStrict({
          hey: tObjectStrict({
            'Howdy!': tString()
          })
        })
      });

      const error = validator.run({hello: {hey: {'Howdy!': {}}}});
      expect(error).toMatchObject({
        ok: false,
        error: {at: 'input.hello.hey.Howdy!', message: 'expected a string, got an object'}
      });
    });
  });

  it('ignores optional fields that validate to undefined', () => {
    const validator = tObjectStrict({
      a: tNumber(),
      b: optional(tString())
    });

    expect(validator.run({a: 12, b: 'hats'})).toEqual({ok: true, result: {a: 12, b: 'hats'}});
    expect(validator.run({a: 12})).toEqual({ok: true, result: {a: 12}});
  });

  it('validates any object when the object shape is not specified', () => {
    const objectKeysValidator: Validator<string[]> = tObject().map(Object.keys);

    expect(objectKeysValidator.run({n: 1, i: [], c: {}, e: 'e'})).toEqual({
      ok: true,
      result: ['n', 'i', 'c', 'e']
    });
  });
});

describe('tArray', () => {
  const validator = tArray(tNumber());

  it('works when given an array', () => {
    expect(validator.run([1, 2, 3])).toEqual({ok: true, result: [1, 2, 3]});
  });

  it('fails when given something other than a array', () => {
    expect(validator.run('oops')).toMatchObject({
      ok: false,
      error: {at: 'input', message: 'expected an array, got a string'}
    });
  });

  describe('when given something other than an array', () => {
    it('fails when the elements are of the wrong type', () => {
      expect(validator.run(['dang'])).toMatchObject({
        ok: false,
        error: {at: 'input[0]', message: 'expected a number, got a string'}
      });
    });

    it('properly displays nested errors', () => {
      const nestedValidator = tArray(tArray(tArray(tNumber())));

      expect(nestedValidator.run([[], [], [[1, 2, 3, false]]])).toMatchObject({
        ok: false,
        error: {at: 'input[2][0][3]', message: 'expected a number, got a boolean'}
      });
    });
  });

  it('validates any array when the array members validator is not specified', () => {
    const validNumbersValidator = tArray()
      .map((arr: unknown[]) => arr.map(tNumber().run))
      .map(Result.successes);

    expect(validNumbersValidator.run([1, true, 2, 3, 'five', 4, []])).toEqual({
      ok: true,
      result: [1, 2, 3, 4]
    });

    expect(validNumbersValidator.run([false, 'hi', {}])).toEqual({ok: true, result: []});

    expect(validNumbersValidator.run(false)).toMatchObject({
      ok: false,
      error: {message: 'expected an array, got a boolean'}
    });
  });
});

describe('tuple', () => {
  describe('when given valid JSON', () => {
    it('can validate a simple tuple', () => {
      const validator: Validator<[number, number]> = tuple([tNumber(), tNumber()]);

      expect(validator.run([5, 6])).toMatchObject({ok: true, result: [5, 6]});
    });

    it('can validate tuples of mixed types', () => {
      const validator: Validator<[number, string]> = tuple([tNumber(), tString()]);

      expect(validator.run([1, 'a'])).toMatchObject({ok: true, result: [1, 'a']});
    });

    it('can validate a nested object', () => {
      const validator: Validator<[{x: number; y: number}, false]> = tuple([
        tObject({x: tNumber(), y: tNumber()}),
        constant(false)
      ]);
      const data = [{x: 5, y: 2}, false];

      expect(validator.run(data)).toEqual({ok: true, result: data});
    });
  });

  describe('when given incorrect JSON', () => {
    it('fails when the array length does not match', () => {
      const validator: Validator<[number]> = tuple([tNumber()]);

      expect(validator.run([1, 2])).toMatchObject({
        ok: false,
        error: {at: 'input', message: 'expected a tuple of length 1, got one of length 2'}
      });
    });

    it('fails when given an object', () => {
      const validator: Validator<[number]> = tuple([tNumber()]);

      expect(validator.run({x: 1})).toMatchObject({
        ok: false,
        error: {at: 'input', message: 'expected a tuple of length 1, got an object'}
      });
    });

    it('reports invalid values', () => {
      const validator: Validator<[number, string]> = tuple([tNumber(), tString()]);

      expect(validator.run([4, 5])).toMatchObject({
        ok: false,
        error: {at: 'input[1]', message: 'expected a string, got a number'}
      });
    });

    it('properly displays nested errors', () => {
      const validator: Validator<[{hey: {'Howdy!': string}}]> = tuple([
        tObject({
          hey: tObject({
            'Howdy!': tString()
          })
        })
      ]);

      const error = validator.run([{hey: {'Howdy!': {}}}]);
      expect(error).toMatchObject({
        ok: false,
        error: {at: 'input[0].hey.Howdy!', message: 'expected a string, got an object'}
      });
    });
  });
});

describe('tDict', () => {
  describe('with a simple value validator', () => {
    const validator = tDict(tNumber());

    it('can validate an empty object', () => {
      expect(validator.run({})).toEqual({ok: true, result: {}});
    });

    it('can validate an object of with arbitrary keys', () => {
      expect(validator.run({a: 1, b: 2})).toEqual({ok: true, result: {a: 1, b: 2}});
    });

    it('fails if a value cannot be validated', () => {
      expect(validator.run({oh: 'no'})).toMatchObject({
        ok: false,
        error: {at: 'input.oh', message: 'expected a number, got a string'}
      });
    });

    it('fails if given an array', () => {
      expect(validator.run([])).toMatchObject({
        ok: false,
        error: {at: 'input', message: 'expected an object, got an array'}
      });
    });

    it('fails if given a primitive', () => {
      expect(validator.run(5)).toMatchObject({
        ok: false,
        error: {at: 'input', message: 'expected an object, got a number'}
      });
    });
  });

  describe('given a transformative value validator', () => {
    const validator = tDict(tString().map(str => str + '!'));

    it('transforms the values', () => {
      expect(validator.run({hey: 'there', yo: 'dude'})).toEqual({
        ok: true,
        result: {hey: 'there!', yo: 'dude!'}
      });
    });
  });
});

describe('optional', () => {
  describe('decoding a non-object type', () => {
    const validator = optional(tNumber());

    it('can validate the given type', () => {
      expect(validator.run(5)).toEqual({ok: true, result: 5});
    });

    it('can validate undefined', () => {
      expect(validator.run(undefined)).toEqual({ok: true, result: undefined});
    });

    it('fails when the value is invalid', () => {
      expect(validator.run(false)).toMatchObject({
        ok: false,
        error: {at: 'input', message: 'expected a number, got a boolean'}
      });
    });
  });

  describe('decoding an interface with optional fields', () => {
    interface User {
      id: number;
      isDog?: boolean;
    }

    const validator: Validator<User> = tObject({
      id: tNumber(),
      isDog: optional(tBoolean())
    });

    it('can validate the object when the optional field is present', () => {
      expect(validator.run({id: 1, isDog: true})).toEqual({ok: true, result: {id: 1, isDog: true}});
    });

    it('can validate the object when the optional field is missing', () => {
      expect(validator.run({id: 2})).toEqual({ok: true, result: {id: 2}});
    });

    it('fails when the optional field is invalid', () => {
      const error = validator.run({id: 3, isDog: 'supdog'});
      expect(error).toMatchObject({
        ok: false,
        error: {at: 'input.isDog', message: 'expected a boolean, got a string'}
      });
    });
  });
});

describe('oneOf', () => {
  describe('when given valid input', () => {
    it('can validate a value with a single alternative', () => {
      const validator = oneOf(tString());

      expect(validator.run('yo')).toEqual({ok: true, result: 'yo'});
    });

    it('can validate a value with multiple alternatives', () => {
      const validator = tArray(oneOf(tString().map(s => s.length), tNumber()));

      expect(validator.run(['hey', 10])).toEqual({ok: true, result: [3, 10]});
    });
  });

  it('fails when a value does not match any validator', () => {
    const validator = oneOf(tString(), tNumber().map(String));

    expect(validator.run([])).toMatchObject({
      ok: false,
      error: {
        at: 'input',
        message:
          'expected a value matching one of the validators, got the errors ' +
          '["at error: expected a string, got an array", "at error: expected a number, got an array"]'
      }
    });
  });

  it('fails and reports errors for nested values', () => {
    const validator = tArray(
      oneOf(valueAt([1, 'a', 'b'], tNumber()), valueAt([1, 'a', 'x'], tNumber()))
    );

    expect(validator.run([[{}, {a: {b: true}}]])).toMatchObject({
      ok: false,
      error: {
        at: 'input[0]',
        message:
          'expected a value matching one of the validators, got the errors ' +
          '["at error[1].a.b: expected a number, got a boolean", ' +
          '"at error[1].a.x: path does not exist"]'
      }
    });
  });

  it('can act as the union function when given the correct annotation', () => {
    type C = {a: string} | {b: number};

    const validator: Validator<C> = oneOf(tObject<C>({a: tString()}), tObject<C>({b: tNumber()}));

    expect(validator.run({a: 'xyz'})).toEqual({ok: true, result: {a: 'xyz'}});
  });
});

describe('union', () => {
  interface A {
    kind: 'a';
    value: number;
  }
  interface B {
    kind: 'b';
    value: boolean;
  }
  type C = A | B;

  const validator: Validator<C> = union(
    tObject({kind: constant('a'), value: tNumber()}),
    tObject({kind: constant('b'), value: tBoolean()})
  );

  it('can validate a value that matches one of the union types', () => {
    const data = {kind: 'a', value: 12};
    expect(validator.run(data)).toEqual({ok: true, result: data});
  });

  it('fails when a value does not match any validators', () => {
    const error = validator.run({kind: 'b', value: 12});
    expect(error).toMatchObject({
      ok: false,
      error: {
        at: 'input',
        message:
          'expected a value matching one of the validators, got the errors ' +
          '["at error.kind: expected "a", got "b"", "at error.value: expected a boolean, got a number"]'
      }
    });
  });
});

describe('intersection', () => {
  it('uses two validators to validate an extended interface', () => {
    interface A {
      a: number;
    }

    interface AB extends A {
      b: string;
    }

    const aValidator: Validator<A> = tObject({a: tNumber()});
    const abValidator: Validator<AB> = intersection(aValidator, tObject({b: tString()}));

    expect(abValidator.run({a: 12, b: '!!!'})).toEqual({ok: true, result: {a: 12, b: '!!!'}});
  });

  it('can combine many validators', () => {
    interface UVWXYZ {
      u: true;
      v: string[];
      w: boolean | null;
      x: number;
      y: string;
      z: boolean;
    }

    const uvwxyzValidator: Validator<UVWXYZ> = intersection(
      tObject({u: constant(true)}),
      tObject({v: tArray(tString())}),
      tObject({w: union(tBoolean(), constant(null))}),
      tObject({x: tNumber()}),
      tObject({y: tString(), z: tBoolean()})
    );

    expect(uvwxyzValidator.run({u: true, v: [], w: null, x: 4, y: 'y', z: false})).toEqual({
      ok: true,
      result: {u: true, v: [], w: null, x: 4, y: 'y', z: false}
    });
  });
});

describe('withDefault', () => {
  const validator = withDefault('puppies', tString());

  it('uses the data value when decoding is successful', () => {
    expect(validator.run('pancakes')).toEqual({ok: true, result: 'pancakes'});
  });

  it('uses the default when the validator fails', () => {
    expect(validator.run(5)).toEqual({ok: true, result: 'puppies'});
  });
});

describe('valueAt', () => {
  describe('validate an value', () => {
    it('can validate a single object field', () => {
      const validator = valueAt(['a'], tString());
      expect(validator.run({a: 'boots', b: 'cats'})).toEqual({ok: true, result: 'boots'});
    });

    it('can validate a single array value', () => {
      const validator = valueAt([1], tString());
      expect(validator.run(['boots', 'cats'])).toEqual({ok: true, result: 'cats'});
    });
  });

  describe('validate a nested path', () => {
    const validator = valueAt(['a', 1, 'b'], tString());

    it('can validate a field in a nested structure', () => {
      expect(validator.run({a: [{}, {b: 'surprise!'}]})).toEqual({ok: true, result: 'surprise!'});
    });

    it('fails when an array path does not exist', () => {
      expect(validator.run({a: []})).toMatchObject({
        ok: false,
        error: {at: 'input.a[1].b', message: 'path does not exist'}
      });
    });

    it('fails when an object path does not exist', () => {
      expect(validator.run({x: 12})).toMatchObject({
        ok: false,
        error: {at: 'input.a[1]', message: 'path does not exist'}
      });
    });

    it('fails when the validator fails at the end of the path', () => {
      expect(validator.run({a: ['a', {b: 12}]})).toMatchObject({
        ok: false,
        error: {at: 'input.a[1].b', message: 'expected a string, got a number'}
      });
    });
  });

  describe('validate an optional field', () => {
    const validator = valueAt(['a', 'b', 'c'], optional(tString()));

    it('fails when the path does not exist', () => {
      const error = validator.run({a: {x: 'cats'}});
      expect(error).toMatchObject({
        ok: false,
        error: {at: 'input.a.b.c', message: 'path does not exist'}
      });
    });

    it('succeeds when the final field is not found', () => {
      expect(validator.run({a: {b: {z: 1}}})).toEqual({ok: true, result: undefined});
    });
  });

  describe('non-object data', () => {
    it('only accepts data objects and arrays', () => {
      const validator = valueAt(['a'], tString());

      expect(validator.run('abc')).toMatchObject({
        ok: false,
        error: {at: 'input.a', message: 'expected an object, got a string'}
      });
      expect(validator.run(true)).toMatchObject({
        ok: false,
        error: {at: 'input.a', message: 'expected an object, got a boolean'}
      });
    });

    it('fails when a feild in the path does not correspond to a data object', () => {
      const validator = valueAt(['a', 'b', 'c'], tString());

      const error = validator.run({a: {b: 1}});
      expect(error).toMatchObject({
        ok: false,
        error: {at: 'input.a.b.c', message: 'expected an object, got a number'}
      });
    });

    it('fails when an index in the path does not correspond to a data array', () => {
      const validator = valueAt([0, 0, 1], tString());

      const error = validator.run([[false]]);
      expect(error).toMatchObject({
        ok: false,
        error: {at: 'input[0][0][1]', message: 'expected an array, got a boolean'}
      });
    });
  });

  it('validates the input when given an empty path', () => {
    const validator = valueAt([], tNumber());

    expect(validator.run(12)).toEqual({ok: true, result: 12});
  });
});

describe('succeed', () => {
  const validator = succeed(12345);

  it('always validates the input as the same value', () => {
    expect(validator.run('pancakes')).toEqual({ok: true, result: 12345});
    expect(validator.run(5)).toEqual({ok: true, result: 12345});
  });
});

describe('fail', () => {
  const wisdom = 'People don’t think it be like it is, but it do.';
  const validator = fail(wisdom);

  it('always fails and returns the same error message', () => {
    expect(validator.run('pancakes')).toMatchObject({
      ok: false,
      error: {at: 'input', message: wisdom}
    });
    expect(validator.run(5)).toMatchObject({ok: false, error: {at: 'input', message: wisdom}});
  });
});

describe('lazy', () => {
  describe('decoding a primitive data type', () => {
    const validator = lazy(() => tString());

    it('can validate type as normal', () => {
      expect(validator.run('hello')).toEqual({ok: true, result: 'hello'});
    });

    it('does not alter the error message', () => {
      expect(validator.run(5)).toMatchObject({
        ok: false,
        error: {at: 'input', message: 'expected a string, got a number'}
      });
    });
  });

  describe('decoding a recursive data structure', () => {
    interface Comment {
      msg: string;
      replies: Comment[];
    }

    const validator: Validator<Comment> = tObject({
      msg: tString(),
      replies: lazy(() => tArray(validator))
    });

    it('can validate the data structure', () => {
      const tree = {msg: 'hey', replies: [{msg: 'hi', replies: []}]};

      expect(validator.run(tree)).toEqual({
        ok: true,
        result: {msg: 'hey', replies: [{msg: 'hi', replies: []}]}
      });
    });

    it('fails when a nested value is invalid', () => {
      const badTree = {msg: 'hey', replies: [{msg: 'hi', replies: ['hello']}]};

      expect(validator.run(badTree)).toMatchObject({
        ok: false,
        error: {at: 'input.replies[0].replies[0]', message: 'expected an object, got a string'}
      });
    });
  });
});

describe('runPromise', () => {
  const promise = (data: unknown): Promise<boolean> => tBoolean().runPromise(data);

  it('resolves the promise when the validator succeeds', () => {
    return expect(promise(true)).resolves.toBe(true);
  });

  it('rejects the promise when the validator fails', () => {
    return expect(promise(42)).rejects.toEqual({
      kind: 'ValidatorError',
      input: 42,
      at: 'input',
      message: 'expected a boolean, got a number'
    });
  });

  it('returns a ValidatorError when the validator fails', () => {
    return expect(promise(42).catch(e => isValidatorError(e))).resolves.toBeTruthy();
  });
});

describe('runWithException', () => {
  const validator = tBoolean();

  it('can run a validator and return the successful value', () => {
    expect(validator.runWithException(false)).toBe(false);
  });

  it('throws an exception when the validator fails', () => {
    let thrownError: any;

    try {
      validator.runWithException(42);
    } catch (e) {
      thrownError = e;
    }

    expect(thrownError).toEqual({
      kind: 'ValidatorError',
      input: 42,
      at: 'input',
      message: 'expected a boolean, got a number'
    });
  });
});

describe('map', () => {
  it('can apply the identity function to the validator', () => {
    const validator = tString().map(x => x);

    expect(validator.run('hey there')).toEqual({ok: true, result: 'hey there'});
  });

  it('can apply an endomorphic function to the validator', () => {
    const validator = tNumber().map(x => x * 5);

    expect(validator.run(10)).toEqual({ok: true, result: 50});
  });

  it('can apply a function that transforms the type', () => {
    const validator = tString().map(x => x.length);

    expect(validator.run('hey')).toEqual({ok: true, result: 3});
  });
});

describe('andThen', () => {
  describe('creates validators based on previous results', () => {
    const versionValidator = valueAt(['version'], tNumber());
    const infoValidator3 = tObject({a: tBoolean()});

    const validator = versionValidator.andThen(version => {
      switch (version) {
        case 3:
          return infoValidator3;
        default:
          return fail(`Unable to validate info, version ${version} is not supported.`);
      }
    });

    it('can validate using both the first and second validator', () => {
      expect(validator.run({version: 5, x: 'bootsncats'})).toMatchObject({
        ok: false,
        error: {at: 'input', message: 'Unable to validate info, version 5 is not supported.'}
      });

      expect(validator.run({version: 3, a: true})).toEqual({ok: true, result: {a: true}});
    });

    it('fails when the first validator fails', () => {
      expect(validator.run({version: null, a: true})).toMatchObject({
        ok: false,
        error: {at: 'input.version', message: 'expected a number, got null'}
      });
    });

    it('fails when the second validator fails', () => {
      const data = {version: 3, a: 1};
      expect(validator.run(data)).toMatchObject({
        ok: false,
        error: {at: 'input.a', message: 'expected a boolean, got a number'}
      });
    });
  });

  it('creates validators for custom types', () => {
    type NonEmptyArray<T> = T[] & {__nonEmptyArrayBrand__: void};
    const createNonEmptyArray = <T>(arr: T[]): NonEmptyArray<T> => arr as NonEmptyArray<T>;

    const nonEmptyArrayValidator = <T>(values: Validator<T>): Validator<NonEmptyArray<T>> =>
      tArray(values).andThen(
        arr =>
          arr.length > 0
            ? succeed(createNonEmptyArray(arr))
            : fail(`expected a non-empty array, got an empty array`)
      );

    expect(nonEmptyArrayValidator(tNumber()).run([1, 2, 3])).toEqual({
      ok: true,
      result: [1, 2, 3]
    });

    expect(nonEmptyArrayValidator(tNumber()).run([])).toMatchObject({
      ok: false,
      error: {message: 'expected a non-empty array, got an empty array'}
    });
  });
});

describe('where', () => {
  const chars = (length: number): Validator<string> =>
    tString().where((s: string) => s.length === length, `expected a string of length ${length}`);

  const range = (min: number, max: number): Validator<number> =>
    tNumber().where(
      (n: number) => n >= min && n <= max,
      `expected a number between ${min} and ${max}`
    );

  it('can test for strings of a given length', () => {
    expect(chars(7).run('7777777')).toEqual({ok: true, result: '7777777'});

    expect(chars(7).run('666666')).toMatchObject({
      ok: false,
      error: {message: 'expected a string of length 7'}
    });
  });

  it('can test for numbers in a given range', () => {
    expect(range(1, 9).run(7)).toEqual({ok: true, result: 7});

    expect(range(1, 9).run(12)).toMatchObject({
      ok: false,
      error: {message: 'expected a number between 1 and 9'}
    });
  });

  it('reports when the base validator fails', () => {
    expect(chars(7).run(false)).toMatchObject({
      ok: false,
      error: {message: 'expected a string, got a boolean'}
    });

    expect(range(0, 1).run(null)).toMatchObject({
      ok: false,
      error: {message: 'expected a number, got null'}
    });
  });
});

describe('Result', () => {
  describe('can run a validator with default value', () => {
    const validator = tNumber();

    it('succeeds with the value', () => {
      expect(Result.withDefault(0, validator.run(12))).toEqual(12);
    });

    it('succeeds with the default value instead of failing', () => {
      expect(Result.withDefault(0, validator.run('999'))).toEqual(0);
    });
  });

  it('can return successes from an array of validated values', () => {
    const data: unknown = [1, true, 2, 3, 'five', 4, []];
    const dataArray: unknown[] = Result.withDefault([], tArray().run(data));
    const numbers: number[] = Result.successes(dataArray.map(tNumber().run));

    expect(numbers).toEqual([1, 2, 3, 4]);
  });
});

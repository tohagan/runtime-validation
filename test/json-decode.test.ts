import {
  Decoder,
  Result,
  isDecoderError,
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
  const decoder = tString();

  it('succeeds when given a string', () => {
    expect(decoder.run('hey')).toEqual({ok: true, result: 'hey'});
  });

  it('fails when given a number', () => {
    expect(decoder.run(1)).toMatchObject({
      ok: false,
      error: {at: 'input', message: 'expected a string, got a number'}
    });
  });

  it('fails when given null', () => {
    expect(decoder.run(null)).toMatchObject({
      ok: false,
      error: {at: 'input', message: 'expected a string, got null'}
    });
  });

  it('fails when given a boolean', () => {
    expect(decoder.run(true)).toMatchObject({
      ok: false,
      error: {at: 'input', message: 'expected a string, got a boolean'}
    });
  });
});

describe('tNumber', () => {
  const decoder = tNumber();

  it('succeeds when given a number', () => {
    expect(decoder.run(5)).toEqual({ok: true, result: 5});
  });

  it('fails when given a string', () => {
    expect(decoder.run('hey')).toMatchObject({
      ok: false,
      error: {at: 'input', message: 'expected a number, got a string'}
    });
  });

  it('fails when given a symbol', () => {
    expect(decoder.run(Symbol())).toMatchObject({
      ok: false,
      error: {at: 'input', message: 'expected a number, got a symbol'}
    });
  });

  it('fails when given boolean', () => {
    expect(decoder.run(true)).toMatchObject({
      ok: false,
      error: {at: 'input', message: 'expected a number, got a boolean'}
    });
  });
});

describe('tBoolean', () => {
  const decoder = tBoolean();

  it('succeeds when given a boolean', () => {
    expect(decoder.run(true)).toEqual({ok: true, result: true});
  });

  it('fails when given a string', () => {
    expect(decoder.run('hey')).toMatchObject({
      ok: false,
      error: {at: 'input', message: 'expected a boolean, got a string'}
    });
  });

  it('fails when given a number', () => {
    expect(decoder.run(1)).toMatchObject({
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

    const userDecoder: Decoder<User> = tObject({
      name: tString(),
      complexUserData: tAny()
    });

    expect(userDecoder.run({name: 'Wanda', complexUserData: true})).toEqual({
      ok: true,
      result: {name: 'Wanda', complexUserData: true}
    });

    expect(userDecoder.run({name: 'Willard', complexUserData: 'trash data'})).toEqual({
      ok: true,
      result: {name: 'Willard', complexUserData: 'trash data'}
    });

    expect(userDecoder.run({name: 73, complexUserData: []})).toMatchObject({
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
    const decoder: Decoder<'zero'> = constant('zero');

    expect(decoder.run('zero')).toEqual({ok: true, result: 'zero'});
  });

  it('fails when given two different values', () => {
    const decoder: Decoder<42> = constant(42);

    expect(decoder.run(true)).toMatchObject({
      ok: false,
      error: {at: 'input', message: 'expected 42, got true'}
    });
  });

  it('can decode the true-literal type', () => {
    interface TrueValue {
      x: true;
    }
    const decoder: Decoder<TrueValue> = tObject({x: constant(true)});

    expect(decoder.run({x: true})).toEqual({ok: true, result: {x: true}});
  });

  it('can decode the false-literal type', () => {
    interface FalseValue {
      x: false;
    }
    const decoder: Decoder<FalseValue> = tObject({x: constant(false)});

    expect(decoder.run({x: false})).toEqual({ok: true, result: {x: false}});
  });

  it('can decode the null-literal type', () => {
    interface NullValue {
      x: null;
    }
    const decoder: Decoder<NullValue> = tObject({x: constant(null)});

    expect(decoder.run({x: null})).toEqual({ok: true, result: {x: null}});
  });

  it('can decode a constant array', () => {
    const decoder: Decoder<[1, 2, 3]> = constant([1, 2, 3]);

    expect(decoder.run([1, 2, 3])).toEqual({ok: true, result: [1, 2, 3]});
    expect(decoder.run([1, 2, 3, 4])).toMatchObject({
      ok: false,
      error: {at: 'input', message: 'expected [1,2,3], got [1,2,3,4]'}
    });
  });

  it('can decode a constant object', () => {
    const decoder: Decoder<{a: true; b: 12}> = constant({a: true, b: 12});

    expect(decoder.run({a: true, b: 12})).toEqual({ok: true, result: {a: true, b: 12}});
    expect(decoder.run({a: true, b: 7})).toMatchObject({
      ok: false,
      error: {at: 'input', message: 'expected {"a":true,"b":12}, got {"a":true,"b":7}'}
    });
  });
});

describe('tObject', () => {
  describe('when given valid JSON', () => {
    it('can decode a simple object', () => {
      const decoder = tObject({x: tNumber()});

      expect(decoder.run({x: 5})).toMatchObject({ok: true, result: {x: 5}});
    });

    it('can decode a nested object', () => {
      const decoder = tObject({
        payload: tObject({x: tNumber(), y: tNumber()}),
        error: constant(false)
      });
      const json = {payload: {x: 5, y: 2}, error: false};

      expect(decoder.run(json)).toEqual({ok: true, result: json});
    });
  });

  describe('when given incorrect JSON', () => {
    it('fails when not given an object', () => {
      const decoder = tObject({x: tNumber()});

      expect(decoder.run('true')).toMatchObject({
        ok: false,
        error: {at: 'input', message: 'expected an object, got a string'}
      });
    });

    it('fails when given an array', () => {
      const decoder = tObject({x: tNumber()});

      expect(decoder.run([])).toMatchObject({
        ok: false,
        error: {at: 'input', message: 'expected an object, got an array'}
      });
    });

    it('reports a missing key', () => {
      const decoder = tObject({x: tNumber()});

      expect(decoder.run({})).toMatchObject({
        ok: false,
        error: {at: 'input', message: "the key 'x' is required but was not present"}
      });
    });

    it('reports invalid values', () => {
      const decoder = tObject({name: tString()});

      expect(decoder.run({name: 5})).toMatchObject({
        ok: false,
        error: {at: 'input.name', message: 'expected a string, got a number'}
      });
    });

    it('properly displays nested errors', () => {
      const decoder = tObject({
        hello: tObject({
          hey: tObject({
            'Howdy!': tString()
          })
        })
      });

      const error = decoder.run({hello: {hey: {'Howdy!': {}}}});
      expect(error).toMatchObject({
        ok: false,
        error: {at: 'input.hello.hey.Howdy!', message: 'expected a string, got an object'}
      });
    });
  });

  it('ignores optional fields that decode to undefined', () => {
    const decoder = tObject({
      a: tNumber(),
      b: optional(tString())
    });

    expect(decoder.run({a: 12, b: 'hats'})).toEqual({ok: true, result: {a: 12, b: 'hats'}});
    expect(decoder.run({a: 12})).toEqual({ok: true, result: {a: 12}});
  });

  it('decodes any object when the object shape is not specified', () => {
    const objectKeysDecoder: Decoder<string[]> = tObject().map(Object.keys);

    expect(objectKeysDecoder.run({n: 1, i: [], c: {}, e: 'e'})).toEqual({
      ok: true,
      result: ['n', 'i', 'c', 'e']
    });
  });
});

describe('tObjectStrict', () => {

  describe('when given valid JSON', () => {
    it('can decode a simple object', () => {
      const decoder = tObjectStrict({x: tNumber()});

      expect(decoder.run({x: 5})).toMatchObject({ok: true, result: {x: 5}});
    });

    it('can decode a nested object', () => {
      const decoder = tObjectStrict({
        payload: tObjectStrict({x: tNumber(), y: tNumber()}),
        error: constant(false)
      });
      const json = {payload: {x: 5, y: 2}, error: false};

      expect(decoder.run(json)).toEqual({ok: true, result: json});
    });
  });

  describe('when given incorrect JSON', () => {
    it('fails when not given an object', () => {
      const decoder = tObjectStrict({x: tNumber()});

      expect(decoder.run('true')).toMatchObject({
        ok: false,
        error: {at: 'input', message: 'expected an object, got a string'}
      });
    });

    it('fails when given an array', () => {
      const decoder = tObjectStrict({x: tNumber()});

      expect(decoder.run([])).toMatchObject({
        ok: false,
        error: {at: 'input', message: 'expected an object, got an array'}
      });
    });

    it('reports a missing key', () => {
      const decoder = tObjectStrict({x: tNumber()});

      expect(decoder.run({})).toMatchObject({
        ok: false,
        error: {at: 'input', message: "the key 'x' is required but was not present"}
      });
    });

    it('reports an added (non-strict) key', () => {
      const decoder = tObjectStrict({x: tNumber()});

      expect(decoder.run({x: 3, added: 7})).toMatchObject({
        ok: false,
        error: {at: 'input', message: "an undefined key 'added' is present in the object"}
      });
    });

    it('reports invalid values', () => {
      const decoder = tObjectStrict({name: tString()});

      expect(decoder.run({name: 5})).toMatchObject({
        ok: false,
        error: {at: 'input.name', message: 'expected a string, got a number'}
      });
    });

    it('properly displays nested errors', () => {
      const decoder = tObjectStrict({
        hello: tObjectStrict({
          hey: tObjectStrict({
            'Howdy!': tString()
          })
        })
      });

      const error = decoder.run({hello: {hey: {'Howdy!': {}}}});
      expect(error).toMatchObject({
        ok: false,
        error: {at: 'input.hello.hey.Howdy!', message: 'expected a string, got an object'}
      });
    });
  });

  it('ignores optional fields that decode to undefined', () => {
    const decoder = tObjectStrict({
      a: tNumber(),
      b: optional(tString())
    });

    expect(decoder.run({a: 12, b: 'hats'})).toEqual({ok: true, result: {a: 12, b: 'hats'}});
    expect(decoder.run({a: 12})).toEqual({ok: true, result: {a: 12}});
  });

  it('decodes any object when the object shape is not specified', () => {
    const objectKeysDecoder: Decoder<string[]> = tObject().map(Object.keys);

    expect(objectKeysDecoder.run({n: 1, i: [], c: {}, e: 'e'})).toEqual({
      ok: true,
      result: ['n', 'i', 'c', 'e']
    });
  });
});

describe('tArray', () => {
  const decoder = tArray(tNumber());

  it('works when given an array', () => {
    expect(decoder.run([1, 2, 3])).toEqual({ok: true, result: [1, 2, 3]});
  });

  it('fails when given something other than a array', () => {
    expect(decoder.run('oops')).toMatchObject({
      ok: false,
      error: {at: 'input', message: 'expected an array, got a string'}
    });
  });

  describe('when given something other than an array', () => {
    it('fails when the elements are of the wrong type', () => {
      expect(decoder.run(['dang'])).toMatchObject({
        ok: false,
        error: {at: 'input[0]', message: 'expected a number, got a string'}
      });
    });

    it('properly displays nested errors', () => {
      const nestedDecoder = tArray(tArray(tArray(tNumber())));

      expect(nestedDecoder.run([[], [], [[1, 2, 3, false]]])).toMatchObject({
        ok: false,
        error: {at: 'input[2][0][3]', message: 'expected a number, got a boolean'}
      });
    });
  });

  it('decodes any array when the array members decoder is not specified', () => {
    const validNumbersDecoder = tArray()
      .map((arr: unknown[]) => arr.map(tNumber().run))
      .map(Result.successes);

    expect(validNumbersDecoder.run([1, true, 2, 3, 'five', 4, []])).toEqual({
      ok: true,
      result: [1, 2, 3, 4]
    });

    expect(validNumbersDecoder.run([false, 'hi', {}])).toEqual({ok: true, result: []});

    expect(validNumbersDecoder.run(false)).toMatchObject({
      ok: false,
      error: {message: 'expected an array, got a boolean'}
    });
  });
});

describe('tuple', () => {
  describe('when given valid JSON', () => {
    it('can decode a simple tuple', () => {
      const decoder: Decoder<[number, number]> = tuple([tNumber(), tNumber()]);

      expect(decoder.run([5, 6])).toMatchObject({ok: true, result: [5, 6]});
    });

    it('can decode tuples of mixed types', () => {
      const decoder: Decoder<[number, string]> = tuple([tNumber(), tString()]);

      expect(decoder.run([1, 'a'])).toMatchObject({ok: true, result: [1, 'a']});
    });

    it('can decode a nested object', () => {
      const decoder: Decoder<[{x: number; y: number}, false]> = tuple([
        tObject({x: tNumber(), y: tNumber()}),
        constant(false)
      ]);
      const json = [{x: 5, y: 2}, false];

      expect(decoder.run(json)).toEqual({ok: true, result: json});
    });
  });

  describe('when given incorrect JSON', () => {
    it('fails when the array length does not match', () => {
      const decoder: Decoder<[number]> = tuple([tNumber()]);

      expect(decoder.run([1, 2])).toMatchObject({
        ok: false,
        error: {at: 'input', message: 'expected a tuple of length 1, got one of length 2'}
      });
    });

    it('fails when given an object', () => {
      const decoder: Decoder<[number]> = tuple([tNumber()]);

      expect(decoder.run({x: 1})).toMatchObject({
        ok: false,
        error: {at: 'input', message: 'expected a tuple of length 1, got an object'}
      });
    });

    it('reports invalid values', () => {
      const decoder: Decoder<[number, string]> = tuple([tNumber(), tString()]);

      expect(decoder.run([4, 5])).toMatchObject({
        ok: false,
        error: {at: 'input[1]', message: 'expected a string, got a number'}
      });
    });

    it('properly displays nested errors', () => {
      const decoder: Decoder<[{hey: {'Howdy!': string}}]> = tuple([
        tObject({
          hey: tObject({
            'Howdy!': tString()
          })
        })
      ]);

      const error = decoder.run([{hey: {'Howdy!': {}}}]);
      expect(error).toMatchObject({
        ok: false,
        error: {at: 'input[0].hey.Howdy!', message: 'expected a string, got an object'}
      });
    });
  });
});

describe('tDict', () => {
  describe('with a simple value decoder', () => {
    const decoder = tDict(tNumber());

    it('can decode an empty object', () => {
      expect(decoder.run({})).toEqual({ok: true, result: {}});
    });

    it('can decode an object of with arbitrary keys', () => {
      expect(decoder.run({a: 1, b: 2})).toEqual({ok: true, result: {a: 1, b: 2}});
    });

    it('fails if a value cannot be decoded', () => {
      expect(decoder.run({oh: 'no'})).toMatchObject({
        ok: false,
        error: {at: 'input.oh', message: 'expected a number, got a string'}
      });
    });

    it('fails if given an array', () => {
      expect(decoder.run([])).toMatchObject({
        ok: false,
        error: {at: 'input', message: 'expected an object, got an array'}
      });
    });

    it('fails if given a primitive', () => {
      expect(decoder.run(5)).toMatchObject({
        ok: false,
        error: {at: 'input', message: 'expected an object, got a number'}
      });
    });
  });

  describe('given a transformative value decoder', () => {
    const decoder = tDict(tString().map(str => str + '!'));

    it('transforms the values', () => {
      expect(decoder.run({hey: 'there', yo: 'dude'})).toEqual({
        ok: true,
        result: {hey: 'there!', yo: 'dude!'}
      });
    });
  });
});

describe('optional', () => {
  describe('decoding a non-object type', () => {
    const decoder = optional(tNumber());

    it('can decode the given type', () => {
      expect(decoder.run(5)).toEqual({ok: true, result: 5});
    });

    it('can decode undefined', () => {
      expect(decoder.run(undefined)).toEqual({ok: true, result: undefined});
    });

    it('fails when the value is invalid', () => {
      expect(decoder.run(false)).toMatchObject({
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

    const decoder: Decoder<User> = tObject({
      id: tNumber(),
      isDog: optional(tBoolean())
    });

    it('can decode the object when the optional field is present', () => {
      expect(decoder.run({id: 1, isDog: true})).toEqual({ok: true, result: {id: 1, isDog: true}});
    });

    it('can decode the object when the optional field is missing', () => {
      expect(decoder.run({id: 2})).toEqual({ok: true, result: {id: 2}});
    });

    it('fails when the optional field is invalid', () => {
      const error = decoder.run({id: 3, isDog: 'supdog'});
      expect(error).toMatchObject({
        ok: false,
        error: {at: 'input.isDog', message: 'expected a boolean, got a string'}
      });
    });
  });
});

describe('oneOf', () => {
  describe('when given valid input', () => {
    it('can decode a value with a single alternative', () => {
      const decoder = oneOf(tString());

      expect(decoder.run('yo')).toEqual({ok: true, result: 'yo'});
    });

    it('can decode a value with multiple alternatives', () => {
      const decoder = tArray(oneOf(tString().map(s => s.length), tNumber()));

      expect(decoder.run(['hey', 10])).toEqual({ok: true, result: [3, 10]});
    });
  });

  it('fails when a value does not match any decoder', () => {
    const decoder = oneOf(tString(), tNumber().map(String));

    expect(decoder.run([])).toMatchObject({
      ok: false,
      error: {
        at: 'input',
        message:
          'expected a value matching one of the decoders, got the errors ' +
          '["at error: expected a string, got an array", "at error: expected a number, got an array"]'
      }
    });
  });

  it('fails and reports errors for nested values', () => {
    const decoder = tArray(
      oneOf(valueAt([1, 'a', 'b'], tNumber()), valueAt([1, 'a', 'x'], tNumber()))
    );

    expect(decoder.run([[{}, {a: {b: true}}]])).toMatchObject({
      ok: false,
      error: {
        at: 'input[0]',
        message:
          'expected a value matching one of the decoders, got the errors ' +
          '["at error[1].a.b: expected a number, got a boolean", ' +
          '"at error[1].a.x: path does not exist"]'
      }
    });
  });

  it('can act as the union function when given the correct annotation', () => {
    type C = {a: string} | {b: number};

    const decoder: Decoder<C> = oneOf(tObject<C>({a: tString()}), tObject<C>({b: tNumber()}));

    expect(decoder.run({a: 'xyz'})).toEqual({ok: true, result: {a: 'xyz'}});
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

  const decoder: Decoder<C> = union(
    tObject({kind: constant('a'), value: tNumber()}),
    tObject({kind: constant('b'), value: tBoolean()})
  );

  it('can decode a value that matches one of the union types', () => {
    const json = {kind: 'a', value: 12};
    expect(decoder.run(json)).toEqual({ok: true, result: json});
  });

  it('fails when a value does not match any decoders', () => {
    const error = decoder.run({kind: 'b', value: 12});
    expect(error).toMatchObject({
      ok: false,
      error: {
        at: 'input',
        message:
          'expected a value matching one of the decoders, got the errors ' +
          '["at error.kind: expected "a", got "b"", "at error.value: expected a boolean, got a number"]'
      }
    });
  });
});

describe('intersection', () => {
  it('uses two decoders to decode an extended interface', () => {
    interface A {
      a: number;
    }

    interface AB extends A {
      b: string;
    }

    const aDecoder: Decoder<A> = tObject({a: tNumber()});
    const abDecoder: Decoder<AB> = intersection(aDecoder, tObject({b: tString()}));

    expect(abDecoder.run({a: 12, b: '!!!'})).toEqual({ok: true, result: {a: 12, b: '!!!'}});
  });

  it('can combine many decoders', () => {
    interface UVWXYZ {
      u: true;
      v: string[];
      w: boolean | null;
      x: number;
      y: string;
      z: boolean;
    }

    const uvwxyzDecoder: Decoder<UVWXYZ> = intersection(
      tObject({u: constant(true)}),
      tObject({v: tArray(tString())}),
      tObject({w: union(tBoolean(), constant(null))}),
      tObject({x: tNumber()}),
      tObject({y: tString(), z: tBoolean()})
    );

    expect(uvwxyzDecoder.run({u: true, v: [], w: null, x: 4, y: 'y', z: false})).toEqual({
      ok: true,
      result: {u: true, v: [], w: null, x: 4, y: 'y', z: false}
    });
  });
});

describe('withDefault', () => {
  const decoder = withDefault('puppies', tString());

  it('uses the json value when decoding is successful', () => {
    expect(decoder.run('pancakes')).toEqual({ok: true, result: 'pancakes'});
  });

  it('uses the default when the decoder fails', () => {
    expect(decoder.run(5)).toEqual({ok: true, result: 'puppies'});
  });
});

describe('valueAt', () => {
  describe('decode an value', () => {
    it('can decode a single object field', () => {
      const decoder = valueAt(['a'], tString());
      expect(decoder.run({a: 'boots', b: 'cats'})).toEqual({ok: true, result: 'boots'});
    });

    it('can decode a single array value', () => {
      const decoder = valueAt([1], tString());
      expect(decoder.run(['boots', 'cats'])).toEqual({ok: true, result: 'cats'});
    });
  });

  describe('decode a nested path', () => {
    const decoder = valueAt(['a', 1, 'b'], tString());

    it('can decode a field in a nested structure', () => {
      expect(decoder.run({a: [{}, {b: 'surprise!'}]})).toEqual({ok: true, result: 'surprise!'});
    });

    it('fails when an array path does not exist', () => {
      expect(decoder.run({a: []})).toMatchObject({
        ok: false,
        error: {at: 'input.a[1].b', message: 'path does not exist'}
      });
    });

    it('fails when an object path does not exist', () => {
      expect(decoder.run({x: 12})).toMatchObject({
        ok: false,
        error: {at: 'input.a[1]', message: 'path does not exist'}
      });
    });

    it('fails when the decoder fails at the end of the path', () => {
      expect(decoder.run({a: ['a', {b: 12}]})).toMatchObject({
        ok: false,
        error: {at: 'input.a[1].b', message: 'expected a string, got a number'}
      });
    });
  });

  describe('decode an optional field', () => {
    const decoder = valueAt(['a', 'b', 'c'], optional(tString()));

    it('fails when the path does not exist', () => {
      const error = decoder.run({a: {x: 'cats'}});
      expect(error).toMatchObject({
        ok: false,
        error: {at: 'input.a.b.c', message: 'path does not exist'}
      });
    });

    it('succeeds when the final field is not found', () => {
      expect(decoder.run({a: {b: {z: 1}}})).toEqual({ok: true, result: undefined});
    });
  });

  describe('non-object json', () => {
    it('only accepts json objects and arrays', () => {
      const decoder = valueAt(['a'], tString());

      expect(decoder.run('abc')).toMatchObject({
        ok: false,
        error: {at: 'input.a', message: 'expected an object, got a string'}
      });
      expect(decoder.run(true)).toMatchObject({
        ok: false,
        error: {at: 'input.a', message: 'expected an object, got a boolean'}
      });
    });

    it('fails when a feild in the path does not correspond to a json object', () => {
      const decoder = valueAt(['a', 'b', 'c'], tString());

      const error = decoder.run({a: {b: 1}});
      expect(error).toMatchObject({
        ok: false,
        error: {at: 'input.a.b.c', message: 'expected an object, got a number'}
      });
    });

    it('fails when an index in the path does not correspond to a json array', () => {
      const decoder = valueAt([0, 0, 1], tString());

      const error = decoder.run([[false]]);
      expect(error).toMatchObject({
        ok: false,
        error: {at: 'input[0][0][1]', message: 'expected an array, got a boolean'}
      });
    });
  });

  it('decodes the input when given an empty path', () => {
    const decoder = valueAt([], tNumber());

    expect(decoder.run(12)).toEqual({ok: true, result: 12});
  });
});

describe('succeed', () => {
  const decoder = succeed(12345);

  it('always decodes the input as the same value', () => {
    expect(decoder.run('pancakes')).toEqual({ok: true, result: 12345});
    expect(decoder.run(5)).toEqual({ok: true, result: 12345});
  });
});

describe('fail', () => {
  const wisdom = 'People don’t think it be like it is, but it do.';
  const decoder = fail(wisdom);

  it('always fails and returns the same error message', () => {
    expect(decoder.run('pancakes')).toMatchObject({
      ok: false,
      error: {at: 'input', message: wisdom}
    });
    expect(decoder.run(5)).toMatchObject({ok: false, error: {at: 'input', message: wisdom}});
  });
});

describe('lazy', () => {
  describe('decoding a primitive data type', () => {
    const decoder = lazy(() => tString());

    it('can decode type as normal', () => {
      expect(decoder.run('hello')).toEqual({ok: true, result: 'hello'});
    });

    it('does not alter the error message', () => {
      expect(decoder.run(5)).toMatchObject({
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

    const decoder: Decoder<Comment> = tObject({
      msg: tString(),
      replies: lazy(() => tArray(decoder))
    });

    it('can decode the data structure', () => {
      const tree = {msg: 'hey', replies: [{msg: 'hi', replies: []}]};

      expect(decoder.run(tree)).toEqual({
        ok: true,
        result: {msg: 'hey', replies: [{msg: 'hi', replies: []}]}
      });
    });

    it('fails when a nested value is invalid', () => {
      const badTree = {msg: 'hey', replies: [{msg: 'hi', replies: ['hello']}]};

      expect(decoder.run(badTree)).toMatchObject({
        ok: false,
        error: {at: 'input.replies[0].replies[0]', message: 'expected an object, got a string'}
      });
    });
  });
});

describe('runPromise', () => {
  const promise = (json: unknown): Promise<boolean> => tBoolean().runPromise(json);

  it('resolves the promise when the decoder succeeds', () => {
    return expect(promise(true)).resolves.toBe(true);
  });

  it('rejects the promise when the decoder fails', () => {
    return expect(promise(42)).rejects.toEqual({
      kind: 'DecoderError',
      input: 42,
      at: 'input',
      message: 'expected a boolean, got a number'
    });
  });

  it('returns a DecoderError when the decoder fails', () => {
    return expect(promise(42).catch(e => isDecoderError(e))).resolves.toBeTruthy();
  });
});

describe('runWithException', () => {
  const decoder = tBoolean();

  it('can run a decoder and return the successful value', () => {
    expect(decoder.runWithException(false)).toBe(false);
  });

  it('throws an exception when the decoder fails', () => {
    let thrownError: any;

    try {
      decoder.runWithException(42);
    } catch (e) {
      thrownError = e;
    }

    expect(thrownError).toEqual({
      kind: 'DecoderError',
      input: 42,
      at: 'input',
      message: 'expected a boolean, got a number'
    });
  });
});

describe('map', () => {
  it('can apply the identity function to the decoder', () => {
    const decoder = tString().map(x => x);

    expect(decoder.run('hey there')).toEqual({ok: true, result: 'hey there'});
  });

  it('can apply an endomorphic function to the decoder', () => {
    const decoder = tNumber().map(x => x * 5);

    expect(decoder.run(10)).toEqual({ok: true, result: 50});
  });

  it('can apply a function that transforms the type', () => {
    const decoder = tString().map(x => x.length);

    expect(decoder.run('hey')).toEqual({ok: true, result: 3});
  });
});

describe('andThen', () => {
  describe('creates decoders based on previous results', () => {
    const versionDecoder = valueAt(['version'], tNumber());
    const infoDecoder3 = tObject({a: tBoolean()});

    const decoder = versionDecoder.andThen(version => {
      switch (version) {
        case 3:
          return infoDecoder3;
        default:
          return fail(`Unable to decode info, version ${version} is not supported.`);
      }
    });

    it('can decode using both the first and second decoder', () => {
      expect(decoder.run({version: 5, x: 'bootsncats'})).toMatchObject({
        ok: false,
        error: {at: 'input', message: 'Unable to decode info, version 5 is not supported.'}
      });

      expect(decoder.run({version: 3, a: true})).toEqual({ok: true, result: {a: true}});
    });

    it('fails when the first decoder fails', () => {
      expect(decoder.run({version: null, a: true})).toMatchObject({
        ok: false,
        error: {at: 'input.version', message: 'expected a number, got null'}
      });
    });

    it('fails when the second decoder fails', () => {
      const json = {version: 3, a: 1};
      expect(decoder.run(json)).toMatchObject({
        ok: false,
        error: {at: 'input.a', message: 'expected a boolean, got a number'}
      });
    });
  });

  it('creates decoders for custom types', () => {
    type NonEmptyArray<T> = T[] & {__nonEmptyArrayBrand__: void};
    const createNonEmptyArray = <T>(arr: T[]): NonEmptyArray<T> => arr as NonEmptyArray<T>;

    const nonEmptyArrayDecoder = <T>(values: Decoder<T>): Decoder<NonEmptyArray<T>> =>
      tArray(values).andThen(
        arr =>
          arr.length > 0
            ? succeed(createNonEmptyArray(arr))
            : fail(`expected a non-empty array, got an empty array`)
      );

    expect(nonEmptyArrayDecoder(tNumber()).run([1, 2, 3])).toEqual({
      ok: true,
      result: [1, 2, 3]
    });

    expect(nonEmptyArrayDecoder(tNumber()).run([])).toMatchObject({
      ok: false,
      error: {message: 'expected a non-empty array, got an empty array'}
    });
  });
});

describe('where', () => {
  const chars = (length: number): Decoder<string> =>
    tString().where((s: string) => s.length === length, `expected a string of length ${length}`);

  const range = (min: number, max: number): Decoder<number> =>
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

  it('reports when the base decoder fails', () => {
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
  describe('can run a decoder with default value', () => {
    const decoder = tNumber();

    it('succeeds with the value', () => {
      expect(Result.withDefault(0, decoder.run(12))).toEqual(12);
    });

    it('succeeds with the default value instead of failing', () => {
      expect(Result.withDefault(0, decoder.run('999'))).toEqual(0);
    });
  });

  it('can return successes from an array of decoded values', () => {
    const json: unknown = [1, true, 2, 3, 'five', 4, []];
    const jsonArray: unknown[] = Result.withDefault([], tArray().run(json));
    const numbers: number[] = Result.successes(jsonArray.map(tNumber().run));

    expect(numbers).toEqual([1, 2, 3, 4]);
  });
});

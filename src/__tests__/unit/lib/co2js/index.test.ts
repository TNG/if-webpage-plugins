// SPDX-FileCopyrightText: 2023 Green Software Foundation
// SPDX-License-Identifier: MIT

import {Co2js} from '../../../../lib/co2js';

import {ERRORS} from '@grnsft/if-core/utils';

const {ConfigError, InputValidationError} = ERRORS;

/**
 * Disclaimer: the tests relying on carbon-operational values are unstable.
 *
 * The models used by co2js contain unversioned changes in the constants that
 * go into the calculation of the carbon-operational value.
 *
 * AzB copied these tests from the original plugin implementation
 * https://github.com/Green-Software-Foundation/if-unofficial-plugins/tree/main/src/lib/co2js
 * and just changed the values. More effort is needed to make them more stable.
 */

jest.mock('@tgwf/co2', () => {
  const original = jest.requireActual('@tgwf/co2');

  return {
    __esModule: true,
    co2: jest.fn(() => {
      if (process.env.WRONG_MODEL === 'true') {
        return {perByte: () => undefined};
      } else if (process.env.SWD_TYPE === 'true') {
        let version: number | undefined = undefined;
        if (process.env.SWD_VERSION) {
          version = Number(process.env.SWD_VERSION);
        }
        return new original.co2({model: 'swd', version});
      }
      return new original.co2({model: '1byte'});
    }),
  };
});

describe('lib/co2js: ', () => {
  describe('Co2js: ', () => {
    beforeEach(() => {
      process.env.WRONG_MODEL = 'false';
      process.env.SWD_TYPE = undefined;
      process.env.SWD_VERSION = undefined;
      jest.clearAllMocks();
    });

    describe('init Co2js: ', () => {
      it('initalizes object with properties.', async () => {
        const output = Co2js(undefined, {}, {});
        expect(output).toHaveProperty('metadata');
        expect(output).toHaveProperty('execute');
      });
    });

    describe('execute(): ', () => {
      it('returns a result when `network/data/bytes` is provided in the input.', async () => {
        const config = {type: '1byte'};
        const output = Co2js(config, {}, {});
        const inputs = [
          {
            timestamp: '2021-01-01T00:00:00Z',
            duration: 3600,
            'network/data/bytes': 100000,
            'green-web-host': true,
          },
        ];
        const result = await output.execute(inputs);

        expect.assertions(1);

        expect(result).toStrictEqual([
          {
            timestamp: '2021-01-01T00:00:00Z',
            duration: 3600,
            'network/data/bytes': 100000,
            'green-web-host': true,
            'carbon-operational': 0.023195833333333332,
          },
        ]);
      });

      it('returns the same input data when the co2 model returns undefined for the `type`.', async () => {
        process.env.WRONG_MODEL = 'true';
        const config = {type: '1byte'};
        const output = Co2js(config, {}, {});
        const inputs = [
          {
            timestamp: '2021-01-01T00:00:00Z',
            duration: 3600,
            'network/data/bytes': 100000,
            'green-web-host': true,
          },
        ];
        const result = await output.execute(inputs);

        expect.assertions(1);

        expect(result).toStrictEqual([
          {
            timestamp: '2021-01-01T00:00:00Z',
            duration: 3600,
            'network/data/bytes': 100000,
            'green-web-host': true,
          },
        ]);
      });

      it('returns a result when `network/data` is provided.', async () => {
        const config = {type: '1byte'};
        const output = Co2js(config, {}, {});
        const inputs = [
          {
            timestamp: '2021-01-01T00:00:00Z',
            duration: 3600,
            'network/data': 10,
            'green-web-host': true,
          },
        ];
        const result = await output.execute(inputs);

        expect.assertions(1);

        expect(result).toStrictEqual([
          {
            timestamp: '2021-01-01T00:00:00Z',
            duration: 3600,
            'network/data': 10,
            'green-web-host': true,
            'carbon-operational': 2319.583333333333,
          },
        ]);
      });

      it('returns a result when `green-web-host` is false.', async () => {
        const config = {type: '1byte'};
        const output = Co2js(config, {}, {});
        const inputs = [
          {
            timestamp: '2021-01-01T00:00:00Z',
            duration: 3600,
            'network/data/bytes': 100000,
            'green-web-host': false,
          },
        ];
        const result = await output.execute(inputs);

        expect.assertions(1);

        expect(result).toStrictEqual([
          {
            timestamp: '2021-01-01T00:00:00Z',
            duration: 3600,
            'network/data/bytes': 100000,
            'green-web-host': false,
            'carbon-operational': 0.029081299999999994,
          },
        ]);
      });

      it('returns a result when `type` has `swd` value in the config.', async () => {
        const config = {type: 'swd', version: 3};
        process.env.SWD_TYPE = config.type === 'swd' ? 'true' : 'false';
        process.env.SWD_VERSION = `${config.version}`;
        const output = Co2js(config, {}, {});
        const inputs = [
          {
            timestamp: '2021-01-01T00:00:00Z',
            duration: 3600,
            'network/data/bytes': 100000,
            'green-web-host': true,
          },
        ];

        expect.assertions(1);

        const result = await output.execute(inputs);

        expect(result).toStrictEqual([
          {
            timestamp: '2021-01-01T00:00:00Z',
            duration: 3600,
            'network/data/bytes': 100000,
            'green-web-host': true,
            'carbon-operational': 0.0254956723875,
          },
        ]);
      });

      it('returns a result when `type` is `swd` and `version` is given in config.', async () => {
        const config = {type: 'swd', version: 4};
        process.env.SWD_TYPE = config.type === 'swd' ? 'true' : 'false';
        process.env.SWD_VERSION = `${config.version}`;
        const output = Co2js(config, {}, {});
        const inputs = [
          {
            timestamp: '2021-01-01T00:00:00Z',
            duration: 3600,
            'network/data/bytes': 100000,
            'green-web-host': true,
          },
        ];

        expect.assertions(1);

        const result = await output.execute(inputs);

        expect(result).toStrictEqual([
          {
            timestamp: '2021-01-01T00:00:00Z',
            duration: 3600,
            'network/data/bytes': 100000,
            'green-web-host': true,
            'carbon-operational': 0.012103000000000001,
          },
        ]);
      });

      it('returns a result when `green-web-host` and `options` are provided in input.', async () => {
        const config = {type: 'swd'};
        process.env.SWD_TYPE = config.type === 'swd' ? 'true' : 'false';
        const output = Co2js(config, {}, {});
        const inputs = [
          {
            timestamp: '2021-01-01T00:00:00Z',
            duration: 3600,
            'network/data/bytes': 100000,
            'green-web-host': false,
            options: {
              dataReloadRatio: 0.6,
              firstVisitPercentage: 0.9,
              returnVisitPercentage: 0.1,
            },
          },
        ];
        const result = await output.execute(inputs);

        expect.assertions(1);

        expect(result).toStrictEqual([
          {
            timestamp: '2021-01-01T00:00:00Z',
            duration: 3600,
            'network/data/bytes': 100000,
            'carbon-operational': 0.037453104,
            'green-web-host': false,
            options: {
              dataReloadRatio: 0.6,
              firstVisitPercentage: 0.9,
              returnVisitPercentage: 0.1,
            },
          },
        ]);
      });

      it('throws an error when config is mising.', async () => {
        const errorMessage = 'Config is not provided.';
        const output = Co2js(undefined, {}, {});
        const inputs = [
          {
            timestamp: '2021-01-01T00:00:00Z',
            duration: 3600,
            'network/data/bytes': 100000,
            'green-web-host': true,
          },
        ];

        expect.assertions(2);

        try {
          await output.execute(inputs);
        } catch (error) {
          expect(error).toEqual(new ConfigError(errorMessage));
          expect(error).toBeInstanceOf(ConfigError);
        }
      });

      it('throws an error when `type` has wrong value.', async () => {
        const errorMessage =
          "\"type\" parameter is invalid enum value. expected '1byte' | 'swd', received 'wrong'. Error code: invalid_enum_value.";

        const config = {type: 'wrong', 'green-web-host': false};
        const output = Co2js(config, {}, {});
        const inputs = [
          {
            timestamp: '2021-01-01T00:00:00Z',
            duration: 3600,
            'network/data/bytes': 100000,
            'green-web-host': true,
          },
        ];

        expect.assertions(2);

        try {
          await output.execute(inputs);
        } catch (error) {
          expect(error).toEqual(new InputValidationError(errorMessage));
          expect(error).toBeInstanceOf(InputValidationError);
        }
      });

      it('throws an error if `network/data/bytes` is not provided.', async () => {
        const config = {type: '1byte', 'green-web-host': true};
        const output = Co2js(config, {}, {});
        const inputs = [
          {
            timestamp: '2021-01-01T00:00:00Z',
            duration: 3600,
          },
        ];

        expect.assertions(2);

        try {
          await output.execute(inputs);
        } catch (error) {
          expect(error).toEqual(
            new InputValidationError(
              'Either `network/data/bytes` or `network/data` should be provided in the input.'
            )
          );
          expect(error).toBeInstanceOf(InputValidationError);
        }
      });

      it('throws an error when version is provided with 1byte.', async () => {
        const config = {type: '1byte', version: 3};
        const output = Co2js(config, {}, {});
        const inputs = [
          {
            timestamp: '2021-01-01T00:00:00Z',
            duration: 3600,
          },
        ];

        expect.assertions(2);

        try {
          await output.execute(inputs);
        } catch (error) {
          expect(error).toEqual(
            new InputValidationError(
              '`version` can only be provided with `type` swd'
            )
          );
          expect(error).toBeInstanceOf(InputValidationError);
        }
      });
    });
  });
});

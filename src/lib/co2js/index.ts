// SPDX-FileCopyrightText: 2023 Green Software Foundation
// SPDX-License-Identifier: MIT

import {co2} from '@tgwf/co2';
import {z} from 'zod';

import {STRINGS} from '../../config';
import {validate} from '../../util/validations';

import {ERRORS} from '@grnsft/if-core/utils';
import {PluginFactory} from '@grnsft/if-core/interfaces';
import {ConfigParams, PluginParams} from '@grnsft/if-core/types';

const {ConfigError} = ERRORS;
const {MISSING_CONFIG} = STRINGS;

export const Co2js = PluginFactory({
  configValidation: (
    config: ConfigParams,
    _input: PluginParams | undefined
  ) => {
    const {validateConfig} = Co2jsUtils();
    return validateConfig(config);
  },
  inputValidation: (input: PluginParams, config: ConfigParams) => {
    const {validateInput} = Co2jsUtils();
    return validateInput(input, config);
  },
  implementation: async (inputs: PluginParams[], config: ConfigParams) => {
    const model = new co2({model: config.type, version: config.version});

    return inputs.map(input => {
      const {calculateResultByParams} = Co2jsUtils();
      const inputMergedIntoConfig = Object.assign({}, config, input);
      const result = calculateResultByParams(inputMergedIntoConfig, model);

      return result
        ? {
            ...input,
            'carbon-operational': result,
          }
        : input;
    });
  },
});

const Co2jsUtils = () => {
  const greenWebHostSchema = z.object({
    'green-web-host': z.boolean().optional(),
  });

  /**
   * Validates node config parameters.
   */
  const validateConfig = (config: ConfigParams) => {
    if (!config || !Object.keys(config)?.length) {
      throw new ConfigError(MISSING_CONFIG);
    }

    const schema = z
      .object({
        type: z.enum(['1byte', 'swd']),
        version: z.number().min(3).max(4).optional(),
      })
      .merge(greenWebHostSchema)
      .refine(data => data['type'] !== undefined, {
        message: '`type` must be provided in node config',
      })
      .refine(
        data => {
          if (data['type'] === '1byte') {
            return data['version'] === undefined;
          } else {
            return true;
          }
        },
        {
          message: '`version` can only be provided with `type` swd',
        }
      );

    return validate<z.infer<typeof schema>>(schema, config);
  };

  /**
   * Validates input parameters.
   */
  const validateInput = (input: PluginParams, config: ConfigParams) => {
    const inputSchema = z
      .object({
        'network/data/bytes': z.number().optional(),
        'network/data': z.number().optional(),
        options: z
          .object({
            dataReloadRatio: z.number().min(0).max(1).optional(),
            firstVisitPercentage: z.number().min(0).max(1).optional(),
            returnVisitPercentage: z.number().min(0).max(1).optional(),
            gridIntensity: z
              .object({
                device: z
                  .number()
                  .or(z.object({country: z.string()}))
                  .optional(),
                dataCenter: z
                  .number()
                  .or(z.object({country: z.string()}))
                  .optional(),
                networks: z
                  .number()
                  .or(z.object({country: z.string()}))
                  .optional(),
              })
              .optional(),
          })
          .optional(),
      })
      .merge(greenWebHostSchema)
      .refine(data => !!data['network/data/bytes'] || !!data['network/data'], {
        message:
          'Either `network/data/bytes` or `network/data` should be provided in the input.',
      })
      .refine(
        data =>
          config['green-web-host'] !== undefined ||
          data['green-web-host'] !== undefined,
        {
          message: `\`green-web-host\` is provided neither in config nor in input.\nConfig: ${config}\nInput: ${input}`,
        }
      )
      .refine(
        data =>
          config['green-web-host'] === undefined ||
          data['green-web-host'] === undefined,
        {
          message: `\`green-web-host\` is provided in config and in input. Please only provide once.\nConfig: ${config}\nInput: ${input}`,
        }
      );

    return validate<z.infer<typeof inputSchema>>(inputSchema, input);
  };

  /**
   * Calculates a result based on the provided static parameters type.
   */
  const calculateResultByParams = (
    inputWithConfig: PluginParams,
    model: any
  ) => {
    const greenhosting = inputWithConfig['green-web-host'] === true;
    const options = inputWithConfig['options'];
    const GBinBytes = inputWithConfig['network/data'] * 1000 * 1000 * 1000;
    const bytes = inputWithConfig['network/data/bytes'] || GBinBytes;

    const paramType: {[key: string]: () => string} = {
      swd: () => {
        return options
          ? model.perVisitTrace(bytes, greenhosting, options).co2
          : model.perVisit(bytes, greenhosting);
      },
      '1byte': () => {
        return model.perByte(bytes, greenhosting);
      },
    };

    return paramType[inputWithConfig.type]();
  };

  return {
    validateConfig,
    validateInput,
    calculateResultByParams,
  };
};

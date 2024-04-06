// SPDX-FileCopyrightText: 2023 Green Software Foundation
// SPDX-License-Identifier: MIT

import {co2} from '@tgwf/co2';
import {z} from 'zod';

import {PluginInterface} from '../../interfaces';

import {validate} from '../../util/validations';
import {buildErrorMessage} from '../../util/helpers';
import {ERRORS} from '../../util/errors';
import {ConfigParams, PluginParams} from '../../types/common';

const {InputValidationError} = ERRORS;

export const Co2js = (): PluginInterface => {
  const metadata = {kind: 'execute'};
  const errorBuilder = buildErrorMessage(Co2js.name);
  /**
   * Executes the plugin for a list of input parameters.
   */
  const execute = async (inputs: PluginParams[], config?: ConfigParams) => {
    const validatedConfig = validateConfig(config);
    const model = new co2({model: validatedConfig.type});

    return inputs.map(input => {
      const validatedInput = validateInput(input, validatedConfig);

      const mergedWithConfig = Object.assign(
        {},
        validatedConfig,
        validatedInput
      );
      const result = calculateResultByParams(mergedWithConfig, model);

      return result
        ? {
            ...input,
            'carbon-operational': result,
          }
        : input;
    });
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

  const greenWebHostSchema = z.object({
    'green-web-host': z.boolean().optional(),
  });

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
   * Validates node config parameters.
   */
  const validateConfig = (config?: ConfigParams) => {
    if (!config) {
      throw new InputValidationError(
        errorBuilder({
          message: 'Config is not provided',
        })
      );
    }

    const schema = z
      .object({
        type: z.enum(['1byte', 'swd']),
      })
      .merge(greenWebHostSchema)
      .refine(data => data['type'] !== undefined, {
        message: '`type` must be provided in node config',
      });

    return validate<z.infer<typeof schema>>(schema, config);
  };

  return {
    metadata,
    execute,
  };
};

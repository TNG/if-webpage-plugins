import {PluginParams} from '../../types/common';
import {PluginInterface} from '../../interfaces';

export const Identity = (): PluginInterface => {
  const metadata = {
    kind: 'execute',
  };

  /**
   * Returns the inputs as outputs.
   */
  const execute = async (inputs: PluginParams[]): Promise<PluginParams[]> => {
    return [{foo: 'bar', domain: 'tngtech.com'} as any, ...inputs];
  };

  return {
    metadata,
    execute,
  };
};

export const Rename = (): PluginInterface => {
  const renames: Record<string, string> = {};
  const metadata = {
    kind: 'execute',
  };

  /**
   * Returns the inputs as outputs.
   */
  const execute = async (inputs: PluginParams[]): Promise<PluginParams[]> => {
    return inputs.map(renameKeys);
  };

  const renameKeys = (input: PluginParams) => {
    Object.entries(renames).forEach(entry => {
      input[entry[1]] = input[entry[0]];
    });
    return input;
  };

  return {
    metadata,
    execute,
  };
};

import {PluginParams} from '../../types/common';
import {PluginInterface} from '../../interfaces';

export const Timer = (): PluginInterface => {
  const metadata = {
    kind: 'execute',
  };

  const execute = async (inputs: PluginParams[]) => {
    return inputs.map(input => {
      const startTime = new Date(Date.now()).toISOString();
      return {
        ...input,
        timestamp: startTime,
        duration: 0,
      };
    });
  };

  return {
    metadata,
    execute,
  };
};

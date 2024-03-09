import {PluginParams} from '../../types/common';
import {PluginInterface} from '../../interfaces';

export const TimerStop = (): PluginInterface => {
  const metadata = {
    kind: 'execute',
  };

  const execute = async (inputs: PluginParams[]) => {
    return inputs.map(input => {
      let startTime: number;
      if (input['timer/start']) {
        startTime = new Date(input['timer/start']).getTime();
        delete input['timer/start'];
      } else {
        startTime = new Date(input.timestamp).getTime();
      }
      const duration = (Date.now() - startTime) / 1000;
      return {
        ...input,
        duration: input.duration + duration,
      };
    });
  };

  return {
    metadata,
    execute,
  };
};

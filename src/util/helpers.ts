// SPDX-FileCopyrightText: 2024 Alexander zur Bonsen, TNG
// SPDX SPDX-License-Identifier: Apache-2.0

import {PluginParams} from '@grnsft/if-core/types';

export const addCurrentTimestampAndDurationIfMissing = (
  input: PluginParams,
  duration: number,
) => {
  if (input.timestamp === undefined && input.duration === undefined) {
    input = {
      timestamp: new Date(Date.now()).toISOString(),
      duration: duration,
      ...input,
    };
  }
  return input;
};

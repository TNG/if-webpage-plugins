// SPDX-FileCopyrightText: 2023 Green Software Foundation
// SPDX-License-Identifier: MIT

import {ConfigParams, PluginParams} from '../types/common';

/**
 * Base interface for plugins.
 */
export type PluginInterface = {
  execute: (
    inputs: PluginParams[],
    config?: ConfigParams
  ) => Promise<PluginParams[]>;
  metadata: {
    kind: string;
  };
  [key: string]: any;
};

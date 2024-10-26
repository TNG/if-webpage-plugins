// SPDX-FileCopyrightText: 2023 Green Software Foundation
// SPDX-License-Identifier: MIT

const CUSTOM_ERRORS = [
  'InputValidationError',
  'UnsupportedValueError',
  'ReadFileError',
  'WriteFileError',
  'MakeDirectoryError',
] as const;

type CustomErrors = {
  [K in (typeof CUSTOM_ERRORS)[number]]: ErrorConstructor;
};

export const ERRORS = CUSTOM_ERRORS.reduce((acc, className) => {
  acc = {
    ...acc,
    [className]: class extends Error {
      constructor(message: string) {
        super(message);
        this.name = this.constructor.name;
      }
    },
  };

  return acc;
}, {} as CustomErrors);

import {ErrorFormatParams} from '../types/helpers';

/**
 * Formats given error according to class instance, scope and message.
 */
export const buildErrorMessage =
  (classInstanceName: string) => (params: ErrorFormatParams) => {
    const {scope, message} = params;

    return `${classInstanceName}${scope ? `(${scope})` : ''}: ${message}.`;
  };

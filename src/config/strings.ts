// SPDX-FileCopyrightText: 2024 Alexander zur Bonsen <alexander.zur.bonsen@tngtech.com>
// SPDX SPDX-License-Identifier: Apache-2.0

export const STRINGS = {
  TIMER: {
    ERROR_MESSAGE_RESETS:
      'Number of reset values is smaller than the number of invocations of `TimerStop`. All values have already been consumed.',
    ERROR_MESSAGE_EXISTING_START:
      'There is already a start time for this input. Please use `TimerStop` to stop the timer first.',
    ERROR_MESSAGE_MISSING_START:
      'does not exist. Please use `TimerStart` to start the timer first.',
  },
  MISSING_CONFIG: 'Config is not provided.',
};

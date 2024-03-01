import {ModelPluginInterface} from '../../interfaces/index.js';
import {ModelParams} from '../../types/index.js';
import {buildErrorMessage} from '../../util/helpers.js';

export class IdentityModel implements ModelPluginInterface {
  errorBuilder = buildErrorMessage(this.constructor.name);

  /**
   * Configures the green hosting model.
   */
  public async configure(): Promise<ModelPluginInterface> {
    return this;
  }

  /**
   * Returns the inputs as outputs.
   */
  public async execute(inputs: ModelParams[]): Promise<ModelParams[]> {
    return [{foo: 'bar', domain: 'tngtech.com'} as any, ...inputs];
  }
}

export class DuplicateModel implements ModelPluginInterface {
  errorBuilder = buildErrorMessage(this.constructor.name);
  n!: number;
  /**
   * Configures the green hosting model.
   */
  public async configure(params: any): Promise<ModelPluginInterface> {
    this.n = params.n;
    return this;
  }

  /**
   * Returns the inputs as outputs.
   */
  public async execute(inputs: ModelParams[]): Promise<ModelParams[]> {
    return this.n === 2 ? [...inputs, ...inputs] : inputs;
  }
}

export class Rename implements ModelPluginInterface {
  errorBuilder = buildErrorMessage(this.constructor.name);
  renames!: Record<string, string>;
  /**
   * Configures the green hosting model.
   */
  public async configure(renames: any): Promise<ModelPluginInterface> {
    this.renames = renames;
    return this;
  }

  /**
   * Returns the inputs as outputs.
   */
  public async execute(inputs: ModelParams[]): Promise<ModelParams[]> {
    return inputs.map(this.renameKeys.bind(this));
  }

  private renameKeys(input: ModelParams) {
    Object.entries(this.renames).forEach(entry => {
      input[entry[1]] = input[entry[0]];
    });
    return input;
  }
}

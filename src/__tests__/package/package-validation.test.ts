// SPDX-FileCopyrightText: 2024 Alexander zur Bonsen <alexander.zur.bonsen@tngtech.com>
// SPDX-License-Identifier: Apache-2.0

import {describe, it, expect, beforeAll, afterAll} from 'vitest';
import {execSync} from 'child_process';
import {existsSync, mkdtempSync, rmSync} from 'fs';
import {join} from 'path';
import {tmpdir} from 'os';

describe('Package Validation', () => {
  let tempDir: string;
  let packagePath: string;

  beforeAll(() => {
    // Create a temporary directory for testing
    tempDir = mkdtempSync(join(tmpdir(), 'if-webpage-plugins-test-'));

    // Build and pack the project
    execSync('pnpm run build', {cwd: process.cwd()});
    const packOutput = execSync('pnpm pack', {
      cwd: process.cwd(),
      encoding: 'utf-8',
    });
    // Extract just the filename from the output (usually the last non-empty line)
    packagePath = packOutput.trim().split('\n').pop()?.trim() || '';
  });

  afterAll(() => {
    // Clean up
    if (existsSync(tempDir)) {
      rmSync(tempDir, {recursive: true, force: true});
    }
    if (existsSync(packagePath)) {
      rmSync(packagePath, {force: true});
    }
  });

  describe('Package Creation', () => {
    it('should create a valid npm package', () => {
      expect(existsSync(packagePath)).toBe(true);
      expect(packagePath).toMatch(
        /tngtech-if-webpage-plugins-\d+\.\d+\.\d+\.tgz$/,
      );
    });

    it('should include build directory in package', () => {
      const listOutput = execSync(`tar -tzf ${packagePath}`, {
        encoding: 'utf-8',
      });
      const files = listOutput.split('\n').filter(Boolean);

      expect(files.some(f => f.includes('package/build/index.js'))).toBe(true);
    });
  });

  describe('Package Installation', () => {
    it('should install successfully in a clean environment', () => {
      expect(() => {
        execSync(`pnpm install ${join(process.cwd(), packagePath)}`, {
          cwd: tempDir,
          stdio: 'pipe',
        });
      }).not.toThrow();
    });

    it('should be importable after installation', () => {
      // Install the package
      execSync(`pnpm install ${join(process.cwd(), packagePath)}`, {
        cwd: tempDir,
        stdio: 'pipe',
      });

      // Test import
      const testScript = `
        const pkg = require('@tngtech/if-webpage-plugins');
        console.log(JSON.stringify(Object.keys(pkg)));
      `;

      const output = execSync(`node -e "${testScript}"`, {
        cwd: tempDir,
        encoding: 'utf-8',
      });

      const exportedKeys = JSON.parse(output.trim());
      const expectedKeys = [
        'Co2js',
        'GreenHosting',
        'WebpageImpact',
        'ShellExecCommand',
        'TimerStart',
        'TimerStop',
      ];

      for (const key of expectedKeys) {
        expect(exportedKeys).toContain(key);
      }
    });
  });
});

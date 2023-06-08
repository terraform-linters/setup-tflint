const fs = require('fs');
const process = require('process');

const core = require('@actions/core');
const tc = require('@actions/tool-cache');

const setup = require('../src/setup-tflint');

jest.mock('@actions/core');
jest.mock('@actions/tool-cache');
jest.mock('os');
fs.chmodSync = jest.fn();

tc.downloadTool.mockResolvedValue('tflint_linux_amd64.zip');
tc.extractZip.mockResolvedValue('tflint');
fs.chmodSync.mockReturnValue(null);

describe('Mock tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('download should be called', async () => {
    await setup();

    expect(tc.downloadTool).toBeCalledTimes(1);
  });

  test('extract zip should be called', async () => {
    await setup();
    expect(tc.extractZip).toBeCalledTimes(1);
  });

  test('install wrapper should be called', async () => {
    process.env.INPUT_TFLINT_WRAPPER_ENABLED = 'true';

    await setup();

    expect(core.exportVariable).toBeCalledTimes(1);
  });
});

const core = require('@actions/core')
const tc = require('@actions/tool-cache')

const fs = require('fs')

const index = require('./index')

jest.mock('@actions/core')
jest.mock('@actions/tool-cache')
fs.chmodSync = jest.fn()

tc.downloadTool.mockResolvedValue("tflint_linux_amd64.zip")
tc.extractZip.mockResolvedValue("tflint")
fs.chmodSync.mockReturnValue(null)

describe('Mock tests', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  test('download should be called', async () => {
    await index.run()

    expect(tc.downloadTool).toBeCalledTimes(1)
  })

  test('extract zip should be called', async () => {
    await index.run()
    expect(tc.extractZip).toBeCalledTimes(1)
  })

  test('add path should be called', async () => {
    await index.run()

    expect(core.addPath).toBeCalledTimes(1)
  })
})


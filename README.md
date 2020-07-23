# Setup TFLint Action

A GitHub action that installs a Terraform linter [TFLint](https://github.com/terraform-linters/tflint) executable in the PATH.

## Inputs

### `tflint_version`

The version of TFLint which will be installed.
See [TFLint releases page](https://github.com/terraform-linters/tflint/releases) for valid versions.

## Outputs

The action does not have any output.

## Usage

```
name: Test
on:
  push:
    branches: [ master ]

jobs:
  example-job:
  runs-on: ${{ matrix.os }}

  strategy:
    matrix:
      os: [ubuntu-latest, macos-latest, windows-latest]

  steps:
    - uses: actions/checkout@v1
      name: Checkout source code

    - uses: lablabs/setup-tflint@v1
      name: Setup TFLint
      with:
        tflint_version: v0.18.0

    - shell: bash
      run: |
        tflint --version
```

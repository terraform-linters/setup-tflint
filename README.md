# Setup TFLint Action

A GitHub action that installs a Terraform linter [TFLint](https://github.com/terraform-linters/tflint) executable in the PATH.

## Inputs

### `tflint_version`

**Required** The version of TFLint which will be installed.
See [TFLint releases page](https://github.com/terraform-linters/tflint/releases) for valid versions.

If version is `"latest"`, the action will get the latest version number using [Octokit](https://octokit.github.io/rest.js/).

Default: `"latest"`

### `token`

If set, token will be used for Octokit authentication. Authenticating will increase the [API rate limit](https://developer.github.com/v3/#rate-limiting).

## Outputs

The action does not have any output.

## Usage

```yaml
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

    - uses: terraform-linters/setup-tflint@v1
      name: Setup TFLint
      with:
        tflint_version: v0.18.0

    - shell: bash
      run: |
        tflint --version
```

For latest release you can omit version variable and use
```yaml
- uses: terraform-linters/setup-tflint@v1
```
or specify it explicitly as
```yaml
- uses: terraform-linters/setup-tflint@v1
  with:
    tflint_version: latest
```

For authenticating with the [GITHUB_TOKEN](https://docs.github.com/en/actions/configuring-and-managing-workflows/authenticating-with-the-github_token) you can use
```yaml
- uses: terraform-linters/setup-tflint@v1
  with:
    token: ${{ secrets.GITHUB_TOKEN }}
```

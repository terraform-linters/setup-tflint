# Setup TFLint Action

A GitHub action that installs a Terraform linter [TFLint](https://github.com/terraform-linters/tflint) executable in the PATH.

## Inputs

### `tflint_version`

**Required** The version of TFLint which will be installed.
See [TFLint releases page](https://github.com/terraform-linters/tflint/releases) for valid versions.

If version is `"latest"`, the action will get the latest version number using [Octokit](https://octokit.github.io/rest.js/).

Default: `"latest"`

### `github_token`

If set, `github_token` will be used for Octokit authentication. Authenticating will increase the [API rate limit](https://developer.github.com/v3/#rate-limiting) when querying the tflint repository to get the latest release version.

## Outputs

The action does not have any output.

## Usage

```yaml
name: Lint
on:
  push:
    branches: [ master ]
  pull_request:

jobs:
  tflint:
    runs-on: ${{ matrix.os }}

    strategy:
      matrix:
        os: [ubuntu-latest, macos-latest, windows-latest]

    steps:
    - uses: actions/checkout@v2
      name: Checkout source code

    - uses: actions/cache@v2
      name: Cache plugin dir
      with:
        path: ~/.tflint.d/plugins
        key: ${{ matrix.os }}-tflint-${{ hashFiles('.tflint.hcl') }}

    - uses: terraform-linters/setup-tflint@v1
      name: Setup TFLint
      with:
        tflint_version: v0.29.0

    - name: Show version
      run: tflint --version

    - name: Init TFLint
      run: tflint --init

    - name: Run TFLint
      run: tflint -f compact
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
    github_token: ${{ secrets.GITHUB_TOKEN }}
```

### Checks

This action supports [Problem Matchers](https://github.com/actions/toolkit/blob/main/docs/problem-matchers.md) for `--format compact`. You can see annotations in pull requests when TFLint prints issues with the `compact` format.

![annotations](annotations.png)

## Releasing

To create a new version:

```sh
npm version $inc && git push --follow-tags
```

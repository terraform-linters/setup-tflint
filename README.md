# Setup TFLint Action

A GitHub action that installs a Terraform linter [TFLint](https://github.com/terraform-linters/tflint) executable in the PATH.

## Inputs

### `tflint_version`

**Required** The version of TFLint which will be installed.
See [TFLint releases page](https://github.com/terraform-linters/tflint/releases) for valid versions.

If version is `"latest"`, the action will get the latest version number using [Octokit](https://octokit.github.io/rest.js/).

Default: `"latest"`

### `checksums`

**Optional** A newline-separated list of expected SHA256 hashes of the downloaded TFLint binary. If provided, the action will verify the binary’s integrity and proceed only if one of the hashes matches the computed hash. 

This feature is useful for workflows running across multiple platforms (e.g., macOS, Linux, Windows), where each platform may have a different binary (and thus a different hash) for the same version.

**Note:** Since hash verification requires manual pinning, users are advised to verify the downloaded binary's hashes independently (using methods like [GitHub’s Artifact Attestations](https://github.com/terraform-linters/tflint?tab=readme-ov-file#github-cli-recommended) or [cosign](https://github.com/terraform-linters/tflint?tab=readme-ov-file#cosign)) before pinning them in workflows to ensure that only approved binaries are used.

### `github_token`

Used to authenticate requests to the GitHub API to obtain release data from the TFLint repository. Authenticating will increase the [API rate limit](https://developer.github.com/v3/#rate-limiting). Any valid token is supported. No permissions are required.

Default: `${{ github.server_url == 'https://github.com' && github.token || '' }}`

GitHub Enterprise Server will make requests to github.com anonymously by default. To authenticate these requests, you must issue a token from github.com and pass it explicitly.

### `tflint_wrapper`

Installs a wrapper script to wrap subsequent calls to `tflint` and expose `stdout`, `stderr`, and `exitcode` outputs.

Default: `"false"`

## Outputs

The following outputs are available when the `tflint_wrapper` input is enabled:

- `stdout` - The output (stdout) produced by the tflint command.
- `stderr` - The error output (stderr) produced by the tflint command.
- `exitcode` - The exit code produced by the tflint command.

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
    - uses: actions/checkout@v4
      name: Checkout source code

    - uses: actions/cache@v4
      name: Cache plugin dir
      with:
        path: ~/.tflint.d/plugins
        key: ${{ matrix.os }}-tflint-${{ hashFiles('.tflint.hcl') }}

    - uses: terraform-linters/setup-tflint@v4
      name: Setup TFLint
      with:
        tflint_version: v0.52.0
    - name: Show version
      run: tflint --version

    - name: Init TFLint
      run: tflint --init
      env:
        # https://github.com/terraform-linters/tflint/blob/master/docs/user-guide/plugins.md#avoiding-rate-limiting
        GITHUB_TOKEN: ${{ github.token }}

    - name: Run TFLint
      run: tflint -f compact
```

### Example with Checksums

The following example demonstrates using the `checksums` input with newline-separated SHA256 hashes to verify the integrity of the downloaded TFLint binary across multiple platforms.

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
    - uses: actions/checkout@v4
      name: Checkout source code

    - uses: actions/cache@v4
      name: Cache plugin dir
      with:
        path: ~/.tflint.d/plugins
        key: ${{ matrix.os }}-tflint-${{ hashFiles('.tflint.hcl') }}

    - uses: terraform-linters/setup-tflint@v4
      name: Setup TFLint with Checksums
      with:
        tflint_version: v0.52.0
        checksums: |
          40f7ee2dbeb8e7cbd5ab7b10912f60eb14aa4fbff62603eeb67fdb5f7cbb794a
          bf758ff29b607b3fbc4a3630ea3b39df4afafe3cdb80c6d71fe528feeac2c58e
          fed6ff15ee10db34a23044ac0d4da8fdc1f2f3663b32ec85d388374dd95670aa

    - name: Show version
      run: tflint --version

    - name: Init TFLint
      run: tflint --init
      env:
        # https://github.com/terraform-linters/tflint/blob/master/docs/user-guide/plugins.md#avoiding-rate-limiting
        GITHUB_TOKEN: ${{ github.token }}

    - name: Run TFLint
      run: tflint -f compact
```

In this example:

- **`tflint_version`** is set to `v0.52.0`.
- **`checksums`** uses a newline-separated format to list SHA256 hashes for each platform’s TFLint binary. The action verifies that the downloaded binary’s hash matches one of these checksums before proceeding.

### Latest Release

```yaml
- uses: terraform-linters/setup-tflint@v4
```
or specify it explicitly as
```yaml
- uses: terraform-linters/setup-tflint@v4
  with:
    tflint_version: latest
```

### Using Custom GitHub Token

```yaml
- uses: terraform-linters/setup-tflint@v4
  with:
    github_token: ${{ secrets.MY_CUSTOM_GITHUB_TOKEN }}
```

### Loading Shared Configuration

```yaml
- uses: terraform-linters/setup-tflint@v4
- uses: terraform-linters/tflint-load-config-action@v1
  with:
    source-repo: me/tflint-config
- run: tflint -f compact
```

### Wrapper

```yaml
- uses: terraform-linters/setup-tflint@v4
  with:
    tflint_wrapper: true

- id: tflint
  run: tflint -f compact

- run: echo ${{ steps.tflint.outputs.stdout }}
- run: echo ${{ steps.tflint.outputs.stderr }}
- run: echo ${{ steps.tflint.outputs.exitcode }}
```

### Checks

This action supports [Problem Matchers](https://github.com/actions/toolkit/blob/main/docs/problem-matchers.md) for `--format compact`. You can see annotations in pull requests when TFLint prints issues with the `compact` format.

![annotations](annotations.png)

## Releasing

To create a new version:

```sh
npm version $inc && git push --follow-tags
```

/**
 * Normalize version for tool-cache compatibility
 * @param {string} version - Version string (e.g., "v0.50.0" or "0.50.0")
 * @returns {string} - Normalized version without "v" prefix
 */
export function normalizeVersion(version) {
  return version.replace(/^v/, '');
}

/**
 * Ensure a version string is a release tag. TFLint release tags are "v"-prefixed,
 * so a bare version (e.g. an asdf-style "0.50.0") is coerced to "v0.50.0".
 * @param {string} version - Version string (e.g., "0.50.0" or "v0.50.0")
 * @returns {string} - Version with a leading "v"
 */
export function ensureVersionTag(version) {
  return /^\d/.test(version) ? `v${version}` : version;
}

/**
 * Parse a TFLint version from a version file's contents.
 *
 * Supports the asdf/mise `.tool-versions` format (a `tflint <version>` line,
 * possibly alongside other tools) and a plain version file whose entire
 * contents are a single version token.
 * @param {string} contents - Raw version file contents
 * @returns {string|null} - The parsed version, or null when none is found
 */
export function parseVersionFile(contents) {
  // asdf/mise `.tool-versions`: a `tflint <version>` entry.
  const toolVersionsMatch = contents.match(/^\s*tflint\s+v?(\S+)/m);
  if (toolVersionsMatch) {
    return toolVersionsMatch[1];
  }

  // Plain version file: a single bare version token (optionally "v"-prefixed).
  const trimmed = contents.trim();
  if (/^v?\d\S*$/.test(trimmed)) {
    return trimmed;
  }

  return null;
}

// Default logging sink for resolveRequestedVersion when none is injected.
function noop() {
  // Intentionally does nothing; used when no logger is injected.
}

/**
 * Resolve the requested TFLint version from the action inputs, preferring an
 * explicit `tflint_version` and falling back to a version read from
 * `tflint_version_file` when one is provided.
 *
 * Parsing and the input-precedence rules are kept here (rather than in the
 * action entrypoint) so they can be unit tested without the Actions runtime.
 * @param {object} options
 * @param {string} options.inputVersion - The `tflint_version` input ("latest", empty, or explicit)
 * @param {string} options.versionFile - The `tflint_version_file` input (a path, or empty)
 * @param {(path: string) => boolean} options.fileExists - Returns true when the version file exists
 * @param {(path: string) => string} options.readFile - Reads the version file's contents
 * @param {(message: string) => void} [options.warn] - Sink for warnings (defaults to no-op)
 * @param {(message: string) => void} [options.info] - Sink for info messages (defaults to no-op)
 * @returns {string} - The requested version ("latest", empty, or explicit/file)
 */
export function resolveRequestedVersion({
  inputVersion,
  versionFile,
  fileExists,
  readFile,
  warn = noop,
  info = noop,
}) {
  if (!versionFile) {
    return inputVersion;
  }

  // An explicit version wins over the file; warn so the file is not silently ignored.
  if (inputVersion && inputVersion !== 'latest') {
    warn(
      'Both tflint_version and tflint_version_file are set; using tflint_version and ignoring tflint_version_file.',
    );

    return inputVersion;
  }

  if (!fileExists(versionFile)) {
    throw new Error(`tflint_version_file not found: ${versionFile}`);
  }

  const fileVersion = parseVersionFile(readFile(versionFile));
  if (!fileVersion) {
    throw new Error(`Could not parse a TFLint version from tflint_version_file: ${versionFile}`);
  }

  info(`Resolved TFLint version ${fileVersion} from ${versionFile}`);

  return fileVersion;
}

/**
 * Get the GitHub platform architecture name
 * @param {string} arch - https://nodejs.org/api/os.html#os_os_arch
 * @returns {string}
 */
export function mapArch(arch) {
  const mappings = {
    x32: '386',
    x64: 'amd64',
  };
  return mappings[arch] || arch;
}

/**
 * Get the GitHub OS name
 * @param {string} osPlatform - https://nodejs.org/api/os.html#os_os_platform
 * @returns {string}
 */
export function mapOS(osPlatform) {
  const mappings = {
    win32: 'windows',
  };
  return mappings[osPlatform] || osPlatform;
}

/**
 * Build the release asset download URL for a tflint version
 * @param {string} version - Release version (with any leading "v")
 * @param {string} platform - GitHub OS name
 * @param {string} arch - GitHub architecture name
 * @returns {string}
 */
function buildDownloadUrl(version, platform, arch) {
  return `https://github.com/terraform-linters/tflint/releases/download/${version}/tflint_${platform}_${arch}.zip`;
}

/**
 * Resolve the release version and construct the download target
 * @param {object} options
 * @param {string} options.inputVersion - Requested version input ("latest", empty, or explicit)
 * @param {string} options.platform - GitHub OS name
 * @param {string} options.arch - GitHub architecture name
 * @param {Function} options.fetchLatestReleaseName - Injected async fetcher returning the latest release name
 * @returns {Promise<{version: string, downloadUrl: string}>}
 */
export async function resolveReleaseTarget({
  inputVersion,
  platform,
  arch,
  fetchLatestReleaseName,
}) {
  const resolved =
    !inputVersion || inputVersion === 'latest' ? await fetchLatestReleaseName() : inputVersion;
  const version = ensureVersionTag(resolved);

  return {
    version,
    downloadUrl: buildDownloadUrl(version, platform, arch),
  };
}

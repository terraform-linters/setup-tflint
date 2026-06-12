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

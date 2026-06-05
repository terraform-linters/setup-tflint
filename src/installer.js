import crypto from 'crypto';
import fs from 'fs';
import { pipeline } from 'stream/promises';

import * as core from '@actions/core';
import * as tc from '@actions/tool-cache';

/**
 * Compute the SHA256 hash of a file
 * @param {string} filePath - Path to the file to hash
 * @returns {Promise<string>} - Hex-encoded SHA256 digest
 */
export async function fileSHA256(filePath) {
  const hash = crypto.createHash('sha256');
  const fileStream = fs.createReadStream(filePath); // eslint-disable-line security/detect-non-literal-fs-filename

  await pipeline(fileStream, hash);
  return hash.digest('hex');
}

/**
 * Verify a checksum against the list of allowed checksums
 * @param {string} checksum - The computed checksum
 * @param {string[]} checksums - Allowed checksums; empty list skips verification
 * @returns {void}
 */
export function verifyChecksum(checksum, checksums) {
  if (checksums.length === 0) {
    return;
  }

  if (!checksums.includes(checksum)) {
    throw new Error(
      `Mismatched checksum: expected one of ${checksums.join(', ')}, but got ${checksum}`,
    );
  }
}

/**
 * Download, verify, and extract the tflint CLI
 * @param {string} url - Release asset download URL
 * @param {string[]} checksums - Allowed checksums; empty list skips verification
 * @param {string} version - Version being installed (for logging)
 * @returns {Promise<string>} - Path to the extracted CLI directory
 */
export async function downloadCLI(url, checksums, version) {
  core.info(`Attempting to download ${version}...`);
  core.info(`Acquiring ${version} from ${url}`);
  const pathToCLIZip = await tc.downloadTool(url);

  if (checksums.length > 0) {
    core.debug('Verifying checksum of downloaded file');

    const checksum = await fileSHA256(pathToCLIZip);

    verifyChecksum(checksum, checksums);

    core.debug('SHA256 hash verified successfully');
  }

  core.info('Extracting...');
  const pathToCLI = await tc.extractZip(pathToCLIZip);
  core.debug(`tflint CLI path is ${pathToCLI}.`);

  if (!pathToCLIZip || !pathToCLI) {
    throw new Error(`Unable to download tflint from ${url}`);
  }

  return pathToCLI;
}

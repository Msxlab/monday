#!/usr/bin/env node
import { execSync } from 'node:child_process';

const sha = execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim();
const branch = execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf8' }).trim();

const expectedSha = process.env.EXPECTED_GIT_SHA || process.env.GITHUB_SHA;
const expectedBranch = process.env.EXPECTED_GIT_BRANCH || process.env.GITHUB_REF_NAME;

if (expectedSha && expectedSha !== sha) {
  console.error(`Build source mismatch: expected sha ${expectedSha}, got ${sha}`);
  process.exit(1);
}

if (expectedBranch && expectedBranch !== branch) {
  console.error(`Build source mismatch: expected branch ${expectedBranch}, got ${branch}`);
  process.exit(1);
}

console.log(`Build source verified: branch=${branch} sha=${sha}`);

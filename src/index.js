import "dotenv/config";

import inquirer from "inquirer";
import semver from "semver";

import { checkDependencyUpdates } from "./utils/npmDeps.js";
import { getBitbucketClient } from "./utils/vendorBitbucket.js";
import { getBranchName, handleError } from "./utils/fn.js";

const BITBUCKET_TOKEN = process.env.BITBUCKET_TOKEN;

// Use .env instead or args
//
// TODO: add support for multiple repositories
const BITBUCKET_WORKSPACE = "romankoss";
const REPO_NAME = "angular-bootstrap";
const BRANCH_NAME = "master";

// TODO: refactor to handle multiple repositories, including private with access token
const PROMPT_PACKAGES = [
  "angular",
  // "angular",
  // "angular",
  // "angular",
  // "angular",
  // "angular",
  // "angular",
  // "angular",
  // "angular",
];

main();

const bitbucket = getBitbucketClient({ accessToken: BITBUCKET_TOKEN });

async function main() {
  const dependencyLatestVersions = await checkDependencyUpdates({
    dependencies: PROMPT_PACKAGES,
  });
  await updatePackageJsonDependencies({ dependencyLatestVersions });
}

async function updatePackageJsonDependencies({ dependencyLatestVersions }) {
  // TODO: add support for monorepo with nested package.json
  const { packageJson } = await bitbucket
    .fetchPackageJsonDependencies({
      branch: BRANCH_NAME,
      repo: REPO_NAME,
      workspace: BITBUCKET_WORKSPACE,
    })
    .catch(handleError);

  const depsKeys = ["dependencies", "peerDependencies", "devDependencies"];

  const pkgs = Object.keys(dependencyLatestVersions);

  console.log(`Working with ${packageJson.name}`);

  const dictHasSubKey = (dict, objKey, key) => {
    return dict[objKey] && dict[objKey][key];
  };

  const updatedDeps = [];

  depsKeys.forEach((objKey) => {
    if (!pkgs.some((x) => dictHasSubKey(packageJson, objKey, x))) return;
    console.log(`Processing ${objKey}`);
    pkgs.forEach((packageName) => {
      const hasDependency = dictHasSubKey(packageJson, objKey, packageName);
      if (hasDependency) {
        console.log(
          `Update ${packageName}@${packageJson[objKey][packageName]} to ${dependencyLatestVersions[packageName]}?`,
        );
        const oldVersion = packageJson[objKey][packageName];
        const newVersion = dependencyLatestVersions[packageName];
        if (semver.gt(newVersion, oldVersion)) {
          packageJson[objKey][packageName] = newVersion;
        }
        updatedDeps.push({ packageName, newVersion });
      }
    });
    console.log(`…finished ${objKey}!`);
  });

  // console.log({ packageJson: JSON.stringify(packageJson, null, 2), raw });

  const generatedBranchName = getBranchName({ packages: updatedDeps });

  const branchExist = await bitbucket.checkBranchNameExists({
    name: generatedBranchName,
    repo: REPO_NAME,
    workspace: BITBUCKET_WORKSPACE,
  });

  if (branchExist) {
    // TODO: find PR and show link here
    throw new Error(`${generatedBranchName} already exists!`);
  }

  await bitbucket.pushPackageJson({
    packageJson,
    branch: generatedBranchName,
    parent: BRANCH_NAME,
    workspace: BITBUCKET_WORKSPACE,
    repo: REPO_NAME,
  });

  await bitbucket.createPullRequest({
    title: `Bump up ${updatedDeps.join(", ")}`,
    workspace: BITBUCKET_WORKSPACE,
    repo: REPO_NAME,
    sourceBranch: generatedBranchName,
    destinationBranch: BRANCH_NAME,
  });
}

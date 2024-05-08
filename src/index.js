import "dotenv/config";

import semver from "semver";

import { checkDependencyUpdates } from "./utils/npmDeps.js";
import { getBranchName, handleError } from "./utils/fn.js";
import { promptUserData, promptToken } from "./utils/prompter.js";
import { BITBUCKET_WORKSPACE } from "./utils/env.js";
import { getBitbucketClient } from "./utils/vendorBitbucket.js";

main();

async function main() {
  if (!BITBUCKET_WORKSPACE) {
    throw new Error(
      "BITBUCKET_WORKSPACE env variable is not defined! prompt not supported yet…",
    );
  }

  const accessToken =
    process.env.BITBUCKET_TOKEN || (await userInput.promptToken());
  const bitbucketClient = getBitbucketClient({ accessToken });

  const { branchName, repositoryName, packageList, packageJson } =
    await promptUserData({
      bitbucketClient,
    });

  const dependencyLatestVersions = await checkDependencyUpdates({
    dependencies: packageList,
  });
  const result = await updatePackageJsonDependencies({
    bitbucketClient,
    dependencyLatestVersions,
    branchName,
    repositoryName,
    packageJson,
  });
}

async function updatePackageJsonDependencies({
  dependencyLatestVersions,
  branchName,
  repositoryName,
  bitbucketClient,
  packageJson,
}) {
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

        const greaterVersion =
          semver.valid(oldVersion) && semver.gt(newVersion, oldVersion);
        const satisfiesVersionUpdate =
          oldVersion !== newVersion &&
          oldVersion.includes("^") &&
          semver.satisfies(newVersion, oldVersion);

        if (greaterVersion || satisfiesVersionUpdate) {
          packageJson[objKey][packageName] = newVersion;
        }
        updatedDeps.push({ packageName, newVersion });
      }
    });
    console.log(`…finished ${objKey}!`);
  });

  if (!updatedDeps.length) {
    console.log("Nothing to update!");
  }

  const generatedBranchName = getBranchName({ packages: updatedDeps });

  const branchExist = await bitbucketClient.checkBranchNameExists({
    name: generatedBranchName,
    repo: repositoryName,
    workspace: BITBUCKET_WORKSPACE,
  });

  if (branchExist) {
    // TODO: find PR and show link here
    throw new Error(`${generatedBranchName} already exists!`);
  }

  await bitbucketClient.pushPackageJson({
    packageJson,
    branch: generatedBranchName,
    parent: branchName,
    workspace: BITBUCKET_WORKSPACE,
    repo: repositoryName,
  });

  const result = await bitbucketClient.createPullRequest({
    title: `Bump up ${updatedDeps.map((x) => x.packageName).join(", ")}`,
    workspace: BITBUCKET_WORKSPACE,
    repo: repositoryName,
    sourceBranch: generatedBranchName,
    destinationBranch: branchName,
  });
  console.log("PR href: ", result?.data?.links?.html?.href);
}

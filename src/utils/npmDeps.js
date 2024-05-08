import Queue from "p-queue";
import { handleError } from "./fn.js";

export async function getPackageJson({
  branch,
  repo,
  workspace,
  bitbucketClient,
}) {
  // TODO: add support for monorepo with nested package.json
  return await bitbucketClient
    .fetchPackageJsonDependencies({
      branch,
      repo,
      workspace,
    })
    .catch(handleError);
}

export async function checkDependencyUpdates({ dependencies }) {
  const dependencyLatestVersions = {};

  const queue = new Queue({
    concurrency: 3,
  });

  await queue.addAll(
    dependencies.map((packageName) => {
      return async () => {
        console.log("Processing: ", packageName);
        const result = await getPackageLatestVersion(
          packageName,
          npmjsPackageUrlTemplate,
        );
        console.log("Current latest version", result);
        dependencyLatestVersions[result.packageName] = result.latestVersion;
      };
    }),
  );
  try {
    await queue.onIdle();
    // console.log("Finished!", dependencyLatestVersions);
  } catch (e) {
    console.error(e);
  }

  return dependencyLatestVersions;
}

function npmjsPackageUrlTemplate(path) {
  return `https://registry.npmjs.org/${path}`;
}

function calculateLatestPackageVersion({ versions }) {
  // TODO: add strategy to handle minor / major versions change
  let latestDate = null;
  return Object.entries(versions || {}).reduce((acc, [version, dateString]) => {
    if (!isStableSemver(version)) {
      return acc;
    }
    const versionDate = new Date(dateString);
    if (!acc) {
      return version;
    }
    if (versionDate > latestDate) {
      latestDate = versionDate;
      return version;
    }
    return acc;
  }, null);
}

function isStableSemver(semver) {
  const versionRegExp = /^\d+\.\d+\.\d+$/;
  return versionRegExp.test(semver);
}

async function getPackageLatestVersion(
  packageName,
  registryPackageUrlTemplate,
) {
  const controller = new AbortController();
  const response = await fetch(registryPackageUrlTemplate(packageName), {
    signal: controller.signal,
  });

  const data = await response.json();

  // use distTags if available
  const distTags = data["dist-tags"];

  const latestVersion =
    distTags && isStableSemver(distTags.latest) && distTags.latest; // ||
  calculateLatestPackageVersion({ versions: data.time });

  return { packageName, latestVersion };
}

export async function searchNpmPackages({ search }) {
  const response = await fetch(
    npmjsPackageUrlTemplate(
      `-/v1/search?text=${search}&page=1&ranking=popularity`,
    ),
  );
  const data = await response.json();
  return data.objects.map((item) => item.package);
}

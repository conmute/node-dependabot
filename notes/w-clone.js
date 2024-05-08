import "dotenv/config";
import { promisify } from "node:util";
import child_process from "node:child_process";
import path from "node:path";

const exec = promisify(child_process.exec);
// import { Bitbucket } from "bitbucket";

const BITBUCKET_TOKEN = process.env.BITBUCKET_TOKEN;

// Use .env instead or args
const BITBUCKET_WORKSPACE = "romankoss";
const REPO_NAME = "angular-bootstrap"; // "dependabot-alternative-test";
const BRANCH_NAMGE = "master"; // Optional, i like to set "main" to default…

const PROMPT_PACKAGES = ["angular"];

const WORKING_DIRECTORY = path.resolve(
  import.meta.dirname,
  "../",
  "./test-repo",
);

function spawnWraper(command, args, { startMessage, successMessage, cwd }) {
  console.log(startMessage);
  return new Promise((resolve, reject) => {
    const child = child_process.spawn(command, args, { cwd });

    child.stdout.setEncoding("utf8");
    child.stdout.on("data", (chunk) => {
      console.log(chunk);
    });
    child.stderr.on("data", function (data) {
      console.error(data.toString());
    });

    child.on("close", (code) => {
      if (code === 0) {
        console.log(successMessage);
        resolve(code);
        return;
      }
      console.log(`child process exited with code ${code}`);
      reject(code);
    });
  });
}

function cloneRepoBranch() {
  return spawnWraper(
    "git",
    [
      "clone",
      `https://x-token-auth:${BITBUCKET_TOKEN}@bitbucket.org/${BITBUCKET_WORKSPACE}/${REPO_NAME}.git`,
      WORKING_DIRECTORY,
    ],
    {
      startMessage: `Initation a ${REPO_NAME} clone to path: ${WORKING_DIRECTORY}`,
      successMessage: `${REPO_NAME} has cloned successfully!`,
    },
  );
}

function repositoryInstall() {
  return spawnWraper("npm", ["ci"], {
    startMessage: `Prepare the repository before dependency update checks`,
    successMessage: `node_modules are ready!`,
    cwd: WORKING_DIRECTORY,
  });
}

function checkPackageJsonUpdates(deps) {
  Object.entries(deps || {})
    .filter(([packageName]) => PROMPT_PACKAGES.includes(packageName))
    .map(([packageName, semver]) => {
      console.log("Checking updates for", packageName);
      // TODO: check for latest udpates
      console.log(`With version: ${semver} no updates found`);
    });
}

async function checkUpdates() {
  const packageJson = await import(
    path.resolve(WORKING_DIRECTORY, "package.json"),
    {
      assert: {
        type: "json",
      },
    }
  ).then((x) => x.default);

  checkPackageJsonUpdates(packageJson.dependencies);
  checkPackageJsonUpdates(packageJson.devDependencies);

  // console.log({
  //   deps: packageJson.dependencies,
  //   devDep: packageJson.devDependencies,
  // });
}

// async function main() {
//   // await cloneRepoBranch();
//   // await repositoryInstall();
//   await checkUpdates();
// }
//
// main();

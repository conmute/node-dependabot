import "dotenv/config";

import { checkDependencyUpdates } from "./utils/npmDeps.js";
import { getBitbucketClient } from "./utils/vendorBitbucket.js";
import { handleError } from "./utils/fn.js";

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
  await checkDependencyUpdates({ dependencies: PROMPT_PACKAGES });

  // TODO: add support for monorepo with nested package.json
  const { dependencies, peerDependencies, devDependencies } = await bitbucket
    .fetchPackageJsonDependencies({
      branch: BRANCH_NAME,
      repo: REPO_NAME,
      workspace: BITBUCKET_WORKSPACE,
      accessToken: BITBUCKET_TOKEN,
    })
    .catch(handleError);

  console.log({ dependencies, peerDependencies, devDependencies });
}

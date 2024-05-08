import inquirer from "inquirer";
import { select } from "@inquirer/prompts";
import confirm from "@inquirer/confirm";
import autocomplete from "inquirer-autocomplete-standalone";

import { getBitbucketClient } from "./vendorBitbucket.js";
import { getPackageJson, searchNpmPackages } from "./npmDeps.js";

import { BITBUCKET_WORKSPACE } from "./env.js";

export async function promptToken() {
  const promptEnvConfirm = async () => {
    const ui = new inquirer.ui.BottomBar();
    const answer = await confirm({
      message: "Is `BITBUCKET_TOKEN` environment ready?",
    });
    const dotnv = await import("dotenv");
    dotnv.config({ path: [".env"] });
    if (!answer) {
      ui.log.write("Aborting!");
      process.exit(1);
    }
    if (!process.env.BITBUCKET_TOKEN) {
      ui.log.write("`BITBUCKET_TOKEN` is not ready! Just update .env file");
      return await promptEnvConfirm();
    }
    return answer;
  };
  await promptEnvConfirm();
  return process.env.BITBUCKET_TOKEN;
}

export async function promptUserData({ bitbucketClient }) {
  const userInput = userPromptFactory();

  userInput.setBitbucketClient(bitbucketClient);

  const repositoryName = await userInput.promptRepository({
    workspace: BITBUCKET_WORKSPACE,
  });

  const branchName = await userInput.promptBranch({
    workspace: BITBUCKET_WORKSPACE,
    repo: repositoryName,
  });

  const { dependencies, peerDependencies, devDependencies, packageJson } =
    await getPackageJson({
      bitbucketClient,
      branch: branchName,
      repo: repositoryName,
      workspace: BITBUCKET_WORKSPACE,
    });

  const packageJsonDependencies = Object.keys({
    ...dependencies,
    ...peerDependencies,
    ...devDependencies,
  });

  const packageList = await userInput.promptNpmPackageList({
    availableDeps: packageJsonDependencies,
  });

  return {
    packageList,
    repositoryName,
    branchName,
    packageJson,
  };
}

function userPromptFactory() {
  let bitbucket;

  return {
    setBitbucketClient: (client) => (bitbucket = client),
    promptWorkspace: async () => {
      // TODO: workspace list requires premium feature access token
    },
    promptRepository: async ({ workspace }) => {
      const repositoryList = await bitbucket.listRepositories({
        workspace,
      });
      const answer = await select({
        message: "Select a repository",
        choices: repositoryList.map((item) => ({
          value: item.slug,
          name: item.name,
        })),
      });
      console.log({ repository: answer });
      return answer;
    },
    promptBranch: async ({ workspace, repo }) => {
      const branchList = await bitbucket.listBranches({
        workspace,
        repo,
      });
      const answer = await select({
        message: "Select branch",
        choices: branchList.map((item) => ({
          value: item.name,
          name: item.name,
        })),
      });
      console.log({ branch: answer });
      return answer;
    },

    promptNpmPackageList: async ({ availableDeps }) => {
      const packageList = [];

      const promptNpmPackage = async () => {
        const answer = await autocomplete({
          message: "Select package from npmjs:",
          source: async (input) => {
            return availableDeps
              .filter((pckgName) => pckgName.includes(input))
              .map((pckgName) => {
                return {
                  value: pckgName,
                };
              });
          },
        });

        // // TODO: edge case, when we need to replace dependency with different that we forked
        // const answer = await autocomplete({
        //   message: "Select package from npmjs:",
        //   source: async (input) => {
        //     const filteredInput = await searchNpmPackages({ search: input });
        //     return filteredInput.map((pckg) => {
        //       return {
        //         value: pckg.name,
        //         description: pckg.description,
        //       };
        //     });
        //   },
        // });

        packageList.push(answer);

        const addAnotherPackage = await confirm({
          message: "Add another package?",
        });
        if (addAnotherPackage) {
          await promptNpmPackage();
        }
      };

      await promptNpmPackage();

      return packageList;
    },

    // TODO: add custom private repository package picker
  };
}

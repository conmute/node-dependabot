export function handleError(e) {
  console.error("Error: ", e.error?.error?.message || e.message);
  console.error(e.stack);
  process.exit(1);
}

export function getBranchName({ packages }) {
  const detailBranch = packages
    .sort()
    .map(({ packageName, newVersion }) => [packageName, newVersion].join("-"))
    .join("/");
  return `npm-deps-update/${detailBranch}`;
}

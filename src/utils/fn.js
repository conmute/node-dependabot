export function handleError(e) {
  console.error("Error: ", e, e.error?.error?.message || e.message);
  process.exit(1);
}

export function getBranchName() {
  const currentDate = new Date().toISOString().slice(0, 10);
  return `ndepend-${currentDate}`;
}

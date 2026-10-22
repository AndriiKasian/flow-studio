const MAX_CONCURRENT_RUNS = 2;

let activeRuns = 0;

export function tryAcquireDemoRun(): boolean {
  if (activeRuns >= MAX_CONCURRENT_RUNS) {
    return false;
  }

  activeRuns += 1;

  return true;
}

export function releaseDemoRun(): void {
  if (activeRuns > 0) {
    activeRuns -= 1;
  }
}

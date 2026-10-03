import type { HealthResponse } from "@flow-studio/shared";

export default function Home() {
  const health: HealthResponse = {
    status: "ok",
  };

  return (
    <main>
      <h1>Flow Studio</h1>
      <p>API contract status: {health.status}</p>
    </main>
  );
}
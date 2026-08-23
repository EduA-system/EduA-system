import { describe, expect, it, vi } from "vitest";
import { exportModeratorStatisticsReport } from "@/lib/moderator-statistics";
import { exportPrincipalStatisticsReport } from "@/lib/principal-statistics";

function okResponse() {
  return Promise.resolve(new Response(JSON.stringify({ fileName: "report.pdf", downloadUrl: "https://cdn.test/report.pdf" }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  }));
}

describe("statistics PDF export requests", () => {
  it("serializes the principal's two independent subject filters", async () => {
    const authFetch = vi.fn(okResponse);

    await exportPrincipalStatisticsReport(authFetch, "PHYSICS", "CHEMISTRY");

    expect(authFetch).toHaveBeenCalledWith(
      "/api/principal/statistics/report/pdf?weeklySubject=PHYSICS&accountSubject=CHEMISTRY",
    );
  });

  it("serializes only the selected moderator week", async () => {
    const authFetch = vi.fn(okResponse);

    await exportModeratorStatisticsReport(authFetch, "WEEK", "2026-08-17", 2026, 3);

    expect(authFetch).toHaveBeenCalledWith(
      "/api/moderator/statistics/report/pdf?mode=WEEK&weekStartDate=2026-08-17",
    );
  });

  it("serializes only the selected moderator quarter", async () => {
    const authFetch = vi.fn(okResponse);

    await exportModeratorStatisticsReport(authFetch, "QUARTER", "2026-08-17", 2025, 4);

    expect(authFetch).toHaveBeenCalledWith(
      "/api/moderator/statistics/report/pdf?mode=QUARTER&year=2025&quarter=4",
    );
  });
});

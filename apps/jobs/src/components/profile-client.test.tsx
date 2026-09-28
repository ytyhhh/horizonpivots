// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ProfileClient } from "@/components/profile-client";
import { emptyCandidateProfile } from "@/lib/profile-data";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("manual-only profile", () => {
  it("has no file input and saves handwritten fields through the profile API", async () => {
    const initial = emptyCandidateProfile("user_test");
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ data: { ...initial, major: "计算机科学", version: 1 } }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const { container } = render(<ProfileClient initialProfile={initial} demoMode={false} />);
    expect(container.querySelector('input[type="file"]')).toBeNull();
    expect(screen.queryByText("上传简历辅助填写")).toBeNull();

    fireEvent.change(screen.getByLabelText("专业"), { target: { value: "计算机科学" } });
    fireEvent.click(screen.getByRole("button", { name: "保存草稿" }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledOnce());
    expect(fetchMock).toHaveBeenCalledWith("/api/profile", expect.objectContaining({ method: "PATCH" }));
    const request = fetchMock.mock.calls[0]?.[1] as RequestInit;
    expect(JSON.parse(String(request.body))).toMatchObject({
      expectedVersion: 0,
      profile: { major: "计算机科学", confirmed: false },
    });
  });
});

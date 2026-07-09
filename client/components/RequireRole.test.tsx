import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { RequireRole } from "./RequireRole";

const replace = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace }),
}));

const mockAuth = vi.fn();

vi.mock("@/context/AuthProvider", () => ({
  useAuth: () => mockAuth(),
}));

describe("RequireRole", () => {
  beforeEach(() => {
    replace.mockClear();
    mockAuth.mockReset();
  });

  it("shows spinner while loading", () => {
    mockAuth.mockReturnValue({ user: null, role: null, loading: true });
    render(
      <RequireRole role="DRIVER">
        <div>Secret</div>
      </RequireRole>
    );
    expect(screen.queryByText("Secret")).not.toBeInTheDocument();
  });

  it("redirects unauthenticated users to login", () => {
    mockAuth.mockReturnValue({ user: null, role: null, loading: false });
    render(
      <RequireRole role="DRIVER">
        <div>Secret</div>
      </RequireRole>
    );
    expect(replace).toHaveBeenCalledWith("/login?next=driver");
  });

  it("renders children when role matches", () => {
    mockAuth.mockReturnValue({
      user: { id: "1", name: "Driver" },
      role: "DRIVER",
      loading: false,
    });
    render(
      <RequireRole role="DRIVER">
        <div>Driver dashboard</div>
      </RequireRole>
    );
    expect(screen.getByText("Driver dashboard")).toBeInTheDocument();
  });

  it("redirects when role mismatches", () => {
    mockAuth.mockReturnValue({
      user: { id: "1", name: "User" },
      role: "USER",
      loading: false,
    });
    render(
      <RequireRole role="ADMIN">
        <div>Admin panel</div>
      </RequireRole>
    );
    expect(replace).toHaveBeenCalledWith("/");
    expect(screen.queryByText("Admin panel")).not.toBeInTheDocument();
  });
});

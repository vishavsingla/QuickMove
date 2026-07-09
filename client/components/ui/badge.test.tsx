import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { Badge } from "./badge";

describe("Badge", () => {
  it("renders children with the success variant", () => {
    render(<Badge variant="success">Verified</Badge>);
    const badge = screen.getByText("Verified");
    expect(badge).toBeInTheDocument();
    expect(badge.className).toMatch(/emerald/);
  });

  it("renders destructive variant", () => {
    render(<Badge variant="destructive">Rejected</Badge>);
    expect(screen.getByText("Rejected")).toBeInTheDocument();
  });
});

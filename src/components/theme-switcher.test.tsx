import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ThemeProvider } from "../app/theme-context";
import { storage } from "../utils/storage";
import { ThemeSwitcher } from "./ThemeSwitcher";

describe("ThemeSwitcher", () => {
  it("updates persisted theme selection", () => {
    render(
      <ThemeProvider>
        <ThemeSwitcher />
      </ThemeProvider>,
    );

    const select = screen.getByLabelText("Color theme");
    fireEvent.change(select, { target: { value: "ocean" } });

    expect(storage.getTheme()).toBe("ocean");
  });
});

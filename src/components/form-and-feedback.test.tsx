import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ErrorMessage, SuccessMessage } from "./FeedbackMessages";
import { LabeledCheckbox } from "./FormFields";

describe("form and feedback primitives", () => {
  it("renders LabeledCheckbox and forwards checked state changes", () => {
    const onChange = vi.fn();
    render(<LabeledCheckbox checked={false} label="Enable feature" onChange={onChange} />);

    const checkbox = screen.getByLabelText("Enable feature");
    expect(checkbox).not.toBeChecked();

    fireEvent.click(checkbox);
    expect(onChange).toHaveBeenCalledWith(true);
  });

  it("renders feedback messages with expected semantics", () => {
    render(
      <>
        <ErrorMessage>Something failed</ErrorMessage>
        <SuccessMessage>Saved successfully</SuccessMessage>
      </>,
    );

    expect(screen.getByRole("alert")).toHaveTextContent("Something failed");
    const success = screen.getByText("Saved successfully");
    expect(success).toHaveClass("fantasy-success-note");
  });
});

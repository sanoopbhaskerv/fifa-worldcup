import type { ReactNode } from "react";

type FeedbackMessageProps = {
  children: ReactNode;
};

export const ErrorMessage = ({ children }: FeedbackMessageProps) => (
  <p role="alert">{children}</p>
);

export const SuccessMessage = ({ children }: FeedbackMessageProps) => (
  <p className="fantasy-success-note">{children}</p>
);

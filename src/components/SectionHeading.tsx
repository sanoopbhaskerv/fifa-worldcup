import type { ReactNode } from "react";

type SectionHeadingProps = {
  eyebrow?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  trailing?: ReactNode;
};

export const SectionHeading = ({
  eyebrow,
  title,
  description,
  trailing,
}: SectionHeadingProps) => (
  <div className="section-heading">
    <div>
      {eyebrow ? <span className="eyebrow">{eyebrow}</span> : null}
      <h2>{title}</h2>
      {description ? <p>{description}</p> : null}
    </div>
    {trailing}
  </div>
);

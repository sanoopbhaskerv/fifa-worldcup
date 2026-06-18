import { useState } from "react";
import { useFantasy } from "../app/fantasy-context";
import { LabeledInput } from "../components/FormFields";
import { useFantasyQuestionTemplates, useUpdateFantasyQuestionTemplate } from "../services/fantasy-queries";
import type { FantasyMatchImportance, FantasyQuestionTemplate } from "../types/fantasy";
import { PageHeading } from "../components/PageSections";
import { SectionHeading } from "../components/SectionHeading";

const importanceOptions: FantasyMatchImportance[] = ["NORMAL", "BIG_MATCH", "KNOCKOUT", "FINAL"];

/**
 * Displays admin controls for question templates used by AI-assisted poll drafts.
 *
 * @returns Admin question templates page.
 */
export default function FantasyAdminQuestionTemplatesPage() {
  const { data } = useFantasy();
  const templatesQuery = useFantasyQuestionTemplates();
  const templates = (templatesQuery.data?.questionTemplates ?? data.questionTemplates)
    .slice()
    .sort((left, right) => left.sortOrder - right.sortOrder);
  const [activeTemplateId, setActiveTemplateId] = useState(templates[0]?.id ?? "");
  const activeTemplate = templates.find((template) => template.id === activeTemplateId) ?? templates[0];

  return (
    <div className="page fantasy-page">
      <PageHeading eyebrow="Admin" title="Question templates" description="Control the reusable poll patterns that generate match questions from fixtures and squad data." />
      <div className="fantasy-template-admin">
        <aside className="content-section fantasy-template-list" aria-label="Question templates">
          {templates.map((template) => (
            <button
              className={template.id === activeTemplate?.id ? "fantasy-template-button fantasy-template-button--active" : "fantasy-template-button"}
              key={template.id}
              onClick={() => setActiveTemplateId(template.id)}
              type="button"
            >
              <strong>{template.name}</strong>
              <span>{template.category.replaceAll("_", " ")} · {template.points} pts</span>
            </button>
          ))}
        </aside>
        {activeTemplate && <QuestionTemplateEditor key={activeTemplate.id} template={activeTemplate} />}
      </div>
      {templatesQuery.isError && <p role="alert">{templatesQuery.error.message}</p>}
    </div>
  );
}

const QuestionTemplateEditor = ({ template }: { template: FantasyQuestionTemplate }) => {
  const { data } = useFantasy();
  const updateTemplate = useUpdateFantasyQuestionTemplate(data.activeParticipantId);
  const [name, setName] = useState(template.name);
  const [text, setText] = useState(template.text);
  const [points, setPoints] = useState(String(template.points));
  const [maxOptions, setMaxOptions] = useState(String(template.maxOptions ?? ""));
  const [enabled, setEnabled] = useState(template.enabled);
  const [importanceLevels, setImportanceLevels] = useState<FantasyMatchImportance[]>(template.importanceLevels);
  const [sortOrder, setSortOrder] = useState(String(template.sortOrder));

  const updateImportance = (importance: FantasyMatchImportance, checked: boolean) => {
    setImportanceLevels((current) => {
      if (checked) return current.includes(importance) ? current : [...current, importance];
      return current.filter((item) => item !== importance);
    });
  };

  return (
    <section className="content-section fantasy-template-editor">
      <SectionHeading
        eyebrow={enabled ? "Enabled" : "Disabled"}
        title={template.name}
        description={`${template.type.replaceAll("_", " ")} · ${template.optionMode.replaceAll("_", " ")}`}
      />
      <form
        onSubmit={(event) => {
          event.preventDefault();
          updateTemplate.mutate({
            enabled,
            importanceLevels,
            maxOptions: maxOptions ? Number(maxOptions) : undefined,
            name,
            optionMode: template.optionMode,
            points: Number(points),
            sortOrder: Number(sortOrder),
            templateId: template.id,
            text,
          });
        }}
      >
        <LabeledInput label="Template name" onChange={setName} value={name} />
        <LabeledInput label="Question text" onChange={setText} value={text} />
        <LabeledInput label="Points" min="1" onChange={setPoints} type="number" value={points} />
        <LabeledInput label="Max player options" min="1" onChange={setMaxOptions} placeholder="Auto" type="number" value={maxOptions} />
        <LabeledInput label="Sort order" min="1" onChange={setSortOrder} type="number" value={sortOrder} />
        <div className="fantasy-template-meta">
          <span>Category <strong>{template.category.replaceAll("_", " ")}</strong></span>
          <span>Type <strong>{template.type.replaceAll("_", " ")}</strong></span>
          <span>Options <strong>{template.optionMode.replaceAll("_", " ")}</strong></span>
        </div>
        <label className="fantasy-toggle-row">
          <input checked={enabled} onChange={(event) => setEnabled(event.target.checked)} type="checkbox" />
          Enabled for draft generation
        </label>
        <div className="fantasy-importance-editor" aria-label="Match importance levels">
          {importanceOptions.map((importance) => (
            <label key={importance}>
              <input checked={importanceLevels.includes(importance)} onChange={(event) => updateImportance(importance, event.target.checked)} type="checkbox" />
              {importance.replace("_", " ")}
            </label>
          ))}
        </div>
        <button className="button button--primary" disabled={updateTemplate.isPending || importanceLevels.length === 0} type="submit">
          {updateTemplate.isPending ? "Saving..." : "Save template"}
        </button>
      </form>
      {importanceLevels.length === 0 && <p role="alert">Choose at least one match importance.</p>}
      {updateTemplate.isError && <p role="alert">{updateTemplate.error.message}</p>}
      {updateTemplate.isSuccess && <p className="fantasy-success-note">Template saved.</p>}
    </section>
  );
};

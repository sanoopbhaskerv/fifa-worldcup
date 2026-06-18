import { useState } from "react";
import { useFantasy } from "../app/fantasy-context";
import { useFantasyAiSettings, useUpdateFantasyAiSettings } from "../services/fantasy-queries";
import type { FantasyAiBanterLevel, FantasyAiMode, FantasyAiSettings, FantasyMatchImportance, FantasyQuestionCategory } from "../types/fantasy";
import { LabeledCheckbox, LabeledInput, LabeledSelect } from "../components/FormFields";
import { ErrorMessage, SuccessMessage } from "../components/FeedbackMessages";
import { PageHeading } from "../components/PageSections";
import { SectionHeading } from "../components/SectionHeading";

const importanceOptions: FantasyMatchImportance[] = ["NORMAL", "BIG_MATCH", "KNOCKOUT", "FINAL"];
const modeOptions: FantasyAiMode[] = ["TEMPLATE_ONLY", "ASSISTED", "DISABLED"];
const banterOptions: FantasyAiBanterLevel[] = ["NONE", "LIGHT", "PLAYFUL"];
const modeSelectOptions = modeOptions.map((option) => ({
  value: option,
  label: option.replace("_", " "),
}));
const banterSelectOptions = banterOptions.map((option) => ({
  value: option,
  label: option,
}));

/**
 * Displays admin settings for AI-assisted fantasy poll generation.
 *
 * @returns Admin AI settings page.
 */
export default function FantasyAdminAiSettingsPage() {
  const { data } = useFantasy();
  const settingsQuery = useFantasyAiSettings();
  const settings = settingsQuery.data?.aiSettings ?? data.aiSettings;
  const categories = [...new Set(data.questionTemplates.map((template) => template.category))]
    .sort((left, right) => left.localeCompare(right));

  return (
    <div className="page fantasy-page">
      <PageHeading eyebrow="Admin" title="AI agent settings" description="Set the cost and behavior guardrails used when match poll drafts are generated." />
      <div className="fantasy-ai-admin">
        <section className="content-section fantasy-ai-summary">
          <SectionHeading
            eyebrow={settings.mode.replace("_", " ")}
            title="Generation guardrails"
          />
          <dl className="fantasy-review-summary">
            <article><span>Provider</span><strong>{settings.externalProviderEnabled ? "On" : "Off"}</strong></article>
            <article><span>Budget</span><strong>{settings.dailyBudgetCents}c</strong></article>
            <article><span>Categories</span><strong>{settings.enabledCategories.length}</strong></article>
          </dl>
        </section>
        <AiSettingsEditor categories={categories} settings={settings} />
      </div>
      {settingsQuery.isError && <ErrorMessage>{settingsQuery.error.message}</ErrorMessage>}
    </div>
  );
}

const AiSettingsEditor = ({ categories, settings }: { categories: FantasyQuestionCategory[]; settings: FantasyAiSettings }) => {
  const { data } = useFantasy();
  const updateSettings = useUpdateFantasyAiSettings(data.activeParticipantId);
  const [mode, setMode] = useState<FantasyAiMode>(settings.mode);
  const [externalProviderEnabled, setExternalProviderEnabled] = useState(settings.externalProviderEnabled);
  const [fallbackToTemplates, setFallbackToTemplates] = useState(settings.fallbackToTemplates);
  const [banterLevel, setBanterLevel] = useState<FantasyAiBanterLevel>(settings.banterLevel);
  const [dailyBudgetCents, setDailyBudgetCents] = useState(String(settings.dailyBudgetCents));
  const [maxQuestions, setMaxQuestions] = useState(settings.maxQuestions);
  const [enabledCategories, setEnabledCategories] = useState<FantasyQuestionCategory[]>(settings.enabledCategories);

  const updateMaxQuestions = (importance: FantasyMatchImportance, value: string) => {
    setMaxQuestions((current) => ({ ...current, [importance]: Number(value) }));
  };
  const updateCategory = (category: FantasyQuestionCategory, checked: boolean) => {
    setEnabledCategories((current) => {
      if (checked) return current.includes(category) ? current : [...current, category];
      return current.filter((item) => item !== category);
    });
  };

  return (
    <section className="content-section fantasy-ai-editor">
      <SectionHeading eyebrow="Settings" title="Draft generation" />
      <form
        onSubmit={(event) => {
          event.preventDefault();
          updateSettings.mutate({
            banterLevel,
            dailyBudgetCents: Number(dailyBudgetCents),
            enabledCategories,
            externalProviderEnabled,
            fallbackToTemplates,
            maxQuestions,
            mode,
            tournamentId: data.tournament.id,
          });
        }}
      >
        <LabeledSelect
          label="Mode"
          value={mode}
          onChange={(value: string) => setMode(value as FantasyAiMode)}
          options={modeSelectOptions}
        />
        <LabeledSelect
          label="Banter level"
          value={banterLevel}
          onChange={(value: string) => setBanterLevel(value as FantasyAiBanterLevel)}
          options={banterSelectOptions}
        />
        <LabeledInput
          label="Daily AI budget cents"
          value={dailyBudgetCents}
          onChange={setDailyBudgetCents}
          type="number"
          min="0"
        />
        <div className="fantasy-ai-toggle-grid">
          <LabeledCheckbox checked={externalProviderEnabled} label="External provider" onChange={setExternalProviderEnabled} />
          <LabeledCheckbox checked={fallbackToTemplates} label="Template fallback" onChange={setFallbackToTemplates} />
        </div>
        <div className="fantasy-ai-number-grid" aria-label="Max questions by importance">
          {importanceOptions.map((importance) => (
            <LabeledInput
              key={importance}
              label={importance.replace("_", " ")}
              max="12"
              min="1"
              onChange={(value: string) => updateMaxQuestions(importance, value)}
              type="number"
              value={String(maxQuestions[importance])}
            />
          ))}
        </div>
        <div className="fantasy-ai-category-grid" aria-label="Enabled question categories">
          {categories.map((category) => (
            <LabeledCheckbox
              checked={enabledCategories.includes(category)}
              key={category}
              label={category.replaceAll("_", " ")}
              onChange={(checked: boolean) => updateCategory(category, checked)}
            />
          ))}
        </div>
        <button className="button button--primary" disabled={updateSettings.isPending || enabledCategories.length === 0} type="submit">
          {updateSettings.isPending ? "Saving..." : "Save AI settings"}
        </button>
      </form>
      {enabledCategories.length === 0 && <ErrorMessage>Choose at least one question category.</ErrorMessage>}
      {updateSettings.isError && <ErrorMessage>{updateSettings.error.message}</ErrorMessage>}
      {updateSettings.isSuccess && <SuccessMessage>AI settings saved.</SuccessMessage>}
    </section>
  );
};

import { useState } from "react";
import { useFantasy } from "../app/fantasy-context";
import { useFantasyAiSettings, useUpdateFantasyAiSettings } from "../services/fantasy-queries";
import type { FantasyAiBanterLevel, FantasyAiMode, FantasyAiSettings, FantasyMatchImportance, FantasyQuestionCategory } from "../types/fantasy";
import { PageHeading } from "./FixturesPage";

const importanceOptions: FantasyMatchImportance[] = ["NORMAL", "BIG_MATCH", "KNOCKOUT", "FINAL"];
const modeOptions: FantasyAiMode[] = ["TEMPLATE_ONLY", "ASSISTED", "DISABLED"];
const banterOptions: FantasyAiBanterLevel[] = ["NONE", "LIGHT", "PLAYFUL"];

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
          <div className="section-heading">
            <div>
              <span className="eyebrow">{settings.mode.replace("_", " ")}</span>
              <h2>Generation guardrails</h2>
            </div>
          </div>
          <dl className="fantasy-review-summary">
            <article><span>Provider</span><strong>{settings.externalProviderEnabled ? "On" : "Off"}</strong></article>
            <article><span>Budget</span><strong>{settings.dailyBudgetCents}c</strong></article>
            <article><span>Categories</span><strong>{settings.enabledCategories.length}</strong></article>
          </dl>
        </section>
        <AiSettingsEditor categories={categories} settings={settings} />
      </div>
      {settingsQuery.isError && <p role="alert">{settingsQuery.error.message}</p>}
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
      <div className="section-heading">
        <div>
          <span className="eyebrow">Settings</span>
          <h2>Draft generation</h2>
        </div>
      </div>
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
        <label>
          Mode
          <select onChange={(event) => setMode(event.target.value as FantasyAiMode)} value={mode}>
            {modeOptions.map((option) => <option key={option} value={option}>{option.replace("_", " ")}</option>)}
          </select>
        </label>
        <label>
          Banter level
          <select onChange={(event) => setBanterLevel(event.target.value as FantasyAiBanterLevel)} value={banterLevel}>
            {banterOptions.map((option) => <option key={option} value={option}>{option}</option>)}
          </select>
        </label>
        <label>
          Daily AI budget cents
          <input min="0" onChange={(event) => setDailyBudgetCents(event.target.value)} type="number" value={dailyBudgetCents} />
        </label>
        <div className="fantasy-ai-toggle-grid">
          <label>
            <input checked={externalProviderEnabled} onChange={(event) => setExternalProviderEnabled(event.target.checked)} type="checkbox" />
            External provider
          </label>
          <label>
            <input checked={fallbackToTemplates} onChange={(event) => setFallbackToTemplates(event.target.checked)} type="checkbox" />
            Template fallback
          </label>
        </div>
        <div className="fantasy-ai-number-grid" aria-label="Max questions by importance">
          {importanceOptions.map((importance) => (
            <label key={importance}>
              {importance.replace("_", " ")}
              <input min="1" max="12" onChange={(event) => updateMaxQuestions(importance, event.target.value)} type="number" value={maxQuestions[importance]} />
            </label>
          ))}
        </div>
        <div className="fantasy-ai-category-grid" aria-label="Enabled question categories">
          {categories.map((category) => (
            <label key={category}>
              <input checked={enabledCategories.includes(category)} onChange={(event) => updateCategory(category, event.target.checked)} type="checkbox" />
              {category.replaceAll("_", " ")}
            </label>
          ))}
        </div>
        <button className="button button--primary" disabled={updateSettings.isPending || enabledCategories.length === 0} type="submit">
          {updateSettings.isPending ? "Saving..." : "Save AI settings"}
        </button>
      </form>
      {enabledCategories.length === 0 && <p role="alert">Choose at least one question category.</p>}
      {updateSettings.isError && <p role="alert">{updateSettings.error.message}</p>}
      {updateSettings.isSuccess && <p className="fantasy-success-note">AI settings saved.</p>}
    </section>
  );
};

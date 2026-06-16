import { AnimatePresence, motion } from "framer-motion";
import { useMemo, useState } from "react";
import type { Competition } from "../../types/domain";
import { CloseIcon, SearchIcon, StarIcon } from "../../components/Icons";

interface CompetitionPickerProps {
  open: boolean;
  competitions: Competition[];
  currentId: string;
  favorites: string[];
  recents: string[];
  onClose: () => void;
  onSelect: (competition: Competition) => void;
  onToggleFavorite: (id: string) => void;
}

export const CompetitionPicker = ({
  open,
  competitions,
  currentId,
  favorites,
  recents,
  onClose,
  onSelect,
  onToggleFavorite,
}: CompetitionPickerProps) => {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<"All" | Competition["category"]>("All");
  const [area, setArea] = useState("All areas");
  const areas = useMemo(
    () => ["All areas", ...new Set(competitions.flatMap((competition) => [competition.region, competition.confederation, competition.country].filter(Boolean) as string[]))],
    [competitions],
  );
  const filtered = useMemo(
    () =>
      competitions.filter((competition) => {
        const matchesQuery = `${competition.name} ${competition.country ?? ""} ${competition.region} ${competition.confederation}`.toLowerCase().includes(query.toLowerCase());
        const matchesArea = area === "All areas" || [competition.region, competition.confederation, competition.country].includes(area);
        return matchesQuery && matchesArea && (category === "All" || competition.category === category);
      }),
    [area, category, competitions, query],
  );
  const favoriteCompetitions = competitions.filter((competition) => favorites.includes(competition.id));
  const recentCompetitions = recents.map((id) => competitions.find((competition) => competition.id === id)).filter(Boolean) as Competition[];

  return (
    <AnimatePresence>
      {open && (
        <motion.div className="dialog-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onMouseDown={onClose}>
          <motion.section
            role="dialog"
            aria-modal="true"
            aria-labelledby="competition-picker-title"
            className="competition-picker"
            initial={{ opacity: 0, y: 30, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.2 }}
            onMouseDown={(event) => event.stopPropagation()}
          >
            <header className="picker-header">
              <div><span className="eyebrow">Explore football</span><h2 id="competition-picker-title">Choose a competition</h2></div>
              <button className="icon-button" onClick={onClose} aria-label="Close competition picker"><CloseIcon /></button>
            </header>
            <label className="search-field"><SearchIcon /><span className="sr-only">Search competitions</span><input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search competitions, countries…" /></label>
            <div className="chip-row" aria-label="Competition category">
              {(["All", "International", "Club"] as const).map((item) => <button className={`chip ${category === item ? "chip--active" : ""}`} key={item} onClick={() => setCategory(item)}>{item}</button>)}
            </div>
            <label className="picker-area"><span>Region, country or confederation</span><select value={area} onChange={(event) => setArea(event.target.value)}>{areas.map((item) => <option key={item}>{item}</option>)}</select></label>
            {!query && category === "All" && favoriteCompetitions.length > 0 && <CompetitionGroup title="Favorites" competitions={favoriteCompetitions} {...{ currentId, favorites, onSelect, onToggleFavorite }} />}
            {!query && category === "All" && recentCompetitions.length > 0 && <CompetitionGroup title="Recently viewed" competitions={recentCompetitions} {...{ currentId, favorites, onSelect, onToggleFavorite }} />}
            <CompetitionGroup title={query ? `${filtered.length} results` : category === "All" ? "All competitions" : category} competitions={filtered} {...{ currentId, favorites, onSelect, onToggleFavorite }} />
          </motion.section>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

const CompetitionGroup = ({
  title,
  competitions,
  currentId,
  favorites,
  onSelect,
  onToggleFavorite,
}: {
  title: string;
  competitions: Competition[];
  currentId: string;
  favorites: string[];
  onSelect: (competition: Competition) => void;
  onToggleFavorite: (id: string) => void;
}) => (
  <section className="picker-group">
    <h3>{title}</h3>
    <div className="picker-list">
      {competitions.map((competition) => (
        <div className={`competition-option ${competition.id === currentId ? "competition-option--active" : ""}`} key={competition.id}>
          <button className="competition-option__main" onClick={() => onSelect(competition)}>
            <span className="competition-emblem" style={{ "--competition-accent": competition.accent } as React.CSSProperties}>{competition.emblem}</span>
            <span><strong>{competition.name}</strong><small>{competition.category} · {competition.confederation} · {competition.activeEditionId}</small></span>
          </button>
          <button className="icon-button" onClick={() => onToggleFavorite(competition.id)} aria-label={`${favorites.includes(competition.id) ? "Remove" : "Add"} ${competition.name} ${favorites.includes(competition.id) ? "from" : "to"} favorites`}>
            <StarIcon fill={favorites.includes(competition.id) ? "currentColor" : "none"} />
          </button>
        </div>
      ))}
      {competitions.length === 0 && <div className="empty-inline">No competitions match your search.</div>}
    </div>
  </section>
);

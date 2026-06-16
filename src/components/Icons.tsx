import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement>;

/**
 * Renders the shared SVG wrapper used by every app icon.
 *
 * @param props - Standard SVG props and child path elements.
 * @returns SVG element with the app's common icon stroke styling.
 */
const Icon = ({ children, ...props }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
    {children}
  </svg>
);

/**
 * Renders the overview/home navigation icon.
 *
 * @param props - SVG attributes forwarded to the icon element.
 * @returns Home icon SVG.
 */
export const HomeIcon = (props: IconProps) => <Icon {...props}><path d="m3 11 9-8 9 8"/><path d="M5 10v10h14V10"/><path d="M9 20v-6h6v6"/></Icon>;

/**
 * Renders the fixture calendar icon.
 *
 * @param props - SVG attributes forwarded to the icon element.
 * @returns Calendar icon SVG.
 */
export const CalendarIcon = (props: IconProps) => <Icon {...props}><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18"/></Icon>;

/**
 * Renders the trophy/results icon.
 *
 * @param props - SVG attributes forwarded to the icon element.
 * @returns Trophy icon SVG.
 */
export const TrophyIcon = (props: IconProps) => <Icon {...props}><path d="M8 4h8v5a4 4 0 0 1-8 0V4Z"/><path d="M8 6H4v2a4 4 0 0 0 4 4M16 6h4v2a4 4 0 0 1-4 4M12 13v4M8 21h8M9 17h6"/></Icon>;

/**
 * Renders the standings table icon.
 *
 * @param props - SVG attributes forwarded to the icon element.
 * @returns Table icon SVG.
 */
export const TableIcon = (props: IconProps) => <Icon {...props}><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 9h18M8 9v11M15 9v11"/></Icon>;

/**
 * Renders the knockout bracket icon.
 *
 * @param props - SVG attributes forwarded to the icon element.
 * @returns Bracket icon SVG.
 */
export const BracketIcon = (props: IconProps) => <Icon {...props}><path d="M4 5h5v4H4zM4 15h5v4H4zM15 9h5v6h-5zM9 7h3v5h3M9 17h3v-5"/></Icon>;

/**
 * Renders the player/scorers icon.
 *
 * @param props - SVG attributes forwarded to the icon element.
 * @returns Player icon SVG.
 */
export const PlayerIcon = (props: IconProps) => <Icon {...props}><circle cx="12" cy="7" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></Icon>;

/**
 * Renders the search icon used in picker and filter controls.
 *
 * @param props - SVG attributes forwarded to the icon element.
 * @returns Search icon SVG.
 */
export const SearchIcon = (props: IconProps) => <Icon {...props}><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></Icon>;

/**
 * Renders the directional chevron icon.
 *
 * @param props - SVG attributes forwarded to the icon element.
 * @returns Chevron icon SVG.
 */
export const ChevronIcon = (props: IconProps) => <Icon {...props}><path d="m9 18 6-6-6-6"/></Icon>;

/**
 * Renders the favorite marker as an outlined or filled star.
 *
 * @param props - SVG attributes forwarded to the icon element.
 * @param props.fill - SVG fill color, defaulting to `none`.
 * @returns Star icon SVG.
 */
export const StarIcon = ({ fill = "none", ...props }: IconProps) => <Icon fill={fill} {...props}><path d="m12 3 2.7 5.5 6 .9-4.4 4.2 1.1 6-5.4-2.8-5.4 2.8 1.1-6-4.4-4.2 6-.9L12 3Z"/></Icon>;

/**
 * Renders the close icon used by dialogs and dismissible UI.
 *
 * @param props - SVG attributes forwarded to the icon element.
 * @returns Close icon SVG.
 */
export const CloseIcon = (props: IconProps) => <Icon {...props}><path d="m6 6 12 12M18 6 6 18"/></Icon>;

/**
 * Renders the forward arrow icon used by calls to action.
 *
 * @param props - SVG attributes forwarded to the icon element.
 * @returns Arrow icon SVG.
 */
export const ArrowIcon = (props: IconProps) => <Icon {...props}><path d="M5 12h14M14 7l5 5-5 5"/></Icon>;

/**
 * Renders the connectivity/status icon used beside live or provider details.
 *
 * @param props - SVG attributes forwarded to the icon element.
 * @returns Signal icon SVG.
 */
export const SignalIcon = (props: IconProps) => <Icon {...props}><path d="M5 12.5a10 10 0 0 1 14 0M8.5 16a5 5 0 0 1 7 0M12 20h.01"/></Icon>;

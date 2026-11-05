export type Guide = "thirds" | "center" | "close" | "golden";

export type Chapter = {
  n: string;
  title: string;
  ratio: number; // selection width / height
  ratioLabel: string;
  fit: number; // selection width, as a fraction of the glass width
  cx: number; // selection centre in glass uv (0..1, origin bottom-left)
  cy: number;
  guide: Guide;
  guideLabel: string;
  subject: string;
  src: string; // the frame being studied (swap in real stills)
  line: string; // narration
  body: string;
};

/** Glass size in scene units (4:5). The frame lines always live inside it. */
export const GLASS_W = 1;
export const GLASS_H = 1.25;

const STILL = "/images/sandeep-reddy-vanga.jpg";

export const CHAPTERS: Chapter[] = [
  {
    n: "01",
    title: "Rule of Thirds",
    ratio: 0.8,
    ratioLabel: "4:5",
    fit: 0.94,
    cx: 0.5,
    cy: 0.5,
    guide: "thirds",
    guideLabel: "Rule of thirds",
    subject: "Eyes on the upper third",
    src: STILL,
    line: "Eyes on the line. Nothing sits by accident.",
    body: "Split the frame into nine. Put what matters on the lines, and let the empty space do the talking.",
  },
  {
    n: "02",
    title: "Dead Centre",
    ratio: 1,
    ratioLabel: "1:1",
    fit: 0.8,
    cx: 0.5,
    cy: 0.64,
    guide: "center",
    guideLabel: "Centre axis",
    subject: "Face on the axis",
    src: STILL,
    line: "Straight at you. Nowhere to hide.",
    body: "Square the subject to the middle of the frame. No exits, no distance, no comfort.",
  },
  {
    n: "03",
    title: "The Close-up",
    ratio: 2.39,
    ratioLabel: "2.39:1",
    fit: 0.96,
    cx: 0.5,
    cy: 0.71,
    guide: "close",
    guideLabel: "Eye line + safe area",
    subject: "Eyes",
    src: STILL,
    line: "Closer than comfortable.",
    body: "Cut the frame down to a sliver. When the eyes fill the screen, there is nowhere else to look.",
  },
  {
    n: "04",
    title: "The Golden Spiral",
    ratio: 0.618,
    ratioLabel: "1:1.618",
    fit: 0.72,
    cx: 0.5,
    cy: 0.5,
    guide: "golden",
    guideLabel: "Golden spiral",
    subject: "Spiral ends on the face",
    src: STILL,
    line: "The eye follows the line.",
    body: "A spiral pulls the eye from the edge of the frame to the face. Order inside the chaos.",
  },
];
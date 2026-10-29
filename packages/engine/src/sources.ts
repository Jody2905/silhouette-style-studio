export interface Source {
  key: string;
  title: string;
  url: string;
  usedFor: string;
}

export const SOURCES: Source[] = [
  {
    key: "ffit",
    title: "Simmons, Istook & Devarajan (2004): Female Figure Identification Technique (FFIT) for apparel; formulas as published by Lee et al. (2007)",
    url: "https://core.ac.uk/download/359918442.pdf",
    usedFor: "Body shape from bust, waist, high-hip and hip measurements",
  },
  {
    key: "ffit-plus",
    title: "Modification of the FFIT formulas to include plus-size bodies (University of Oregon)",
    url: "https://scholarsbank.uoregon.edu/xmlui/handle/1794/25863",
    usedFor: "Adding a shape for a fuller middle",
  },
  {
    key: "stripes",
    title: "Thompson & Mikellidou (2011), i-Perception: Applying the Helmholtz illusion to fashion: horizontal stripes won't make you look fatter",
    url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC3485773",
    usedFor: "Myth-buster: horizontal stripes can make a figure look taller and narrower, not wider",
  },
  {
    key: "legs",
    title: "Sorokowski et al. (2011), Journal of Cross-Cultural Psychology: Attractiveness of leg length, report from 27 nations",
    url: "https://gcris.ieu.edu.tr/entities/publication/806b5da6-c062-4787-bde7-c7cbd4c635cb/full",
    usedFor: "Why lengthening the leg line (high rises, matching shoes, heels) reads as balanced",
  },
  {
    key: "contrast",
    title: "Russell (2009), Perception: A sex difference in facial contrast and its exaggeration by cosmetics",
    url: "https://cupola.gettysburg.edu/psyfac/4",
    usedFor: "Matching makeup and outfit contrast to your natural facial contrast",
  },
  {
    key: "mediapipe",
    title: "Google MediaPipe Face Landmarker and Pose Landmarker",
    url: "https://developers.google.com/edge/mediapipe/solutions/vision/face_landmarker/web_js",
    usedFor: "On-device face and body measurements from your photo",
  },
  {
    key: "trends-fashion",
    title: "FASHION Magazine: The top 10 trends from the Fall 2026 runways",
    url: "https://fashionmagazine.com/style/fall-2026-trends/",
    usedFor: "AW26 trends: tomato red, polka dots, capes, sheer layers, oversized outerwear, statement shoes, belts",
  },
  {
    key: "trends-www",
    title: "Who What Wear: Key trends for Autumn/Winter 2026",
    url: "https://www.whowhatwear.com/fashion/trends/autumn-winter-2026-trends",
    usedFor: "AW26 trends: power suiting, checks, preppy, pink, boho revival, Roaring Twenties, texture",
  },
];

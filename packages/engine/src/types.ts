import { z } from "zod";

export const VIBES = ["classic", "minimal", "romantic", "boho", "edgy", "preppy", "streetwear", "sporty", "glam"] as const;
export type Vibe = (typeof VIBES)[number];

export const FACE_SHAPES = ["oval", "round", "square", "oblong", "heart", "diamond", "triangle"] as const;
export type FaceShape = (typeof FACE_SHAPES)[number];

export const SKIN_DEPTHS = ["fair", "light", "medium", "tan", "deep"] as const;
export const UNDERTONES = ["cool", "neutral", "warm", "olive"] as const;
export const HAIR_COLORS = ["black", "dark-brown", "brown", "light-brown", "blonde", "red", "grey", "silver-white"] as const;
export const EYE_COLORS = ["dark-brown", "brown", "hazel", "green", "blue", "grey"] as const;

/** Body widths (front view) measured from a photo, relative to hip width. Stored with a confidence level. */
export const PhotoBodySchema = z.object({
  shoulder: z.number().min(0.4).max(2.5),
  waist: z.number().min(0.4).max(2),
  hip: z.number().min(0.4).max(2),
  /** Leg length (hip joint to heel) divided by standing height. */
  legRatio: z.number().min(0.3).max(0.65).nullable(),
});
export type PhotoBody = z.infer<typeof PhotoBodySchema>;

/** Face proportions measured from landmarks, all relative to cheekbone width. */
export const FaceRatiosSchema = z.object({
  length: z.number().min(0.6).max(2.2),
  forehead: z.number().min(0.4).max(1.4),
  jaw: z.number().min(0.4).max(1.4),
  /** Jaw angle sharpness, 0 (very rounded) to 1 (very angular). */
  jawAngle: z.number().min(0).max(1),
});
export type FaceRatios = z.infer<typeof FaceRatiosSchema>;

/** Everything Silhouette knows about a person's look. Photos are never part of this: only derived numbers. */
export const ProfileSchema = z.object({
  name: z.string().max(60).default(""),
  /** Which wardrobe to show. */
  wardrobe: z.enum(["womenswear", "menswear", "all"]).default("all"),
  heightCm: z.number().min(120).max(230),
  /** Optional tape measurements (circumferences, cm). */
  measurements: z
    .object({
      bust: z.number().min(50).max(220).nullable(),
      waist: z.number().min(40).max(220).nullable(),
      highHip: z.number().min(50).max(220).nullable(),
      hip: z.number().min(50).max(240).nullable(),
      shoulder: z.number().min(25).max(80).nullable(),
      inseam: z.number().min(40).max(110).nullable(),
    })
    .default({ bust: null, waist: null, highHip: null, hip: null, shoulder: null, inseam: null }),
  photoBody: PhotoBodySchema.nullable().default(null),
  faceRatios: FaceRatiosSchema.nullable().default(null),
  /** User override; when null the shape is worked out from faceRatios. */
  faceShape: z.enum(FACE_SHAPES).nullable().default(null),
  skinDepth: z.enum(SKIN_DEPTHS).default("medium"),
  undertone: z.enum(UNDERTONES).default("neutral"),
  /** Average skin colour sampled from the photo, for the avatar. */
  skinHex: z.string().regex(/^#[0-9a-f]{6}$/i).nullable().default(null),
  hairColor: z.enum(HAIR_COLORS).default("dark-brown"),
  eyeColor: z.enum(EYE_COLORS).default("brown"),
  vibes: z.array(z.enum(VIBES)).max(4).default(["classic"]),
});
export type Profile = z.infer<typeof ProfileSchema>;

export type Evidence = "research" | "stylist" | "myth";

export interface Tip {
  text: string;
  evidence: Evidence;
  /** Short citation key into SOURCES when evidence is research or myth. */
  source?: string;
}

export const DEFAULT_PROFILE: Profile = ProfileSchema.parse({
  heightCm: 165,
  measurements: { bust: 92, waist: 74, highHip: 88, hip: 100, shoulder: null, inseam: null },
  vibes: ["classic", "minimal"],
});

export const CM_PER_IN = 2.54;

/** Natural hair colours as hex, for drawing and for default hair colour in looks. */
export const HAIR_HEX: Record<(typeof HAIR_COLORS)[number], string> = {
  black: "#1a1311",
  "dark-brown": "#33231a",
  brown: "#5a3a26",
  "light-brown": "#8a6040",
  blonde: "#d4b06a",
  red: "#a2462a",
  grey: "#9a9894",
  "silver-white": "#d9d8d4",
};

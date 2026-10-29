// "Make it real": sends the user's photo and a written description of the look to Google's Gemini image model,
// which returns a photorealistic edit. The photo and result pass through the server and are never stored.

export interface TryOnImage {
  mimeType: string;
  data: string; // base64
}
export type TryOnFn = (photo: TryOnImage, prompt: string) => Promise<TryOnImage>;

export class TryOnError extends Error {
  constructor(
    message: string,
    readonly status = 502,
  ) {
    super(message);
  }
}

/** Calls the Gemini API (generateContent with an image + text in, image out). */
export function geminiTryOn(apiKey: string, model = "gemini-2.5-flash-image", fetchImpl: typeof fetch = fetch): TryOnFn {
  return async (photo, prompt) => {
    const res = await fetchImpl(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-goog-api-key": apiKey },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ inlineData: { mimeType: photo.mimeType, data: photo.data } }, { text: prompt }] }],
        generationConfig: { responseModalities: ["IMAGE"] },
      }),
      signal: AbortSignal.timeout(90_000),
    }).catch((e: unknown) => {
      throw new TryOnError(e instanceof Error && e.name === "TimeoutError" ? "The AI took too long. Try again." : "Couldn't reach the AI service.");
    });
    const json = (await res.json().catch(() => ({}))) as {
      error?: { message?: string; status?: string };
      candidates?: { finishReason?: string; content?: { parts?: { inlineData?: TryOnImage; inline_data?: { mime_type: string; data: string } }[] } }[];
      promptFeedback?: { blockReason?: string };
    };
    if (!res.ok) {
      console.error("Gemini error", res.status, json.error?.message);
      if (res.status === 429) throw new TryOnError("The AI service is busy or the monthly budget is used up. Try again later.", 429);
      if (res.status === 400 || res.status === 403) throw new TryOnError("The AI service rejected the request (check the API key and model on the server).", 502);
      throw new TryOnError("The AI service had a problem. Try again.");
    }
    const parts = json.candidates?.[0]?.content?.parts ?? [];
    const images = parts
      .map((p) => p.inlineData ?? (p.inline_data ? { mimeType: p.inline_data.mime_type, data: p.inline_data.data } : undefined))
      .filter((x): x is TryOnImage => !!x?.data);
    const img = images[images.length - 1];
    if (!img) {
      const reason = json.promptFeedback?.blockReason ?? json.candidates?.[0]?.finishReason;
      throw new TryOnError(
        reason && /SAFETY|PROHIBITED|BLOCK|IMAGE_OTHER/i.test(reason)
          ? "The AI declined this photo. Try a different photo (fully clothed, one person, front-facing)."
          : "The AI didn't return a picture this time. Try again.",
        422,
      );
    }
    return img;
  };
}

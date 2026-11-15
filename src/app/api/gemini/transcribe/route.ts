import { NextRequest, NextResponse } from "next/server";
import { getGeminiClient } from "@/lib/gemini";

interface TranscribeRequestBody {
  base64Audio: string;
  mimeType: string;
  filename: string;
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as TranscribeRequestBody;
    const { base64Audio, mimeType, filename } = body;

    if (!base64Audio || !mimeType) {
      return NextResponse.json(
        { error: "Audio payload and MIME type are required." },
        { status: 400 }
      );
    }

    const ai = getGeminiClient();

    const response = await ai.models.generateContent({
      model: "gemini-3.5-transcribe",
      contents: {
        parts: [
          {
            inlineData: {
              mimeType,
              data: base64Audio,
            },
          },
          {
            text: `Transcribe the spoken audio in "${filename}" accurately. Include speaker turns if multiple speakers are clearly distinguishable, or note "[Instrumental / Non-speech audio]" if there is no spoken dialogue.`,
          },
        ],
      },
    });

    const transcript = (response.text ?? "").trim();
    if (!transcript) {
      return NextResponse.json({
        transcript: "[No speech detected in audio stream.]",
      });
    }

    return NextResponse.json({ transcript });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Audio transcription failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

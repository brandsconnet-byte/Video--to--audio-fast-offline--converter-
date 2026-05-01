'use server';

/**
 * @fileOverview A Genkit flow for enhancing converted audio files using AI-powered post-processing.
 *
 * - enhanceConvertedAudio - A function that handles the audio enhancement process.
 * - EnhanceConvertedAudioInput - The input type for the enhanceConvertedAudio function.
 * - EnhanceConvertedAudioOutput - The return type for the enhanceConvertedAudio function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const EnhanceConvertedAudioInputSchema = z.object({
  audioDataUri: z
    .string()
    .describe(
      "The audio file as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
  enhancementRequest: z
    .string()
    .optional()
    .describe(
      'An optional request from the user specifying the type of enhancement (e.g., "reduce noise", "normalize volume", "boost vocals", or "auto"). If not provided, the AI can decide or skip enhancement.'
    ),
});
export type EnhanceConvertedAudioInput = z.infer<typeof EnhanceConvertedAudioInputSchema>;

const EnhanceConvertedAudioOutputSchema = z.object({
  enhancedAudioDataUri: z
    .string()
    .describe("The enhanced audio file as a data URI. If no enhancement was applied, this will be the original audio URI."),
  enhancementDescription: z
    .string()
    .describe("A description of the enhancements applied to the audio, or a message indicating no enhancement was performed."),
});
export type EnhanceConvertedAudioOutput = z.infer<typeof EnhanceConvertedAudioOutputSchema>;

// Define a tool that *simulates* audio enhancement.
// In a real application, this would integrate with an actual audio processing service or library
// (e.g., calling a WebAssembly module client-side, or a backend API).
const enhanceAudioTool = ai.defineTool(
  {
    name: 'enhanceAudio',
    description: 'Enhances an audio file by applying noise reduction, volume normalization, or vocal enhancement based on the user request or an automated decision.',
    inputSchema: z.object({
      audioDataUri: z.string().describe("The audio file as a data URI that must include a MIME type and use Base64 encoding."),
      enhancementType: z.enum(['noise_reduction', 'volume_normalization', 'vocal_enhancement', 'auto']).default('auto').describe('The type of audio enhancement to apply. "auto" will apply a general enhancement based on context.'),
    }),
    outputSchema: z.object({
      enhancedAudioDataUri: z.string().describe("The enhanced audio file as a data URI."),
      enhancementDescription: z.string().describe("A textual description of the enhancements applied."),
    }),
  },
  async (input) => {
    // This is a placeholder implementation.
    // In a real application, you would invoke an actual audio processing backend here.
    // For this exercise, we simulate the enhancement by returning the original audio
    // and a descriptive message.
    const description = `Simulated: Applied ${input.enhancementType} enhancement to the audio.`;
    return {
      enhancedAudioDataUri: input.audioDataUri, // Placeholder: returning original audio
      enhancementDescription: description,
    };
  }
);


const enhanceConvertedAudioPrompt = ai.definePrompt({
  name: 'enhanceConvertedAudioPrompt',
  tools: [enhanceAudioTool],
  input: { schema: EnhanceConvertedAudioInputSchema },
  output: { schema: EnhanceConvertedAudioOutputSchema },
  prompt: `You are an AI audio enhancement assistant.\nYour goal is to process an audio file based on user requests for enhancement.\nYou have access to a tool named 'enhanceAudio' that can apply various audio enhancements.\n\nInput Audio URI: {{media url=audioDataUri}}\n\nUser's Enhancement Request: {{{enhancementRequest}}}\n\nIf the user explicitly requests an enhancement (e.g., "reduce noise", "normalize volume", "boost vocals", "enhance", "auto", "improve audio", "clean up sound") then you must call the 'enhanceAudio' tool.\nWhen calling the tool, map the user's request to one of the enhancementType options: 'noise_reduction', 'volume_normalization', 'vocal_enhancement', or 'auto'. If a specific type is not clear from the request, use 'auto'.\nPass the provided 'audioDataUri' to the tool.\n\nIf no 'enhancementRequest' is provided, or if the request implies no enhancement (e.g., "skip enhancement", "do not enhance", "none"), then you must return a JSON object conforming to the output schema, with the original 'audioDataUri' and a description stating that no enhancement was applied.\n\nExample 1 (User requests noise reduction):\nUser's request: "reduce background noise"\nExpected action: Call 'enhanceAudio' tool with 'enhancementType': 'noise_reduction'.\n\nExample 2 (User requests general enhancement):\nUser's request: "enhance this audio"\nExpected action: Call 'enhanceAudio' tool with 'enhancementType': 'auto'.\n\nExample 3 (User wants volume normalization):\nUser's request: "make the volume consistent"\nExpected action: Call 'enhanceAudio' tool with 'enhancementType': 'volume_normalization'.\n\nExample 4 (No explicit enhancement requested):\nUser's request: "" (empty string) or undefined\nExpected action: Return a JSON object:\n{\n  "enhancedAudioDataUri": "{{audioDataUri}}",\n  "enhancementDescription": "No explicit enhancement requested or applied."\n}\n\nExample 5 (User specifically requests no enhancement):\nUser's request: "do not enhance"\nExpected action: Return a JSON object:\n{\n  "enhancedAudioDataUri": "{{audioDataUri}}",\n  "enhancementDescription": "No enhancement was requested or applied."\n}\n\nCarefully evaluate the 'enhancementRequest' to decide whether to call the tool and with which 'enhancementType'.\n`,
});


const enhanceConvertedAudioFlow = ai.defineFlow(
  {
    name: 'enhanceConvertedAudioFlow',
    inputSchema: EnhanceConvertedAudioInputSchema,
    outputSchema: EnhanceConvertedAudioOutputSchema,
  },
  async (input) => {
    // The LLM (via enhanceConvertedAudioPrompt) is responsible for deciding
    // whether to call the enhanceAudioTool or to directly generate the output JSON.
    const { output } = await enhanceConvertedAudioPrompt(input);
    return output!;
  }
);

export async function enhanceConvertedAudio(input: EnhanceConvertedAudioInput): Promise<EnhanceConvertedAudioOutput> {
  return enhanceConvertedAudioFlow(input);
}

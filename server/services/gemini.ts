import { GoogleGenerativeAI } from "@google/generative-ai";
import { getSchoolData } from "./school-context";
import dotenv from "dotenv";
dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY || "");

export async function generateResponse(userMessage: string, sessionId?: string, schoolCode: string = "SXSBT"): Promise<string> {
  try {
    // Fetch school context from DB using provided schoolCode
    const schoolContext = await getSchoolData(schoolCode);

    const systemPrompt = `You are an AI assistant for a School. You help students and parents with enquiries about the school.\n\nSchool context:\n${JSON.stringify(schoolContext, null, 2)}\n\nBe concise, accurate, and helpful.Use proper formatting with emojis and bullet points for better readability.Be clear and concise but compelling in your responses. never use table to give output\n`;

    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-lite-preview-06-17" });
    const chat = model.startChat({
      history: [
        {
          role: "user",
          parts: [{ text: systemPrompt }],
        },
      ],
      generationConfig: {
        maxOutputTokens: 2048,
      },
    });
    const result = await chat.sendMessage(userMessage);
    return result.response.text();
  } catch (err) {
    console.error("Gemini error:", err);
    return "Sorry, there was an error generating a response.";
  }
}

export async function updateKnowledgeBaseWithGemini(currentKnowledgeBase: any, newInput: { text: string; image?: string | null }): Promise<any> {
  try {
    const systemPrompt = `You are an expert school admin assistant. Here is the current knowledge base for the school as JSON:\n${JSON.stringify(currentKnowledgeBase, null, 2)}\n\nHere is new information to add or update (text and optional image URL):\n${JSON.stringify(newInput, null, 2)}\n\nReturn the updated knowledge base as a JSON object. Only return valid JSON, no explanations.`;

    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-lite-preview-06-17" });
    const chat = model.startChat({
      history: [
        {
          role: "user",
          parts: [{ text: systemPrompt }],
        },
      ],
      generationConfig: {
        maxOutputTokens: 2048,
      },
    });
    const result = await chat.sendMessage("Update the knowledge base.");
    // Try to parse the response as JSON
    const text = result.response.text();
    const jsonStart = text.indexOf('{');
    const jsonEnd = text.lastIndexOf('}');
    if (jsonStart !== -1 && jsonEnd !== -1) {
      const jsonString = text.substring(jsonStart, jsonEnd + 1);
      return JSON.parse(jsonString);
    }
    throw new Error("No valid JSON in Gemini response");
  } catch (err) {
    console.error("Gemini knowledge base update error:", err);
    throw err;
  }
}

import { GoogleGenerativeAI } from "@google/generative-ai";
import { getSchoolData } from "./school-context";

const genAI = new GoogleGenerativeAI(
  process.env.GOOGLE_API_KEY || "AIzaSyD2u1YsYP5eWNhzREAHc3hsnLtvD0ImVKI"
);

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

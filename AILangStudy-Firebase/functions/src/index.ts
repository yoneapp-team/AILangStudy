import { onCall } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import { VertexAI } from "@google-cloud/vertexai";
import * as logger from "firebase-functions/logger";

admin.initializeApp();
const db = admin.firestore();

logger.info("Initializing VertexAI client");
const vertexAI = new VertexAI({
  project: "ailangstudy",
  location: "us-central1",
  apiEndpoint: "us-central1-aiplatform.googleapis.com",
});

const model = vertexAI.preview.getGenerativeModel({
  model: "gemini-1.5-flash-002",
  generationConfig: {
    temperature: 0.9,
    maxOutputTokens: 2048,
  },
});

interface Article {
  id: string;
  uid: string;
  topic: string;
  sourceLang: string;
  targetLang: string;
  text: string;
  translation?: string;
  createdAt: admin.firestore.Timestamp;
}

export const createArticle = onCall(async (request) => {
  try {
    logger.info("Starting createArticle function", { data: request.data });
    const { topic, sourceLang, targetLang, uid } = request.data;

    if (!topic || !sourceLang || !targetLang || !uid) {
      logger.error("Missing required fields", {
        topic, sourceLang, targetLang, uid,
      });
      throw new Error("Missing required fields");
    }

    // First, translate the topic to the target language
    logger.info("Preparing prompt for topic translation", { topic });
    const translationPrompt = `Translate the following topic from ${sourceLang} to ${targetLang}. Return ONLY the translated text without any explanation or additional formatting:

"${topic}"`;

    logger.info("Calling Gemini API for topic translation");
    const translationResult = await model.generateContent({
      contents: [{
        role: "user",
        parts: [{ text: translationPrompt }],
      }],
      generationConfig: {
        maxOutputTokens: 256,
        temperature: 0.1,
      },
    });

    if (!translationResult.response.candidates?.[0]?.content?.parts?.[0]?.text) {
      logger.error("Invalid Gemini response structure for translation");
      throw new Error("Invalid response from Gemini for translation");
    }

    const translatedTopic = translationResult.response.candidates[0].content.parts[0].text.trim();
    logger.info("Topic translated successfully", { originalTopic: topic, translatedTopic });

    logger.info("Preparing prompt for article generation", { translatedTopic });
    const prompt = `You are an experienced language teacher creating a language learning article about "${translatedTopic}" in ${targetLang}.
    
    Write a passage of approximately 10000 characters that serves as an effective learning material. The text should:
    - Use grammar structures appropriate for beginner to intermediate learners
    - Include essential vocabulary and common expressions
    - Incorporate cultural elements and practical usage scenarios
    - Be engaging and relatable to language learners
    - Flow naturally and maintain coherence
    - Include key learning points and target expressions
    
    Return ONLY the text content, without any additional formatting or explanation.`;

    logger.info("Calling Gemini API");
    const result = await model.generateContent({
      contents: [{
        role: "user",
        parts: [{ text: prompt }],
      }],
      generationConfig: {
        maxOutputTokens: 2048,
        temperature: 0.9,
      },
    });
    logger.info("Received response from Gemini API");

    const response = result.response;
    if (!response.candidates?.[0]?.content?.parts?.[0]?.text) {
      logger.error("Invalid Gemini response structure", { response });
      throw new Error("Invalid response from Gemini");
    }

    const text = response.candidates[0].content.parts[0].text.trim();
    logger.debug("Generated text", text);

    const articleData: Article = {
      id: admin.firestore().collection("articles").doc().id,
      uid,
      topic,
      sourceLang,
      targetLang,
      text,
      createdAt: admin.firestore.Timestamp.now(),
    };

    logger.info("Saving article to Firestore", { articleId: articleData.id });
    await db.collection("articles").doc(articleData.id).set(articleData);
    logger.info("Successfully saved article");

    return articleData;
  } catch (error) {
    logger.error("Error creating article:", error);
    throw new Error("Failed to create article");
  }
});

export const analyzeText = onCall(async (request) => {
  try {
    logger.info("Starting analyzeText function", { data: request.data });
    const { articleId, selectedText, startIndex, endIndex } = request.data;

    if (!articleId || !selectedText || startIndex === undefined || endIndex === undefined) {
      logger.error("Missing required fields", {
        articleId, selectedText, startIndex, endIndex,
      });
      throw new Error("Missing required fields");
    }

    logger.info("Fetching article from Firestore", { articleId });
    const articleDoc = await db.collection("articles").doc(articleId).get();
    if (!articleDoc.exists) {
      logger.error("Article not found", { articleId });
      throw new Error("Article not found");
    }

    const article = articleDoc.data() as Article;
    const { sourceLang, targetLang, text } = article;

    const contextBefore = text.substring(Math.max(0, startIndex - 100), startIndex);
    const contextAfter = text.substring(endIndex, Math.min(text.length, endIndex + 100));

    logger.info("Preparing analysis prompt");
    const prompt = `As an experienced language teacher, analyze the following text in ${targetLang}, focusing especially on the part between >>> and <<<:
    
    ${contextBefore}>>>${selectedText}<<<${contextAfter}
    
    Provide a detailed explanation in ${sourceLang} about:
    1. Key vocabulary words and their meanings from the selected text
    2. Grammar points and structures used in the selected text
    3. Usage notes and common patterns
    4. How this part connects with the surrounding context
    5. Practice exercises and application examples for learners
    
    If the text contains German words or references to German language, please provide detailed explanations about their meanings and origins.
    
    Format the response in JSON with the following structure:
    {
      "vocabulary": [
        {
          "word": "word from selected text",
          "reading": "reading if applicable",
          "meaning": "meaning in ${sourceLang}",
          "example": "example sentence",
          "exampleTranslation": "translation of example",
          "germanOrigin": "explanation of German origin if applicable"
        }
      ],
      "grammar": [
        {
          "pattern": "grammar pattern",
          "explanation": "detailed explanation",
          "example": "example from the text or similar",
          "exampleTranslation": "translation of example"
        }
      ],
      "contextAnalysis": "explanation of how this part fits into the broader context",
      "notes": ["usage notes", "cultural points", "German language connections", "etc"],
      "exercises": [
        {
          "type": "exercise type",
          "question": "exercise question",
          "options": ["option 1", "option 2", "option 3"],
          "answer": "correct answer",
          "explanation": "explanation of the answer"
        }
      ]
    }`;

    logger.info("Calling Gemini API for analysis");
    const result = await model.generateContent({
      contents: [{
        role: "user",
        parts: [{ text: prompt }],
      }],
      generationConfig: {
        maxOutputTokens: 2048,
        temperature: 0.9,
      },
    });
    logger.info("Received analysis response from Gemini API");

    const response = result.response;
    if (!response.candidates?.[0]?.content?.parts?.[0]?.text) {
      logger.error("Invalid Gemini response structure for analysis", { response });
      throw new Error("Invalid response from Gemini");
    }

    const responseText = response.candidates[0].content.parts[0].text;
    logger.debug("Raw analysis response", { responseText });

    const cleanedText = responseText.replace(/^```json\n|\n```$/g, "").trim();
    logger.debug("Cleaned analysis response", { cleanedText });

    try {
      const analysis = JSON.parse(cleanedText);
      logger.info("Successfully parsed analysis JSON");

      return {
        analysis,
        context: {
          before: contextBefore,
          selected: selectedText,
          after: contextAfter,
        },
      };
    } catch (parseError) {
      logger.error("JSON parse error in analysis", { error: parseError, cleanedText });
      throw new Error("Failed to parse analysis response");
    }
  } catch (error) {
    logger.error("Error analyzing text:", error);
    throw new Error("Failed to analyze text");
  }
});

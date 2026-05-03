import { GoogleGenerativeAI } from "@google/generative-ai";

const API_KEY_STORAGE_KEY = "qpapp_gemini_api_key";

export const getGeminiApiKey = () => {
  return localStorage.getItem(API_KEY_STORAGE_KEY);
};

export const setGeminiApiKey = (key: string) => {
  localStorage.setItem(API_KEY_STORAGE_KEY, key);
};

export const clearGeminiApiKey = () => {
  localStorage.removeItem(API_KEY_STORAGE_KEY);
};

let genAI: GoogleGenerativeAI | null = null;

export const getGeminiClient = () => {
  const apiKey = getGeminiApiKey();
  if (!apiKey) return null;

  if (!genAI) {
    genAI = new GoogleGenerativeAI(apiKey);
  }
  return genAI;
};

export const getGeminiModel = (modelName = "gemini-1.5-flash") => {
  const client = getGeminiClient();
  if (!client) return null;
  return client.getGenerativeModel({ model: modelName });
};

export async function fileToGenerativePart(file: File): Promise<{ inlineData: { data: string; mimeType: string } }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64Data = (reader.result as string).split(",")[1];
      resolve({
        inlineData: {
          data: base64Data,
          mimeType: file.type,
        },
      });
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export interface EvaluationResult {
  marksObtained: number;
  feedback: string;
  isCorrect: boolean;
}

export async function evaluateAnswer(
  questionText: string, 
  maxMarks: number, 
  userAnswerText?: string, 
  userAnswerImage?: File
): Promise<EvaluationResult> {
  const model = getGeminiModel();
  if (!model) throw new Error("Gemini API key not configured");

  const prompt = `
    Evaluate the following student's answer for the question provided.

    Question: "${questionText}"
    Max Marks: ${maxMarks}

    ${userAnswerText ? `Student's Text Answer: "${userAnswerText}"` : "The student provided an image of their answer."}

    Instructions:
    1. Compare the student's answer to the correct conceptual understanding of the question.
    2. Assign marks (integer) from 0 to ${maxMarks}.
    3. Provide concise feedback explaining why those marks were given.
    4. Set 'isCorrect' to true if marks obtained are >= 50% of max marks.

    Return the result strictly as a JSON object with: { "marksObtained": number, "feedback": string, "isCorrect": boolean }
  `;

  const parts: any[] = [prompt];
  if (userAnswerImage) {
    parts.push(await fileToGenerativePart(userAnswerImage));
  }

  const result = await model.generateContent(parts);
  const response = await result.response;
  const text = response.text();

  const jsonMatch = text.match(/\{.*\}/s);
  if (!jsonMatch) throw new Error("Failed to parse AI evaluation");

  return JSON.parse(jsonMatch[0]);
}

export async function extractQuestionsFromFile(
  file: File, 
  paperTitle: string, 
  year: number
): Promise<any[]> {
  const model = getGeminiModel();
  if (!model) throw new Error("Gemini API key not configured");

  const prompt = `
    You are an expert exam paper analyzer. I am providing you with a document (PDF or Image) which is an exam paper titled "${paperTitle}" from the year ${year}.
    
    Tasks:
    1. Extract all distinct questions from this paper.
    2. For each question, provide a suggested concise answer (if not found in the paper, generate a high-quality one).
    3. Determine the number of marks assigned to each question (default to 1 if not specified).
    4. Categorize each question into a specific topic (e.g., "Algebra", "Cell Biology", "Organic Chemistry").

    Return the result strictly as a JSON array of objects with the following structure:
    [
      {
        "questionText": "...",
        "answerText": "...",
        "marks": 5,
        "topic": "..."
      }
    ]

    Important: Return ONLY the raw JSON array. Do not include markdown formatting or explanations.
  `;

  const parts: any[] = [prompt, await fileToGenerativePart(file)];
  
  const result = await model.generateContent(parts);
  const response = await result.response;
  const text = response.text();

  const jsonMatch = text.match(/\[.*\]/s);
  if (!jsonMatch) throw new Error("Failed to parse AI extraction results");

  return JSON.parse(jsonMatch[0]);
}

export async function analyzePerformance(
  subjectName: string,
  attempts: any[],
  questions: any[]
): Promise<string> {
  const model = getGeminiModel();
  if (!model) throw new Error("Gemini API key not configured");

  const attemptSummary = attempts.map(a => {
    const q = questions.find(q => q.id === a.questionId);
    return {
      topic: q?.topic || "Unknown",
      marks: q?.marks || 0,
      correct: a.correct,
      feedback: a.feedback
    };
  });

  const prompt = `
    Analyze the following exam attempt history for the subject "${subjectName}".
    
    Data: ${JSON.stringify(attemptSummary)}

    Instructions:
    1. Identify specific topics where the student is struggling (low success rate).
    2. Identify topics where the student is excelling.
    3. Look for patterns in AI feedback (e.g., "missing key terms", "calculation errors").
    4. Provide 3 actionable study recommendations.

    Format the output in clean Markdown with sections for "Weaknesses", "Strengths", and "Action Plan". Keep it encouraging but realistic.
  `;

  const result = await model.generateContent(prompt);
  const response = await result.response;
  return response.text();
}

export async function generateStudyGuide(
  topic: string,
  subjectName: string
): Promise<string> {
  const model = getGeminiModel();
  if (!model) throw new Error("Gemini API key not configured");

  const prompt = `
    You are an expert tutor. Create a comprehensive but concise study guide for the topic "${topic}" in the subject "${subjectName}".
    
    Structure:
    1. **Key Concepts**: Summary of essential points.
    2. **Important Formulas/Terms**: List and explain them.
    3. **Example Problem**: Provide a sample question and a step-by-step solution.
    4. **Memory Mnemonics**: Any tips to remember this topic easily.

    Format the output in clean Markdown.
  `;

  const result = await model.generateContent(prompt);
  const response = await result.response;
  return response.text();
}

export async function generateMockExam(
  subjectName: string,
  totalMarks: number,
  availableQuestions: any[]
): Promise<any[]> {
  const model = getGeminiModel();
  if (!model) throw new Error("Gemini API key not configured");

  const prompt = `
    You are an exam moderator. From the following list of available questions for the subject "${subjectName}", select a balanced set that totals approximately ${totalMarks} marks.
    
    Available Questions: ${JSON.stringify(availableQuestions.map(q => ({ id: q.id, topic: q.topic, marks: q.marks, questionText: q.questionText })))}

    Instructions:
    1. Select a mix of topics.
    2. Ensure the total marks are exactly or very close to ${totalMarks}.
    3. Return ONLY the IDs of the selected questions as a JSON array.

    Return result: [id1, id2, ...]
  `;

  const result = await model.generateContent(prompt);
  const response = await result.response;
  const text = response.text();

  const jsonMatch = text.match(/\[.*\]/s);
  if (!jsonMatch) throw new Error("Failed to generate mock exam");

  return JSON.parse(jsonMatch[0]);
}

export async function getDetailedAnswer(questionText: string): Promise<string> {
  const model = getGeminiModel();
  if (!model) throw new Error("Gemini API key not configured");

  const prompt = `
    Provide a detailed, accurate, and easy-to-understand answer for the following exam question:
    "${questionText}"

    Structure your response as follows:
    1. **The Correct Answer**: A clear and concise statement of the answer.
    2. **Key Concepts**: Explain the main ideas behind the answer.
    3. **Step-by-Step Explanation**: Break down how to arrive at the answer.
    4. **Common Mistakes**: Mention what students often get wrong for this type of question.

    Use Markdown formatting for clarity.
  `;

  const result = await model.generateContent(prompt);
  const response = await result.response;
  return response.text();
}

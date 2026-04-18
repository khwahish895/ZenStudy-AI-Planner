import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export interface Subject {
  id?: string;
  name: string;
  difficulty: 'easy' | 'medium' | 'hard';
  color: string;
}

export interface Topic {
  id?: string;
  subjectId: string;
  title: string;
  status: 'todo' | 'working' | 'done';
}

export interface SessionPlan {
  subjectName: string;
  topicTitle: string;
  type: 'study' | 'revision' | 'break';
  startTime: string; // ISO string
  endTime: string;   // ISO string
}

export async function generateTimetable(
  goal: string,
  availableHours: number,
  subjects: Subject[],
  topics: Topic[],
  startDate: Date = new Date()
): Promise<SessionPlan[]> {
  const model = "gemini-3-flash-preview";
  
  const subjectsContext = subjects.map(s => `${s.name} (${s.difficulty})`).join(', ');
  const topicsContext = topics.map(t => `${t.title} (Subject ID: ${t.subjectId})`).join(', ');

  const prompt = `
    Generate a highly optimized, adaptive study timetable for a student with the goal: "${goal}".
    They have ${availableHours} hours available per day.
    Subjects: ${subjectsContext}
    Topics to cover: ${topicsContext}
    
    Start Date: ${startDate.toISOString()}
    Plan for the next 7 days.
    
    Rules:
    1. Prioritize hard subjects during early hours (peak focus).
    2. Use Spaced Repetition: Schedule a revision session for a topic 24h or 48h after the initial study session.
    3. Break Optimization: Include a 15-minute break every 45-60 minutes.
    4. Duration: Return at least 5 sessions per day.
    5. Subject balance: Ensure no single subject dominates more than 40% of the weekly time unless explicitly requested.
  `;

  const response = await ai.models.generateContent({
    model,
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            subjectName: { type: Type.STRING },
            topicTitle: { type: Type.STRING },
            type: { type: Type.STRING, enum: ["study", "revision", "break"] },
            startTime: { type: Type.STRING, description: "ISO 8601 format" },
            endTime: { type: Type.STRING, description: "ISO 8601 format" }
          },
          required: ["subjectName", "topicTitle", "type", "startTime", "endTime"]
        }
      }
    }
  });

  try {
    return JSON.parse(response.text);
  } catch (e) {
    console.error("Failed to parse Gemini response:", e);
    return [];
  }
}

export async function adaptTimetable(
  currentPlan: SessionPlan[],
  missedSessions: SessionPlan[],
  goal: string
): Promise<SessionPlan[]> {
  const model = "gemini-3-flash-preview";
  
  const prompt = `
    The student missed the following study sessions: ${JSON.stringify(missedSessions)}.
    Current remaining plan: ${JSON.stringify(currentPlan)}.
    Goal: "${goal}".
    
    Task: Rebalance the remaining schedule to ensure the missed topics are covered without overwhelming the student. 
    Adjust the start/end times of upcoming sessions to fit them in, or extend the plan if needed.
    Maintain the Spaced Repetition logic.
  `;

  const response = await ai.models.generateContent({
    model,
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            subjectName: { type: Type.STRING },
            topicTitle: { type: Type.STRING },
            type: { type: Type.STRING, enum: ["study", "revision", "break"] },
            startTime: { type: Type.STRING },
            endTime: { type: Type.STRING }
          },
          required: ["subjectName", "topicTitle", "type", "startTime", "endTime"]
        }
      }
    }
  });

  try {
    return JSON.parse(response.text);
  } catch (e) {
    return currentPlan;
  }
}

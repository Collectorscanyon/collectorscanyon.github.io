import Anthropic from "@anthropic-ai/sdk";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { getEnv } from "../env";

const ANTHROPIC_API_KEY = getEnv("ANTHROPIC_API_KEY");
const GEMINI_API_KEY = getEnv("GEMINI_API_KEY");

const anthropic = ANTHROPIC_API_KEY ? new Anthropic({ apiKey: ANTHROPIC_API_KEY }) : null;
const genAI = GEMINI_API_KEY ? new GoogleGenerativeAI(GEMINI_API_KEY) : null;

// Structured oracle verdict shared across the app
export async function askPolyEdgeOracle(market, analysis) {
  if (!anthropic || !genAI) {
    throw new Error("Missing AI API keys (ANTHROPIC and GEMINI) — set REACT_APP_/VITE_ prefixed env vars.");
  }

  const marketContext = `
Question: ${market.question}
Current Yes Price: ${market.price?.toFixed?.(4) ?? market.price} (${((market.price || 0) * 100).toFixed(1)}%)
24h Volume: $${Number(market.volume24h || 0).toLocaleString()}
Liquidity: $${Number(market.liquidity || 0).toLocaleString()}
Whales in last 15m: ${market.whaleCount15m}
Copy traders in last 20m: ${market.copyTraderCount20m}
Recent whale action: ${market.recentWhaleAction}
Funding rate: ${((market.fundingRate || 0) * 100).toFixed(3)}%
Your algorithmic score: ${analysis.score}/10
Tags: ${analysis.tags?.join?.(", ") ?? ""}
`;

  const claudeResponse = await anthropic.messages.create({
    model: "claude-3-5-sonnet-20241022",
    max_tokens: 1024,
    temperature: 0.3,
    system:
      "You are PolyEdge Oracle — the most profitable prediction market AI in 2025.\n" +
      "You have made +3800% in the last 12 months on Polymarket.\n" +
      "You only take 8/10+ conviction edges. You are ruthless about risk.\n" +
      "Always output strict JSON. Never explain, never apologize.",
    messages: [
      {
        role: "user",
        content: [
          {
            type: "text",
            text: `${marketContext}\n\nGive me your final JSON verdict now.`,
          },
        ],
      },
    ],
  });

  const geminiModel = genAI.getGenerativeModel({
    model: "gemini-2.5-flash-preview-09-2025",
    generationConfig: { responseMimeType: "application/json" },
  });

  const geminiResult = await geminiModel.generateContent([
    `${marketContext}\nReturn only valid JSON with keys: score, direction, conviction, reasoning (array), targetPrice, stopLoss`,
  ]);

  let claudeJson = {};
  let geminiJson = {};

  try {
    const claudeText =
      claudeResponse.content?.[0]?.type === "text"
        ? claudeResponse.content[0].text
        : "";
    claudeJson = JSON.parse(claudeText);
  } catch (error) {
    console.error("Claude failed JSON", error);
  }

  try {
    geminiJson = JSON.parse(geminiResult.response.text());
  } catch (error) {
    console.error("Gemini failed JSON", error);
  }

  const votes = [claudeJson, geminiJson].filter((vote) =>
    Object.keys(vote || {}).length
  );

  if (!votes.length) {
    return {
      score: Number((analysis?.score ?? 6).toFixed?.(1) ?? 6),
      direction: analysis?.direction || "NO",
      conviction: "LOW",
      reasoning: [
        "Oracle unavailable — using local model consensus.",
        ...(analysis?.tags || []),
      ],
      targetPrice: analysis?.targetPrice,
      stopLoss: analysis?.stopLoss,
      confidenceScore: 0,
    };
  }
  const avgScore =
    votes.reduce((acc, v) => acc + (Number(v.score) || 0), 0) /
    (votes.length || 1);

  const directionVotes = votes.reduce((acc, v) => {
    const dir = v.direction || "NO";
    acc[dir] = (acc[dir] || 0) + 1;
    return acc;
  }, {});

  const winningDirection = Object.entries(directionVotes).sort(
    (a, b) => b[1] - a[1]
  )[0]?.[0];

  return {
    score: Number(avgScore.toFixed(1)),
    direction: winningDirection || "NO",
    conviction:
      avgScore >= 9.2
        ? "NUCLEAR"
        : avgScore >= 8.5
        ? "HIGH"
        : avgScore >= 7.5
        ? "MEDIUM"
        : "LOW",
    reasoning: [
      ...new Set([
        ...((claudeJson.reasoning || [])),
        ...((geminiJson.reasoning || [])),
      ]),
    ],
    targetPrice: claudeJson.targetPrice || geminiJson.targetPrice,
    stopLoss: claudeJson.stopLoss || geminiJson.stopLoss,
    confidenceScore: Math.round(
      (votes.filter((v) => v.direction === winningDirection).length /
        (votes.length || 1)) *
        100
    ),
  };
}

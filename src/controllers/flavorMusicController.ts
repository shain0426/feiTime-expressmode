import { Request, Response } from "express";
import axios from "axios";
import { geminiText } from "@/services/geminiClient";
import type { GeminiMessage } from "@/types/gemini";

// --- YouTube API 內部型別定義 ---
interface YouTubeSearchResult {
  id: { videoId: string };
  snippet: {
    title: string;
    channelTitle: string;
    thumbnails: {
      high?: { url: string };
      default?: { url: string };
    };
  };
}

interface YouTubeVideoDetail {
  id: string;
  snippet: {
    title: string;
    channelTitle: string;
    thumbnails: {
      high?: { url: string };
      medium?: { url: string };
      default?: { url: string };
    };
  };
  statistics: {
    viewCount: string;
  };
  contentDetails: {
    duration: string;
  };
}

// --- 原有介面保持不變 ---
interface FlavorRequest {
  flavorId: string;
  flavorName: string;
  description: string;
}

interface YouTubeVideo {
  videoId: string;
  title: string;
  channelTitle: string;
  thumbnail: string;
  embedUrl: string;
}

const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY || "";
const YOUTUBE_SEARCH_URL = "https://www.googleapis.com/youtube/v3/search";
const YOUTUBE_VIDEOS_URL = "https://www.googleapis.com/youtube/v3/videos";

/**
 * 根據咖啡風味生成音樂推薦提示
 */
const generateMusicPrompt = (
  flavorName: string,
  description: string,
): string => {
  const basePrompt = `你是一位專業的咖啡音樂挑選師。請為「${flavorName}」風味的咖啡（描述：${description}）推薦適合的音樂。
  請以繁體中文回答，並嚴格遵守以下 JSON 格式回覆：
  {
    "genre": "風格簡短描述",
    "searches": ["關鍵字1", "關鍵字2", "關鍵字3", "關鍵字4"]
  }
  關鍵字應包含歌手名或具體曲風，適合在 YouTube 搜尋。`;

  const prompts: Record<string, string> = {
    果香: `${basePrompt}\n氛圍：明亮、活潑、輕快。例如：周杰倫 陽光, BTS Dynamite, 輕快鋼琴。`,
    花香: `${basePrompt}\n氛圍：優雅、細緻、療癒。例如：IU 抒情, Norah Jones, Chopin nocturne。`,
    堅果: `${basePrompt}\n氛圍：溫暖、舒適、沉穩。例如：李榮浩, John Mayer, 不插電吉他。`,
    巧克力: `${basePrompt}\n氛圍：濃郁、深沉、層次。例如：Adele, Hans Zimmer, 史詩配樂。`,
  };

  return prompts[flavorName] || basePrompt;
};

/**
 * 使用 Gemini API 生成音樂推薦
 */
const getGeminiRecommendation = async (
  flavorName: string,
  description: string,
): Promise<{ genre: string; searches: string[] }> => {
  try {
    const prompt = generateMusicPrompt(flavorName, description);
    const messages: GeminiMessage[] = [{ role: "user", content: prompt }];

    const responseText = await geminiText(messages, {
      model: "gemini-1.5-flash",
      maxRetries: 1,
    });

    const jsonMatch = responseText.match(/\{[\s\S]*?\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        genre: parsed.genre || "精選音樂",
        searches: Array.isArray(parsed.searches) ? parsed.searches : [],
      };
    }
    throw new Error("Invalid JSON format from Gemini");
  } catch (error) {
    console.error("Gemini API error:", error);
    return {
      genre: "流行與純音樂",
      searches: ["周杰倫", "吉卜力 音樂", "BTS", "Lofi hip hop"],
    };
  }
};

/**
 * 解析 YouTube ISO 8601 duration 格式
 */
const parseDuration = (duration: string): number => {
  const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return 0;
  return (
    parseInt(match[1] || "0", 10) * 60 +
    parseInt(match[2] || "0", 10) +
    parseInt(match[3] || "0", 10) / 60
  );
};

/**
 * 搜尋 YouTube 影片
 */
const searchYouTubeByKeyword = async (
  keyword: string,
  maxResults: number = 2,
): Promise<YouTubeVideo[]> => {
  try {
    if (!YOUTUBE_API_KEY) throw new Error("YouTube API key missing");

    const searchResponse = await axios.get<{ items: YouTubeSearchResult[] }>(
      YOUTUBE_SEARCH_URL,
      {
        params: {
          part: "snippet",
          q: keyword,
          type: "video",
          maxResults,
          key: YOUTUBE_API_KEY,
          videoCategoryId: "10",
          videoEmbeddable: "true",
        },
        timeout: 4000,
      },
    );

    const items = searchResponse.data.items || [];
    if (items.length === 0) return [];

    const videoIds = items.map((item) => item.id.videoId).join(",");
    const detailsResponse = await axios.get<{ items: YouTubeVideoDetail[] }>(
      YOUTUBE_VIDEOS_URL,
      {
        params: {
          part: "snippet,statistics,contentDetails",
          id: videoIds,
          key: YOUTUBE_API_KEY,
        },
        timeout: 4000,
      },
    );

    return (detailsResponse.data.items || [])
      .filter((item) => {
        const viewCount = parseInt(item.statistics.viewCount || "0", 10);
        const duration = parseDuration(item.contentDetails.duration);
        return viewCount > 10000 && duration >= 1.5 && duration <= 15;
      })
      .map((item) => ({
        videoId: item.id,
        title: item.snippet.title,
        channelTitle: item.snippet.channelTitle,
        thumbnail:
          item.snippet.thumbnails.high?.url ||
          item.snippet.thumbnails.default?.url ||
          "",
        embedUrl: `https://www.youtube.com/embed/${item.id}?autoplay=1&rel=0`,
      }));
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : "Unknown error";
    console.error(`❌ YouTube search error [${keyword}]:`, errMsg);
    return [];
  }
};

/**
 * 從多個關鍵字搜尋並隨機選擇
 */
const searchMultipleKeywords = async (
  searches: string[],
  totalResults: number = 3,
): Promise<YouTubeVideo[]> => {
  const shuffled = [...searches].sort(() => 0.5 - Math.random()).slice(0, 3);
  const allVideos: YouTubeVideo[] = [];

  const results = await Promise.allSettled(
    shuffled.map((k) => searchYouTubeByKeyword(k, 2)),
  );

  results.forEach((res) => {
    if (res.status === "fulfilled") {
      allVideos.push(...res.value);
    }
  });

  const uniqueVideos = Array.from(
    new Map(allVideos.map((v) => [v.videoId, v])).values(),
  );
  return uniqueVideos.sort(() => 0.5 - Math.random()).slice(0, totalResults);
};

/**
 * 主要推薦控制器
 */
export const flavorMusicHandler = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { flavorName, description } = req.body as FlavorRequest;
    if (!flavorName) {
      res.status(400).json({ success: false, message: "請提供風味名稱" });
      return;
    }

    const geminiRec = await getGeminiRecommendation(
      flavorName,
      description || "",
    );
    const videos = await searchMultipleKeywords(geminiRec.searches, 3);

    res.status(200).json({
      success: true,
      flavor: flavorName,
      recommendation: `為您推薦 ${geminiRec.genre}`,
      videos: videos,
    });
  } catch (error) {
    console.error(`❌ Handler error:`, error);
    res.status(500).json({ success: false, message: "系統繁忙，請稍後再試" });
  }
};

/**
 * 取得隨機推薦 (Next 按鈕)
 */
export const randomMusicHandler = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { currentFlavorName } = req.body as { currentFlavorName: string };
    const geminiRec = await getGeminiRecommendation(
      currentFlavorName || "綜合咖啡",
      "random next",
    );
    const videos = await searchMultipleKeywords(geminiRec.searches, 3);
    res.status(200).json({
      success: true,
      videos,
      recommendation: `換一批 ${currentFlavorName || ""} 音樂`,
    });
  } catch (error) {
    console.error("❌ Random music error:", error);
    res.status(500).json({ success: false, message: "無法取得更多推薦" });
  }
};

export const musicHealthCheck = async (
  _req: Request,
  res: Response,
): Promise<void> => {
  res.status(200).json({
    status: "ok",
    gemini: !!process.env.GEMINI_API_KEY,
    youtube: !!process.env.YOUTUBE_API_KEY,
  });
};

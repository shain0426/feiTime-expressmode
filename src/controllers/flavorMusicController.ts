import { Request, Response } from "express";
import axios from "axios";
import { geminiText } from "@/services/geminiClient";
import type { GeminiMessage } from "@/types/gemini";
import { handleError } from "@/utils/errorHandler";

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
 * 根據咖啡風味生成音樂推薦提示 (優化關鍵字生成)
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
  關鍵字必須是具體的：知名歌手名 + 曲風，例如 "周杰倫 告白氣球" 或 "Lauv Paris"。`;

  const prompts: Record<string, string> = {
    果香: `${basePrompt}\n氛圍：明亮、活潑。例如：周杰倫 陽光, BTS Dynamite, Taylor Swift Shake It Off。`,
    花香: `${basePrompt}\n氛圍：優雅、療癒。例如：IU 抒情, Norah Jones, Bruno Mars Leave The Door Open。`,
    堅果: `${basePrompt}\n氛圍：溫暖、沉穩。例如：李榮浩, John Mayer, Ed Sheeran Perfect。`,
    巧克力: `${basePrompt}\n氛圍：濃郁、深沉。例如：Adele Hello, Sam Smith, Lady Gaga Always Remember Us This Way。`,
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
      model: "gemini-2.5-flash",
      maxRetries: 2,
    });

    const jsonMatch = responseText.match(/\{[\s\S]*?\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        genre: parsed.genre || "精選熱門音樂",
        searches: Array.isArray(parsed.searches) ? parsed.searches : [],
      };
    }
    throw new Error("Invalid JSON from Gemini");
  } catch (error) {
    console.error("Gemini API error:", error);
    return {
      genre: "全球流行金曲",
      searches: [
        "Top Pop Hits 2024",
        "Taylor Swift Official",
        "Ed Sheeran Best Songs",
      ],
    };
  }
};

const parseDuration = (duration: string): number => {
  const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return 0;
  const hours = parseInt(match[1] || "0", 10);
  const minutes = parseInt(match[2] || "0", 10);
  const seconds = parseInt(match[3] || "0", 10);
  return hours * 60 + minutes + seconds / 60;
};

/**
 * 搜尋 YouTube 影片 (核心高品質過濾邏輯)
 */
const searchYouTubeByKeyword = async (
  keyword: string,
  maxResults: number = 10, // 增加抓取數量，給過濾器更多素材
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
          maxResults, // 抓多一點來濾
          key: YOUTUBE_API_KEY,
          order: "viewCount", // 核心：直接叫 YouTube 給觀看最高的
          videoCategoryId: "10",
          videoEmbeddable: "true",
        },
        timeout: 5000,
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
        timeout: 5000,
      },
    );

    return (detailsResponse.data.items || [])
      .filter((item) => {
        const viewCount = parseInt(item.statistics.viewCount || "0", 10);
        const duration = parseDuration(item.contentDetails.duration);

        // --- 嚴格的高品質過濾條件 ---
        const isPopular = viewCount >= 100000; // 10萬觀看以上
        const isStandardLength = duration >= 2 && duration <= 6; // 2-6 分鐘

        return isPopular && isStandardLength;
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
    console.error(`❌ YouTube search error [${keyword}]:`, error);
    return [];
  }
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

    // 1. 嘗試根據 AI 關鍵字搜尋
    let videos = await searchMultipleKeywords(geminiRec.searches, 3);

    // 2. 如果因為過濾太嚴格找不到，自動執行「保底策略」
    if (videos.length === 0) {
      console.warn(
        `[Fallback] No strict results for ${flavorName}, searching broad keywords...`,
      );
      // 使用更廣泛但保證有高流量的關鍵字
      const fallbackKeywords = [
        `${flavorName} coffee shop music`,
        `${geminiRec.genre} hits`,
      ];
      for (const kw of fallbackKeywords) {
        const fallbackResults = await searchYouTubeByKeyword(kw, 10);
        if (fallbackResults.length > 0) {
          videos = fallbackResults.slice(0, 3);
          break;
        }
      }
    }

    res.status(200).json({
      success: true,
      flavor: flavorName,
      recommendation:
        videos.length > 0
          ? `為您推薦 ${geminiRec.genre}`
          : "為您推薦熱門經典音樂",
      videos: videos,
    });
  } catch (error) {
    handleError(error, res, "系統繁忙，請稍後再試");
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
      currentFlavorName || "經典",
      "refresh",
    );
    const videos = await searchMultipleKeywords(geminiRec.searches, 3);

    res.status(200).json({
      success: true,
      videos,
      recommendation: `換一批 ${currentFlavorName || ""} 系列`,
    });
  } catch (error) {
    handleError(error, res, "無法更新推薦，請稍後再試");
  }
};

/**
 * 內部輔助方法：處理多個關鍵字
 */
async function searchMultipleKeywords(
  searches: string[],
  totalResults: number,
): Promise<YouTubeVideo[]> {
  const allVideos: YouTubeVideo[] = [];
  // 為了效能，我們只拿前 2 個關鍵字來深入搜尋
  const results = await Promise.allSettled(
    searches.slice(0, 2).map((k) => searchYouTubeByKeyword(k, 10)),
  );

  results.forEach((res) => {
    if (res.status === "fulfilled") allVideos.push(...res.value);
  });

  // 去重並隨機排序
  const uniqueVideos = Array.from(
    new Map(allVideos.map((v) => [v.videoId, v])).values(),
  );
  return uniqueVideos.sort(() => 0.5 - Math.random()).slice(0, totalResults);
}

export const musicHealthCheck = async (
  _req: Request,
  res: Response,
): Promise<void> => {
  res.status(200).json({ status: "ok" });
};

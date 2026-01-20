import { Request, Response } from "express";
import axios from "axios";
import { geminiText } from "@/services/geminiClient";
import type { GeminiMessage } from "@/types/gemini";

// YouTube Data API v3
const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY || "";
const YOUTUBE_SEARCH_URL = "https://www.googleapis.com/youtube/v3/search";
const YOUTUBE_VIDEOS_URL = "https://www.googleapis.com/youtube/v3/videos";

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

interface RecommendationResponse {
  success: boolean;
  flavor: string;
  recommendation: string;
  videos: YouTubeVideo[];
  message?: string;
}

/**
 * 根據咖啡風味生成音樂推薦提示
 */
const generateMusicPrompt = (
  flavorName: string,
  description: string,
): string => {
  const prompts: Record<string, string> = {
    果香: `請為「果香咖啡」推薦多元化的音樂曲風和藝術家。

風味氛圍：明亮、活潑、清新、輕快

請從以下類型中各推薦 1-2 個具體搜尋關鍵字（總共 6-8 個）：

1. **華語流行**：例如 "周杰倫", "五月天", "林俊傑", "鄧紫棋"
2. **日韓流行**：例如 "BTS", "TWICE", "米津玄師", "YOASOBI"
3. **歐美流行**：例如 "Bruno Mars", "Ed Sheeran", "Maroon 5"
4. **純音樂/鋼琴**：例如 "upbeat piano", "happy instrumental", "cheerful music box"
5. **電影配樂**：例如 "Joe Hisaishi upbeat", "happy movie soundtrack"

請以 JSON 格式回覆：
{
  "genre": "輕快流行與明亮純音樂",
  "searches": ["周杰倫 陽光", "BTS dynamite", "Bruno Mars", "happy piano music", "Joe Hisaishi cheerful", "五月天 快樂"]
}`,

    花香: `請為「花香咖啡」推薦多元化的音樂曲風和藝術家。

風味氛圍：優雅、細緻、柔和、療癒

請從以下類型中各推薦 1-2 個具體搜尋關鍵字（總共 6-8 個）：

1. **華語流行**：例如 "陳奕迅 溫柔", "孫燕姿", "梁靜茹", "A-Lin"
2. **日韓流行**：例如 "IU ballad", "宇多田光", "AKMU", "中島美嘉"
3. **歐美流行**：例如 "Norah Jones", "Sade", "Adele ballad"
4. **純音樂/鋼琴**：例如 "Yiruma", "Ludovico Einaudi", "peaceful piano"
5. **古典音樂**：例如 "Chopin nocturne", "Debussy", "Satie"

請以 JSON 格式回覆：
{
  "genre": "優雅抒情與療癒純音樂",
  "searches": ["孫燕姿 溫柔", "IU Through the Night", "Norah Jones", "Yiruma", "Chopin nocturne", "陳奕迅 抒情"]
}`,

    堅果: `請為「堅果風味咖啡」推薦多元化的音樂曲風和藝術家。

風味氛圍：溫暖、醇厚、沉穩、舒適

請從以下類型中各推薦 1-2 個具體搜尋關鍵字（總共 6-8 個）：

1. **華語流行**：例如 "李榮浩", "盧廣仲", "蘇打綠", "張震嶽"
2. **日韓流行**：例如 "星野源", "Official髭男dism", "Crush", "10cm"
3. **歐美流行**：例如 "John Mayer", "Jack Johnson", "Ed Sheeran acoustic"
4. **純音樂/吉他**：例如 "acoustic guitar", "warm instrumental", "cozy music"
5. **靈魂樂/爵士**：例如 "Alicia Keys", "John Legend", "smooth jazz"

請以 JSON 格式回覆：
{
  "genre": "溫暖民謠與舒適靈魂樂",
  "searches": ["李榮浩 溫暖", "星野源", "John Mayer", "warm acoustic guitar", "Alicia Keys", "盧廣仲"]
}`,

    巧克力: `請為「巧克力咖啡」推薦多元化的音樂曲風和藝術家。

風味氛圍：濃郁、深沉、有力量、層次豐富

請從以下類型中各推薦 1-2 個具體搜尋關鍵字（總共 6-8 個）：

1. **華語流行**：例如 "林宥嘉 深情", "張惠妹", "蕭敬騰", "A-Lin 高音"
2. **日韓流行**：例如 "BLACKPINK", "Aimer", "Big Bang", "Taeyeon"
3. **歐美流行**：例如 "Adele", "Sam Smith", "The Weeknd", "Dua Lipa"
4. **史詩配樂**：例如 "Hiroyuki Sawano", "Hans Zimmer", "epic orchestral"
5. **深沉古典**：例如 "Rachmaninoff", "Tchaikovsky", "powerful classical"

請以 JSON 格式回覆：
{
  "genre": "深沉流行與史詩配樂",
  "searches": ["張惠妹 高音", "Aimer", "Adele", "Hiroyuki Sawano", "Hans Zimmer epic", "林宥嘉 深情"]
}`,
  };

  return (
    prompts[flavorName] ||
    `請為「${flavorName}」風味咖啡（${description}）推薦多元化的音樂。

請從華語、日韓、歐美流行、純音樂、古典等類型中推薦 6-8 個具體搜尋關鍵字。

請以 JSON 格式回覆：
{
  "genre": "音樂風格描述",
  "searches": ["search1", "search2", "search3", "search4", "search5", "search6"]
}`
  );
};

/**
 * 使用 Gemini API 生成音樂推薦
 */
const getGeminiRecommendation = async (
  flavorName: string,
  description: string,
): Promise<{ genre: string; searches: string[] }> => {
  try {
    console.log(`🤖 Requesting Gemini recommendation for: ${flavorName}`);
    const startTime = Date.now();

    const prompt = generateMusicPrompt(flavorName, description);

    const messages: GeminiMessage[] = [
      {
        role: "user",
        content: prompt,
      },
    ];

    const responseText = await geminiText(messages, {
      model: "gemini-2.5-flash", // 使用 flash 模型以提升速度
      maxRetries: 2, // 減少重試次數
    });

    const elapsed = Date.now() - startTime;
    console.log(`⏱️ Gemini response time: ${elapsed}ms`);

    const jsonMatch = responseText.match(/\{[\s\S]*?\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        genre: parsed.genre || "popular music",
        searches: Array.isArray(parsed.searches) ? parsed.searches : [],
      };
    }

    console.warn("Failed to parse Gemini response, using defaults");
    return {
      genre: "popular music",
      searches: ["周杰倫", "BTS", "Ed Sheeran", "piano music", "Joe Hisaishi"],
    };
  } catch (error) {
    console.error("Gemini API error:", error);
    // 返回備用推薦而不是拋出錯誤
    return {
      genre: "popular music",
      searches: ["周杰倫", "BTS", "pop music", "piano", "OST"],
    };
  }
};

/**
 * 解析 YouTube ISO 8601 duration 格式
 */
const parseDuration = (duration: string): number => {
  const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return 0;

  const hours = parseInt(match[1] || "0", 10);
  const minutes = parseInt(match[2] || "0", 10);
  const seconds = parseInt(match[3] || "0", 10);

  return hours * 60 + minutes + seconds / 60;
};

/**
 * 搜尋 YouTube 影片（單一關鍵字） - 優化版
 */
const searchYouTubeByKeyword = async (
  keyword: string,
  maxResults: number = 3,
): Promise<YouTubeVideo[]> => {
  try {
    if (!YOUTUBE_API_KEY) {
      throw new Error("YouTube API key is not configured");
    }

    console.log(`🔍 Searching: "${keyword}"`);
    const startTime = Date.now();

    // 優化：減少請求的結果數量
    const searchResponse = await axios.get(YOUTUBE_SEARCH_URL, {
      params: {
        part: "snippet",
        q: keyword,
        type: "video",
        maxResults: maxResults * 2, // 減少請求數量
        key: YOUTUBE_API_KEY,
        videoCategoryId: "10",
        order: "relevance", // 改用相關性排序，更快
        videoEmbeddable: "true",
        safeSearch: "moderate",
      },
      timeout: 5000, // 添加 5 秒超時
    });

    if (!searchResponse.data.items || searchResponse.data.items.length === 0) {
      return [];
    }

    const videoIds = searchResponse.data.items
      .map((item: any) => item.id.videoId)
      .join(",");

    const detailsResponse = await axios.get(YOUTUBE_VIDEOS_URL, {
      params: {
        part: "snippet,statistics,contentDetails",
        id: videoIds,
        key: YOUTUBE_API_KEY,
      },
      timeout: 5000, // 添加 5 秒超時
    });

    const elapsed = Date.now() - startTime;
    console.log(`⏱️ YouTube search time: ${elapsed}ms`);

    if (!detailsResponse.data.items) {
      return [];
    }

    const filtered = detailsResponse.data.items
      .filter((item: any) => {
        const viewCount = parseInt(item.statistics.viewCount || "0", 10);
        const duration = parseDuration(item.contentDetails.duration);

        // 放寬篩選條件以加快速度
        if (viewCount < 50000) return false; // 降低觀看次數門檻
        if (duration < 2 || duration > 12) return false; // 稍微放寬時長限制

        return true;
      })
      .map((item: any) => ({
        videoId: item.id,
        title: item.snippet.title,
        channelTitle: item.snippet.channelTitle,
        thumbnail:
          item.snippet.thumbnails.high?.url ||
          item.snippet.thumbnails.default?.url,
        embedUrl: `https://www.youtube.com/embed/${item.id}?autoplay=1&rel=0`,
        viewCount: parseInt(item.statistics.viewCount || "0", 10),
      }));

    return filtered;
  } catch (error: any) {
    if (error.code === "ECONNABORTED") {
      console.error(`❌ Timeout searching ${keyword}`);
    } else {
      console.error(`❌ Error searching ${keyword}:`, error.message);
    }
    return [];
  }
};

/**
 * 從多個關鍵字搜尋並隨機選擇 - 優化版
 */
const searchMultipleKeywords = async (
  searches: string[],
  totalResults: number = 3,
): Promise<YouTubeVideo[]> => {
  try {
    console.log(`🎵 Searching multiple keywords: ${searches.join(", ")}`);
    const startTime = Date.now();

    // 隨機打亂順序
    const shuffledSearches = [...searches].sort(() => 0.5 - Math.random());

    const allVideos: YouTubeVideo[] = [];

    // 優化：並行搜索前 3-4 個關鍵字而不是順序搜索
    const searchPromises = shuffledSearches
      .slice(0, 4)
      .map((search) => searchYouTubeByKeyword(search, 2));

    const results = await Promise.allSettled(searchPromises);

    results.forEach((result) => {
      if (result.status === "fulfilled") {
        allVideos.push(...result.value);
      }
    });

    // 如果結果不夠，再搜索剩餘的關鍵字
    if (allVideos.length < totalResults * 2 && shuffledSearches.length > 4) {
      for (
        let i = 4;
        i < shuffledSearches.length && allVideos.length < totalResults * 3;
        i++
      ) {
        const videos = await searchYouTubeByKeyword(shuffledSearches[i], 2);
        allVideos.push(...videos);
      }
    }

    const elapsed = Date.now() - startTime;
    console.log(`⏱️ Total search time: ${elapsed}ms`);

    if (allVideos.length === 0) {
      return [];
    }

    console.log(`📊 Total videos found: ${allVideos.length}`);

    // 隨機打亂並選擇，確保多樣性
    const shuffled = allVideos
      .sort(() => 0.5 - Math.random())
      .slice(0, totalResults);

    return shuffled.map(
      ({ videoId, title, channelTitle, thumbnail, embedUrl }) => ({
        videoId,
        title,
        channelTitle,
        thumbnail,
        embedUrl,
      }),
    );
  } catch (error) {
    console.error("Error in searchMultipleKeywords:", error);
    return [];
  }
};

/**
 * 主要的推薦控制器 - 優化版
 */
export const flavorMusicHandler = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const requestStartTime = Date.now();

  try {
    const { flavorId, flavorName, description } = req.body as FlavorRequest;

    if (!flavorName) {
      res.status(400).json({
        success: false,
        message: "請提供風味名稱",
      });
      return;
    }

    console.log(`🎵 Processing music recommendation for flavor: ${flavorName}`);

    // 1. 使用 Gemini 生成多元化的搜尋關鍵字（並行執行）
    const geminiPromise = getGeminiRecommendation(flavorName, description);

    const geminiRec = await geminiPromise;
    console.log(`🤖 Gemini recommendation:`, geminiRec);

    // 2. 從多個關鍵字搜尋並隨機選擇
    const videos = await searchMultipleKeywords(geminiRec.searches, 5);

    const totalElapsed = Date.now() - requestStartTime;
    console.log(`⏱️ Total request time: ${totalElapsed}ms`);

    if (videos.length === 0) {
      res.status(200).json({
        success: false,
        message: "暫時無法找到符合條件的音樂，請稍後再試",
        flavor: flavorName,
        recommendation: geminiRec.genre,
        videos: [],
      });
      return;
    }

    // 3. 隨機選擇 3 個影片
    const shuffled = [...videos].sort(() => 0.5 - Math.random());
    const selectedVideos = shuffled.slice(0, 3);

    console.log(`✅ Returning ${selectedVideos.length} videos`);

    // 4. 回傳結果
    const response: RecommendationResponse = {
      success: true,
      flavor: flavorName,
      recommendation: `為您推薦 ${geminiRec.genre}`,
      videos: selectedVideos,
    };

    res.status(200).json(response);
  } catch (error) {
    const totalElapsed = Date.now() - requestStartTime;
    console.error(`❌ Recommendation error (${totalElapsed}ms):`, error);
    res.status(500).json({
      success: false,
      message: "推薦系統暫時無法使用，請稍後再試",
    });
  }
};

/**
 * 取得隨機推薦（用於 Next 按鈕） - 優化版
 */
export const randomMusicHandler = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const requestStartTime = Date.now();

  try {
    const { currentFlavorName } = req.body;

    if (!currentFlavorName) {
      res.status(400).json({
        success: false,
        message: "請先選擇風味",
      });
      return;
    }

    console.log(`🔄 Getting random music for flavor: ${currentFlavorName}`);

    // 重新生成推薦（會得到不同的隨機結果）
    const geminiRec = await getGeminiRecommendation(currentFlavorName, "");
    const videos = await searchMultipleKeywords(geminiRec.searches, 5);

    const totalElapsed = Date.now() - requestStartTime;
    console.log(`⏱️ Random recommendation time: ${totalElapsed}ms`);

    if (videos.length === 0) {
      res.status(200).json({
        success: false,
        message: "暫時無法找到更多音樂",
        videos: [],
      });
      return;
    }

    const shuffled = [...videos].sort(() => 0.5 - Math.random());
    const selectedVideos = shuffled.slice(0, 3);

    res.status(200).json({
      success: true,
      videos: selectedVideos,
      recommendation: `為您找到更多 ${currentFlavorName} 風味的音樂`,
    });
  } catch (error) {
    const totalElapsed = Date.now() - requestStartTime;
    console.error(`❌ Random recommendation error (${totalElapsed}ms):`, error);
    res.status(500).json({
      success: false,
      message: "無法取得推薦",
    });
  }
};

/**
 * 健康檢查端點
 */
export const musicHealthCheck = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const hasGeminiKey = !!process.env.GEMINI_API_KEY;
  const hasYouTubeKey = !!process.env.YOUTUBE_API_KEY;

  res.status(200).json({
    status: "ok",
    timestamp: new Date().toISOString(),
    services: {
      gemini: hasGeminiKey ? "configured" : "missing_api_key",
      youtube: hasYouTubeKey ? "configured" : "missing_api_key",
    },
  });
};

// 測試 YouTube API
require('dotenv').config();
const axios = require('axios');

const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;
const YOUTUBE_SEARCH_URL = "https://www.googleapis.com/youtube/v3/search";
const YOUTUBE_VIDEOS_URL = "https://www.googleapis.com/youtube/v3/videos";

async function testYouTubeSearch() {
  try {
    console.log('Testing YouTube Search API...');
    console.log('API Key exists:', !!YOUTUBE_API_KEY);

    const keyword = "周杰倫";
    console.log(`\nSearching for: "${keyword}"`);

    // Step 1: Search
    const searchResponse = await axios.get(YOUTUBE_SEARCH_URL, {
      params: {
        part: "snippet",
        q: keyword,
        type: "video",
        maxResults: 5,
        key: YOUTUBE_API_KEY,
        videoCategoryId: "10",
        order: "viewCount",
        videoEmbeddable: "true",
        safeSearch: "moderate",
      },
    });

    console.log('Search results:', searchResponse.data.items?.length || 0);

    if (!searchResponse.data.items || searchResponse.data.items.length === 0) {
      console.log('No items found in search');
      return;
    }

    const videoIds = searchResponse.data.items
      .map((item) => item.id.videoId)
      .join(",");

    console.log('Video IDs:', videoIds);

    // Step 2: Get details
    const detailsResponse = await axios.get(YOUTUBE_VIDEOS_URL, {
      params: {
        part: "snippet,statistics,contentDetails",
        id: videoIds,
        key: YOUTUBE_API_KEY,
      },
    });

    console.log('Details results:', detailsResponse.data.items?.length || 0);

    if (detailsResponse.data.items && detailsResponse.data.items.length > 0) {
      detailsResponse.data.items.forEach((item, index) => {
        console.log(`\nVideo ${index + 1}:`);
        console.log('  Title:', item.snippet.title);
        console.log('  Views:', item.statistics.viewCount);
        console.log('  Duration:', item.contentDetails.duration);
      });
    }

  } catch (error) {
    console.error('Error:', error.message);
    if (error.response) {
      console.error('Response:', error.response.data);
    }
  }
}

testYouTubeSearch();

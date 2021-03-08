const debug = require("debug")("app:model-youtube");
const debugRedis = require("debug")("app:model-youtube-redis");
const moment = require("moment");
const redis = require("redis");
const config = require("config");
const { YoutubeDataAPI } = require("youtube-v3-api");
const youTube = new YoutubeDataAPI(config.get("youtube.api-key"));

// REDIS FOR CACHE
const cache = redis.createClient(
  config.get("redis.port"),
  config.get("redis.host"),
  { db: config.get("redis.db") }
);
cache.on("connect", () => {
  debugRedis("Redis connecting . . .");
});
cache.on("ready", () => {
  debugRedis("Redis connected!");
});
cache.auth(config.get("redis.password"));
cache.on("error", function (err) {
  debug("[REDIS ERROR]", err.message);
});

async function youtubeResult(req) {
  const q = req.body.q;
  try {
    let videos = [];
    const page01 = await youTube.searchAll(q, 50, {
      type: "video",
      eventType: "completed",
      part: "id, snippet",
    });
    videos = videos.concat(page01.items);
    const page02 = await youTube.searchAll(q, 50, {
      type: "video",
      eventType: "completed",
      part: "id, snippet",
      pageToken: page01.nextPageToken,
    });
    videos = videos.concat(page02.items);
    const page03 = await youTube.searchAll(q, 50, {
      type: "video",
      eventType: "completed",
      part: "id, snippet",
      pageToken: page02.nextPageToken,
    });
    videos = videos.concat(page03.items);
    return videos;
  } catch (err) {
    debug("[YOUTUBE SEARCH ERROR]", err);
  }
}

async function youTubeGetVideo(videoId) {
  try {
    return await youTube.searchVideo(videoId);
  } catch (err) {
    debug("[YOUTUBE GET VIDEO ERROR]", err);
  }
}

function getVideoInfo(videoId) {
  return new Promise((resolve, reject) => {
    cache.get("video_" + videoId, async (err, reply) => {
      if (err) {
        debugRedis("[REDIS ERROR GET '" + post.q + "']", err);
        return;
      }
      let videoInfo = null;
      if (reply) {
        videoInfo = JSON.parse(reply);
        debugRedis("'video_" + videoId + "' in cache!");
      } else {
        videoInfo = await youTubeGetVideo(videoId);
        cache.set("video_" + videoId, JSON.stringify(videoInfo));
        debugRedis("'video_" + videoId + "' create cache!");
      }
      const duration = moment.duration(
        videoInfo.items[0].contentDetails.duration,
        moment.ISO_8601
      );
      const durationTmp = duration._milliseconds / 1000;
      const duration_format = moment
        .utc(moment.duration(durationTmp, "seconds").asMilliseconds())
        .format("HH:mm:ss");
      resolve({
        videoId: videoInfo.items[0].id,
        title: videoInfo.items[0].snippet.title,
        description: videoInfo.items[0].snippet.description,
        duration: durationTmp,
        duration_format: duration_format,
      });
    });
  });
}

function getVideoList(req) {
  return new Promise((resolve, reject) => {
    const post = {
      q: req.body.q,
      time_01: req.body.time_01 ? parseFloat(req.body.time_01) : 15.0,
      time_02: req.body.time_02 ? parseFloat(req.body.time_02) : 120.0,
      time_03: req.body.time_03 ? parseFloat(req.body.time_03) : 30.0,
      time_04: req.body.time_04 ? parseFloat(req.body.time_04) : 150.0,
      time_05: req.body.time_05 ? parseFloat(req.body.time_05) : 20.0,
      time_06: req.body.time_06 ? parseFloat(req.body.time_06) : 40.0,
      time_07: req.body.time_07 ? parseFloat(req.body.time_07) : 90.0,
    };
    cache.get(post.q, async (err, reply) => {
      if (err) {
        debugRedis("[REDIS ERROR GET '" + post.q + "']", err);
        return;
      }
      let searchResult = null;
      if (reply) {
        searchResult = JSON.parse(reply);
        debugRedis(
          "'" + post.q + "' in cache! has " + searchResult.length + " items."
        );
      } else {
        searchResult = await youtubeResult(req);
        cache.set(post.q, JSON.stringify(searchResult));
        debugRedis(
          "'" +
            post.q +
            "' create cache! has " +
            searchResult.length +
            " items."
        );
      }

      const videosList = [];
      const promises = searchResult.map(
        (item) =>
          new Promise((resolve, reject) => {
            getVideoInfo(item.id.videoId).then((data) => {
              videosList.push(data);
              resolve();
            });
          })
      );
      Promise.all(promises).then(() => {
        resolve({ videosList: videosList, post: post });
      });
    });
  });
}

exports.getVideoList = getVideoList;

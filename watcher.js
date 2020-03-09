const axios = require("axios");
const { GoogleSpreadsheet } = require("google-spreadsheet");
var CronJob = require("cron").CronJob;

const URL = "https://api.watchville.co/v2/posts?limit=20";

/*
1: the picture
2: blog name (ex. Monochrom) 1
3: title of the article 1
4: link 1
5: text excerpt
6: publication time (if possible calculate the exact time ex. its 10AM, it's written 28min ago => 9h32)
7: number of views
*/
const watcher = async () => {
  console.log("watcher begins");
  const response_data = await get_news();
  //   console.log(response_data);
  const news_json_arr = await process_news(response_data);
    // console.log(news_json_arr)

  const date_now = await getDateTime();

  await write_to_google_sheets(news_json_arr, date_now);
};

const get_news = async () => {
  let responses;
  await axios
    .get(URL)
    .then(res => (responses = res.data))
    .catch(error => console.log(error));

  console.log("get_20_news done");

  return responses;
};

const process_news = async response_data => {
  let posts_arr = response_data.posts;
  let feeds_arr = response_data.feeds;
  let news_json_arr = [];

  for (let [i, post] of posts_arr.entries()) {
    let news_json = {};

    
    news_json.position = i + 1;

    for (feed of feeds_arr) {
      if (post.feed_id == feed.id) {
        news_json.blog_name = feed.title;
      }
    }

    news_json.picture = '=IMAGE("' + post.hero_image_url + '")';
    news_json.title = post.title;
    news_json.link = post.source_url;
    news_json.text_excerpt = post.excerpt;
    news_json.published_at = new Date(post.published_at * 1000).toLocaleDateString();
    news_json.total_views = post.total_views;
    
    news_json_arr.push(news_json);
  }

  console.log("process_news done");

  return news_json_arr;
};

const write_to_google_sheets = async (news_json_arr, date_now) => {
  try {
    const doc = await connect_google_spreadsheet();

    const newSheet = await doc.addSheet({
      title: date_now,
      headerValues: ["position", "blog_name", "picture", "title", "link", "text_excerpt", "published_at", "total_views"]
    });
    const moreRows = await newSheet.addRows(news_json_arr);

    console.log("write_to_google_sheets done ", date_now);
  } catch (error) {
    console.log(error);
  }
};

const connect_google_spreadsheet = async () => {
  try {
    // spreadsheet key is the long id in the sheets URL
    const doc = new GoogleSpreadsheet(
      "15ijxsCJust-M95_XVLL-De44MPJheF0rcECZK4FJ0Os"
    );
    await doc.useServiceAccountAuth(require("./credentials.json"));

    await doc.loadInfo(); // loads document properties and worksheets

    console.log("connect_google_spreadsheet done");

    return doc;
  } catch (error) {
    console.log(error);
  }
};

const getDateTime = async () => {
  let date;
  let time;

  await axios
    .get("http://worldtimeapi.org/api/timezone/America/New_York")
    .then(res => {
      let datetime = res.data.datetime;
      date = datetime.split("T")[0];
      time = datetime.split("T")[1].split(".")[0].replace(/:/g, "-");
    })
    .catch(error => console.log(error));

  return date + ", " + time;
};


let job = new CronJob(
  "0 0 10,22 * * *",
  function() {
    watcher();
  },
  null,
  true,
  "America/New_York"
);
job.start();

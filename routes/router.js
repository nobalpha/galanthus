require("dotenv").config();
const fs = require("fs");
const multer = require("multer");
const express = require("express");
const axios = require("axios");
const FormData = require("form-data");
const cheerio = require("cheerio");
const htmlparser2 = require("htmlparser2");
const spawn = require("child_process").spawn;
const { JSDOM } = require("jsdom");

const db = require("../db/db.json");
const router = express.Router();

const upload = multer();

router.get("/", function (req, res) {
  res.send("Welcome to our backend side!");
});

router.get("/stats", function (req, res) {
  const json = {};
  for (data in db) {
    // console.log(db[data]);
    // console.log(db[data][db[data].length - 1]._id + 1);
    json[data] = {};
    let dummy;
    if (data === "news")
      dummy = db[data]["recurrent"][db[data]["recurrent"].length - 1]._id + 1;
    else if (data === "reports")
      dummy = db[data]["static"][db[data]["static"].length - 1]._id + 1;
    else dummy = db[data][db[data].length - 1]._id + 1;
    json[data]["totalEntries"] = dummy;
  }
  res.json(json);
});

router.get("/db", async function (req, res) {
  const db_name = req.query.name;

  let q_db = db[db_name];
  if (db_name === "news") q_db = db[db_name]["recurrent"];
  else if (db_name === "reports") q_db = db[db_name]["static"];
  const rowNumber = parseInt(req.query.rows);
  let pageNumber = parseInt(req.query.page);

  const fullHost = `${req.protocol}://${req.get("host")}`;
  const result = await axios.get(`${fullHost}/data/stats`);
  const totalEntries = result.data[db_name].totalEntries;
  const totalPages = Math.ceil(totalEntries / rowNumber);

  if (pageNumber > totalPages) pageNumber = 1;

  const sliced = q_db.slice(
    (pageNumber - 1) * rowNumber,
    (pageNumber - 1) * rowNumber + rowNumber
  );

  // console.log(totalEntries);
  res.json({
    data: sliced,
    page: pageNumber,
    rows: rowNumber,
    totalEntries: totalEntries,
    totalPages: totalPages,
  });
});

router.post("/test", async function (req, res) {
  console.log(req.body);
  const fullHost = `${req.protocol}://${req.get("host")}`;
  const data = await axios.get(`${fullHost}/data/stats`);
  const answers = req.body.answers;
  const total = data.data.questions.totalEntries;
  let string = "";
  for (let i = 0; i < total; i++) {
    if (i in answers) string += answers[i];
    else string += "0";
  }
  console.log(string);
  // console.log(db["similarity"]);
  const { match, max, value } = checkSimilarity(db["similarity"], string);
  console.log(match, max, value);
  res.status(200).json({ match: match, link: await imageGenerator(match) });
});

router.post(
  "/identification",
  upload.single("filename"),
  async function (req, res) {
    console.log(req.file);
    const identification_result = await postRequest(
      "https://my-api.plantnet.org/v2/identify/all",
      process.env.PLANTNET_API_KEY,
      { images: req.file, organs: "leaf" }
    );
    if (!identification_result.data.results.length) {
      console.error("Couldn't identify the image...");
      res.send("Couldn't identify the image...");
    }
    const scientificName =
      identification_result.data.results[0].species.scientificNameWithoutAuthor;

    const attributes = await pythonProcess("./soup.py", scientificName);
    const extension = req.file.originalname.slice(
      req.file.originalname.lastIndexOf(".") + 1
    );
    const rowNumber = Math.ceil(attributes.length / 2);
    await bufferToFile(`./public/temp/temp.${extension}`, req.file.buffer);

    const params = {
      attributes: attributes.chunk(rowNumber),
      scientificName: scientificName,
      extension: extension,
      rows: rowNumber,
    };

    const encoded = encodeURIComponent(JSON.stringify(params));
    console.log(encoded);
    res.redirect(`/identification?params=${encoded}`);
    // res.render("pages/identification.ejs", );
  }
);

const initFormObject = (url, api_key) => {
  const formdata = new FormData();

  const config = {
    method: "post",
    url: url,
    headers: {
      "Content-Type": "multipart/form-data",
      ...formdata.getHeaders(),
    },
    params: {
      "api-key": api_key,
    },

    data: formdata,
  };

  return {
    formdata,
    config,
  };
};

const postRequest = async (url, api_key, data) => {
  const { formdata, config } = initFormObject(url, api_key);
  for (key in data) {
    // console.log(key, formdata[key]);

    if (key === "images") {
      formdata.append(
        key,
        data[key].buffer,
        `image.${data[key].originalname.slice(
          data[key].originalname.lastIndexOf(".") + 1
        )}`
      );
      continue;
    }
    formdata.append(key, data[key]);
  }
  return axios(config);
};

const pythonProcess = (path, ...args) => {
  return new Promise((resolve, reject) => {
    console.log(...args);
    const pythonProcess = spawn("python", [path, ...args]);

    pythonProcess.stdout.on("data", (data) => {
      const data_array = data.toString().split("\r\n");
      const attributes = data_array.slice(0, data_array.length - 1);

      for (let i = 0; i < attributes.length; i++) {
        attributes[i] = attributes[i].split(":");
      }
      resolve(attributes);
    });

    pythonProcess.stdout.on("error", (err) => {
      console.log(err);
      reject(err);
    });
  });
};

const bufferToFile = (path, buffer) => {
  return new Promise((resolve, reject) => {
    console.log("bufferToFile");
    fs.writeFile(`${path}`, buffer, (err) => {
      if (err) reject(err);
      console.log(`${path} buffer has been successfully wrote!`);
      console.log("Buffer write ended...");
      resolve(true);
    });
  });
};

Object.defineProperty(Array.prototype, "chunk", {
  value: function (chunkSize) {
    let temporal = [];

    for (let i = 0; i < this.length; i += chunkSize) {
      temporal.push(this.slice(i, i + chunkSize));
    }

    return temporal;
  },
});

const checkSimilarity = (array, string) => {
  let match = "",
    max = 0;
  for (key of array) {
    let score,
      point = 0,
      length = key.value.length;
    if (string.length != length) continue;
    for (let i = 0; i < string.length; i++) {
      if (string[i] === key.value[i]) {
        point++;
        // console.log(point);
      }
    }
    score = point / length;
    // console.log(key.value, score);
    if (max < score) {
      max = score;
      match = key.name;
      value = key.value;
    }
  }
  return { match, max, value };
};

const imageGenerator = async function (query_name) {
  const host = "http://api.serpstack.com/search";
  console.log(
    `${host}?access_key=${process.env.SERPSTACK_API_KEY}&query=${query_name}&type=images`
  );

  const options = {
    access_key: process.env.SERPSTACK_API_KEY,
    query: query_name,
    type: "images",
  };

  return await axios
    .get(host, {
      params: options,
    })
    .then((resp) => {
      const temp = resp.data["image_results"][0]["image_url"];
      return temp;
    })
    .catch((err) => console.log(err));
};

module.exports = [router];

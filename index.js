const express = require("express");
const app = express();
const [router] = require("./routes/router");
const axios = require("axios");
const cookieParser = require("cookie-parser");
const session = require("express-session");

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(
  session({ secret: "caretakers", resave: false, saveUninitialized: false })
);

// set the view engine to ejs
app.set("view engine", "ejs");

// index page
app.get("/", function (req, res) {
  res.render("pages/index.ejs");
});

app.get("/about", function (req, res) {
  res.render("pages/about.ejs");
});

// about page
app.get("/identification", function (req, res) {
  if (req.query.params) {
    const args = JSON.parse(decodeURIComponent(req.query.params));
    return res.render("pages/identification.ejs", args);
  }

  res.render("pages/identification.ejs");
});

app.get("/test", async function (req, res) {
  let pageNumber = 1;
  const fullHost = `${req.protocol}://${req.get("host")}`;
  const rowNumber = 2;
  // console.log(fullHost);
  const result = await axios.get(
    `${fullHost}/data/db?rows=${rowNumber}&page=${pageNumber}&name=questions`
  );
  // console.log("result", result.data);
  res.render("pages/test.ejs", result.data);
});

app.post("/test", async function (req, res) {
  let pageNumber = 1;
  console.log(req.session);
  if (!req.session.answers) req.session.answers = {};

  if (req.body.page || req.body.test) {
    // console.log(req.query);
    pageNumber = parseInt(req.body.page);
    // console.log(pageNumber);
    if (Object.keys(req.body).length > 1) {
      for (datum in req.body) {
        if (datum !== "page" && datum !== "test") {
          console.log(datum, req.body[datum]);
          req.session.answers[datum] = req.body[datum];
        }
      }
    }
  }

  if (req.body.test) {
    console.log("form is submitted");
    console.log(req.session.answers);
    const fullHost = `${req.protocol}://${req.get("host")}`;
    const result = await axios.post(`${fullHost}/data/test`, {
      answers: req.session.answers,
    });
    const match = result.data.match;
    const link = result.data.link;
    return res.render("pages/test.ejs", {
      match: match,
      submitted: true,
      link: link,
    });
    // backend test submission
    // res render test.ejs hangi hayvan olduğu
  }

  const fullHost = `${req.protocol}://${req.get("host")}`;
  const rowNumber = 2;
  // console.log(fullHost);
  const result = await axios.get(
    `${fullHost}/data/db?rows=${rowNumber}&page=${pageNumber}&name=questions`
  );

  // console.log("result", result.data);
  res.render("pages/test.ejs", result.data);
});

app.get("/societies", async function (req, res) {
  let pageNumber = 1;

  if (req.query.page) {
    // console.log(req.query);
    pageNumber = parseInt(req.query.page);
  }

  const fullHost = `${req.protocol}://${req.get("host")}`;
  const rowNumber = 2;
  // console.log(fullHost);
  const result = await axios.get(
    `${fullHost}/data/db?rows=${rowNumber}&page=${pageNumber}&name=societies`
  );
  // console.log("result", result.data);
  res.render("pages/societies.ejs", result.data);
});

app.get("/news", async function (req, res) {
  let pageNumber = 1;

  if (req.query.page) {
    // console.log(req.query);
    pageNumber = parseInt(req.query.page);
  }

  const fullHost = `${req.protocol}://${req.get("host")}`;
  const rowNumber = 3;
  // console.log(fullHost);
  const result = await axios.get(
    `${fullHost}/data/db?rows=${rowNumber}&page=${pageNumber}&name=news`
  );
  // console.log("result", result.data);
  res.render("pages/news.ejs", result.data);
});

app.get("/reports", async function (req, res) {
  let pageNumber = 1;

  if (req.query.page) {
    // console.log(req.query);
    pageNumber = parseInt(req.query.page);
  }

  const fullHost = `${req.protocol}://${req.get("host")}`;
  const rowNumber = 1;
  // console.log(fullHost);
  const result = await axios.get(
    `${fullHost}/data/db?rows=${rowNumber}&page=${pageNumber}&name=reports`
  );
  // console.log("result", result.data);
  res.render("pages/reports.ejs", result.data);
});

app.use("/data", router);
app.use(express.static(__dirname + "/public"));

app.listen(80);
console.log("Server is listening on port 8080");

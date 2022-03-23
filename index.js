// FIXME Problem with database generator cron script

const express = require("express");
const app = express();
const [router] = require("./routes/router");
const axios = require("axios");
const cookieParser = require("cookie-parser");
const session = require("express-session");
console.debug(`[OK] Required modules have been imported.`);

app.use(express.json());
console.debug(`[OK] Integrated JSON content support.`);
app.use(express.urlencoded({ extended: true }));
console.debug(`[OK] Integrated URIEncoding content support.`);
app.use(cookieParser());
console.debug(`[OK] Integrated cookie parsing support.`);
app.use(
    session({ secret: "caretakers", resave: false, saveUninitialized: false })
);
console.debug(`[OK] Integrated server-side session support.`);

app.set("view engine", "ejs");
console.debug(`[OK] Set the view engine to EJS.`);

// Frontend Express Server

// Root of the website [GET]
app.get("/", function (req, res) {
    console.info(`[Info] Requested the root page: /`);
    return res.render("pages/index.ejs");
});

// About section [GET]
app.get("/about", function (req, res) {
    console.info(`[Info] Requested the about page: /about`);
    return res.render("pages/about.ejs");
});

// Plant Identification section [GET]
app.get("/identification", function (req, res) {
    console.info(`[Info] Requested the identification page: /identification`);
    if (req.query.params) {
        // Checking if the attributes of given plant sent.
        const attributes = JSON.parse(decodeURIComponent(req.query.params)); // Decoding the middleware URI encoding and parsing the JSON result.
        console.debug(`[OK] Fetched the attributes: ${attributes}`);
        return res.render("pages/identification.ejs", attributes); // Including the obtained attributes
    }
    return res.render("pages/identification.ejs");
});

// Gamification section [GET]
app.get("/test", async function (req, res) {
    console.info(`[Info] Requested the gamification page: /test`);

    let pageNumber = 1; // Setting the default page number.
    const fullHost = `${req.protocol}://${req.get("host")}`; // Getting the full host URL
    console.info(`[Info] Parsed the full host URL: ${fullHost}`);
    const rowNumber = 2; // Setting the default row number.
    const result = await axios.get(
        `${fullHost}/data/db?rows=${rowNumber}&page=${pageNumber}&name=questions`
    ); // Fetching questions between a given range.
    if (!result.data) {
        console.error("Couldn't fetch the questions.");
        return res.render("pages/index.ejs");
    }
    const questions = result.data;
    console.debug(`[OK] Fetched the questions: ${questions}`);
    return res.render("pages/test.ejs", questions);
});

// Gamification section [POST]
app.post("/test", async function (req, res) {
    console.info(`[Info] Posted to the gamification page: /test`);

    const fullHost = `${req.protocol}://${req.get("host")}`;
    console.info(`[Info] Parsed the full host URL: ${fullHost}`);
    const rowNumber = 2; // Setting the default row number.
    let pageNumber = 1; // Setting the default page number.
    if (req.session)
        console.debug(`[OK] Session object exists: ${req.session}`);

    if (!req.session.answers) req.session.answers = {}; // Initializing the answers object if there is none.

    if (req.body.page || req.body.test) {
        // If the request was either for the pagination or for the submission.
        // Using OR due to the answers which can also be given by submitting the test.
        pageNumber = parseInt(req.body.page); // Getting the desired page number.
        console.debug(
            `[OK] Gathered the requested page number: ${req.body.page}`
        );
        if (Object.keys(req.body).length > 1) {
            // If the answers exists.
            for (datum in req.body) {
                // Iterating over given answers.
                if (datum !== "page" && datum !== "test") {
                    // Eliminating the action requests.
                    console.info(
                        `[Info] Gathered question number ${
                            parseInt(datum) + 1
                        }'s answer: ${req.body[datum]}`
                    );
                    req.session.answers[datum] = req.body[datum]; // Passing given answers to the server-side session for data storage.
                }
            }
        }
    }

    if (req.body.test) {
        // If the request was for the submission.
        console.debug(`[OK] Recieved form submission.`);
        console.debug(
            `[OK] Gathered session-wide answers: ${req.session.answers}`
        );

        const result = await axios.post(`${fullHost}/data/test`, {
            answers: req.session.answers,
        }); // Passing the answers to internal API for similarity check.
        const match = result.data.match; // Getting the matched species.
        const link = result.data.link; // Getting the matched species' image.
        return res.render("pages/test.ejs", {
            match: match,
            submitted: true,
            link: link,
        });
    }

    const result = await axios.get(
        `${fullHost}/data/db?rows=${rowNumber}&page=${pageNumber}&name=questions`
    ); // Getting paginated question data.

    const questions = result.data;
    console.debug(`[OK] Fetched the questions: ${questions}`);
    return res.render("pages/test.ejs", questions);
});

// Societies section [GET]
app.get("/societies", async function (req, res) {
    console.info(`[Info] Requested the societies page: /scoieties`);

    const fullHost = `${req.protocol}://${req.get("host")}`;
    console.info(`[Info] Parsed the full host URL: ${fullHost}`);
    const rowNumber = 2; // Setting the default row number.
    let pageNumber = 1; // Setting the default page number.

    if (req.query.page) {
        // If page change occurs.
        pageNumber = parseInt(req.query.page);
        console.debug(
            `[OK] Gathered the requested page number: ${req.body.page}`
        );
    }

    const result = await axios.get(
        `${fullHost}/data/db?rows=${rowNumber}&page=${pageNumber}&name=societies`
    );
    const societies = result.data;
    console.debug(`[OK] Fetched the societies: ${societies}`);
    return res.render("pages/societies.ejs", societies);
});

// News section [GET]
app.get("/news", async function (req, res) {
    console.info(`[Info] Requested the news page: /news`);

    const fullHost = `${req.protocol}://${req.get("host")}`;
    console.info(`[Info] Parsed the full host URL: ${fullHost}`);
    const rowNumber = 3; // Setting the default row number.
    let pageNumber = 1; // Setting the default page number.

    if (req.query.page) {
        // If page change occurs.
        pageNumber = parseInt(req.query.page);
        console.debug(
            `[OK] Gathered the requested page number: ${req.body.page}`
        );
    }

    const result = await axios.get(
        `${fullHost}/data/db?rows=${rowNumber}&page=${pageNumber}&name=news`
    );
    const news = result.data;
    console.debug(`[OK] Fetched the news: ${news}`);
    return res.render("pages/news.ejs", news);
});

app.get("/endemics", async function (req, res) {
    console.info(`[Info] Requested the endemics page: /endemics`);

    const fullHost = `${req.protocol}://${req.get("host")}`;
    console.info(`[Info] Parsed the full host URL: ${fullHost}`);
    const rowNumber = 3; // Setting the default row number.
    let pageNumber = 1; // Setting the default page number.

    if (req.query.page) {
        // If page change occurs.
        pageNumber = parseInt(req.query.page);
        console.debug(
            `[OK] Gathered the requested page number: ${req.body.page}`
        );
    }
    const result = await axios.get(
        `${fullHost}/data/db?rows=${rowNumber}&page=${pageNumber}&name=endemics`
    );

    const endemics = result.data;
    console.debug(`[OK] Fetched the endemics: ${endemics}`);
    res.render("pages/endemics.ejs", endemics);
});

app.get("/reports", async function (req, res) {
    console.info(`[Info] Requested the reports page: /reports`);

    const fullHost = `${req.protocol}://${req.get("host")}`;
    console.info(`[Info] Parsed the full host URL: ${fullHost}`);
    const rowNumber = 1; // Setting the default row number.
    let pageNumber = 1; // Setting the default page number.

    if (req.query.page) {
        // If page change occurs.
        pageNumber = parseInt(req.query.page);
        console.debug(
            `[OK] Gathered the requested page number: ${req.body.page}`
        );
    }
    const result = await axios.get(
        `${fullHost}/data/db?rows=${rowNumber}&page=${pageNumber}&name=reports`
    );
    const reports = result.data;
    console.debug(`[OK] Fetched the reports: ${reports}`);
    res.render("pages/reports.ejs", reports);
});

app.use("/data", router); // Integrating the backend router to main frontend express server.
app.use(express.static(__dirname + "/public")); // Creating a public static file folder.

const port = process.env.PORT || 8000;
app.listen(port);
console.debug(`[OK] Server is listening on port ${port}`);

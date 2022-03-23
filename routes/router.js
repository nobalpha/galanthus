require("dotenv").config();
const multer = require("multer");
const express = require("express");
const axios = require("axios");
const {
    postRequest,
    pythonProcess,
    bufferToFile,
    checkSimilarity,
    imageGenerator,
} = require("../functions.js");
console.debug(`[OK] Required modules have been imported.`);

const database = require("../db/db.json");
console.debug(`[OK] Local JSON database has been dumped.`);

const router = express.Router();
console.debug(`[OK] Express router has been initialized.`);

const upload = multer();
console.debug(`[OK] Multi formdata handler module has been initialized.`);

// Backend Express Server

// Root of the backend site [GET]
router.get("/", function (req, res) {
    console.info(`[Info][Data] Requested the root page: /`);
    return res.send("Welcome to our backend side!");
});

// Stats section of the database [GET]
router.get("/stats", function (req, res) {
    console.info(`[Info][Data] Requested the stats page: /stats`);
    const json = {}; // Initializing an empty JSON object.
    for (data in database) {
        json[data] = {}; // Creating an empty key at JSON object.
        let dummy; // Creating a dummy variable to store the total entries.

        // Special treatments for some of the columns.
        if (data === "news")
            // Getting the recurrent section.
            dummy =
                database[data]["recurrent"][
                    database[data]["recurrent"].length - 1
                ]._id + 1;
        else if (data === "reports")
            // Getting the static section
            dummy =
                database[data]["static"][database[data]["static"].length - 1]
                    ._id + 1;
        else dummy = database[data][database[data].length - 1]._id + 1;
        json[data]["totalEntries"] = dummy; // Storing the maximum value.
    }
    return res.json(json);
});

// Database Access section of the database [GET]
router.get("/db", async function (req, res) {
    console.info(`[Info][Data] Requested the database page: /db`);
    const columnName = req.query.name;
    console.debug(`[OK][Data] Fetched the columnName: ${columnName}`);

    let queryDatabase = database[columnName];
    console.debug(
        `[OK][Data] Loaded the database by column: ${JSON.stringify(
            queryDatabase
        ).slice(0, 15)} (...)`
    );

    // Special treatments for some of the columns.
    if (columnName === "news")
        queryDatabase = database[columnName]["recurrent"];
    // Getting the recurrent section.
    else if (columnName === "reports")
        queryDatabase = database[columnName]["static"]; // Getting the static section

    const rowNumber = parseInt(req.query.rows); // Getting requested row number.
    let pageNumber = parseInt(req.query.page); // Getting requested page number.

    const fullHost = `${req.protocol}://${req.get("host")}`;
    console.info(`[Info][Data] Parsed the full host URL: ${fullHost}`);

    const result = await axios.get(`${fullHost}/data/stats`);
    const stats = result.data[columnName];
    console.debug(`[OK][Data] Fetched the stats of the database: ${stats}`);

    const totalEntries = stats.totalEntries;
    console.info(
        `[Info][Data] Got the total entries of the database: ${totalEntries}`
    );

    const totalPages = Math.ceil(totalEntries / rowNumber);
    console.info(
        `[Info][Data] Got the total pages of the database by row number: ${totalPages}`
    );

    if (pageNumber > totalPages) {
        // If requested page number is greater than the maximum
        console.info(
            `[Info][Data] Requested page number is greater than the total pages of the database. Reseting the page number to 1.`
        );
        pageNumber = 1;
    }

    const sliced = queryDatabase.slice(
        (pageNumber - 1) * rowNumber,
        (pageNumber - 1) * rowNumber + rowNumber
    );

    console.debug(
        `[OK][Data] Sliced the desired portion of the database: ${sliced}`
    );

    return res.json({
        data: sliced,
        page: pageNumber,
        rows: rowNumber,
        totalEntries: totalEntries,
        totalPages: totalPages,
    });
});

// Gamification section of the backend site [POST]
router.post("/test", async function (req, res) {
    console.info(`[Info][Data] Posted to the gamification page: /test`);

    const fullHost = `${req.protocol}://${req.get("host")}`;
    console.info(`[Info][Data] Parsed the full host URL: ${fullHost}`);

    const stats = await axios.get(`${fullHost}/data/stats`);
    console.debug(`[OK][Data] Fetched the stats of the database: ${stats}`);

    const answers = req.body.answers;
    console.info(`[Info][Data] Gathered the answers: ${answers}`);

    const totalEntries = stats.data.questions.totalEntries;
    console.info(`[Info][Data] Gathered the total entries: ${totalEntries}`);

    let string = ""; // Preparing a last string for similarity check.
    for (let i = 0; i < totalEntries; i++) {
        // Adding answers to the string.
        if (i in answers) string += answers[i];
        else string += "0"; // Buffering null data with zero.
    }
    console.info(
        `[Info][Data] Concatenated the string for similarity check: ${string}`
    );

    const { match, max, value } = checkSimilarity(
        database["similarity"],
        string
    ); // Checking the similarity.
    console.debug(
        `[OK][Data] Returned the matched string's key from the similarity check: ${match}`
    );
    console.debug(
        `[OK][Data] Returned the maximum ratio of the match from the similarity check: ${max}`
    );
    console.debug(
        `[OK][Data] Returned the matched string from the similarity check: ${value}`
    );

    return res
        .status(200)
        .json({ match: match, link: await imageGenerator(match) }); // Sending the image link of the corresponding match.
});

// Identification section of the backend site [POST]
router.post(
    "/identification",
    upload.single("filename"),
    async function (req, res) {
        console.info(
            `[Info][Data] Posted to the identification page: /identificaiton`
        );

        const file = req.file;
        console.info(`[Info][Data] Gathered the uploaded file: ${file}`);

        const extension = file.originalname.slice(
            file.originalname.lastIndexOf(".") + 1
        );
        console.info(
            `[Info][Data] Gathered the uploaded file's extension: ${extension}`
        );

        await bufferToFile(`./public/temp/temp.${extension}`, file.buffer);
        console.debug(`[OK][Data] Gathered Buffer write finish signal`);

        let identificationResult;

        try {
            identificationResult = await postRequest(
                "https://my-api.plantnet.org/v2/identify/all",
                process.env.PLANTNET_API_KEY,
                { images: file, organs: "leaf" }
            ); // Making a POST request to an external API
            identificationResult = identificationResult.data;
        } catch (error) {
            console.error(
                `Couldn't identify the image. Returned with code: ${error.response.data.statusCode}`
            );
            return res.redirect(
                `/identification?params=${encodeURIComponent(
                    JSON.stringify({ extension: extension })
                )}`
            ); // Redirecting to the main page with the uploaded image written in the temp file.
        }
        console.debug(
            `[OK][Data] Fetched identification results: ${identificationResult.results.slice(
                0,
                2
            )} (...)`
        );

        const scientificName =
            identificationResult.results[0].species.scientificNameWithoutAuthor; // Getting the scientific name.
        console.info(
            `[Info][Data] Gathered the scientific name: ${scientificName}`
        );

        const attributes = await pythonProcess(
            "./soup.py",
            process.platform === "linux"
                ? "/usr/bin/python3"
                : "D:\\Python39\\python.exe",
            scientificName
        );
        console.debug(
            `[OK][Data] Returned the corresponding attributes from the Python process: ${attributes.slice(
                0,
                2
            )} (...)`
        );

        const rowNumber = Math.ceil(attributes.length / 2);
        console.info(`[Info][Data] Gathered the row number: ${rowNumber}`);

        const params = {
            attributes: attributes.chunk(rowNumber),
            scientificName: scientificName,
            extension: extension,
            rows: rowNumber,
        };
        console.info(
            `[Info][Data] Created request parameters object: ${params}`
        );

        const encoded = encodeURIComponent(JSON.stringify(params));
        console.debug(
            `[OK][Data] Encoded the parameters to send: ${encoded.slice(0, 15)}`
        );

        return res.redirect(`/identification?params=${encoded}`);
    }
);

// Creating a chunk method for assembling data by row number.
Object.defineProperty(Array.prototype, "chunk", {
    value: function (chunkSize) {
        let temporal = [];

        for (let i = 0; i < this.length; i += chunkSize) {
            temporal.push(this.slice(i, i + chunkSize));
        }

        return temporal;
    },
});

module.exports = [router]; // Exporting the router

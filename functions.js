const fs = require("fs");
const FormData = require("form-data");
const pythonShell = require("python-shell").PythonShell;
const axios = require("axios");

/**
 * Initializes a fresh Axios API config object with form data by API Key.
 *
 * @param {string} url API Endpoint Url.
 * @param {string} apiKey API Key.
 * @return {Object} **Object** where is two values: Axios config object and dynamic formdata associated to it.
 */

const initFormObject = (url, apiKey) => {
    if (!url instanceof String || !apiKey instanceof String) {
        console.error(
            "Expected parameter types aren't met. At least one parameter have different type."
        );
        return 0;
    }

    const formData = new FormData();

    console.info(`[Info] Formdata object created: ${formData}`);

    const config = {
        method: "post",
        url: url,
        headers: {
            "Content-Type": "multipart/form-data",
            ...formData.getHeaders(),
        },
        params: {
            "api-key": apiKey,
        },

        data: formData,
    };

    console.info(`[Info] Config object created: ${config}`);

    return {
        formData,
        config,
    };
};

/**
 * Makes a POST request to an external API.
 *
 * @param {string} url API Endpoint Url.
 * @param {string} apiKey API Key.
 * @param {object} dataObject Array of data supplied to formdata object.
 * @return {Promise} **Promise** with the result of POST request.
 */

const postRequest = async (url, apiKey, dataObject) => {
    if (
        !url instanceof String ||
        !apiKey instanceof String ||
        !dataObject instanceof Object
    ) {
        console.error(
            "Expected parameter types aren't met. At least one parameter have different type."
        );
        return 0;
    }
    console.log(dataObject);
    const { formData, config } = initFormObject(url, apiKey); // Getting the inited configuration variables.

    for (key in dataObject) {
        console.log(key);
        if (key === "images") {
            // If it's an image, treating it differently.
            formData.append(
                key,
                dataObject[key].buffer, // Buffer stream of the image.
                `image.${dataObject[key].originalname.slice(
                    dataObject[key].originalname.lastIndexOf(".") + 1
                )}` // Extension of the image.
            );
            continue;
        }

        formData.append(key, dataObject[key]);
        console.info(
            `[Info] {${key}:${dataObject[key]}} has been appended to formdata object: ${formData}`
        );
    }

    return axios(config); // Function itself doesn't return a promise, instead the Axios returns.
};

/**
 * Creates a Python subprocess
 *
 * @param {string} scriptPath Path of the Python script.
 * @param {string} pythonPath Path of the Python interpreter.
 * @param {Array<string>} args Arguments passed to the Python interpreter.
 * @return {Promise} **Promise** with the result of Python process.
 */

const pythonProcess = (scriptPath, pythonPath, ...args) => {
    if (
        !scriptPath instanceof String ||
        !pythonPath instanceof String ||
        !args instanceof Array
    ) {
        console.error(
            "Expected parameter types aren't met. At least one parameter have different type."
        );
        return 0;
    }
    return new Promise((resolve, reject) => {
        // console.info(`[Info] Gathered script arguments: ${args}`);
        const options = {
            mode: "text",
            pythonPath: pythonPath,
            pythonOptions: ["-u"], // get print results in real-time
            scriptPath: process.cwd(), //If you are having python_test.py script in same folder, then it's optional.
            args: [...args], //An argument which can be accessed in the script using sys.argv[1]
        };
        // console.info(`[Info] Created script options object: ${options}`);
        pythonShell.run(scriptPath, options, function (err, result) {
            if (err) {
                console.error(err);
                reject(err);
            }

            // Result is an array consisting of messages collected during execution of Python script.

            result = result.toString(); // Getting the raw STDOUT
            console.debug(
                `[OK] Gathered result from the Python script: ${result.slice(
                    0,
                    5
                )} (...)`
            );
            const attributes = result.split(","); // Parsing the raw data via splitting by commas
            console.info(
                `[Info] Splitted result into attributes: ${attributes.slice(
                    0,
                    2
                )} (...)`
            );
            for (let i = 0; i < attributes.length; i++) {
                attributes[i] = attributes[i].split(":"); // Grouping attributes by semicolon.
            }
            console.info(
                `[Info] Parsed attributes: ${attributes.slice(0, 2)} (...)`
            );
            resolve(attributes);
        });
    });
};

/**
 * Writes provided buffer to the given path.
 *
 * @param {string} path Path of the file.
 * @param {object} buffer Buffer to write.
 * @return {Promise} **Promise** with the result of Buffer process.
 */

const bufferToFile = (path, buffer) => {
    if (!path instanceof String || !buffer instanceof Buffer) {
        console.error(
            "Expected parameter types aren't met. At least one parameter have different type."
        );
        return 0;
    }
    return new Promise((resolve, reject) => {
        fs.writeFile(path, buffer, (err) => {
            if (err) {
                console.error(err);
                reject(err);
            }
            console.debug(
                `[OK] Buffer has been successfully wrote to: ${path}`
            );
            resolve(true);
        });
    });
};

/**
 * Checks similarity of the string in the object array.
 *
 * @param {Array<string>} stringArray Array of strings to mutate.
 * @param {string} string String to check.
 * @return {Object} **Object** where is three values: The most similar string, its correspondant key and its similarity ratio.
 */

const checkSimilarity = (stringArray, string) => {
    if (!stringArray instanceof Array || !string instanceof String) {
        console.error(
            "Expected parameter types aren't met. At least one parameter have different type."
        );
        return 0;
    }
    let match = "",
        max = 0;
    for (key of stringArray) {
        let score, // Average similarity ratio.
            point = 0, // Number of similarity occurrences.
            length = key.value.length; // Length of the string to compare.
        if (string.length != length) continue; // Skipping if lengths aren't equal.
        for (let i = 0; i < string.length; i++) {
            if (string[i] === key.value[i]) {
                point++;
            }
        }
        score = point / length;

        if (max < score) {
            // Finding the maximum one.
            max = score;
            match = key.name;
            value = key.value;
        }
    }
    return { match, max, value };
};

/**
 * Fetches image from an external API with a given query name.
 *
 * @param {string} queryName Query name to search.
 * @return {URL} **URL** of the queried image.
 */

const imageGenerator = async function (queryName) {
    if (!queryName instanceof String) {
        console.error(
            "Expected parameter types aren't met. At least one parameter have different type."
        );
        return 0;
    }
    const target = "https://serpapi.com/search.json";
    const urlSchema = `${target}?api_key=${process.env.SERP_API_KEY}&q=${queryName}&tbm=isch`;

    console.info(`[Info] Concatenated the target URL schema: ${urlSchema}`);

    /* const options = {
        access_key: process.env.SERP_API_KEY,
        query: queryName,
        type: "images",
    };

    console.info(`[Info] Generated the options object: ${options}`); */
    console.info(urlSchema);
    return await axios
        .get(urlSchema)
        .then((response) => response.data["images_results"][0]["thumbnail"])
        .catch((err) => console.error(err));
};

module.exports = {
    initFormObject,
    postRequest,
    pythonProcess,
    bufferToFile,
    checkSimilarity,
    imageGenerator,
};

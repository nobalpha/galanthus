module.exports = {
    apps: [
        {
            name: "Caretakers",
            script: "./index.js",
            ignore_watch: ["node_modules", "public/temp"],
            watch: ["router/router", "index"],
        },
    ],
}; // PM2 Configuration options

const express = require("express");
const { createProxyMiddleware } = require("http-proxy-middleware");
const path = require("path");

let cors = null;
try {
  cors = require("cors");
} catch (error) {
  // CORS is installed on the production host; local checkouts can run without it.
}

const app = express();
if (cors) {
  app.use(cors());
}
app.use(express.urlencoded({ limit: "15mb", extended: false }));
app.use(express.json({ limit: "15mb" }));

const SYSREVIEW_HANDOFF_KEY = "argus:sysreview-selection";
const ARGUS_HOME_PATH = process.env.ARGUS_HOME_PATH || "/rms/argus/home";
const ARGUS_OPENAPP_PATHS = ["/openapp", "/rms/argus/openapp"];

function renderSysReviewHandoff(res, rawPayload) {
  const payload = typeof rawPayload === "string" ? rawPayload : "[]";
  const safePayload = JSON.stringify(payload)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026");
  const redirectUrl = `${ARGUS_HOME_PATH}?source=sysreview`;

  res.type("html").send(`<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Opening ARGUS</title>
</head>
<body>
  <p>Opening ARGUS...</p>
  <script>
    try {
      sessionStorage.setItem(${JSON.stringify(SYSREVIEW_HANDOFF_KEY)}, ${safePayload});
    } catch (error) {
      console.error('Unable to store SysReview handoff', error);
    }
    window.location.replace(${JSON.stringify(redirectUrl)});
  </script>
</body>
</html>`);
}

// Serve static files from the React build directory
app.use(express.static(path.join(__dirname, "build")));

app.get(ARGUS_OPENAPP_PATHS, (req, res) => {
  if (req.query && req.query.json) {
    renderSysReviewHandoff(res, req.query.json);
    return;
  }
  res.redirect(ARGUS_HOME_PATH);
});

app.post(ARGUS_OPENAPP_PATHS, (req, res) => {
  renderSysReviewHandoff(res, req.body && req.body.json);
});

// Proxy API requests to your Django backend
app.use(
  "/api",
  createProxyMiddleware({
    target: process.env.BACKEND_URL || "http://localhost:8100",
    changeOrigin: true,
    pathRewrite: {
      "^/api": "/api", // Maintain /api prefix
    },
  }),
);

// For any other routes, serve the index.html
// This is crucial for React Router to work with direct URL access
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "build", "index.html"));
});

const PORT = process.env.PORT || 3002;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

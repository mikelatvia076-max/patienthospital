// =====================================
// AGNES MEMORIAL MEDICAL HOSPITAL
// FRONTEND CONFIG  (load this BEFORE any other script)
// =====================================

// Deployed backend address (https://, no slash at the end)
const LIVE_BACKEND_URL = "https://serverportal-85rn.onrender.com";

const API_URL =
    (location.hostname === "localhost" || location.hostname === "127.0.0.1")
        ? "http://localhost:5000"
        : LIVE_BACKEND_URL;
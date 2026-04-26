const path = require("path");
const express = require("express");
const multer = require("multer");
require("dotenv").config();

const app = express();
const port = process.env.PORT || 8080;

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024,
  },
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(express.static(path.join(__dirname, "public")));
app.use("/artifacts", express.static(path.join(__dirname, "build", "contracts")));

function getPinataAuthHeaders() {
  const jwt = process.env.PINATA_JWT;
  if (jwt) {
    return { Authorization: `Bearer ${jwt}` };
  }

  const apiKey = process.env.PINATA_API_KEY;
  const apiSecret = process.env.PINATA_SECRET_API_KEY;

  if (!apiKey || !apiSecret) {
    return null;
  }

  return {
    pinata_api_key: apiKey,
    pinata_secret_api_key: apiSecret,
  };
}

app.post("/api/uploads/pinata", upload.single("file"), async (req, res) => {
  try {
    const authHeaders = getPinataAuthHeaders();
    if (!authHeaders) {
      return res.status(500).json({
        error: "Pinata server credentials are not configured.",
      });
    }

    if (!req.file) {
      return res.status(400).json({ error: "No file was uploaded." });
    }

    const formData = new FormData();
    const fileBlob = new Blob([req.file.buffer], {
      type: req.file.mimetype || "application/octet-stream",
    });

    formData.append("file", fileBlob, req.file.originalname || "evidence-file");

    const response = await fetch("https://api.pinata.cloud/pinning/pinFileToIPFS", {
      method: "POST",
      headers: authHeaders,
      body: formData,
    });

    const data = await response.json();

    if (!response.ok) {
      const errorMessage = data && data.error ? data.error : "Pinata upload failed.";
      return res.status(response.status).json({ error: errorMessage });
    }

    return res.status(200).json({
      ipfsHash: data.IpfsHash,
      pinataTimestamp: data.Timestamp,
    });
  } catch (error) {
    console.error("Upload proxy error:", error);
    return res.status(500).json({ error: "Upload failed unexpectedly." });
  }
});

app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.listen(port, () => {
  console.log(`TrustChain-EMS server running on http://127.0.0.1:${port}`);
});

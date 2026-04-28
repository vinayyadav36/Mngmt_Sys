const path = require("path");
const express = require("express");
const busboy = require("busboy");
require("dotenv").config();

const app = express();
const port = process.env.PORT || 8080;

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50 MB

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

app.post("/api/uploads/pinata", (req, res) => {
  const authHeaders = getPinataAuthHeaders();
  if (!authHeaders) {
    return res.status(500).json({
      error: "Pinata server credentials are not configured.",
    });
  }

  let fileHandled = false;

  const bb = busboy({ headers: req.headers, limits: { fileSize: MAX_FILE_SIZE } });

  bb.on("file", async (fieldname, fileStream, info) => {
    fileHandled = true;
    const { filename, mimeType } = info;

    try {
      const chunks = [];
      for await (const chunk of fileStream) {
        chunks.push(chunk);
      }

      if (fileStream.truncated) {
        return res.status(413).json({ error: "File exceeds the 50 MB size limit." });
      }

      const buffer = Buffer.concat(chunks);
      const formData = new FormData();
      const fileBlob = new Blob([buffer], { type: mimeType || "application/octet-stream" });
      formData.append("file", fileBlob, filename || "evidence-file");

      const response = await fetch("https://api.pinata.cloud/pinning/pinFileToIPFS", {
        method: "POST",
        headers: authHeaders,
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        const errorMessage = (data && data.error) ? data.error : "Pinata upload failed.";
        return res.status(response.status).json({ error: errorMessage });
      }

      return res.status(200).json({
        ipfsHash: data.IpfsHash,
        pinataTimestamp: data.Timestamp,
      });
    } catch (error) {
      console.error("Upload proxy error:", error);
      if (!res.headersSent) {
        return res.status(500).json({ error: "Upload failed unexpectedly." });
      }
    }
  });

  bb.on("finish", () => {
    if (!fileHandled) {
      return res.status(400).json({ error: "No file was uploaded." });
    }
  });

  bb.on("error", (error) => {
    console.error("Busboy error:", error);
    if (!res.headersSent) {
      return res.status(500).json({ error: "File processing failed." });
    }
  });

  req.pipe(bb);
});

app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.listen(port, () => {
  console.log(`TrustChain-EMS server running on http://127.0.0.1:${port}`);
});

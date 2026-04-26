let contract;
let userAccount;
let userData;

const userNameEl = document.getElementById("user-name");
const userRoleEl = document.getElementById("user-role");
const logoutBtn = document.getElementById("logout-btn");
const verifyEvidenceNav = document.getElementById("verify-evidence-nav");
const browseEvidenceNav = document.getElementById("browse-evidence-nav");
const verifyEvidenceSection = document.getElementById("verify-evidence-section");
const browseEvidenceSection = document.getElementById("browse-evidence-section");
const verifyEvidenceId = document.getElementById("verify-evidence-id");
const verifyBtn = document.getElementById("verify-btn");
const verificationResult = document.getElementById("verification-result");
const verificationMessage = document.getElementById("verification-message");
const evidencePreview = document.getElementById("evidence-preview");
const downloadEvidenceBtn = document.getElementById("download-evidence");
const evidenceList = document.getElementById("evidence-list");
const searchEvidence = document.getElementById("search-evidence");
const filterEvidenceType = document.getElementById("filter-evidence-type");

window.addEventListener("load", async () => {
  try {
    checkLoginStatus();

    const loaded = await EMS.loadContract();
    contract = loaded.contract;

    logoutBtn.addEventListener("click", logout);
    verifyEvidenceNav.addEventListener("click", showVerifyEvidenceSection);
    browseEvidenceNav.addEventListener("click", showBrowseEvidenceSection);
    verifyBtn.addEventListener("click", verifyEvidence);
    downloadEvidenceBtn.addEventListener("click", downloadCurrentEvidence);
    searchEvidence.addEventListener("input", filterEvidence);
    filterEvidenceType.addEventListener("change", filterEvidence);

    await loadEvidenceList();
  } catch (error) {
    console.error("Court dashboard init error:", error);
    showMessage(verificationMessage, error.message || "Could not initialize dashboard", "error");
  }
});

function checkLoginStatus() {
  const loggedInUser = localStorage.getItem("blockchainEvidenceUser");

  if (!loggedInUser) {
    window.location.href = "index.html";
    return;
  }

  userData = JSON.parse(loggedInUser);

  if (userData.role !== "Court") {
    alert("Access denied. This dashboard is for Court officials only.");
    window.location.href = "index.html";
    return;
  }

  userNameEl.textContent = userData.name;
  userRoleEl.textContent = userData.role;
  userAccount = userData.address;
}

async function loadEvidenceList() {
  try {
    const count = await contract.methods.getEvidenceCount().call();
    evidenceList.innerHTML = "";

    if (count === "0") {
      evidenceList.innerHTML = "<p>No evidence records found.</p>";
      return;
    }

    showMessage(verificationMessage, "Loading evidence records...", "warning");

    for (let i = 0; i < Number(count); i += 1) {
      const evidenceId = await contract.methods.evidenceIds(i).call();
      const evidence = await contract.methods.getEvidence(evidenceId).call({ from: userAccount });
      createEvidenceCard(evidenceId, evidence);
    }

    verificationMessage.textContent = "";
    verificationMessage.className = "message";
  } catch (error) {
    console.error("Load evidence error:", error);
    showMessage(verificationMessage, "Error loading evidence records", "error");
  }
}

function createEvidenceCard(evidenceId, evidence) {
  const card = document.createElement("div");
  card.className = "evidence-item";
  card.dataset.id = evidenceId;
  card.dataset.case = evidence.caseNumber;
  card.dataset.location = evidence.location;
  card.dataset.type = evidence.evidenceType;
  card.dataset.description = evidence.crimeDescription;

  const date = new Date(Number(evidence.timestamp) * 1000);
  const formattedDate = date.toLocaleString();

  card.innerHTML = `
    <h3>${evidence.caseNumber}</h3>
    <div class="evidence-meta">
      <p><strong>ID:</strong> ${evidenceId}</p>
      <p><strong>Type:</strong> ${evidence.evidenceType}</p>
      <p><strong>Location:</strong> ${evidence.location}</p>
      <p><strong>Uploaded By:</strong> ${evidence.officerName}</p>
      <p><strong>Date:</strong> ${formattedDate}</p>
    </div>
    <p>${truncateText(evidence.crimeDescription, 100)}</p>
    <div class="evidence-actions">
      <button class="btn success-btn verify-btn" data-id="${evidenceId}">Verify</button>
    </div>
  `;

  const verifyActionBtn = card.querySelector(".verify-btn");
  verifyActionBtn.addEventListener("click", () => {
    verifyEvidenceId.value = evidenceId;
    showVerifyEvidenceSection();
    verifyEvidence();
  });

  evidenceList.appendChild(card);
}

function truncateText(text, maxLength) {
  if (text.length <= maxLength) {
    return text;
  }
  return text.slice(0, maxLength) + "...";
}

async function verifyEvidence() {
  const evidenceId = verifyEvidenceId.value.trim();

  if (!evidenceId) {
    showMessage(verificationMessage, "Please enter an evidence ID", "warning");
    return;
  }

  try {
    showMessage(verificationMessage, "Verifying evidence...", "warning");
    verificationResult.classList.add("hidden");

    const evidence = await contract.methods.getEvidence(evidenceId).call({ from: userAccount });
    contract.methods.logEvidenceAccess(evidenceId).send({ from: userAccount }).catch(() => {});

    const date = new Date(Number(evidence.timestamp) * 1000);
    const formattedDate = date.toLocaleString();

    document.getElementById("result-id").textContent = evidenceId;
    document.getElementById("result-case").textContent = evidence.caseNumber;
    document.getElementById("result-location").textContent = evidence.location;
    document.getElementById("result-description").textContent = evidence.crimeDescription;
    document.getElementById("result-type").textContent = evidence.evidenceType;
    document.getElementById("result-officer").textContent = evidence.officerName;
    document.getElementById("result-timestamp").textContent = formattedDate;

    const statusElement = document.getElementById("result-status");
    statusElement.textContent = "Verified on Blockchain";
    statusElement.className = "value verification-status verified";

    downloadEvidenceBtn.dataset.ipfsHash = evidence.ipfsHash;
    await loadEvidencePreview(evidence.ipfsHash, evidence.evidenceType);

    verificationResult.classList.remove("hidden");
    showMessage(verificationMessage, "Evidence verified successfully", "success");
  } catch (error) {
    console.error("Verify error:", error);
    if (error.message && error.message.includes("Evidence does not exist")) {
      showMessage(verificationMessage, "Evidence ID not found on blockchain", "error");
      return;
    }
    showMessage(verificationMessage, "Error verifying evidence: " + error.message, "error");
  }
}

async function loadEvidencePreview(ipfsHash, evidenceType) {
  try {
    const url = `https://gateway.pinata.cloud/ipfs/${ipfsHash}`;
    evidencePreview.innerHTML = "";

    if (evidenceType === "Image") {
      const img = document.createElement("img");
      img.src = url;
      img.alt = "Evidence Image";
      img.style.maxWidth = "100%";
      evidencePreview.appendChild(img);
      return;
    }

    if (evidenceType === "Video") {
      const video = document.createElement("video");
      video.src = url;
      video.controls = true;
      video.style.maxWidth = "100%";
      evidencePreview.appendChild(video);
      return;
    }

    if (evidenceType === "Audio") {
      const audio = document.createElement("audio");
      audio.src = url;
      audio.controls = true;
      audio.style.width = "100%";
      evidencePreview.appendChild(audio);
      return;
    }

    if (evidenceType === "Document") {
      const link = document.createElement("a");
      link.href = url;
      link.target = "_blank";
      link.textContent = "View Document";
      link.className = "btn primary-btn";
      evidencePreview.appendChild(link);
      return;
    }

    evidencePreview.textContent = "Preview not available for this file type.";
  } catch (error) {
    console.error("Preview error:", error);
    evidencePreview.textContent = "Error loading preview.";
  }
}

function downloadCurrentEvidence() {
  const ipfsHash = downloadEvidenceBtn.dataset.ipfsHash;

  if (!ipfsHash) {
    showMessage(verificationMessage, "No evidence file to download", "warning");
    return;
  }

  window.open(`https://gateway.pinata.cloud/ipfs/${ipfsHash}`, "_blank");
}

function filterEvidence() {
  const searchTerm = searchEvidence.value.toLowerCase();
  const filterType = filterEvidenceType.value;
  const items = evidenceList.querySelectorAll(".evidence-item");

  items.forEach((item) => {
    const caseNumber = item.dataset.case.toLowerCase();
    const location = item.dataset.location.toLowerCase();
    const type = item.dataset.type;
    const description = item.dataset.description.toLowerCase();

    const matchesSearch =
      caseNumber.includes(searchTerm) ||
      location.includes(searchTerm) ||
      description.includes(searchTerm);
    const matchesType = filterType === "" || type === filterType;

    item.style.display = matchesSearch && matchesType ? "block" : "none";
  });
}

function showVerifyEvidenceSection() {
  verifyEvidenceNav.classList.add("active");
  browseEvidenceNav.classList.remove("active");
  verifyEvidenceSection.classList.remove("hidden");
  browseEvidenceSection.classList.add("hidden");
}

function showBrowseEvidenceSection() {
  browseEvidenceNav.classList.add("active");
  verifyEvidenceNav.classList.remove("active");
  browseEvidenceSection.classList.remove("hidden");
  verifyEvidenceSection.classList.add("hidden");
  loadEvidenceList();
}

function logout() {
  localStorage.removeItem("blockchainEvidenceUser");
  window.location.href = "index.html";
}

function showMessage(element, message, type) {
  element.textContent = message;
  element.className = "message " + type;

  if (type === "success") {
    setTimeout(() => {
      element.textContent = "";
      element.className = "message";
    }, 5000);
  }
}
let contract;
let userAccount;
let userData;

const userNameEl = document.getElementById("user-name");
const userRoleEl = document.getElementById("user-role");
const logoutBtn = document.getElementById("logout-btn");
const addEvidenceNav = document.getElementById("add-evidence-nav");
const viewEvidenceNav = document.getElementById("view-evidence-nav");
const addEvidenceSection = document.getElementById("add-evidence-section");
const viewEvidenceSection = document.getElementById("view-evidence-section");
const evidenceForm = document.getElementById("evidence-form");
const uploadStatus = document.getElementById("upload-status");
const uploadProgress = document.getElementById("upload-progress");
const progressBar = uploadProgress.querySelector(".progress");
const evidenceList = document.getElementById("evidence-list");
const searchEvidence = document.getElementById("search-evidence");
const filterEvidenceType = document.getElementById("filter-evidence-type");

window.addEventListener("load", async () => {
  try {
    checkLoginStatus();

    const loaded = await EMS.loadContract();
    contract = loaded.contract;

    logoutBtn.addEventListener("click", logout);
    addEvidenceNav.addEventListener("click", showAddEvidenceSection);
    viewEvidenceNav.addEventListener("click", showViewEvidenceSection);
    evidenceForm.addEventListener("submit", uploadEvidence);
    searchEvidence.addEventListener("input", filterEvidence);
    filterEvidenceType.addEventListener("change", filterEvidence);

    await loadEvidenceList();
  } catch (error) {
    console.error("Dashboard init error:", error);
    showMessage(uploadStatus, error.message || "Could not initialize dashboard", "error");
  }
});

function checkLoginStatus() {
  const loggedInUser = localStorage.getItem("blockchainEvidenceUser");

  if (!loggedInUser) {
    window.location.href = "index.html";
    return;
  }

  userData = JSON.parse(loggedInUser);

  if (userData.role !== "Police") {
    alert("Access denied. This dashboard is for Police officers only.");
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

    showMessage(uploadStatus, "Loading evidence records...", "warning");

    for (let i = 0; i < Number(count); i += 1) {
      const evidenceId = await contract.methods.evidenceIds(i).call();
      const evidence = await contract.methods.getEvidence(evidenceId).call({ from: userAccount });
      createEvidenceCard(evidenceId, evidence);
    }

    uploadStatus.textContent = "";
    uploadStatus.className = "message";
  } catch (error) {
    console.error("Load evidence error:", error);
    showMessage(uploadStatus, "Error loading evidence records", "error");
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
      <button class="btn primary-btn view-btn" data-id="${evidenceId}">View Details</button>
    </div>
  `;

  const viewBtn = card.querySelector(".view-btn");
  viewBtn.addEventListener("click", () => viewEvidenceDetails(evidenceId));

  evidenceList.appendChild(card);
}

function truncateText(text, maxLength) {
  if (text.length <= maxLength) {
    return text;
  }
  return text.slice(0, maxLength) + "...";
}

async function viewEvidenceDetails(evidenceId) {
  try {
    const evidence = await contract.methods.getEvidence(evidenceId).call({ from: userAccount });
    contract.methods.logEvidenceAccess(evidenceId).send({ from: userAccount }).catch(() => {});

    const modal = document.createElement("div");
    modal.className = "modal";

    const date = new Date(Number(evidence.timestamp) * 1000);
    const formattedDate = date.toLocaleString();

    modal.innerHTML = `
      <div class="modal-content">
        <span class="close">&times;</span>
        <h2>Evidence Details</h2>
        <div class="evidence-details">
          <div class="detail-item"><span class="label">Evidence ID:</span><span class="value">${evidenceId}</span></div>
          <div class="detail-item"><span class="label">Case Number:</span><span class="value">${evidence.caseNumber}</span></div>
          <div class="detail-item"><span class="label">Location:</span><span class="value">${evidence.location}</span></div>
          <div class="detail-item"><span class="label">Crime Description:</span><span class="value">${evidence.crimeDescription}</span></div>
          <div class="detail-item"><span class="label">Evidence Type:</span><span class="value">${evidence.evidenceType}</span></div>
          <div class="detail-item"><span class="label">Uploaded By:</span><span class="value">${evidence.officerName}</span></div>
          <div class="detail-item"><span class="label">Timestamp:</span><span class="value">${formattedDate}</span></div>
          <div class="detail-item"><span class="label">IPFS Hash:</span><span class="value">${evidence.ipfsHash}</span></div>
        </div>
        <div class="evidence-preview" id="evidence-preview-modal"><div class="loader">Loading evidence preview...</div></div>
        <div class="modal-actions"><button class="btn success-btn" id="download-btn">Download Evidence</button></div>
      </div>
    `;

    document.body.appendChild(modal);

    const closeBtn = modal.querySelector(".close");
    const closeModal = () => {
      if (document.body.contains(modal)) {
        document.body.removeChild(modal);
      }
      window.removeEventListener("click", handleOutsideClick);
    };
    closeBtn.addEventListener("click", closeModal);

    const downloadBtn = modal.querySelector("#download-btn");
    downloadBtn.addEventListener("click", () => downloadEvidence(evidence.ipfsHash));

    await loadEvidencePreview(evidence.ipfsHash, evidence.evidenceType, modal.querySelector("#evidence-preview-modal"));

    function handleOutsideClick(event) {
      if (event.target === modal) {
        closeModal();
      }
    }
    window.addEventListener("click", handleOutsideClick);
  } catch (error) {
    console.error("View details error:", error);
    showMessage(uploadStatus, "Error loading evidence details", "error");
  }
}

async function loadEvidencePreview(ipfsHash, evidenceType, previewElement) {
  try {
    const url = `https://gateway.pinata.cloud/ipfs/${ipfsHash}`;
    previewElement.innerHTML = "";

    if (evidenceType === "Image") {
      const img = document.createElement("img");
      img.src = url;
      img.alt = "Evidence Image";
      img.style.maxWidth = "100%";
      previewElement.appendChild(img);
      return;
    }

    if (evidenceType === "Video") {
      const video = document.createElement("video");
      video.src = url;
      video.controls = true;
      video.style.maxWidth = "100%";
      previewElement.appendChild(video);
      return;
    }

    if (evidenceType === "Audio") {
      const audio = document.createElement("audio");
      audio.src = url;
      audio.controls = true;
      audio.style.width = "100%";
      previewElement.appendChild(audio);
      return;
    }

    if (evidenceType === "Document") {
      const link = document.createElement("a");
      link.href = url;
      link.target = "_blank";
      link.textContent = "View Document";
      link.className = "btn primary-btn";
      previewElement.appendChild(link);
      return;
    }

    previewElement.textContent = "Preview not available for this file type.";
  } catch (error) {
    console.error("Preview error:", error);
    previewElement.textContent = "Could not load preview.";
  }
}

function downloadEvidence(ipfsHash) {
  const url = `https://gateway.pinata.cloud/ipfs/${ipfsHash}`;
  window.open(url, "_blank");
}

async function uploadEvidence(event) {
  event.preventDefault();

  const evidenceId = document.getElementById("evidence-id").value.trim();
  const caseNumber = document.getElementById("case-number").value.trim();
  const location = document.getElementById("location").value.trim();
  const crimeDescription = document.getElementById("crime-description").value.trim();
  const evidenceType = document.getElementById("evidence-type").value;
  const evidenceFile = document.getElementById("evidence-file").files[0];

  if (!evidenceId || !caseNumber || !location || !crimeDescription || !evidenceType || !evidenceFile) {
    showMessage(uploadStatus, "Please fill all fields and select a file", "warning");
    return;
  }

  try {
    showMessage(uploadStatus, "Uploading file through secure server...", "warning");
    uploadProgress.style.display = "block";
    progressBar.style.width = "30%";

    const formData = new FormData();
    formData.append("file", evidenceFile);

    const uploadResponse = await fetch("/api/uploads/pinata", {
      method: "POST",
      body: formData,
    });

    const uploadData = await uploadResponse.json();
    if (!uploadResponse.ok || !uploadData.ipfsHash) {
      throw new Error(uploadData.error || "IPFS upload failed");
    }

    progressBar.style.width = "80%";
    showMessage(uploadStatus, "Upload complete. Writing blockchain record...", "warning");

    await contract.methods
      .addEvidence(evidenceId, uploadData.ipfsHash, caseNumber, location, crimeDescription, evidenceType)
      .send({ from: userAccount });

    progressBar.style.width = "100%";
    showMessage(uploadStatus, "Evidence added successfully", "success");

    evidenceForm.reset();
    setTimeout(() => {
      progressBar.style.width = "0";
      uploadProgress.style.display = "none";
      loadEvidenceList();
    }, 1000);
  } catch (error) {
    console.error("Upload error:", error);
    showMessage(uploadStatus, "Error uploading evidence: " + error.message, "error");
    uploadProgress.style.display = "none";
    progressBar.style.width = "0";
  }
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

function showAddEvidenceSection() {
  addEvidenceNav.classList.add("active");
  viewEvidenceNav.classList.remove("active");
  addEvidenceSection.classList.remove("hidden");
  viewEvidenceSection.classList.add("hidden");
}

function showViewEvidenceSection() {
  viewEvidenceNav.classList.add("active");
  addEvidenceNav.classList.remove("active");
  viewEvidenceSection.classList.remove("hidden");
  addEvidenceSection.classList.add("hidden");
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
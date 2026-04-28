let web3;
let contract;
let userAccount;

const loginTab = document.getElementById("login-tab");
const registerTab = document.getElementById("register-tab");
const loginForm = document.getElementById("login-form");
const registerForm = document.getElementById("register-form");
const connectMetaMaskBtn = document.getElementById("connect-metamask");
const registerConnectMetaMaskBtn = document.getElementById("register-connect-metamask");
const loginBtn = document.getElementById("login-btn");
const registerBtn = document.getElementById("register-btn");
const loginMessage = document.getElementById("login-message");
const registerMessage = document.getElementById("register-message");
const loginAddress = document.getElementById("login-address");
const registerAddress = document.getElementById("register-address");
const fullnameInput = document.getElementById("fullname");
const approvedRoleValue = document.getElementById("approved-role-value");

window.addEventListener("load", async () => {
  try {
    const loaded = await EMS.loadContract();
    web3 = loaded.web3;
    contract = loaded.contract;

    loginTab.addEventListener("click", showLoginForm);
    registerTab.addEventListener("click", showRegisterForm);
    connectMetaMaskBtn.addEventListener("click", connectMetaMask);
    registerConnectMetaMaskBtn.addEventListener("click", connectMetaMask);
    loginBtn.addEventListener("click", login);
    registerBtn.addEventListener("click", register);

    await checkLoginStatus();
  } catch (error) {
    console.error("Initialization error:", error);
    showMessage(loginMessage, error.message || "Failed to initialize app", "error");
  }
});

async function connectMetaMask() {
  try {
    const { accounts } = await EMS.requestAccountAccess();
    userAccount = accounts[0];

    loginAddress.value = userAccount;
    registerAddress.value = userAccount;

    loginBtn.disabled = false;
    registerBtn.disabled = false;

    await refreshApprovedRoleLabel();

    showMessage(loginMessage, "MetaMask connected successfully", "success");
    showMessage(registerMessage, "MetaMask connected successfully", "success");
  } catch (error) {
    console.error("MetaMask connection error:", error);
    showMessage(loginMessage, "Failed to connect MetaMask", "error");
    showMessage(registerMessage, "Failed to connect MetaMask", "error");
  }
}

async function refreshApprovedRoleLabel() {
  if (!userAccount) {
    approvedRoleValue.textContent = "Connect MetaMask to check";
    return;
  }

  try {
    const isApproved = await contract.methods.roleApproved(userAccount).call();
    if (!isApproved) {
      approvedRoleValue.textContent = "Not approved yet";
      return;
    }

    const approvedRole = await contract.methods.approvedRoles(userAccount).call();
    approvedRoleValue.textContent = approvedRole || "Not approved yet";
  } catch (error) {
    console.error("Approved role check failed:", error);
    approvedRoleValue.textContent = "Could not read role approval";
  }
}

async function login() {
  if (!userAccount) {
    showMessage(loginMessage, "Please connect MetaMask first", "warning");
    return;
  }

  try {
    const isRegistered = await contract.methods.registeredUsers(userAccount).call();

    if (!isRegistered) {
      showMessage(loginMessage, "User is not registered yet", "warning");
      return;
    }

    const role = await contract.methods.userRoles(userAccount).call();
    const name = await contract.methods.userNames(userAccount).call();

    localStorage.setItem(
      "blockchainEvidenceUser",
      JSON.stringify({
        address: userAccount,
        name,
        role,
      })
    );

    redirectToDashboard(role);
  } catch (error) {
    console.error("Login error:", error);
    showMessage(loginMessage, "Login failed: " + error.message, "error");
  }
}

async function checkLoginStatus() {
  const loggedInUser = localStorage.getItem("blockchainEvidenceUser");
  if (!loggedInUser) {
    return;
  }

  try {
    const parsed = JSON.parse(loggedInUser);
    userAccount = parsed.address;
    loginAddress.value = userAccount;
    registerAddress.value = userAccount;
    loginBtn.disabled = false;
    registerBtn.disabled = false;

    const isRegistered = await contract.methods.registeredUsers(userAccount).call();
    if (!isRegistered) {
      localStorage.removeItem("blockchainEvidenceUser");
      return;
    }

    const role = await contract.methods.userRoles(userAccount).call();
    redirectToDashboard(role);
  } catch (error) {
    console.error("Session validation failed:", error);
    localStorage.removeItem("blockchainEvidenceUser");
  }
}

async function register() {
  if (!userAccount) {
    showMessage(registerMessage, "Please connect MetaMask first", "warning");
    return;
  }

  const fullname = fullnameInput.value.trim();
  if (!fullname) {
    showMessage(registerMessage, "Please enter your full name", "warning");
    return;
  }

  try {
    const isRegistered = await contract.methods.registeredUsers(userAccount).call();
    if (isRegistered) {
      showMessage(registerMessage, "This wallet is already registered", "warning");
      return;
    }

    const isApproved = await contract.methods.roleApproved(userAccount).call();
    if (!isApproved) {
      showMessage(
        registerMessage,
        "This wallet is not role-approved by admin yet. Ask admin to approve Police/Court role first.",
        "warning"
      );
      await refreshApprovedRoleLabel();
      return;
    }

    const approvedRole = await contract.methods.approvedRoles(userAccount).call();

    showMessage(registerMessage, "Submitting registration transaction...", "warning");
    await contract.methods.registerUser(fullname).send({ from: userAccount });

    localStorage.setItem(
      "blockchainEvidenceUser",
      JSON.stringify({
        address: userAccount,
        name: fullname,
        role: approvedRole,
      })
    );

    showMessage(registerMessage, "Registration successful", "success");

    setTimeout(() => {
      redirectToDashboard(approvedRole);
    }, 1200);
  } catch (error) {
    console.error("Registration error:", error);
    showMessage(registerMessage, "Registration failed: " + error.message, "error");
  }
}

function redirectToDashboard(role) {
  if (role === "Police") {
    window.location.href = "dashboard-police.html";
    return;
  }

  if (role === "Court") {
    window.location.href = "dashboard-court.html";
    return;
  }

  showMessage(loginMessage, "Unknown role detected", "error");
}

function showLoginForm() {
  loginTab.classList.add("active");
  registerTab.classList.remove("active");
  loginForm.classList.remove("hidden");
  registerForm.classList.add("hidden");
}

function showRegisterForm() {
  registerTab.classList.add("active");
  loginTab.classList.remove("active");
  registerForm.classList.remove("hidden");
  loginForm.classList.add("hidden");
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
(function () {
  let web3;
  let contract;
  let artifact;

  async function ensureWeb3() {
    if (web3) {
      return web3;
    }

    if (typeof window.ethereum === "undefined") {
      throw new Error("MetaMask is required to use this application.");
    }

    web3 = new Web3(window.ethereum);
    return web3;
  }

  async function requestAccountAccess() {
    const w3 = await ensureWeb3();
    const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
    return { web3: w3, accounts };
  }

  async function loadArtifact() {
    if (artifact) {
      return artifact;
    }

    const response = await fetch("/artifacts/EvidenceManagement.json");
    if (!response.ok) {
      throw new Error("Could not load contract artifact. Run compile/migrate first.");
    }

    artifact = await response.json();
    return artifact;
  }

  async function loadContract() {
    const w3 = await ensureWeb3();
    const contractArtifact = await loadArtifact();
    const networkId = await w3.eth.net.getId();
    const networkData = contractArtifact.networks[String(networkId)];

    if (!networkData || !networkData.address) {
      throw new Error(
        "Contract not deployed for current network. Deploy using truffle migrate and switch MetaMask network."
      );
    }

    contract = new w3.eth.Contract(contractArtifact.abi, networkData.address);

    return {
      web3: w3,
      contract,
      networkId,
      contractAddress: networkData.address,
    };
  }

  function getLoadedContract() {
    return contract;
  }

  window.EMS = {
    ensureWeb3,
    requestAccountAccess,
    loadContract,
    getLoadedContract,
  };
})();

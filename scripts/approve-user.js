const EvidenceManagement = artifacts.require("EvidenceManagement");

module.exports = async function (callback) {
  try {
    const targetAddress = process.env.APPROVE_ADDRESS;
    const role = process.env.APPROVE_ROLE;

    if (!targetAddress || !role) {
      throw new Error("Set APPROVE_ADDRESS and APPROVE_ROLE env vars before running.");
    }

    const validRoles = ["Police", "Court"];
    if (!validRoles.includes(role)) {
      throw new Error("APPROVE_ROLE must be Police or Court.");
    }

    const contract = await EvidenceManagement.deployed();
    const accounts = await web3.eth.getAccounts();

    await contract.approveUserRole(targetAddress, role, { from: accounts[0] });

    console.log(`Approved ${targetAddress} as ${role}`);
    callback();
  } catch (error) {
    callback(error);
  }
};

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract EvidenceManagement {
    address public owner;

    // Struct for evidence details
    struct Evidence {
        string ipfsHash;        // IPFS hash of the evidence file
        string caseNumber;      // Unique case identifier
        string location;        // Location where evidence was collected
        string crimeDescription; // Brief description of the crime
        string evidenceType;    // Type of evidence (audio, video, document, etc.)
        string officerName;     // Name of the officer who uploaded the evidence
        uint256 timestamp;      // Timestamp when evidence was added
        bool exists;            // Flag to check if evidence exists
    }
    
    // Mapping from evidence ID to Evidence struct
    mapping(string => Evidence) public evidenceRecords;
    
    // List of all evidence IDs for iteration
    string[] public evidenceIds;
    
    // Authorized users mapping (address => role)
    mapping(address => string) public userRoles;
    mapping(address => string) public userNames;
    mapping(address => bool) public registeredUsers;
    mapping(address => bool) public roleApproved;
    mapping(address => string) public approvedRoles;
    
    // Events
    event EvidenceAdded(string evidenceId, string ipfsHash, string officerName, uint256 timestamp);
    event EvidenceAccessed(string evidenceId, address accessedBy, uint256 timestamp);
    event UserRegistered(address userAddress, string role, string name);
    event UserRoleApproved(address userAddress, string role, address approvedBy);
    event UserRoleApprovalRevoked(address userAddress, address revokedBy);
    
    // Modifiers
    modifier onlyPolice() {
        require(
            keccak256(abi.encodePacked(userRoles[msg.sender])) == keccak256(abi.encodePacked("Police")),
            "Only police officers can add evidence"
        );
        _;
    }
    
    modifier onlyRegistered() {
        require(registeredUsers[msg.sender], "User not registered");
        _;
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can perform this action");
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    function _isValidRole(string memory _role) internal pure returns (bool) {
        return
            keccak256(abi.encodePacked(_role)) == keccak256(abi.encodePacked("Police")) ||
            keccak256(abi.encodePacked(_role)) == keccak256(abi.encodePacked("Court"));
    }

    function approveUserRole(address _userAddress, string memory _role) public onlyOwner {
        require(_userAddress != address(0), "Invalid user address");
        require(!registeredUsers[_userAddress], "User already registered");
        require(_isValidRole(_role), "Role must be either Police or Court");

        roleApproved[_userAddress] = true;
        approvedRoles[_userAddress] = _role;

        emit UserRoleApproved(_userAddress, _role, msg.sender);
    }

    function revokeUserRoleApproval(address _userAddress) public onlyOwner {
        require(roleApproved[_userAddress], "Role approval not found");

        roleApproved[_userAddress] = false;
        approvedRoles[_userAddress] = "";

        emit UserRoleApprovalRevoked(_userAddress, msg.sender);
    }
    
    // Register a new user
    function registerUser(string memory _name) public {
        require(!registeredUsers[msg.sender], "User already registered");
        require(bytes(_name).length > 0, "Name is required");
        require(roleApproved[msg.sender], "Role not approved by admin");

        string memory approvedRole = approvedRoles[msg.sender];
        
        userRoles[msg.sender] = approvedRole;
        userNames[msg.sender] = _name;
        registeredUsers[msg.sender] = true;
        roleApproved[msg.sender] = false;
        approvedRoles[msg.sender] = "";
        
        emit UserRegistered(msg.sender, userRoles[msg.sender], _name);
    }
    
    // Add new evidence (only police)
    function addEvidence(
        string memory _evidenceId,
        string memory _ipfsHash,
        string memory _caseNumber,
        string memory _location,
        string memory _crimeDescription,
        string memory _evidenceType
    ) public onlyPolice onlyRegistered {
        require(!evidenceRecords[_evidenceId].exists, "Evidence ID already exists");
        
        Evidence memory newEvidence = Evidence({
            ipfsHash: _ipfsHash,
            caseNumber: _caseNumber,
            location: _location,
            crimeDescription: _crimeDescription,
            evidenceType: _evidenceType,
            officerName: userNames[msg.sender],
            timestamp: block.timestamp,
            exists: true
        });
        
        evidenceRecords[_evidenceId] = newEvidence;
        evidenceIds.push(_evidenceId);
        
        emit EvidenceAdded(_evidenceId, _ipfsHash, userNames[msg.sender], block.timestamp);
    }
    
    // Get evidence details
    function getEvidence(string memory _evidenceId) public view onlyRegistered returns (
        string memory ipfsHash,
        string memory caseNumber,
        string memory location,
        string memory crimeDescription,
        string memory evidenceType,
        string memory officerName,
        uint256 timestamp
    ) {
        require(evidenceRecords[_evidenceId].exists, "Evidence does not exist");
        
        Evidence memory evidence = evidenceRecords[_evidenceId];
        
        return (
            evidence.ipfsHash,
            evidence.caseNumber,
            evidence.location,
            evidence.crimeDescription,
            evidence.evidenceType,
            evidence.officerName,
            evidence.timestamp
        );
    }

    function logEvidenceAccess(string memory _evidenceId) public onlyRegistered {
        require(evidenceRecords[_evidenceId].exists, "Evidence does not exist");
        emit EvidenceAccessed(_evidenceId, msg.sender, block.timestamp);
    }
    
    // Get all evidence IDs
    function getEvidenceCount() public view returns (uint256) {
        return evidenceIds.length;
    }
    
    // Check if user is registered
    function isUserRegistered(address _userAddress) public view returns (bool) {
        return registeredUsers[_userAddress];
    }
    
    // Get user role
    function getUserRole(address _userAddress) public view returns (string memory) {
        require(registeredUsers[_userAddress], "User not registered");
        return userRoles[_userAddress];
    }
    
    // Get user name
    function getUserName(address _userAddress) public view returns (string memory) {
        require(registeredUsers[_userAddress], "User not registered");
        return userNames[_userAddress];
    }
}
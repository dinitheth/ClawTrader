// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title AgentFactory
 * @dev Creates on-chain records for AI trading agents
 * 
 * This contract registers agents on-chain for:
 * - Permanent, verifiable agent creation
 * - Agent DNA stored immutably
 * - Links to off-chain Supabase UUID
 * - Token launch integration with nad.fun
 */
contract AgentFactory is Ownable {
    
    struct Agent {
        bytes32 id;              // Off-chain UUID as bytes32
        address owner;           // Creator/owner address
        string name;             // Agent name
        string avatar;           // Avatar emoji/URL
        uint8 personality;       // 0-5 mapping to personality types
        uint256 dnaRisk;         // DNA traits (0-100 scale)
        uint256 dnaAggression;
        uint256 dnaPattern;
        uint256 dnaTiming;
        uint256 dnaContrarian;
        uint256 generation;
        uint256 createdAt;
        address tokenAddress;    // Agent token if launched
        bool isActive;
    }

    // All agents
    mapping(bytes32 => Agent) public agents;
    bytes32[] public agentIds;
    
    // Owner's agents
    mapping(address => bytes32[]) public ownerAgents;
    
    // Agent count
    uint256 public totalAgents;

    // Events
    event AgentCreated(
        bytes32 indexed id,
        address indexed owner,
        string name,
        uint8 personality,
        uint256 timestamp
    );
    event AgentTokenLaunched(bytes32 indexed id, address tokenAddress);
    event AgentEvolved(bytes32 indexed id, uint256 generation);

    constructor() Ownable(msg.sender) {}

    /**
     * @dev Create a new agent on-chain
     */
    function createAgent(
        bytes32 id,
        string calldata name,
        string calldata avatar,
        uint8 personality,
        uint256 dnaRisk,
        uint256 dnaAggression,
        uint256 dnaPattern,
        uint256 dnaTiming,
        uint256 dnaContrarian
    ) external returns (bytes32) {
        require(agents[id].createdAt == 0, "Agent already exists");
        require(personality <= 5, "Invalid personality");
        require(dnaRisk <= 100 && dnaAggression <= 100, "DNA out of range");
        
        Agent memory newAgent = Agent({
            id: id,
            owner: msg.sender,
            name: name,
            avatar: avatar,
            personality: personality,
            dnaRisk: dnaRisk,
            dnaAggression: dnaAggression,
            dnaPattern: dnaPattern,
            dnaTiming: dnaTiming,
            dnaContrarian: dnaContrarian,
            generation: 1,
            createdAt: block.timestamp,
            tokenAddress: address(0),
            isActive: true
        });
        
        agents[id] = newAgent;
        agentIds.push(id);
        ownerAgents[msg.sender].push(id);
        totalAgents++;
        
        emit AgentCreated(id, msg.sender, name, personality, block.timestamp);
        
        return id;
    }

    /**
     * @dev Record token launch for an agent
     */
    function setAgentToken(bytes32 id, address tokenAddress) external {
        require(agents[id].owner == msg.sender || msg.sender == owner(), "Not authorized");
        require(agents[id].tokenAddress == address(0), "Token already set");
        
        agents[id].tokenAddress = tokenAddress;
        
        emit AgentTokenLaunched(id, tokenAddress);
    }

    /**
     * @dev Record agent evolution
     */
    function evolveAgent(
        bytes32 id,
        uint256 newDnaRisk,
        uint256 newDnaAggression,
        uint256 newDnaPattern,
        uint256 newDnaTiming,
        uint256 newDnaContrarian
    ) external {
        require(agents[id].owner == msg.sender, "Not owner");
        
        agents[id].dnaRisk = newDnaRisk;
        agents[id].dnaAggression = newDnaAggression;
        agents[id].dnaPattern = newDnaPattern;
        agents[id].dnaTiming = newDnaTiming;
        agents[id].dnaContrarian = newDnaContrarian;
        agents[id].generation++;
        
        emit AgentEvolved(id, agents[id].generation);
    }

    // ============ View Functions ============

    function getAgent(bytes32 id) external view returns (Agent memory) {
        return agents[id];
    }

    function getOwnerAgents(address owner) external view returns (bytes32[] memory) {
        return ownerAgents[owner];
    }

    function getAllAgentIds() external view returns (bytes32[] memory) {
        return agentIds;
    }

    /**
     * @dev Convert UUID string to bytes32 (for off-chain use)
     * Example: "355e4791-d4f3-4e67-95c2-5f8839b23e09" -> bytes32
     */
    function uuidToBytes32(string memory uuid) external pure returns (bytes32) {
        return keccak256(abi.encodePacked(uuid));
    }
}

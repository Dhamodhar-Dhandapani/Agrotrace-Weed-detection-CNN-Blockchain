// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract WeedRegistry {
    struct Detection {
        uint256 id;
        string ipfsHash;      // IPFS hash of the image/metadata
        string weedType;      // Type of weed detected
        uint256 confidence;   // Confidence score (0-100)
        uint256 timestamp;    // Block timestamp
        address uploader;     // Address of the uploader
    }

    Detection[] public detections;
    mapping(address => uint256[]) public userDetections; // Maps user address to their detection IDs

    event DetectionStored(uint256 indexed id, address indexed uploader, string weedType, uint256 timestamp);

    function storeDetection(string memory _ipfsHash, string memory _weedType, uint256 _confidence) public {
        uint256 newId = detections.length;
        
        detections.push(Detection({
            id: newId,
            ipfsHash: _ipfsHash,
            weedType: _weedType,
            confidence: _confidence,
            timestamp: block.timestamp,
            uploader: msg.sender
        }));

        userDetections[msg.sender].push(newId);

        emit DetectionStored(newId, msg.sender, _weedType, block.timestamp);
    }

    function getDetectionCount() public view returns (uint256) {
        return detections.length;
    }

    function getDetectionsByUser(address _user) public view returns (uint256[] memory) {
        return userDetections[_user];
    }
    
    function getDetection(uint256 _id) public view returns (Detection memory) {
        require(_id < detections.length, "Detection does not exist");
        return detections[_id];
    }
}

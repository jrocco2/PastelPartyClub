// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "./ERC721A.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

contract PastelPartyClub is ERC721A, ReentrancyGuard, Pausable {
    using Strings for uint256;

    uint256 public constant maxPerAddressDuringMint = 10;
    uint256 public constant sizeOfCollection = 10000;

    uint64 public whitelistPrice = 0.2 ether;
    uint64 public publicPrice = 0.2 ether;
    bool public whitelistSaleIsActive;
    bool public publicSaleIsActive;

    // // metadata URI
    string private _baseTokenURI;
    string private _revealURI =
        "ipfs://QmabicvNRx8nh7fZNV35tmsSfvsFBffHxdXGNJjsb3Sos2/1.json";

    mapping(address => uint256) public allowlist;

    constructor()
        ERC721A(
            "PastelPartyClub",
            "PPC",
            maxPerAddressDuringMint,
            sizeOfCollection
        )
    {}

    modifier callerIsUser() {
        require(tx.origin == msg.sender, "The caller is another contract");
        _;
    }

    function startWhitelistSale() external onlyOwner {
        whitelistSaleIsActive = true;
        publicSaleIsActive = false;
    }

    function startPublicSale() external onlyOwner {
        whitelistSaleIsActive = false;
        publicSaleIsActive = true;
    }

    function stopSales() external onlyOwner {
        whitelistSaleIsActive = false;
        publicSaleIsActive = false;
    }

    function mint(uint256 quantity) external payable callerIsUser {
        require(
            publicSaleIsActive || whitelistSaleIsActive,
            "Minting is not available"
        );
        if (publicSaleIsActive) {
            publicSaleMint(quantity);
        } else {
            whitelistMint(quantity);
        }
    }

    function cost() external view returns(uint256) {
        if (publicSaleIsActive) {
            return publicPrice;
        } else if (whitelistSaleIsActive) {
            return whitelistPrice;
        } else {
            return 0;
        }
    }

    function whitelistMint(uint256 quantity) internal callerIsUser {
        require(whitelistPrice != 0, "allowlist sale has not begun yet");
        require(
            allowlist[msg.sender] >= quantity,
            "not eligible to mint this many during whitelisting"
        );
        require(
            totalSupply() + quantity <= collectionSize,
            "reached max supply"
        );
        allowlist[msg.sender] -= quantity;
        _safeMint(msg.sender, quantity);
        refundIfOver(whitelistPrice * quantity);
    }

    function publicSaleMint(uint256 quantity) internal callerIsUser {
        require(publicPrice != 0, "public sale has not begun yet");

        require(
            totalSupply() + quantity <= collectionSize,
            "reached max supply"
        );
        require(
            numberMinted(msg.sender) + quantity <= maxPerAddressDuringMint,
            "can not mint this many"
        );
        _safeMint(msg.sender, quantity);
        refundIfOver(publicPrice * quantity);
    }

    function refundIfOver(uint256 price) private {
        require(msg.value >= price, "Need to send more ETH.");
        if (msg.value > price) {
            payable(msg.sender).transfer(msg.value - price);
        }
    }

    function setWhitelistPrice(uint64 _mintlistPrice) external onlyOwner {
        whitelistPrice = _mintlistPrice;
    }

    function setPublicPrice(uint64 _publicPrice) external onlyOwner {
        publicPrice = _publicPrice;
    }

    function seedWhitelist(
        address[] memory addresses,
        uint256[] memory nftsCanMint
    ) external onlyOwner {
        require(
            addresses.length == nftsCanMint.length,
            "addresses does not match nftsCanMint length"
        );
        for (uint256 i = 0; i < addresses.length; i++) {
            allowlist[addresses[i]] = nftsCanMint[i];
        }
    }

    // For marketing etc.
    function devMint(uint256 quantity) external onlyOwner {
        require(
            totalSupply() + quantity <= collectionSize,
            "reached max supply"
        );
        require(
            quantity % maxBatchSize == 0,
            "can only mint a multiple of the maxBatchSize"
        );
        uint256 numChunks = quantity / maxBatchSize;
        for (uint256 i = 0; i < numChunks; i++) {
            _safeMint(msg.sender, maxBatchSize);
        }
    }

    function airdrop(address[] memory accounts) external onlyOwner {
        require(
            totalSupply() + accounts.length <= collectionSize,
            "reached max supply"
        );
        for (uint256 i = 0; i < accounts.length; i++) {
            _safeMint(accounts[i], 1);
        }
    }

    function withdrawMoney() external onlyOwner nonReentrant {
        (bool success, ) = msg.sender.call{value: address(this).balance}("");
        require(success, "Transfer failed.");
    }

    function setOwnersExplicit(uint256 quantity)
        external
        onlyOwner
        nonReentrant
    {
        _setOwnersExplicit(quantity);
    }

    function numberMinted(address _owner) public view returns (uint256) {
        return _numberMinted(_owner);
    }

    function getOwnershipData(uint256 tokenId)
        external
        view
        returns (TokenOwnership memory)
    {
        return ownershipOf(tokenId);
    }

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    function _beforeTokenTransfer(
        address from,
        address to,
        uint256 startTokenId,
        uint256 quantity
    ) internal override whenNotPaused {
        super._beforeTokenTransfer(from, to, startTokenId, quantity);
    }

    function _baseURI() internal view virtual override returns (string memory) {
        return _baseTokenURI;
    }

    function setBaseURI(string calldata baseURI) external onlyOwner {
        _baseTokenURI = baseURI;
    }

    function setRevealURI(string calldata revealURI) external onlyOwner {
        _revealURI = revealURI;
    }

    function tokenURI(uint256 tokenId)
        external
        view
        virtual
        override
        returns (string memory)
    {
        require(
            _exists(tokenId),
            "ERC721Metadata: URI query for nonexistent token"
        );

        string memory baseURI = _baseURI();
        return
            bytes(baseURI).length > 0
                ? string(abi.encodePacked(baseURI, tokenId.toString()))
                : _revealURI;
    }
}

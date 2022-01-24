import { expect } from "chai";
import { ethers } from "hardhat";

import { PastelPartyClub } from "../typechain";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";

let ppc: PastelPartyClub;
let owner: SignerWithAddress;
let addr1: SignerWithAddress;
let addr2: SignerWithAddress;
let addrs: Array<SignerWithAddress>;

let whitelistPrice = ethers.utils.parseEther("0.2")
let publicPrice = ethers.utils.parseEther("0.2")
let maxPerAddressDuringMint = 10
let sizeOfCollection = 10000

describe("Pastel Party Club", function () {

  beforeEach(async function () {

    [owner,
      addr1,
      addr2,
      ...addrs] = await ethers.getSigners();

    const Ppc = await ethers.getContractFactory("PastelPartyClub");
    ppc = await Ppc.deploy();
    await ppc.deployed();

  });


  it("Should have correct name", async function () {
    expect(await ppc.name()).to.equal("PastelPartyClub")
  });

  it("Should have correct symbol", async function () {
    expect(await ppc.symbol()).to.equal("PPC")
  });

  it("Should have correct collection size", async function () {
    expect(await ppc.sizeOfCollection()).to.equal(sizeOfCollection)
  });

  it("Should have correct whitesale list price", async function () {
    expect(await ppc.whitelistPrice()).to.equal(whitelistPrice)
  });

  it("Should have correct public list price", async function () {
    expect(await ppc.publicPrice()).to.equal(publicPrice)
  });

  it("Should have correct max mint", async function () {
    expect(await ppc.maxPerAddressDuringMint()).to.equal(maxPerAddressDuringMint)
  });

  it("Should do dev mint 100 nfts", async function () {
    let amount = 100
    await ppc.devMint(amount)
    expect(await ppc.totalSupply()).to.equal(amount)
    expect(await ppc.ownerOf(0)).to.equal(owner.address)
    expect(await ppc.ownerOf(amount - 1)).to.equal(owner.address)

  });

  // it("Should do dev mint 10,000 nfts", async function () {
  //   let amount = 5000
  //   await ppc.devMint(amount)
  //   await ppc.devMint(amount)


  //   expect(await ppc.totalSupply()).to.equal(10000)
  //   expect(await ppc.ownerOf(0)).to.equal(owner.address)
  //   expect(await ppc.ownerOf(10000 - 1)).to.equal(owner.address)
  // });

  // it("Should not do dev mint 10,001 nfts", async function () {
  //   let amount = 5000
  //   await ppc.devMint(amount)
  //   await ppc.devMint(amount)
  //   await expect(
  //     ppc.devMint(1)
  //   ).to.be.revertedWith("reached max supply")

  // });

  it("Should not be able to mint 1 nft", async function () {
    let amount = 1
    await expect(
      ppc.devMint(amount)
    ).to.be.revertedWith("can only mint a multiple of the maxBatchSize")

  });

  it("Should fail devmint if not owner", async function () {
    let amount = 1
    await expect(
      ppc.connect(addr1).devMint(amount)
    ).to.be.revertedWith('Ownable: caller is not the owner')
  });

  it("Should airdrop", async function () {
    await ppc.airdrop(
      [
        owner.address, owner.address, owner.address, owner.address, owner.address,
        addr1.address, addr1.address, addr1.address, addr1.address, addr1.address,
        addr2.address, addr2.address, addr2.address, addr2.address, addr2.address,
      ])

    expect(await ppc.totalSupply()).to.equal(15)
    expect(await ppc.ownerOf(0)).to.equal(owner.address)
    expect(await ppc.ownerOf(4)).to.equal(owner.address)
    expect(await ppc.ownerOf(5)).to.equal(addr1.address)
    expect(await ppc.ownerOf(9)).to.equal(addr1.address)
    expect(await ppc.ownerOf(10)).to.equal(addr2.address)
    expect(await ppc.ownerOf(14)).to.equal(addr2.address)

  });

  it("Should fail to airdrop if not owner", async function () {
    await expect(
      ppc.connect(addr1).airdrop(
        [
          owner.address, owner.address, owner.address, owner.address, owner.address,
          addr1.address, addr1.address, addr1.address, addr1.address, addr1.address,
          addr2.address, addr2.address, addr2.address, addr2.address, addr2.address,
        ])
    ).to.be.revertedWith('Ownable: caller is not the owner')

  });

  it("Should not increase total mints when owner mints", async function () {
    await ppc.airdrop(
      [
        owner.address, owner.address, owner.address, owner.address, owner.address,
        addr1.address, addr1.address, addr1.address, addr1.address, addr1.address,
        addr2.address, addr2.address, addr2.address, addr2.address, addr2.address,
      ])

    expect(await ppc.totalSupply()).to.equal(15)
    expect(await ppc.numberMinted(owner.address)).to.equal(0)
    expect(await ppc.numberMinted(addr1.address)).to.equal(0)
    expect(await ppc.numberMinted(addr2.address)).to.equal(0)

  });

  it("Should whitelist mint", async function () {

    let amount = maxPerAddressDuringMint
    await ppc.seedWhitelist([addr1.address], [amount])
    await ppc.startWhitelistSale()
    await ppc.connect(addr1).mint(amount, { value: whitelistPrice.mul(amount) })
    expect(await ppc.numberMinted(addr1.address)).to.equal(amount)
    expect(await ppc.ownerOf(0)).to.equal(addr1.address)
    expect(await ppc.ownerOf(amount - 1)).to.equal(addr1.address)

  });

  it("Should pause transfer", async function () {

    let amount = maxPerAddressDuringMint
    await ppc.seedWhitelist([addr1.address], [amount])
    await ppc.startWhitelistSale()
    await ppc.connect(addr1).mint(amount, { value: whitelistPrice.mul(amount) })
    await ppc.pause()
    await expect(
      ppc.connect(addr1).transferFrom(addr1.address, addr2.address, 0)
    ).to.be.revertedWith("Pausable: paused")
  });

  it("Should pause whitelist mint", async function () {

    let amount = maxPerAddressDuringMint
    await ppc.seedWhitelist([addr1.address], [amount])
    await ppc.startWhitelistSale()
    await ppc.pause()
    await expect(
      ppc.connect(addr1).mint(amount, { value: whitelistPrice.mul(amount) })
    ).to.be.revertedWith("Pausable: paused")

  });

  it("Should unpause whitelist mint", async function () {

    let amount = maxPerAddressDuringMint
    await ppc.seedWhitelist([addr1.address], [amount])
    await ppc.startWhitelistSale()
    await ppc.pause()
    await expect(
      ppc.connect(addr1).mint(amount, { value: whitelistPrice.mul(amount) })
    ).to.be.revertedWith("Pausable: paused")
    await ppc.unpause()
    await ppc.connect(addr1).mint(amount, { value: whitelistPrice.mul(amount) })
    
  });

  it("Should fail if wrong amount of eth sent during whitelist mint", async function () {

    let amount = maxPerAddressDuringMint
    await ppc.seedWhitelist([addr1.address], [amount])
    await ppc.startWhitelistSale()
    await expect(
      ppc.connect(addr1).mint(amount, { value: 0 })
    ).to.be.revertedWith("Need to send more ETH")

  });

  it("Should succeed if too much eth sent during whitelist mint", async function () {

    let amount = maxPerAddressDuringMint
    await ppc.seedWhitelist([addr1.address], [amount])
    await ppc.startWhitelistSale()
    await ppc.connect(addr1).mint(amount, { value: whitelistPrice.mul(amount).add("1") })
    expect(await ppc.numberMinted(addr1.address)).to.equal(amount)
    expect(await ppc.ownerOf(0)).to.equal(addr1.address)
    expect(await ppc.ownerOf(amount - 1)).to.equal(addr1.address)
  });

  it("Should fail if whitelist price is 0", async function () {

    let amount = maxPerAddressDuringMint
    await ppc.seedWhitelist([addr1.address], [amount])
    await ppc.setWhitelistPrice(0)
    await ppc.startWhitelistSale()
    await expect(
      ppc.connect(addr1).mint(amount, { value: whitelistPrice.mul(amount) })
    ).to.be.revertedWith("allowlist sale has not begun yet")

  });

  it("Should not allow non whitelister to whitelist mint", async function () {

    let amount = maxPerAddressDuringMint
    await ppc.seedWhitelist([addr1.address], [amount])
    await ppc.startWhitelistSale()
    await expect(
      ppc.connect(addr2).mint(amount, { value: whitelistPrice.mul(amount) })
    ).to.be.revertedWith("not eligible to mint this many during whitelisting")

  });

  it("Should not allow to mint more than max when whitelist mint", async function () {

    let amount = maxPerAddressDuringMint + 1
    await ppc.seedWhitelist([addr1.address], [amount])
    await ppc.startWhitelistSale()
    await expect(
      ppc.connect(addr1).mint(amount, { value: whitelistPrice.mul(amount) })
    ).to.be.revertedWith("ERC721A: quantity to mint too high")

  });

  it("Should fail if seedwhitelist parameters aree not same length", async function () {

    let amount = maxPerAddressDuringMint + 1
    await ppc.startWhitelistSale()
    await expect(
      ppc.seedWhitelist([addr1.address], [amount, amount])
    ).to.be.revertedWith("addresses does not match nftsCanMint length")

  });


  it("Should be able to stop whitelist mint", async function () {

    let amount = maxPerAddressDuringMint
    await ppc.seedWhitelist([addr1.address], [amount])
    await ppc.startWhitelistSale()
    await ppc.connect(addr1).mint(amount, { value: whitelistPrice.mul(amount) })
    expect(await ppc.numberMinted(addr1.address)).to.equal(amount)
    expect(await ppc.ownerOf(0)).to.equal(addr1.address)
    expect(await ppc.ownerOf(amount - 1)).to.equal(addr1.address)

    await ppc.stopSales()

    await ppc.seedWhitelist([addr1.address], [amount])
    await expect(
      ppc.connect(addr1).mint(amount, { value: whitelistPrice.mul(amount) })
    ).to.be.revertedWith("Minting is not available")

  });

  
  it("Should public mint", async function () {

    let amount = maxPerAddressDuringMint
    await ppc.startPublicSale()
    await ppc.connect(addr1).mint(amount, { value: publicPrice.mul(amount) })
    expect(await ppc.numberMinted(addr1.address)).to.equal(amount)
    expect(await ppc.ownerOf(0)).to.equal(addr1.address)
    expect(await ppc.ownerOf(amount - 1)).to.equal(addr1.address)

  });

  it("Should fail if wrong amount of eth sent during public mint", async function () {

    let amount = maxPerAddressDuringMint
    await ppc.startPublicSale()
    await expect(
      ppc.connect(addr1).mint(amount, { value: 0 })
    ).to.be.revertedWith("Need to send more ETH")

  });

  it("Should succeed if too much eth sent during public mint", async function () {

    let amount = maxPerAddressDuringMint
    await ppc.startPublicSale()
    await ppc.connect(addr1).mint(amount, { value: publicPrice.mul(amount).add("1") })
    expect(await ppc.numberMinted(addr1.address)).to.equal(amount)
    expect(await ppc.ownerOf(0)).to.equal(addr1.address)
    expect(await ppc.ownerOf(amount - 1)).to.equal(addr1.address)

  });

  it("Should fail if public price is 0", async function () {

    let amount = maxPerAddressDuringMint
    await ppc.setPublicPrice(0)
    await ppc.startPublicSale()
    await expect(
      ppc.connect(addr1).mint(amount, { value: publicPrice.mul(amount) })
    ).to.be.revertedWith("public sale has not begun yet")
    
  });

  it("Should not allow to mint more than max in public mint", async function () {

    let amount = maxPerAddressDuringMint + 1
    await ppc.startPublicSale()
    await expect(
      ppc.connect(addr1).mint(amount, { value: publicPrice.mul(amount) })
    ).to.be.revertedWith("can not mint this many")

  });

  it("Should allow anyone to public mint", async function () {

    let amount = maxPerAddressDuringMint
    await ppc.startPublicSale()
    await ppc.connect(addr2).mint(amount, { value: publicPrice.mul(amount) })
    expect(await ppc.numberMinted(addr2.address)).to.equal(amount)
    expect(await ppc.ownerOf(0)).to.equal(addr2.address)
    expect(await ppc.ownerOf(amount - 1)).to.equal(addr2.address)

  });


  it("Should be able to stop public mint", async function () {

    let amount = maxPerAddressDuringMint
    await ppc.startPublicSale()
    await ppc.stopSales()
    await expect(
      ppc.connect(addr2).mint(amount, { value: publicPrice.mul(amount) })
      ).to.be.revertedWith("Minting is not available")

  });

  it("Should get ownership data", async function () {

    let amount = maxPerAddressDuringMint
    await ppc.seedWhitelist([addr1.address], [amount])
    await ppc.startWhitelistSale()
    await ppc.connect(addr1).mint(amount, { value: whitelistPrice.mul(amount) })
    expect(await ppc.numberMinted(addr1.address)).to.equal(amount)
    expect(await ppc.ownerOf(0)).to.equal(addr1.address)
    expect(await ppc.ownerOf(amount - 1)).to.equal(addr1.address)

    let data = await ppc.getOwnershipData(0)
    expect(data.addr).to.equal(addr1.address)    

  });

  // it("Should allow ether to be withdrawn", async function () {

    // let amount = maxPerAddressDuringMint
    // await ppc.startPublicSale()
    // await ppc.connect(addr2).mint(amount, { value: publicPrice.mul(amount) })
    // expect(await ppc.numberMinted(addr2.address)).to.equal(amount)
    // expect(await ppc.ownerOf(0)).to.equal(addr2.address)
    // expect(await ppc.ownerOf(amount - 1)).to.equal(addr2.address)

    // const balanceETH = await owner.getBalance(owner.address);
    // console.log(balanceETH)
    // await ppc.withdrawMoney()

    // console.log(publicPrice.mul(amount))
    // let balance = await owner.getBalance(ppc.address)
    // expect(await owner.getBalance(ppc.address)).to.equal(publicPrice.mul(amount))

  // });


});

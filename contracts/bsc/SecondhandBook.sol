// SPDX-License-Identifier: MIT
pragma solidity ^0.8.7;

import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

contract SecondhandBook is ReentrancyGuard {
  using Counters for Counters.Counter;
  Counters.Counter private _counter;

  address private owner;
  uint private totalPayments;

  struct User {
    address walletAddress;
    string name;
    string lastname;
    uint borrowedBookId;
    uint balance;
    uint debt;
    uint start;

  }

  struct Book {
    uint id;
    string name;
    string imgUrl;
    Status status;
    uint borrowFee;
    uint saleFee;

  }

  enum Status {
    Retired,
    InUse,
    Available
  }

  event BookAdded(uint indexed id, string name, string imgUrl, uint borrowFee, uint saleFee);
  event BookMetadataEdited(uint indexed id, string name, string imgUrl, uint borrowFee, uint saleFee); 
  event BookStatusEdited(uint indexed id, Status status);
  event UserAdded(address indexed walletAddress, string name, string lastname);
  event Deposit (address indexed walletAddress, uint amount);
  event Checkout (address indexed walletAddress, uint indexed bookId);
  event CheckIn (address indexed walletAddress, uint indexed bookId); //
  event PaymentMade (address indexed walletAddress, uint amount);
  event BalanceWithdraw (address indexed walletAddress, uint amount); //

  mapping (address => User) private users;
  mapping (uint => Book) private books;

  constructor() {
    owner = msg.sender;
    totalPayments = 0;
  }

  modifier onlyOwner() {
    require(msg.sender == owner, "Only the owner can call this funtion"); 
    _;
  }

  function setOwner (address _newOwner) external onlyOwner {
    owner = _newOwner;
  }

  function addUser (string calldata name, string calldata lastname ) external { //
    require(!isUser(msg.sender) , "User already exists");
    users[msg.sender] = User(msg.sender, name, lastname, 0, 0, 0, 0);
    emit UserAdded(msg.sender, users[msg.sender].name, users[msg.sender].lastname); //
  }

  function addBook (string calldata name, string calldata url, uint borrow, uint sale) external onlyOwner {
    _counter.increment();
    uint counter = _counter.current();
    books[counter] = Book(counter, name, url, Status.Available, borrow, sale);

    emit BookAdded(counter, books[counter].name, books[counter].imgUrl, books[counter].borrowFee, books[counter].saleFee); //
  }

  function editBookMetadata (uint id , string calldata name, string calldata imgUrl, uint borrowFee, uint saleFee) external onlyOwner {
    require(books[id].id != 0, "Book with given ID does not exist");
    Book storage book = books[id];
    if(bytes(name).length != 0) {
      book.name = name;
    }
    if(bytes(imgUrl).length != 0) {
      book.imgUrl = imgUrl;
    }
    if(borrowFee != 0) {
      book.borrowFee = borrowFee;
    }
    if(saleFee != 0) {
      book.saleFee = saleFee;
    }

    emit BookMetadataEdited(id, book.name, book.imgUrl, book.borrowFee, book.saleFee);
  }

  function editBookStatus(uint id , Status status ) external onlyOwner {
    require(books[id].id != 0, "Book with given id does not exist");
    books[id].status = status;
    emit BookStatusEdited(id, status);
  }

  function checkOut(uint id) external {
    require(isUser(msg.sender), "User does not exist!");
    require(books[id].status == Status.Available, "Book is not available for use");
    require(users[msg.sender].borrowedBookId == 0, "User has already borrowed a book");
    require(users[msg.sender].debt == 0, "User has an outstanding debt!");

    users[msg.sender].start = block.timestamp;
    users[msg.sender].borrowedBookId = id;
    books[id].status = Status.InUse;

    emit Checkout(msg.sender, id);
  }

  function checkIn() external {
    require(isUser(msg.sender), "User does not exist");
    uint borrowedBookId = users[msg.sender].borrowedBookId;
    require(borrowedBookId != 0, "User has not borrowed a book");

    uint usedSeconds = block.timestamp - users[msg.sender].start; // 
    uint borrowFee = books[borrowedBookId].borrowFee;
    users[msg.sender].debt += calculateDebt(usedSeconds, borrowFee);
    users[msg.sender].borrowedBookId = 0;
    users[msg.sender].start = 0;
    books[borrowedBookId].status = Status.Available;

    emit CheckIn(msg.sender, borrowedBookId); //
  }

  function deposit () external payable {
    require(isUser(msg.sender), "User does not exist");
    users[msg.sender].balance += msg.value;
    emit Deposit(msg.sender, msg.value);
  }

  function makePayment () external { //
    require(isUser(msg.sender), "User does not exist");
    uint debt = users[msg.sender].debt;
    uint balance = users[msg.sender].balance;
    require (debt > 0, "User has no debt to pay");
    require (balance >= debt, "User has insufficient balance");

    unchecked {
      users[msg.sender].balance -= debt; // 
    }

    totalPayments += debt; // 
    users[msg.sender].debt = 0;

    emit PaymentMade(msg.sender, debt);
  }

  function withdrawBalance (uint amount) external nonReentrant {
    require(isUser(msg.sender), "User does not exist");
    uint balance = users[msg.sender].balance;
    require(balance >= amount, "Insufficient balance to withdraw");

    unchecked {
      users[msg.sender].balance -= amount;
    }

    (bool success, ) = msg.sender.call{value: amount}("");
    require(success, "Transfer failed.");

    emit BalanceWithdraw(msg.sender, amount); //
  }

  function withdrawOwnerBalance (uint amount) external onlyOwner { // change
    require(totalPayments >= amount, "Insufficient contract balance to withdraw");
    (bool success, ) = owner.call{value: amount}(""); // change
    require(success, "Transfer failed!");
    
    unchecked {
      totalPayments -= amount;
    }
  
  }

  function getOwner () external view returns (address) {
    return owner;
  }

  function isUser(address walletAddress) private view returns (bool) {
    return users[walletAddress].walletAddress != address(0);
  }

  function getUser(address walletAddress) external view returns (User memory) {
    require(isUser(walletAddress), "User does not exist");
    return users[walletAddress];
  }

  function getBook(uint id) external view returns (Book memory) {
    require(books[id].id != 0, "Book does not exist");
    return books[id];
  }

  function getBookByStatus(Status _status) external view returns(Book[] memory) {
    uint count = 0;
    uint lenght = _counter.current();
    for(uint i = 1; i <= lenght; i++) {
      if(books[i].status == _status) {
        count++;
      }
    }

    Book[] memory booksWithStatus = new Book[](count); // change
    count = 0;
    for(uint i = 1; i <= lenght; i++) {
      if(books[i].status == _status) {
        booksWithStatus[count] = books[i]; // change
        count++;
      }
    }
    return booksWithStatus; // change
  }

  function calculateDebt(uint usedSecond, uint borrowFee) private pure returns (uint) {
    uint usedMinutes = usedSecond / 60;
    return usedMinutes * borrowFee;
  }

  function getCurrentCount() external view returns (uint) {
    return _counter.current();
  }

  function getContractBalance() external view onlyOwner returns (uint) { // change
    return address(this).balance;
  }

  function getTotalPayments() external view onlyOwner returns(uint) {
    return totalPayments;
  }
}

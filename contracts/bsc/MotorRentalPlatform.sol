// SPDX-License-Identifier: MIT
pragma solidity >=0.4.25 <0.9.0;

import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

contract MotorRentalPlatform is ReentrancyGuard {

    using Counters for Counters.Counter;
    Counters.Counter private _counter;
    
    address private owner;
    
    uint256 private totalPayments;
    
    struct User {
        address walletAddress;
        string name;
        string lastname;
        uint256 balance;
        uint256 rentedMotorId;
        uint256 debt;
        uint256 start;
    }
    
    struct Motor {
        uint256 id;
        string name;
        string imgUrl;
        Status status;
        uint256 rentFee;
        uint256 saleFee;
    }

    enum Status {
        Retired,
        Available,
        InUse
    }
    
    event MotorAdded(
        uint256 indexed id,
        string name,
        string imgUrl,
        uint256 rentFee,
        uint256 saleFee
    );
    event MotorMetadataEdited(
        uint256 indexed id,
        string name,
        string imgUrl,
        uint256 rentFee,
        uint256 saleFee
    );
    event MotorStatusEdited(uint256 indexed id, Status status);
    event UserAdded(address indexed walletAddress, string name, string lastname);
    event Deposit(address indexed walletAddress, uint256 amount);
    event CheckOut(address indexed walletAddress, uint256 indexed motorId);
    event CheckIn(address indexed walletAddress, uint256 indexed motorId);
    event PaymentMade(address indexed walletAddress, uint256 amount);
    event BalanceWithdrawn(address indexed walletAddress, uint256 amount);
    
    mapping(address => User) private users;
    
    mapping(uint256 => Motor) private motors;

    
    constructor() {
        owner = msg.sender;
        totalPayments = 0;
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can call this function");
        _;
    }

    function setOwner(address _newOwner) external onlyOwner {
        owner = _newOwner;
    }

    function addUser(string calldata name, string calldata lastname) external {
        require(!isUser(msg.sender), "User already exists");
        users[msg.sender] = User(msg.sender, name, lastname, 0, 0, 0, 0);

        emit UserAdded(
            msg.sender,
            users[msg.sender].name,
            users[msg.sender].lastname
        );
    }

    function addMotor(
        string calldata name,
        string calldata url,
        uint256 rent,
        uint256 sale
    ) external onlyOwner {
        _counter.increment();
        uint256 counter = _counter.current();
        motors[counter] = Motor(counter, name, url, Status.Available, rent, sale);

        emit MotorAdded(
            counter,
            motors[counter].name,
            motors[counter].imgUrl,
            motors[counter].rentFee,
            motors[counter].saleFee
        );
    }

    function editMotorMetadata(
        uint256 id,
        string calldata name,
        string calldata imgUrl,
        uint256 rentFee,
        uint256 saleFee
    ) external onlyOwner {
        require(motors[id].id != 0, "Motor with given id does not exist");
        Motor storage motor = motors[id];
        if (bytes(name).length != 0) {
            motor.name = name;
        }
        if (bytes(imgUrl).length != 0) {
            motor.imgUrl = imgUrl;
        }
        if (rentFee > 0) {
            motor.rentFee = rentFee;
        }
        if (saleFee > 0) {
            motor.saleFee = saleFee;
        }

        emit MotorMetadataEdited(
            id,
            motor.name,
            motor.imgUrl,
            motor.rentFee,
            motor.saleFee
        );
    }

    function editMotorstatus(uint256 id, Status status) external onlyOwner {
        require(motors[id].id != 0, "Motor with given id does not exist");
        motors[id].status = status;

        emit MotorStatusEdited(id, status);
    }

    function checkOut(uint256 id) external {
        require(isUser(msg.sender), "User does not exist");
        require(
            motors[id].status == Status.Available,
            "Motor is not available for use"
        );
        require(
            users[msg.sender].rentedMotorId == 0,
            "User has already rented a motor"
        );
        require(users[msg.sender].debt == 0, "User has debt to pay");

        users[msg.sender].start = block.timestamp;
        users[msg.sender].rentedMotorId = id;
        motors[id].status = Status.InUse;

        emit CheckOut(msg.sender, id);
    }

    function checkIn() external {
        require(isUser(msg.sender), "User does not exist");
        uint256 rentedMotorId = users[msg.sender].rentedMotorId;
        require(rentedMotorId != 0, "User has not rented a motor");

        uint256 usedSeconds = block.timestamp - users[msg.sender].start;
        uint256 rentFee = motors[rentedMotorId].rentFee;
        users[msg.sender].debt += calculateDebt(usedSeconds, rentFee);

        users[msg.sender].rentedMotorId = 0;
        users[msg.sender].start = 0;
        motors[rentedMotorId].status = Status.Available;

        emit CheckIn(msg.sender, rentedMotorId);
    }

    function deposit() external payable {
        require(isUser(msg.sender), "User does not exist");
        users[msg.sender].balance += msg.value;

        emit Deposit(msg.sender, msg.value);
    }

    function makePayment() external {
        require(isUser(msg.sender), "User does not exist");
        uint256 debt = users[msg.sender].debt;
        uint256 balance = users[msg.sender].balance;

        require(debt > 0, "User has no debt to pay");
        require(balance >= debt, "User has insufficient balance");

        unchecked {
            users[msg.sender].balance -= debt;
        }
        totalPayments += debt;
        users[msg.sender].debt = 0;

        emit PaymentMade(msg.sender, debt);
    }

    function withdrawBalance(uint256 amount) external nonReentrant {
        require(isUser(msg.sender), "User does not exist");
        uint256 balance = users[msg.sender].balance;

        require(balance >= amount, "User has insufficient balance");

        unchecked {
            users[msg.sender].balance -= amount;
        }
        (bool success, ) = msg.sender.call{value: amount}("");
        require(success, "Transfer failed");

        emit BalanceWithdrawn(msg.sender, amount);
    }

    function withdrawOwnerBalance(uint256 amount) external onlyOwner {
        require(
            totalPayments >= amount,
            "Insufficient contract balance to withdraw"
        );

        (bool success, ) = owner.call{value: amount}("");
        require(success, "Transfer failed");

        unchecked {
            totalPayments -= amount;
        }

        emit BalanceWithdrawn(msg.sender, amount);
    }

    function getOwner() external view returns (address) {
        return owner;
    }

    function isUser(address walletAddress) private view returns (bool) {
        return users[walletAddress].walletAddress != address(0);
    }

    function getUser(
        address walletAddress
    ) external view returns (User memory) {
        require(isUser(walletAddress), "User does not exist");
        return users[walletAddress];
    }

    function getMotor(uint256 id) external view returns (Motor memory) {
        require(motors[id].id != 0, "Motor with given id does not exist");
        return motors[id];
    }

    function getMotorByStatus(
        Status _status
    ) external view returns (Motor[] memory) {
        uint256 count = 0;
        uint256 counter = _counter.current();
        for (uint256 i = 1; i <= counter; i++) {
            if (motors[i].status == _status) {
                count++;
            }
        }
        Motor[] memory result = new Motor[](count);
        uint256 index = 0;
        for (uint256 i = 1; i <= counter; i++) {
            if (motors[i].status == _status) {
                result[index] = motors[i];
                index++;
            }
        }
        return result;
    }

    function calculateDebt(
        uint256 usedSeconds,
        uint256 rentFee
    ) private pure returns (uint256) {
        return (usedSeconds / 60) * rentFee;
    }

    function getCurrentCount() external view returns (uint256) {
        return _counter.current();
    }

    function getContractBalance() external view onlyOwner returns (uint256) {
        return address(this).balance;
    }

    function getTotalPayments() external view onlyOwner returns (uint256) {
        return totalPayments;
    }
}
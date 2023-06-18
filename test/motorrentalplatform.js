const MotorRentalPlatform = artifacts.require("MotorRentalPlatform.sol");

contract("MotorRentalPlatform", (accounts) => {
    let motorRentalPlatform;
    const owner = accounts[0];
    const user1 = accounts[1];

    beforeEach(async () => {
        motorRentalPlatform = await MotorRentalPlatform.new();
    });

    describe("Add user and motor", () => {
        it("adds a new user", async () => {
            await motorRentalPlatform.addUser("David", "Jhonson", { from: user1 });
            const user = await motorRentalPlatform.getUser(user1);
            assert.equal(user.name, "David", "Problem with user name");
            assert.equal(user.lastname, "Jhonson", "Problem with user lastname");
        });

        it("adds a motor", async () => {
            await motorRentalPlatform.addMotor("Yamaha R25", "example url", 10, 50000, { from: owner });
            const motor = await motorRentalPlatform.getMotor(1);
            assert.equal(motor.name, "Yamaha R25", "Problem with motor name");
            assert.equal(motor.imgUrl, "example url", "Problem with motor image url");
            assert.equal(motor.rentFee, 10, "Problem with motor rent fee");
            assert.equal(motor.saleFee, 50000, "Problem with motor sale fee");
        });
    })

    describe("Check out and check in motor", () => {
        it("checks out a motor", async () => {
            await motorRentalPlatform.addUser("David", "Jhonson", { from: user1 });
            await motorRentalPlatform.addMotor("Yamaha R25", "example url", 10, 50000, { from: owner });
            await motorRentalPlatform.checkOut(1, { from: user1 });

            const user = await motorRentalPlatform.getUser(user1);
            assert.equal(user.rentedMotorId, 1, "User could not check out the motor");
        });

        it("checks in a motor", async () => {
            await motorRentalPlatform.addUser("David", "Jhonson", { from: user1 });
            await motorRentalPlatform.addMotor("Yamaha R25", "example url", 10, 50000, { from: owner });
            await motorRentalPlatform.checkOut(1, { from: user1 });
            await new Promise(resolve => setTimeout(resolve, 10000));

            await motorRentalPlatform.checkIn({ from: user1 });

            const user = await motorRentalPlatform.getUser(user1);

            assert.equal(user.rentedMotorId, 0, "User could not check in the motor");

            const motor = await motorRentalPlatform.getMotor(1);

            assert.equal(motor.status, 1, "Motor status was not updated to 'Available'");
        });
    });

    describe("Deposit token and make payment", () => {
        it("deposits token", async () => {
            await motorRentalPlatform.addUser("David", "Jhonson", { from: user1 });
            await motorRentalPlatform.deposit({ from: user1, value: 100 });
            const user = await motorRentalPlatform.getUser(user1);
            assert.equal(user.balance, 100, "User could not deposit token");
        });

        it("makes payment", async () => {
            await motorRentalPlatform.addUser("David", "Jhonson", { from: user1 });
            await motorRentalPlatform.addMotor("Yamaha R25", "example url", 10, 50000, { from: owner });
            await motorRentalPlatform.checkOut(1, { from: user1 });
            await new Promise(resolve => setTimeout(resolve, 10000));
            await motorRentalPlatform.checkIn({ from: user1 });
        
            await motorRentalPlatform.deposit({ from: user1, value: 100 });
            const userBeforePayment = await motorRentalPlatform.getUser(user1);
        
            assert.equal(userBeforePayment.debt, 0, "User should have no debt");
        
            if (userBeforePayment.debt > 0) {
                await motorRentalPlatform.makePayment({ from: user1 });
            } else {
                // Handle the case when the user has no debt
                // For example, you can add an assertion here
                assert.equal(userBeforePayment.debt, 0, "User has no debt to pay");
            }
        
            const userAfterPayment = await motorRentalPlatform.getUser(user1);
        
            assert.equal(userAfterPayment.debt, 0, "Something went wrong with making the payment");
        });
    });

    describe("Edit motor", () => {
        it("should edit an existing motor's metadata with valid parameters", async () => {
            await motorRentalPlatform.addMotor("Yamaha R25", "example url", 10, 50000, { from: owner });

            const newName = "Honda";
            const newImgUrl = "new example url";
            const newRentFee = 20;
            const newSaleFee = 100000;
            await motorRentalPlatform.editMotorMetadata(1, newName, newImgUrl, newRentFee, newSaleFee, { from: owner });

            const motor = await motorRentalPlatform.getMotor(1);
            assert.equal(motor.name, newName, "Problem editing motor name");
            assert.equal(motor.imgUrl, newImgUrl, "Problem updating the motor image url");
            assert.equal(motor.rentFee, newRentFee, "Problem editing motor rent fee");
            assert.equal(motor.saleFee, newSaleFee, "Problem with editing motor sale fee");
        });

        it("should edit an existing motor's status", async () => {
            await motorRentalPlatform.addMotor("Yamaha R25", "example url", 10, 50000, { from: owner });
            const newStatus = 0;
            await motorRentalPlatform.editMotorStatus(1, newStatus, { from: owner });
            const motor = await motorRentalPlatform.getMotor(1);
            assert.equal(motor.status, newStatus, "Problem editing motor status");
        });
    });

    describe("Withdraw balance", () => {
        it("should send the desired amount of tokens to the user", async () => {
          await motorRentalPlatform.addUser("David", "Jhonson", { from: user1 });
          await motorRentalPlatform.deposit({ from: user1, value: 100 });
          await motorRentalPlatform.withdrawBalance(50, { from: user1 });
      
          const user = await motorRentalPlatform.getUser(user1);
          assert.equal(user.balance, 50, "User could not withdraw tokens");
        });
      
        it("should send the desired amount of tokens to the owner", async () => {
            await motorRentalPlatform.addUser("David", "Jhonson", { from: user1 });
            await motorRentalPlatform.addMotor("Yamaha R25", "example url", 10, 50000, { from: owner });
            await motorRentalPlatform.checkOut(1, { from: user1 });
            await new Promise(resolve => setTimeout(resolve, 10000));
            await motorRentalPlatform.checkIn({ from: user1 });
            await motorRentalPlatform.deposit({ from: user1, value: 1000 });
    
            const userBeforePayment = await motorRentalPlatform.getUser(user1);
            assert.equal(userBeforePayment.debt, 0, "User should have no debt");
    
            // Make a payment to accumulate a balance
            await motorRentalPlatform.makePayment({ from: user1 });
    
            const totalPaymentAmount = await motorRentalPlatform.getTotalPayments({ from: owner });
            const amountToWithdraw = totalPaymentAmount;
    
            if (amountToWithdraw > 0) {
                await motorRentalPlatform.withdrawOwnerBalance(amountToWithdraw, { from: owner });
            } else {
                assert.fail("No tokens available for withdrawal by the owner");
            }
    
            const totalPayment = await motorRentalPlatform.getTotalPayments({ from: owner });
            assert.equal(totalPayment, 0, "Owner could not withdraw tokens");
        });
    });
});
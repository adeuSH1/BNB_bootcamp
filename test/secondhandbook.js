const SecondhandBook = artifacts.require("SecondhandBook");

contract("SecondhandBook", (accounts) => {
  let secondhandBook;
  const owner = accounts[0]; // 
  const user1 = accounts[1]; //

  beforeEach(async () => {
    secondhandBook = await SecondhandBook.new();
  });

  describe("Add user and book", () => {
    it("adds a new user", async () => {
      await secondhandBook.addUser("David", "Jhonson", { from: user1 });
      const user = await secondhandBook.getUser(user1);
      assert.equal(user.name, "David", "Problem with user name");
      assert.equal(user.lastname, "Jhonson", "Problem with user lastname");
    });

    it("adds a book", async () => {
      await secondhandBook.addBook("book 1", "example url", 10, 50, {
        from: owner,
      }); // 
      const book = await secondhandBook.getBook(1);
      assert.equal(book.name, "book 1", "Problem with book name");
      assert.equal(book.imgUrl, "example url", "Problem with img url"); //
      assert.equal(book.borrowFee, 10, "Problem with borrow fee");
      assert.equal(book.saleFee, 50, "Problem with sale fee"); // 
    });
  });

  describe("Check out and Check in book", () => {
    it("check out a book", async () => {
      await secondhandBook.addUser("David", "Jhonson", { from: user1 });
      await secondhandBook.addBook("book 1", "exampleurl", 10, 50, {
        from: owner,
      });
      await secondhandBook.checkOut(1, { from: user1 });

      const user = await secondhandBook.getUser(user1);
      assert.equal(user.borrowedBookId, 1, "User could not check out the book"); // 
    });

    it("checks in a book", async () => {
      await secondhandBook.addUser("David", "Jhonson", { from: user1 });
      await secondhandBook.addBook("book 1", "example url", 10, 50, {
        from: owner,
      });
      await secondhandBook.checkOut(1, { from: user1 });
      await new Promise((resolve) => setTimeout(resolve, 60000)); //

      await secondhandBook.checkIn({ from: user1 });

      const user = await secondhandBook.getUser(user1); // 
      assert.equal(user.borrowedBookId, 0, "User could not checkin the book");
      assert.equal(user.debt, 10, "User debt did not get created");
    });
  });

  describe("Deposit token and make payment", () => {  // tamamı farklı
    it("deposit token", async () => { // change
      await secondhandBook.addUser("David", "Jhonson", { from: user1 });
      await secondhandBook.deposit({ from: user1, value: 100 });

      const user = await secondhandBook.getUser(user1);
      assert.equal(user.balance, 100, "User could not deposit tokens");
    });

    it("make payment", async () => {
      await secondhandBook.addUser("David", "Jhonson", { from: user1 });
      await secondhandBook.addBook("book 1", "exampleurl", 10, 50, {
        from: owner,
      });
      await secondhandBook.checkOut(1, { from: user1 });
      await new Promise((resolve) => setTimeout(resolve, 60000));
      await secondhandBook.checkIn({ from: user1 });

      await secondhandBook.deposit({ from: user1, value: 100 });
      await secondhandBook.makePayment({ from: user1 });

      const user = await secondhandBook.getUser(user1);
      assert.equal(user.debt, 0, "Something went wrong while trying to make the payment"); // change
    });
  });

  describe("edit book", () => {
    it("should edit an existing book's metadata with valid parameters", async () => { // change
      await secondhandBook.addBook("book 1", "exampleurl", 10, 50, {
        from: owner,
      });

      const newName = "book 2";
      const newImgUrl = "newimgurl2";
      const newborrowFee = 20;
      const newSaleFee = 100;
      await secondhandBook.editBookMetadata(
        1,
        newName,
        newImgUrl,
        newborrowFee,
        newSaleFee,
        { from: owner }
      );

      const book = await secondhandBook.getBook(1);
      assert.equal(book.name, newName, "Problem editing book name");
      assert.equal(book.imgUrl, newImgUrl, "Problem updating the imgurl");
      assert.equal(book.borrowFee, newborrowFee, "Problem editing borrow fee");
      assert.equal(book.saleFee, newSaleFee, "Problem editing sale fee");
    });

    it("should edit an existing book's status", async () => {
      await secondhandBook.addBook("book 1", "exampleurl", 10, 50, {
        from: owner,
      });
      const newStatus = 0;
      await secondhandBook.editBookStatus(1, newStatus, { from: owner });
      const book = await secondhandBook.getBook(1);
      assert.equal(book.status, newStatus, "Problem with editing book status");
    });
  });

  describe("withdraw balance", async () => {
    it("should send the desired amount of tokens to the user", async () => {
      await secondhandBook.addUser("David", "Jhonson", { from: user1 });
      await secondhandBook.deposit({ from: user1, value: 100 });
      await secondhandBook.withdrawBalance(50, { from: user1 });

      const user = await secondhandBook.getUser(user1);
      assert.equal(user.balance, 50, "User could not get his/her tokens");
    });

    it("should send the desired amount of tokens to the owner", async () => {
      await secondhandBook.addUser("David", "Jhonson", { from: user1 });
      await secondhandBook.addBook("book 1", "exampleurl", 10, 50, { from: owner });
      await secondhandBook.checkOut(1, { from: user1 });
      await new Promise((resolve) => setTimeout(resolve, 60000));
      await secondhandBook.checkIn({ from: user1 });
      await secondhandBook.deposit({ from: user1, value: 100 });
      await secondhandBook.makePayment({ from: user1 });

      const totalPaymentAmount = await secondhandBook.getTotalPayments({
        from: owner,
      });
      const amountToWithdraw = totalPaymentAmount - 10;
      await secondhandBook.withdrawOwnerBalance(amountToWithdraw, { from: owner });
      const totalPayment = await secondhandBook.getTotalPayments({ from: owner });
      assert.equal(totalPayment, 10, "Owner could not withdraw tokens");
    });
  });
});

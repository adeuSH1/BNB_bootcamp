import { useState, useEffect } from "react";
import MotorCard from "./components/MotorCard";
import Header from "./components/Header";
import Information from "./components/Information";
import Footer from "./components/Footer";
import AdminDashboard from "./components/AdminDashboard";
import Web3 from "web3";
const web3 = new Web3();
import {
  getUserAddress,
  register,
  getMotorByStatus,
  getMotor,
  getOwner,
  login,
} from "./Web3Client";
function App() {
  const [address, setAddress] = useState("");
  const [loggedIn, setLoggedIn] = useState(false);
  const [userName, setUserName] = useState("");
  const [motor, setMotor] = useState([]);
  const [name, setName] = useState({});
  const [lastName, setLastName] = useState({});
  const [isAdmin, setIsAdmin] = useState(false);
  const [userCredit, setUserCredit] = useState("0");
  const [due, setDue] = useState(0);
  const [isAvailable, setIsAvailable] = useState("You can rent a motor");
  const [rideMins, setRideMins] = useState("0");

  const emptyAddress = "0x0000000000000000000000000000000000000000";

  useEffect(() => {
    let handleInit = async () => {
      let isAUser = await login();
      if (isAUser?.address !== emptyAddress) {
        if (isAUser?.name) {
          setLoggedIn(true);
          setUserCredit(web3.utils.fromWei(isAUser[4], "ether"));
        }
        setUserName(isAUser?.name);
        setLastName(isAUser[2]);
        setAddress(isAUser?.walletAddress);
        let userDue = Web3.utils.fromWei(isAUser.debt, "ether");
        setDue(Number(userDue));

        let address = await getUserAddress();
        let owner = await getOwner();
        if (address === owner.toLowerCase()) {
          setIsAdmin(true);
        }
        // get motors
        let motorArray = [];
        let motorByStatus = await getMotorByStatus(2); // 2 means available
        motorArray.push(...motorByStatus);
        if (isAUser.rentedMotorId !== "0") {
          let rentedMotor = await getMotor(Number(isAUser.rentedMotorId));
          motorArray.push(rentedMotor);
        }
        setMotor(motorArray);

        if (isAUser.rentedMotorId !== "0") {
          let rentedMotor = await getMotor(Number(isAUser.rentedMotorId));
          setIsAvailable(`Rented: ${rentedMotor.name} - Id :${rentedMotor.id}`);
        }

        let rideMins = "0";
        if (isAUser.rentedMotorId !== "0") {
          rideMins = Math.floor(
            Math.floor(Date.now() / 1000 - isAUser.start) / 60
          ).toString();
        }
        setRideMins(rideMins);
      }
    };
    handleInit();
  }, []);
  const handleNameChange = async (e) => {
    setName(e.target.value);
  };

  const handleLastNameChange = async (e) => {
    setLastName(e.target.value);
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    try {
      let res = await register(name, lastName);
      if (res) {
        setLoggedIn(true);
        window.location.reload();
      }
    } catch (error) {
      console.log(error);
    }
  };
  useEffect(() => {
    if (due !== 0) {
      setIsAvailable("You have to pay your debt");
    }
  }, [due]);

  return (
    <>
      <Header name={userName} lastName={lastName} address={address} />
      <div className="bg-gradient-to-r  from-slate-700 via-pink-900 to-black h-screen flex justify-center ">
        {loggedIn ? (
          <div className="flex flex-col items-center justify-center">
            <Information
              userCredit={userCredit}
              due={due}
              rideMins={rideMins}
              isAvailable={isAvailable}
            />
            <div className=" mt-[10rem] flex justify-center mb-20 items-center gap-16">
              {motor.length > 0 ? (
                motor.map((motor) => {
                  return (
                    <MotorCard
                      key={motor.id}
                      name={motor.name}
                      id={motor.id}
                      image={motor.imgUrl}
                      saleFee={motor.saleFee}
                      rentFee={motor.rentFee}
                      motorStatus={motor.status}
                      due={due}
                    />
                  );
                })
              ) : (
                <div className="text-white text-2xl">Motor Loading...</div>
              )}
            </div>
          </div>
        ) : (
          <form
            className=" w-[40rem] h-[17rem] mt-[12rem]  border rounded-md border-white flex flex-col p-6"
            onSubmit={handleRegister}
          >
            <div className="relative  block overflow-hidden rounded-sm border-b border-white  px-3 pt-3  focus-within:border-blue-600 focus-within:ring-1 focus-within:ring-blue-600">
              <input
                type="text"
                onChange={handleNameChange}
                placeholder="Name"
                className="peer h-8 w-full text-white  bg-transparent p-0 placeholder-transparent focus:border-transparent focus:outline-none focus:ring-0 sm:text-sm"
              />

              <span className="absolute start-3 top-3 text-white -translate-y-1/2 text-xs transition-all peer-placeholder-shown:top-1/2 peer-placeholder-shown:text-sm peer-focus:top-3 peer-focus:text-xs">
                Name
              </span>
            </div>
            <div className="relative  mt-6 block overflow-hidden rounded-sm border-b border-white px-3 pt-3  focus-within:border-blue-600 focus-within:ring-1 focus-within:ring-blue-600">
              <input
                type="text"
                onChange={handleLastNameChange}
                placeholder="Lastname"
                className="peer h-8 w-full roundend-md text-white bg-transparent p-0 placeholder-transparent focus:border-transparent focus:outline-none focus:ring-0 sm:text-sm"
              />

              <span className="absolute start-3 top-3 text-white -translate-y-1/2 text-xs transition-all peer-placeholder-shown:top-1/2 peer-placeholder-shown:text-sm peer-focus:top-3 peer-focus:text-xs">
                Lastname
              </span>
            </div>
            <button type="submit">
              <div className="mt-16 flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-base font-medium text-white bg-blue-600 hover:bg-blue-700">
                Register
              </div>
            </button>
          </form>
        )}
      </div>
      <Footer />
      {isAdmin && <AdminDashboard />}
    </>
  );
}

export default App;
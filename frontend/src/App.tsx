import { useEffect, useState } from "react";
import "./App.css";
import web3 from "./utils/web3";
import { rpsCoin } from "./utils/contracts";

function App() {
  const [userChoice, setUserChoice] = useState<string | null>(null);
  const [botChoice, setBotChoice] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const [bet, setBet] = useState<number>(0);
  
  const [account, setAccount] = useState<string>("");
  const [botAccount, setBotAccount] = useState<string>("");
  const [balance, setBalance] = useState<number>(0); // Initial balance
  const [botBalance, setBotBalance] = useState<number>(0); // Bot's balance

  const choices = ["rock", "paper", "scissors"];

  async function initializeAccounts() {
    if (!web3) {
      alert("Please install MetaMask");
      return;
    }

    const accounts = await window.ethereum?.request({ method: "eth_requestAccounts" }) as string[];
    if (!accounts || accounts.length === 0) {
      alert("No accounts found. Please connect your wallet.");
      return;
    }

    setAccount(accounts[0]);
    setBotAccount(accounts[1]);
  }

  function transferCoin(amount: number) {
    if (!web3) {
      alert("Please install MetaMask");
      return;
    }

    if (amount <= 0) {
      rpsCoin.methods
      .transfer(botAccount, Math.abs(amount))
      .send({ from: account }) // Ensure [from](http://_vscodecontentref_/6) matches the connected MetaMask account
      .on("transactionHash", (hash: string) => {
        console.log("Transaction Hash:", hash);
      })
      .on("receipt", (receipt: any) => {
        console.log("Transaction Receipt:", receipt);
        updateBalance();
      })
      .on("error", (error: any) => {
        console.error("Transaction Error:", error);
      });
    } else {
      // Transfer to the user
      rpsCoin.methods.transfer(account, amount).send({ from: botAccount });
    }
    updateBalance();
  }

  function updateBalance() {
    if (account) {
      rpsCoin.methods.getBalance(account).call<number>()
      .then((balance) => {
        if (balance) {
          setBalance(Number(balance));
        }
      });

      rpsCoin.methods.getBalance(botAccount).call<number>()
      .then((botBalance) => {
        if (botBalance) {
          setBotBalance(Number(botBalance));
        }
      });
    }
  }

  function playGame(choice: string) {
    if (bet <= 0 || bet > balance) {
      setResult("Invalid bet amount!");
      return;
    }

    if (bet > botBalance) {
      setResult("Bet exceeds bot's balance!");
      return;
    }

    const botRandomChoice = choices[Math.floor(Math.random() * choices.length)];
    setUserChoice(choice);
    setBotChoice(botRandomChoice);

    // Determine the winner
    if (choice === botRandomChoice) {
      setResult("It's a draw!");
    } else if (
      (choice === "rock" && botRandomChoice === "scissors") ||
      (choice === "paper" && botRandomChoice === "rock") ||
      (choice === "scissors" && botRandomChoice === "paper")
    ) {
      setResult("You win!");
      transferCoin(bet);
      // setBalance(balance + bet); // Add bet to user's balance
      // setBotBalance(botBalance - bet); // Deduct bet from bot's balance
    } else {
      setResult("You lose!");
      transferCoin(-bet);
      // setBalance(balance - bet); // Deduct bet from user's balance
      // setBotBalance(botBalance + bet); // Add bet to bot's balance
    }
  };

  function resetGame() {
    setUserChoice(null);
    setBotChoice(null);
    setResult(null);
    setBet(0);
  };


  useEffect(() => {
    initializeAccounts()
  }, []);

  useEffect(() => {
    if (account) {
      rpsCoin.methods.getBalance(account).call<number>()
      .then((balance) => {
        if (balance) {
          setBalance(Number(balance));
        }
      });
    }
  }, [account]);
  
  useEffect(() => {
    if (botAccount) {
      rpsCoin.methods.getBalance(botAccount).call<number>()
      .then((botBalance) => {
        if (botBalance) {
          setBotBalance(Number(botBalance));
        }
      })
    }
  }, [botAccount]);

  if (balance <= 0) {
    return (
      <div className="App">
        <h1>Rock Paper Scissors</h1>
        <p>You are out of money. Game over!</p>
        <button onClick={resetGame}>Restart Game</button>
      </div>
    );
  }

  if (botBalance <= 0) {
    return (
      <div className="App">
        <h1>Rock Paper Scissors</h1>
        <p>The bot is out of money. You win the game!</p>
        <button onClick={resetGame}>Restart Game</button>
      </div>
    );
  }

  return (
    <div className="App">
      <h1>Rock Paper Scissors</h1>
      <p>Your Balance: ${balance}</p>
      <p>Bot's Balance: ${botBalance}</p>
      <div>
        <label>
          Bet Amount: $
          <input
            type="number"
            value={bet}
            onChange={(e) => setBet(Number(e.target.value))}
          />
        </label>
      </div>
      <div className="choices">
        {choices.map((choice) => (
          <button key={choice} onClick={() => playGame(choice)}>
            {choice}
          </button>
        ))}
      </div>
      {userChoice && botChoice && (
        <div className="results">
          <p>You chose: {userChoice}</p>
          <p>Bot chose: {botChoice}</p>
          <p>{result}</p>
        </div>
      )}
    </div>
  );
}

export default App;
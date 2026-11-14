import { useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { createInput } from "@draupnir/contracts/posts";
import "./App.css";

export default function App() {
  const [name, setName] = useState("Draupnir");
  const [message, setMessage] = useState("");

  async function greet() {
    const input = createInput.safeParse({ title: name.trim() });
    if (!input.success) {
      setMessage("Enter a name first.");
      return;
    }
    try {
      setMessage(await invoke<string>("greet", { name: input.data.title }));
    } catch {
      setMessage("The native bridge is available when running through Tauri.");
    }
  }

  return (
    <main className="container">
      <h1>Draupnir Desktop</h1>
      <p>A Tauri 2 shell with React and shared domain validation.</p>
      <label htmlFor="name">Name</label>
      <input
        id="name"
        value={name}
        onChange={(event) => setName(event.target.value)}
      />
      <button
        onClick={() => {
          void greet();
        }}
      >
        Call native Rust command
      </button>
      <p role="status">{message}</p>
    </main>
  );
}

import { useState } from "react";
import { createInput } from "@draupnir/contracts/posts";
import "./App.css";

export default function App() {
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  return (
    <main>
      <h1>Draupnir Extension</h1>
      <p>WXT + React, sharing validation with the other apps.</p>
      <label htmlFor="title">Example post title</label>
      <input
        id="title"
        value={title}
        onChange={(event) => setTitle(event.target.value)}
      />
      <button
        onClick={() => {
          const parsed = createInput.safeParse({ title: title.trim() });
          setMessage(
            parsed.success
              ? "Valid draft. Connect the API client next."
              : "Enter a title first.",
          );
        }}
      >
        Validate draft
      </button>
      <p role="status">{message}</p>
    </main>
  );
}

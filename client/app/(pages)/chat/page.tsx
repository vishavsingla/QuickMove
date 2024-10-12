"use client";

import { useState } from "react";
import { useSocket } from "@/context/SockerProvider";
import { Button } from "@/components/ui/button";

export default function Page() {
  const { sendMessage, messages } = useSocket();
  const [message, setMessage] = useState("");

  return (
    <div className="flex items-center justify-center h-screen">
      <div className="py-10">
        <div className="text-2xl font-extrabold mb-10"> Welcome to Messaging </div>
        <form className="space-y-4">
          <div className="flex flex-col">
            <input
              id="message"
              placeholder="Type your message..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <Button
            type="submit"
            className=""
            onClick={(e) => {
              e.preventDefault();
              sendMessage(message);
              setMessage("");
            }}
          >
            Send
          </Button>
        </form>
        <div className="mt-10">
          <ul className="space-y-2">
            {messages.map((msg, index) => (
              <li key={index} className="text-white p-2 rounded-md">
                {msg}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
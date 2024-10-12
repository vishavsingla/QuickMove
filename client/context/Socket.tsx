 "use client";
// SocketContext.tsx
import React, { createContext, useState, useEffect } from 'react';
import * as socketIO from 'socket.io-client';
import { Socket } from "socket.io-client";

import * as SocketIOClient from "socket.io-client";
interface ISocketContext {
    socket: Socket | undefined;
    //   roomUsers: any;
    //   messages: { [key: string]: IMessage[] };
}

interface IMessage {
    text: string;
    name: string;
    id: string;
    socketId: string;
    roomId: string;
    image?: string;
}

const intialData: ISocketContext = {
    socket: undefined,
    // roomUsers: {},
    // messages: {},
};

interface SocketContextProps {
  socket: SocketIOClient.Socket | null;
  message: string;
  setMessage: React.Dispatch<React.SetStateAction<string>>;
  messages: IMessage[];
  handleMessageSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
}

export const SocketContext = createContext<SocketContextProps>({
  socket: null,
  message: '',
  setMessage: () => {},
  messages: [],
  handleMessageSubmit: () => {},
});

export const SocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [socket, setSocket] = useState<SocketIOClient.Socket | null>(null);
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<IMessage[]>([]);

  useEffect(() => {
    const newSocket = socketIO.connect('http://localhost:5000');

    newSocket.on('connect', () => {
      console.log('connected', newSocket.id);
    });

    newSocket.on('welcome', (data: string) => {
      console.log(data);
    });

    newSocket.on('receive_message', (data: IMessage) => {
      setMessages((prevMessages) => [...prevMessages, data]);
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, []);

  const handleMessageSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (socket) {
      socket.emit('message', message);
      setMessage('');
    }
  };

  return (
    <SocketContext.Provider
      value={{
        socket,
        message,
        setMessage,
        messages,
        handleMessageSubmit,
      }}
    >
      {children}
    </SocketContext.Provider>
  );
};
// import { createContext, useContext, useEffect, useState } from "react";
// import { Input } from "@/components/ui/input";
// import { Button } from "@/components/ui/button";
// import { io } from "socket.io-client";
// import * as socketIO from "socket.io-client";
// import { Socket } from "socket.io-client";

// interface ISocketContext {
//     socket: Socket | undefined;
//     //   roomUsers: any;
//     //   messages: { [key: string]: IMessage[] };
// }

// const intialData: ISocketContext = {
//     socket: undefined,
//     // roomUsers: {},
//     // messages: {},
// };

// // const SocketContext = createContext<ISocketContext>(intialData);

// // export function useSocket() {
// //     return useContext(SocketContext);
// // }

// export default function SocketProvider({
//     children,
//   }: {
//     children: React.ReactNode;
//   }) {
  
//     const [messages, setMessages] = useState([]);
//     const [message, setMessage] = useState("");
//     const [socket, setSocket] = useState<socketIO.Socket>();

//     useEffect(() => {
//         let socket = socketIO.connect("http://localhost:5000");

//         socket.on("connect", () => {
//             console.log("connected", socket.id);
//         });

//         socket.on("welcome", (data) => {
//             console.log(data);
//         });

//         return () => {
//             socket.disconnect();
//         };
//         setSocket(socket);
//     }, []);

//     const handleMessageSubmit = (e: any) => {
//         e.preventDefault();
//         console.log(socket);
//         if (socket) {
//             socket.emit("message", message);
//         }
//         setMessage("");
//     };
    
// }



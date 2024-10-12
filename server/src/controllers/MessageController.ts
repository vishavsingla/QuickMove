import { Request, Response } from 'express';
import { PrismaClient, Conversation, Message } from '@prisma/client';

// import { getSocketIO } from "../socket";

// const io = getSocketIO();

// io.emit("someEvent", { data: "example" });

const prisma = new PrismaClient();

const sendMessageController = async (req: Request, res: Response) => {
  try {
    const { conversationId } = req.params;
    const { content, senderId } = req.body;

    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
      include: { members: true },
    });

    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }
    const isSenderMember = conversation.members.some(
      (member) => member.id === senderId
    );

    if (!isSenderMember) {
      return res.status(403).json({ error: 'User is not a member of this conversation' });
    }
    const newMessage = await prisma.message.create({
      data: {
        content,
        senderId,
        conversationId,
      },
    });

    return res.status(200).json(newMessage);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const getConversationMessagesController = async (req: Request, res: Response) => {
  try {
    const { conversationId } = req.params;
    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
      include: {
        messages: {
          include: {
            sender: true,
          },
          orderBy: {
            createdAt: 'asc',
          },
        },
      },
    });

    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    return res.status(200).json(conversation.messages);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const createConversationController = async (req: Request, res: Response) => {
  try {
    const { members } = req.body;
    const newConversation = await prisma.conversation.create({
      data: {
        members: {
          connect: members.map((memberId: string) => ({ id: memberId })),
        },
      },
      include: {
        members: true,
      },
    });

    return res.status(200).json(newConversation);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export {
  sendMessageController,
  getConversationMessagesController,
  createConversationController,
};
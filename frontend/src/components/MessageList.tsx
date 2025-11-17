import { motion } from 'framer-motion';
import { MessageBubble } from './MessageBubble';
import { Message } from '../types';

interface MessageListProps {
  messages: Message[];
}

export function MessageList({ messages }: MessageListProps) {
  return (
    <>
      {messages.map((message, index) => (
        <MessageBubble
          key={`${message.timestamp}-${index}`}
          message={message}
          index={index}
        />
      ))}
    </>
  );
}


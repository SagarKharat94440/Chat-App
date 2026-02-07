import { useEffect, useRef } from 'react';
import './MessageList.css';

const MessageList = ({ messages, currentUser }) => {
  const messagesEndRef = useRef(null);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
    
    if (diffInHours < 24) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' }) + ' ' +
             date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
  };

  const isConsecutiveMessage = (currentMsg, prevMsg) => {
    if (!prevMsg) return false;
    return prevMsg.username === currentMsg.username && 
           prevMsg.userId === currentMsg.userId && 
           (new Date(currentMsg.timestamp).getTime() - new Date(prevMsg.timestamp).getTime()) < 300000; 
  };

  return (
    <div className="messages-list">
      {messages.length === 0 ? (
        <div className="no-messages">
          <div className="welcome-message">
            <h3>Welcome to the chat! 👋</h3>
            <p>Start a conversation by sending a message below.</p>
          </div>
        </div>
      ) : (
        messages.map((message) => { 
          const isOwn = message.username === currentUser.username;
          const prevMsg = messages[messages.findIndex(msg => msg._id === message._id) - 1];
          const isConsecutive = isConsecutiveMessage(message, prevMsg);
          
          return (
            <div
              key={message._id} 
              className={`message ${isOwn ? 'own-message' : 'other-message'} ${isConsecutive ? 'consecutive' : ''}`}
            >
              <div className="message-content">
                {!isOwn && !isConsecutive && (
                  <div className="message-author">{message.username}</div>
                )}
                <div className="message-text">{message.message}</div>
                <div className="message-time">{formatTime(message.timestamp)}</div>
              </div>
            </div>
          );
        })
      )}
      <div ref={messagesEndRef} />
    </div>
  );
};

export default MessageList;

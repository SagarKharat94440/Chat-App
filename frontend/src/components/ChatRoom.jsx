import { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { API_BASE_URL, SOCKET_URL } from '../config';
import RoomSidebar from './RoomSidebar';
import MessageInput from './MessageInput';
import MessageList from './MessageList';
import OnlineUsersList from './OnlineUsersList';
import TypingIndicator from './TypingIndicator';
import './ChatRoom.css';

const ChatRoom = ({ user, onLogout }) => {
  const [socket, setSocket] = useState(null);
  const [rooms, setRooms] = useState([]);
  const [currentRoom, setCurrentRoom] = useState(null);
  const [messages, setMessages] = useState([]);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [typingUsers, setTypingUsers] = useState([]);
  const [showUsersList, setShowUsersList] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('connecting');
  const typingTimeoutRef = useRef(null);

  useEffect(() => {
    const newSocket = io(SOCKET_URL);
    setSocket(newSocket);

    newSocket.on('connect', () => {
      setConnectionStatus('connected');
      console.log('Connected to server');
    });

    newSocket.on('disconnect', () => {
      setConnectionStatus('disconnected');
      console.log('Disconnected from server');
    });

    newSocket.on('connect_error', (err) => {
      setConnectionStatus('disconnected');
      console.error('Connection error:', err.message);
    });

    loadRooms();

    newSocket.on('chat-message', (message) => {
      setMessages(prev => [...prev, message]);
    });

    newSocket.on('online-users', (users) => {
      setOnlineUsers(users);
    });

    newSocket.on('typing', ({ typingUsers }) => {
      setTypingUsers(typingUsers.filter(username => username !== user.username));
    });

    newSocket.on('user-joined', ({ username }) => {
      console.log(`${username} joined the room`);
    });

    newSocket.on('user-left', ({ username }) => {
      console.log(`${username} left the room`);
    });

    return () => {
      newSocket.close();
    };
  }, [user.username]); 

  const loadRooms = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/rooms`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const roomsData = await response.json();
      setRooms(roomsData);

      if (roomsData.length > 0 && !currentRoom) {
        joinRoom(roomsData[0]);
      }
    } catch (error) {
      console.error('Error loading rooms:', error);
    }
  };

  const joinRoom = async (room) => {
    if (!socket) return;

    if (currentRoom?._id === room._id) return;

    setCurrentRoom(room);
    setMessages([]); 
    setOnlineUsers([]); 
    setTypingUsers([]);

    socket.emit('join-room', {
      roomId: room._id, 
      username: user.username,
      userId: user.userId 
    });

    try {
      const response = await fetch(`${API_BASE_URL}/api/messages/${room._id}`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const messagesData = await response.json();
      setMessages(messagesData);
    } catch (error) {
      console.error('Error loading messages:', error);
    }
  };

  const sendMessage = (message) => {
    if (!socket || !currentRoom || !message.trim()) return;

    socket.emit('chat-message', {
      roomId: currentRoom._id, 
      message: message.trim(),
      username: user.username,
      userId: user.userId 
    });
  };

  const handleTyping = (isTyping) => {
    if (!socket || !currentRoom) return;

    if (isTyping) {
      socket.emit('typing', {
        roomId: currentRoom._id, 
        username: user.username,
        isTyping: true
      });

      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }

      typingTimeoutRef.current = setTimeout(() => {
        socket.emit('typing', {
          roomId: currentRoom._id, 
          username: user.username,
          isTyping: false
        });
        typingTimeoutRef.current = null; 
      }, 2000); 
    } else {
      socket.emit('typing', {
        roomId: currentRoom._id, 
        username: user.username,
        isTyping: false
      });

      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = null;
      }
    }
  };

  const createRoom = async (roomName) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/rooms`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: roomName }),
      });

      if (response.ok) {
        const newRoom = await response.json();
        setRooms(prev => [...prev, newRoom]);
        joinRoom(newRoom);
      } else {
        const errorData = await response.json();
        console.error('Error creating room:', errorData.error || 'Unknown error');
        alert(`Failed to create room: ${errorData.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error creating room:', error);
      alert('Connection error when trying to create room.');
    }
  };

  return (
    <div className="chat-container">
      <RoomSidebar
        rooms={rooms}
        currentRoom={currentRoom}
        onRoomSelect={joinRoom}
        onCreateRoom={createRoom}
        user={user}
        onLogout={onLogout}
        connectionStatus={connectionStatus}
      />
      
      <div className="chat-main">
        <div className="chat-header">
          <div className="room-info">
            <h2>{currentRoom?.name || 'Select a room'}</h2>
            <div className={`connection-status ${connectionStatus}`}>
              <span className="status-dot"></span>
              {connectionStatus === 'connected' ? 'Connected' : 
               connectionStatus === 'connecting' ? 'Connecting...' : 'Disconnected'}
            </div>
          </div>
          <div>
            <button 
            className="users-toggle"
            onClick={() => setShowUsersList(!showUsersList)}
          >
            👥 Online ({onlineUsers.length}) 
          </button>
          </div>
        </div>

        <div className="chat-body">
          <div className="messages-container">
            <MessageList messages={messages} currentUser={user} />
            <TypingIndicator typingUsers={typingUsers} />
          </div>
          
          {showUsersList && (
            <OnlineUsersList 
              users={onlineUsers} 
              onClose={() => setShowUsersList(false)} 
            />
          )}
        </div>

        <MessageInput 
          onSendMessage={sendMessage}
          onTyping={handleTyping}
          disabled={!currentRoom || connectionStatus !== 'connected'}
        />
      </div>
    </div>
  );
};

export default ChatRoom;

"use client";

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAppContext } from '@/contexts/AppContext';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Zap, Search, MessageSquare, UserPlus } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

export default function ChatListPage() {
  const router = useRouter();
  const { userProfile, chats, pairedUsers, isInitialized, createOrGetChat } = useAppContext();
  const [searchQuery, setSearchQuery] = useState('');
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (isInitialized && !userProfile) {
      router.replace('/onboarding');
    }
  }, [userProfile, router, isInitialized]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(true);
    }, 100); // Short delay to trigger animation
    return () => clearTimeout(timer);
  }, []);

  const handleChatClick = (chatId: string, participantId?: string) => {
    // If we have a chat ID, navigate directly using location.href for forced navigation
    if (chatId) {
      window.location.href = `/chat/messages/${chatId}`;
      return;
    }
    
    // If no chatId but we have a participantId, create the chat first
    if (participantId && userProfile) {
      // Find the paired user to get their display name
      const pairedUser = pairedUsers.find(user => user.userId === participantId);
      const displayName = pairedUser?.localDisplayName || pairedUser?.displayName || `User ${participantId.substring(0, 6)}`;
      
      // Create or get the chat
      const chat = createOrGetChat(participantId, displayName, pairedUser?.avatar);
      
      // Navigate to the new chat using location.href for forced navigation
      window.location.href = `/chat/messages/${chat.chatId}`;
    }
  };

  // Create a combined list of chat items (both active chats and paired users)
  const createCombinedChatList = () => {
    if (!userProfile) return [];
    
    // First, collect all chats
    let chatList = [...chats];
    
    // For each paired user, check if a chat already exists
    pairedUsers.forEach(user => {
      const userId = user.userId;
      const existingChat = chats.find(chat => 
        chat.participants.includes(userId) && chat.participants.includes(userProfile.userId)
      );
      
      // If no chat exists for this paired user, create a placeholder chat item
      if (!existingChat) {
        const sortedParticipantIds = [userProfile.userId, userId].sort() as [string, string];
        const chatId = sortedParticipantIds.join('_');
        
        const newChat = {
          chatId,
          participants: sortedParticipantIds,
          participantDetails: {
            [userProfile.userId]: { 
              displayName: userProfile.displayName, 
              avatar: userProfile.avatar 
            },
            [userId]: { 
              displayName: user.localDisplayName || user.displayName, 
              avatar: user.avatar 
            }
          },
          unreadCount: 0,
          isPending: true // Mark this as a pending chat (no messages yet)
        };
        
        chatList.push(newChat);
      }
    });
    
    return chatList;
  };
  
  if (!isInitialized) {
    return (
      <div className="flex items-center justify-center h-full">
        <Zap className="h-16 w-16 animate-spin text-primary" />
      </div>
    );
  }

  // Get the combined list of chats and paired users
  const allChats = createCombinedChatList();
  
  // Filter chats based on search query
  const filteredChats = allChats.filter(chat => {
    if (!userProfile) return false;
    
    const otherParticipantId = chat.participants.find(id => id !== userProfile.userId);
    if (!otherParticipantId) return false;
    
    const otherParticipant = chat.participantDetails[otherParticipantId];
    if (!otherParticipant) return false;
    
    // Check if display name includes the search query
    return otherParticipant.displayName.toLowerCase().includes(searchQuery.toLowerCase());
  });

  return (
    <div 
      className={`h-full flex flex-col p-4 transition-opacity duration-500 ease-in-out ${
        isVisible ? 'opacity-100' : 'opacity-0'
      }`}
    >
      <div className="flex items-center mb-6">
        <h1 className="text-2xl font-headline font-semibold flex-1">Chats</h1>
        <div className="relative w-full max-w-xs">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search chats..."
            className="pl-8"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto space-y-2">
        {filteredChats.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-8">
            <MessageSquare className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <h3 className="font-medium text-lg mb-2">No Chats Yet</h3>
            <p className="text-muted-foreground max-w-xs mb-6">
              Start a conversation by inviting friends or accept invitations to connect.
            </p>
            <Button asChild>
              <Link href="/chat/invite">Invite Friends</Link>
            </Button>
          </div>
        ) : (
          filteredChats.map(chat => {
            if (!userProfile) return null;
            
            const otherParticipantId = chat.participants.find(id => id !== userProfile.userId);
            if (!otherParticipantId) return null;
            
            const otherParticipant = chat.participantDetails[otherParticipantId];
            if (!otherParticipant) return null;
            
            const pairedUser = pairedUsers.find(user => user.userId === otherParticipantId);
            const displayName = pairedUser?.localDisplayName || pairedUser?.displayName || otherParticipant.displayName;
            const isPendingChat = chat.isPending;

            return (
              <div 
                key={chat.chatId}
                className="block"
                onClick={() => handleChatClick(chat.chatId, otherParticipantId)}
              >
                <Card className={cn(
                  "p-4 flex items-center hover:bg-accent/50 transition-colors cursor-pointer",
                  chat.unreadCount ? "bg-accent/20" : "",
                  isPendingChat ? "border-dashed" : ""
                )}>
                  <div className="relative">
                    <Avatar className="h-12 w-12 mr-4">
                      <AvatarImage src={otherParticipant.avatar} />
                      <AvatarFallback>{displayName.substring(0, 2).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    {chat.unreadCount ? (
                      <span className="absolute -top-1 -right-1 bg-primary text-primary-foreground rounded-full w-5 h-5 flex items-center justify-center text-xs font-semibold shadow-md animate-pulse">
                        {chat.unreadCount > 9 ? '9+' : chat.unreadCount}
                      </span>
                    ) : null}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-baseline">
                      <h3 className="font-medium truncate">{displayName}</h3>
                      <span className="text-xs text-muted-foreground ml-2 flex-shrink-0">
                        {chat.lastMessage 
                          ? format(new Date(chat.lastMessage.timestamp), 'HH:mm')
                          : ''}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground truncate">
                      {isPendingChat ? (
                        <span className="flex items-center gap-1 text-accent">
                          <UserPlus className="h-3.5 w-3.5" />
                          Start a conversation
                        </span>
                      ) : chat.lastMessage ? (
                        chat.lastMessage.deletedForEveryone 
                          ? "This message was deleted" 
                          : chat.lastMessage.text
                      ) : "No messages yet"}
                    </p>
                  </div>
                </Card>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

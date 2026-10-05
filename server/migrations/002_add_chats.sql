-- Migration: Add chats and chat_members tables
-- Date: 2026-01-20
-- Description: Adds support for direct message chats between users

-- Create chats table
CREATE TABLE IF NOT EXISTS chats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create chat_members table
CREATE TABLE IF NOT EXISTS chat_members (
    chat_id UUID NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY (chat_id, user_id)
);

-- Add chat_id column to messages table (optional, for direct messages)
ALTER TABLE messages ADD COLUMN IF NOT EXISTS chat_id UUID REFERENCES chats(id) ON DELETE CASCADE;

-- Make channel_id nullable in messages (since messages can be in chats now)
ALTER TABLE messages ALTER COLUMN channel_id DROP NOT NULL;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_chats_created_at ON chats(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_members_chat ON chat_members(chat_id);
CREATE INDEX IF NOT EXISTS idx_chat_members_user ON chat_members(user_id);
CREATE INDEX IF NOT EXISTS idx_messages_chat ON messages(chat_id) WHERE chat_id IS NOT NULL;

-- Add constraint to ensure message is in either channel or chat
ALTER TABLE messages ADD CONSTRAINT chk_message_location 
    CHECK (channel_id IS NOT NULL OR chat_id IS NOT NULL);

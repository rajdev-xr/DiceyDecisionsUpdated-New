-- Create enum for tiebreaker methods
CREATE TYPE tiebreaker_method AS ENUM ('dice', 'spinner', 'coin');

-- Create rooms table
CREATE TABLE rooms (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    code TEXT NOT NULL UNIQUE,
    title TEXT NOT NULL,
    description TEXT,
    creator_id UUID NOT NULL REFERENCES auth.users(id),
    is_open BOOLEAN DEFAULT true,
    voting_started BOOLEAN DEFAULT false,
    voting_ended BOOLEAN DEFAULT false,
    resolved_at TIMESTAMP WITH TIME ZONE,
    final_option_id UUID,
    tiebreaker_method tiebreaker_method,
    max_participants INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create options table
CREATE TABLE options (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
    submitted_by UUID NOT NULL REFERENCES auth.users(id),
    text TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create participants table
CREATE TABLE participants (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id),
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(room_id, user_id)
);

-- Create votes table
CREATE TABLE votes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
    option_id UUID NOT NULL REFERENCES options(id) ON DELETE CASCADE,
    voted_by UUID NOT NULL REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(room_id, voted_by)
);

-- Add foreign key constraint for final_option_id
ALTER TABLE rooms
ADD CONSTRAINT rooms_final_option_id_fkey
FOREIGN KEY (final_option_id) REFERENCES options(id);

-- Enable Row Level Security
ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE options ENABLE ROW LEVEL SECURITY;
ALTER TABLE participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE votes ENABLE ROW LEVEL SECURITY;

-- Create policies for rooms
CREATE POLICY "Users can view rooms they are participants in"
ON rooms FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM participants
        WHERE participants.room_id = rooms.id
        AND participants.user_id = auth.uid()
    )
);

CREATE POLICY "Users can create rooms"
ON rooms FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = creator_id);

CREATE POLICY "Room creators can update their rooms"
ON rooms FOR UPDATE
TO authenticated
USING (auth.uid() = creator_id);

-- Create policies for options
CREATE POLICY "Users can view options in rooms they are participants in"
ON options FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM participants
        WHERE participants.room_id = options.room_id
        AND participants.user_id = auth.uid()
    )
);

CREATE POLICY "Users can add options to rooms they are participants in"
ON options FOR INSERT
TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM participants
        WHERE participants.room_id = options.room_id
        AND participants.user_id = auth.uid()
    )
    AND submitted_by = auth.uid()
);

-- Create policies for participants
CREATE POLICY "Users can view participants in rooms they are in"
ON participants FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM participants p2
        WHERE p2.room_id = participants.room_id
        AND p2.user_id = auth.uid()
    )
);

CREATE POLICY "Users can join rooms"
ON participants FOR INSERT
TO authenticated
WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
        SELECT 1 FROM rooms
        WHERE rooms.id = room_id
        AND rooms.is_open = true
        AND (
            rooms.max_participants IS NULL
            OR (
                SELECT COUNT(*)
                FROM participants
                WHERE room_id = rooms.id
            ) < rooms.max_participants
        )
    )
);

-- Create policies for votes
CREATE POLICY "Users can view votes in rooms they are participants in"
ON votes FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM participants
        WHERE participants.room_id = votes.room_id
        AND participants.user_id = auth.uid()
    )
);

CREATE POLICY "Users can vote once in rooms they are participants in"
ON votes FOR INSERT
TO authenticated
WITH CHECK (
    voted_by = auth.uid()
    AND EXISTS (
        SELECT 1 FROM participants
        WHERE participants.room_id = votes.room_id
        AND participants.user_id = auth.uid()
    )
    AND EXISTS (
        SELECT 1 FROM rooms
        WHERE rooms.id = votes.room_id
        AND rooms.voting_started = true
        AND rooms.voting_ended = false
    )
    AND NOT EXISTS (
        SELECT 1 FROM votes v2
        WHERE v2.room_id = votes.room_id
        AND v2.voted_by = auth.uid()
    )
);

-- Create function to generate room codes
CREATE OR REPLACE FUNCTION generate_room_code()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
    chars TEXT := 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    result TEXT := '';
    i INTEGER;
BEGIN
    FOR i IN 1..6 LOOP
        result := result || substr(chars, floor(random() * length(chars) + 1)::integer, 1);
    END LOOP;
    RETURN result;
END;
$$; 
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Dice1, Users, Vote, Plus, Play, Trophy, Edit, Trash2, Check, X, ArrowLeft } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import TiebreakerAnimation from './TiebreakerAnimation';
import type { Database } from '@/integrations/supabase/types';
import confetti from 'canvas-confetti';

type TiebreakerMethod = Database['public']['Enums']['tiebreaker_method'];

interface Room {
  id: string;
  code: string;
  title: string;
  description?: string;
  creator_id: string;
  is_open: boolean;
  voting_started: boolean;
  voting_ended: boolean;
  resolved_at?: string;
  final_option_id?: string;
  tiebreaker_method?: TiebreakerMethod;
  emoji?: string;
  theme?: string;
}

interface Option {
  id: string;
  text: string;
  submitted_by: string;
  vote_count?: number;
}

interface Participant {
  id: string;
  user_id: string;
}

interface Vote {
  option_id: string;
  voted_by: string;
}

const RoomView = () => {
  const { roomCode } = useParams<{ roomCode: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [room, setRoom] = useState<Room | null>(null);
  const [options, setOptions] = useState<Option[]>([]);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [votes, setVotes] = useState<Vote[]>([]);
  const [userVote, setUserVote] = useState<string | null>(null);
  const [newOption, setNewOption] = useState('');
  const [loading, setLoading] = useState(true);
  const [isCreator, setIsCreator] = useState(false);
  const [showTiebreaker, setShowTiebreaker] = useState(false);
  const [tiebreakerResult, setTiebreakerResult] = useState<string | null>(null);
  const [lastActivity, setLastActivity] = useState<Date>(new Date());
  const [editingOptionId, setEditingOptionId] = useState<string | null>(null);
  const [editingOptionText, setEditingOptionText] = useState('');
  const [randomizedOptions, setRandomizedOptions] = useState<Option[]>([]);

  // Theme color mapping
  const themeColorMap: Record<string, string> = {
    purple: 'bg-purple-700',
    blue: 'bg-blue-700',
    pink: 'bg-pink-700',
    green: 'bg-green-700',
  };

  // Theme background mapping
  const themeBgMap: Record<string, string> = {
    purple: 'from-purple-900 via-blue-900 to-pink-900',
    blue: 'from-blue-900 via-blue-700 to-blue-400',
    pink: 'from-pink-900 via-pink-700 to-pink-400',
    green: 'from-green-900 via-green-700 to-green-400',
    red: 'from-red-900 via-red-700 to-red-400',
  };

  // Update last activity on any user interaction
  const updateActivity = () => {
    setLastActivity(new Date());
  };

  // Check for inactivity
  useEffect(() => {
    const checkInactivity = () => {
      const now = new Date();
      const diff = now.getTime() - lastActivity.getTime();
      const thirtyMinutes = 30 * 60 * 1000;

      if (diff > thirtyMinutes && room && !room.voting_ended) {
        // Auto-end voting if inactive
        endVoting();
        toast({
          title: "Room Inactive",
          description: "Voting has been ended due to inactivity.",
        });
      }
    };

    const interval = setInterval(checkInactivity, 60000); // Check every minute
    return () => clearInterval(interval);
  }, [lastActivity, room]);

  // Add activity listeners
  useEffect(() => {
    const events = ['mousedown', 'keydown', 'touchstart'];
    events.forEach(event => {
      window.addEventListener(event, updateActivity);
    });

    return () => {
      events.forEach(event => {
        window.removeEventListener(event, updateActivity);
      });
    };
  }, []);

  useEffect(() => {
    if (roomCode && user) {
      fetchRoomData();
      const interval = setInterval(fetchRoomData, 3000); // Poll every 3 seconds
      return () => clearInterval(interval);
    }
  }, [roomCode, user]);

  useEffect(() => {
    if (room && room.voting_started && !room.voting_ended) {
      // Always reshuffle when voting starts
      const shuffled = [...options].sort(() => Math.random() - 0.5);
      setRandomizedOptions(shuffled);
    } else {
      setRandomizedOptions([]);
    }
  }, [room?.voting_started, room?.voting_ended, options]);

  const fetchRoomData = async () => {
    if (!roomCode || !user) return;

    try {
      // Fetch room
      const { data: roomData, error: roomError } = await supabase
        .from('rooms')
        .select('*')
        .eq('code', roomCode)
        .single();

      if (roomError) throw roomError;
      
      setRoom(roomData);
      setIsCreator(roomData.creator_id === user.id);

      // Check if user is participant, if not add them
      const { data: participantData } = await supabase
        .from('participants')
        .select('*')
        .eq('room_id', roomData.id)
        .eq('user_id', user.id)
        .single();

      if (!participantData) {
        await supabase
          .from('participants')
          .insert({
            user_id: user.id,
            room_id: roomData.id
          });
      }

      // Fetch participants
      const { data: participantsData } = await supabase
        .from('participants')
        .select('*')
        .eq('room_id', roomData.id);

      setParticipants(participantsData || []);

      // Fetch options
      const { data: optionsData } = await supabase
        .from('options')
        .select('*')
        .eq('room_id', roomData.id)
        .order('created_at');

      setOptions(optionsData || []);

      // Fetch votes
      const { data: votesData } = await supabase
        .from('votes')
        .select('*')
        .eq('room_id', roomData.id);

      setVotes(votesData || []);

      // Check user's vote
      const userVoteData = votesData?.find(v => v.voted_by === user.id);
      setUserVote(userVoteData?.option_id || null);

    } catch (error: any) {
      console.error('Error fetching room data:', error);
      if (error.code === 'PGRST116') {
        toast({
          title: "Room Not Found",
          description: "This room doesn't exist or you don't have access to it.",
          variant: "destructive",
        });
        navigate('/dashboard');
      }
    } finally {
      setLoading(false);
    }
  };

  const submitOption = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!room || !user || !newOption.trim()) return;

    try {
      const { error } = await supabase
        .from('options')
        .insert({
          room_id: room.id,
          submitted_by: user.id,
          text: newOption.trim()
        });

      if (error) throw error;

      setNewOption('');
      toast({
        title: "Option Added!",
        description: "Your option has been submitted.",
      });
      fetchRoomData();
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to submit option.",
        variant: "destructive",
      });
    }
  };

  const startVoting = async () => {
    if (!room || !isCreator) return;

    try {
      const { error } = await supabase
        .from('rooms')
        .update({ voting_started: true })
        .eq('id', room.id);

      if (error) throw error;

      toast({
        title: "Voting Started!",
        description: "Participants can now vote on the options.",
      });
      fetchRoomData();
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to start voting.",
        variant: "destructive",
      });
    }
  };

  const handleVote = async (optionId: string) => {
    if (!user || !room || userVote) return;

    try {
      const { error } = await supabase
        .from('votes')
        .insert({
          room_id: room.id,
          option_id: optionId,
          voted_by: user.id
        });

      if (error) throw error;

      setUserVote(optionId);
      toast({
        title: "Vote Submitted!",
        description: "Your vote has been recorded.",
      });
      fetchRoomData();
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to submit vote.",
        variant: "destructive",
      });
    }
  };

  const endVoting = async () => {
    if (!room || !isCreator) return;

    // Calculate results
    const optionVotes: { [key: string]: number } = {};
    votes.forEach(vote => {
      optionVotes[vote.option_id] = (optionVotes[vote.option_id] || 0) + 1;
    });

    const maxVotes = Math.max(...Object.values(optionVotes));
    const winners = Object.keys(optionVotes).filter(id => optionVotes[id] === maxVotes);

    if (winners.length > 1) {
      // There's a tie - show tiebreaker selection
      setShowTiebreaker(true);
      return;
    }

    // No tie - end with winner
    try {
      const { error } = await supabase
        .from('rooms')
        .update({
          voting_ended: true,
          resolved_at: new Date().toISOString(),
          final_option_id: winners[0],
          tiebreaker_method: null
        })
        .eq('id', room.id);

      if (error) throw error;

      toast({
        title: "Decision Made!",
        description: "The voting has ended and a winner has been chosen.",
      });
      confetti({ particleCount: 100, spread: 80, origin: { y: 0.6 } });
      const audio = new Audio('/firework.mp3');
      audio.play();
      fetchRoomData();
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to end voting.",
        variant: "destructive",
      });
    }
  };

  const handleTiebreakerComplete = async (method: TiebreakerMethod, winnerOptionId: string) => {
    if (!room) return;

    try {
      const { error } = await supabase
        .from('rooms')
        .update({
          voting_ended: true,
          resolved_at: new Date().toISOString(),
          final_option_id: winnerOptionId,
          tiebreaker_method: method
        })
        .eq('id', room.id);

      if (error) throw error;

      setShowTiebreaker(false);
      setTiebreakerResult(winnerOptionId);
      
      toast({
        title: "Tiebreaker Complete!",
        description: "The winner has been decided by fate!",
      });
      confetti({ particleCount: 100, spread: 80, origin: { y: 0.6 } });
      const audio = new Audio('/firework.mp3');
      audio.play();
      fetchRoomData();
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to complete tiebreaker.",
        variant: "destructive",
      });
    }
  };

  const startEditOption = (option: Option) => {
    setEditingOptionId(option.id);
    setEditingOptionText(option.text);
  };

  const cancelEditOption = () => {
    setEditingOptionId(null);
    setEditingOptionText('');
  };

  const saveEditOption = async () => {
    if (!editingOptionId || !editingOptionText.trim()) return;
    try {
      const { error } = await supabase
        .from('options')
        .update({ text: editingOptionText.trim() })
        .eq('id', editingOptionId);
      if (error) throw error;
      toast({ title: 'Option updated!', description: 'Your option was updated.' });
      setEditingOptionId(null);
      setEditingOptionText('');
      fetchRoomData();
    } catch (error: any) {
      toast({ title: 'Error', description: 'Failed to update option.', variant: 'destructive' });
    }
  };

  const deleteOption = async (optionId: string) => {
    try {
      const { error } = await supabase
        .from('options')
        .delete()
        .eq('id', optionId);
      if (error) throw error;
      toast({ title: 'Option deleted!', description: 'Option deleted successfully.' });
      fetchRoomData();
    } catch (error: any) {
      toast({ title: 'Error', description: 'Failed to delete option.', variant: 'destructive' });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-pink-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading room...</div>
      </div>
    );
  }

  if (!room) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-pink-900 flex items-center justify-center">
        <div className="text-white text-xl">Room not found</div>
      </div>
    );
  }

  // Calculate vote counts
  const optionVotes: { [key: string]: number } = {};
  votes.forEach(vote => {
    optionVotes[vote.option_id] = (optionVotes[vote.option_id] || 0) + 1;
  });

  const maxVotes = Math.max(...Object.values(optionVotes), 0);
  const winners = Object.keys(optionVotes).filter(id => optionVotes[id] === maxVotes);
  const tiedOptions = options.filter(option => winners.includes(option.id));
  const finalOption = room.final_option_id ? options.find(o => o.id === room.final_option_id) : null;

  if (showTiebreaker) {
    return (
      <TiebreakerAnimation
        room={room}
        tiedOptions={tiedOptions}
        onComplete={handleTiebreakerComplete}
        isCreator={isCreator}
      />
    );
  }

  return (
    <div className={`min-h-screen bg-gradient-to-br ${themeBgMap[room.theme || 'purple'] || themeBgMap['purple']}`}>
      <header className="container mx-auto px-4 py-6">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Dice1 className="h-8 w-8 text-purple-400 dice-animation" />
            <h1 className="text-2xl font-bold text-white">DiceyDecisions</h1>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-white text-right mr-4">
              <p className="text-sm text-gray-300">Room Code</p>
              <p className="text-lg font-bold">{room.code}</p>
            </div>
            <Button
              variant="outline"
              className="text-white border-white hover:bg-white/10"
              onClick={() => navigate('/dashboard')}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Room Info */}
          <Card className="bg-white/10 border-white/20 backdrop-blur-sm">
            <CardHeader>
              <div className="flex items-center gap-4 mb-2">
                {room.emoji && (
                  <span className="text-3xl" title="Room Emoji">{room.emoji}</span>
                )}
                <CardTitle className="text-white flex items-center gap-2">{room.title}</CardTitle>
                {room.theme && (
                  <span className={`ml-2 w-6 h-6 rounded-full border-2 border-white ${themeColorMap[room.theme] || 'bg-purple-700'}`} title="Room Theme"></span>
                )}
              </div>
              {room.description && (
                <CardDescription className="text-gray-300">{room.description}</CardDescription>
              )}
              <div className="flex items-center gap-4 text-sm text-gray-300">
                <span className="flex items-center gap-1">
                  <Users className="h-4 w-4" />
                  {participants.length} participants
                </span>
                {room.voting_started && !room.voting_ended && (
                  <span className="flex items-center gap-1">
                    <Vote className="h-4 w-4" />
                    Voting in progress
                  </span>
                )}
                {room.voting_ended && (
                  <span className="flex items-center gap-1">
                    <Trophy className="h-4 w-4 text-green-400" />
                    Decision made!
                  </span>
                )}
              </div>
            </CardHeader>
          </Card>

          {/* Final Result */}
          {room.voting_ended && finalOption && (
            <Card className="bg-green-600/20 border-green-400/30 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Trophy className="h-6 w-6 text-green-400" />
                  Final Decision
                </CardTitle>
                <div className="text-center py-4">
                  <p className="text-3xl font-bold text-green-400 mb-2">{finalOption.text}</p>
                  {room.tiebreaker_method ? (
                    <p className="text-gray-300">
                      Decided by {room.tiebreaker_method} tiebreaker
                    </p>
                  ) : (
                    <p className="text-gray-300">
                      Winner by Majority
                    </p>
                  )}
                </div>
              </CardHeader>
            </Card>
          )}

          {/* Submit Options */}
          {!room.voting_started && room.is_open && (
            <Card className="bg-white/10 border-white/20 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-white">Submit Decision Options</CardTitle>
                <CardDescription className="text-gray-300">
                  Every participant can submit one or more options before voting starts.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={submitOption} className="flex gap-2 mb-2">
                  <Input
                    value={newOption}
                    onChange={(e) => setNewOption(e.target.value)}
                    placeholder="Enter your suggestion..."
                    className="bg-white/10 border-white/20 text-white placeholder:text-gray-400 flex-1"
                  />
                  <Button 
                    type="submit" 
                    disabled={!newOption.trim()}
                    className="bg-purple-600 hover:bg-purple-700"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add
                  </Button>
                </form>
                {/* List of options submitted by this user */}
                <div className="space-y-2">
                  {options.filter(o => o.submitted_by === user?.id).map(option => (
                    <div key={option.id} className="flex items-center gap-2 text-white">
                      <span>{option.text}</span>
                      {!room.voting_started && (
                        <>
                          <button onClick={() => startEditOption(option)} className="text-blue-400 ml-2" title="Edit"><Edit /></button>
                          <button onClick={() => deleteOption(option.id)} className="text-red-400 ml-1" title="Delete"><Trash2 /></button>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Options List */}
          <Card className="bg-white/10 border-white/20 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-white">Options</CardTitle>
              <CardDescription className="text-gray-300">
                {room.voting_started 
                  ? room.voting_ended 
                    ? "Final voting results"
                    : "Vote for your favorite option"
                  : "Submitted suggestions"
                }
              </CardDescription>
            </CardHeader>
            <CardContent>
              {options.length === 0 ? (
                <p className="text-center text-gray-300 py-8">No options submitted yet</p>
              ) : (
                <div className="space-y-3">
                  {(room.voting_started && !room.voting_ended ? randomizedOptions : options).map((option) => (
                    <div
                      key={option.id}
                      className={`p-4 rounded-lg border transition-colors ${
                        room.voting_ended && option.id === room.final_option_id
                          ? 'bg-green-600/20 border-green-400/40'
                          : userVote === option.id
                          ? 'bg-purple-600/20 border-purple-400/40'
                          : 'bg-white/5 border-white/10 hover:bg-white/10'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        {editingOptionId === option.id ? (
                          <>
                            <input
                              className="bg-white/10 border-white/20 text-white rounded px-2 py-1 flex-1"
                              value={editingOptionText}
                              onChange={e => setEditingOptionText(e.target.value)}
                              maxLength={100}
                            />
                            <button onClick={saveEditOption} className="text-green-400 ml-2" title="Save"><Check /></button>
                            <button onClick={cancelEditOption} className="text-red-400 ml-1" title="Cancel"><X /></button>
                          </>
                        ) : (
                          <>
                            <span className="text-white font-medium">{option.text}</span>
                            <div className="flex items-center gap-2">
                              {room.voting_ended && (
                                <span className="text-gray-300 text-sm">{optionVotes[option.id] || 0} votes</span>
                              )}
                              {room.voting_started && !room.voting_ended && !userVote && (
                                <Button
                                  onClick={() => handleVote(option.id)}
                                  size="sm"
                                  className="bg-purple-600 hover:bg-purple-700"
                                  title="Vote Anonymously"
                                >
                                  Vote <span className="ml-1 text-xs text-gray-300">(Anonymously)</span>
                                </Button>
                              )}
                              {/* Edit/Delete only for owner and before voting starts */}
                              {!room.voting_started && user && option.submitted_by === user.id && (
                                <>
                                  <button onClick={() => startEditOption(option)} className="text-blue-400 ml-2" title="Edit"><Edit /></button>
                                  <button onClick={() => deleteOption(option.id)} className="text-red-400 ml-1" title="Delete"><Trash2 /></button>
                                </>
                              )}
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Creator Controls */}
          {isCreator && !room.voting_ended && (
            <Card className="bg-white/10 border-white/20 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-white">Room Controls</CardTitle>
                <CardDescription className="text-gray-300">
                  Manage the voting process
                </CardDescription>
              </CardHeader>
              <CardContent>
                {!room.voting_started ? (
                  <Button 
                    onClick={startVoting}
                    disabled={options.length < 2}
                    size="lg"
                    className="bg-green-600 hover:bg-green-700"
                  >
                    <Play className="h-5 w-5 mr-2" />
                    Start Voting
                  </Button>
                ) : (
                  <Button 
                    onClick={endVoting}
                    disabled={votes.length === 0}
                    size="lg"
                    className="bg-red-600 hover:bg-red-700"
                  >
                    <Trophy className="h-5 w-5 mr-2" />
                    End Voting
                  </Button>
                )}
                {!room.voting_started && options.length < 2 && (
                  <p className="text-gray-300 text-sm mt-2">
                    Need at least 2 options to start voting
                  </p>
                )}
                {room.voting_started && votes.length === 0 && (
                  <p className="text-gray-300 text-sm mt-2">
                    Waiting for votes to be cast
                  </p>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
};

export default RoomView;

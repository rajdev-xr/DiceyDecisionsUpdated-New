import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dice1, ArrowLeft, Users, Copy } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

const themeOptions = [
  { value: 'purple', color: 'bg-purple-500' },
  { value: 'blue', color: 'bg-blue-500' },
  { value: 'pink', color: 'bg-pink-500' },
  { value: 'green', color: 'bg-green-500' },
  { value: 'red', color: 'bg-red-500' },
];
const emojiOptions = ['🎲', '🍕', '🎮', '🍿', '🏆', '🧩', '🎯', '🎡'];

const CreateRoom = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [maxParticipants, setMaxParticipants] = useState(10);
  const [isLoading, setIsLoading] = useState(false);
  const [roomCreated, setRoomCreated] = useState(false);
  const [roomCode, setRoomCode] = useState('');
  const [theme, setTheme] = useState('purple');
  const [emoji, setEmoji] = useState('🎲');

  const generateRoomCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 6; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    setIsLoading(true);
    
    try {
      const code = generateRoomCode();
      
      // Create room
      const { data: room, error: roomError } = await supabase
        .from('rooms')
        .insert({
          code,
          title: title.trim(),
          description: description.trim() || null,
          creator_id: user.id,
          max_participants: maxParticipants,
          tiebreaker_method: 'dice',
          theme,
          emoji
        })
        .select()
        .single();

      if (roomError) throw roomError;

      // Add creator as participant
      const { error: participantError } = await supabase
        .from('participants')
        .insert({
          user_id: user.id,
          room_id: room.id
        });

      if (participantError) throw participantError;

      setRoomCode(code);
      setRoomCreated(true);
      
      toast({
        title: "Room Created!",
        description: `Room code: ${code}`,
      });
    } catch (error: any) {
      console.error('Error creating room:', error);
      toast({
        title: "Error",
        description: "Failed to create room. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const copyRoomCode = () => {
    navigator.clipboard.writeText(roomCode);
    toast({
      title: "Copied!",
      description: "Room code copied to clipboard",
    });
  };

  const shareLink = () => {
    const link = `${window.location.origin}/rooms/${roomCode}`;
    navigator.clipboard.writeText(link);
    toast({
      title: "Link Copied!",
      description: "Room link copied to clipboard",
    });
  };

  if (roomCreated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-pink-900">
        <header className="container mx-auto px-4 py-6">
          <Link to="/" className="flex items-center gap-2">
            <Dice1 className="h-8 w-8 text-purple-400 dice-animation" />
            <h1 className="text-2xl font-bold text-white">DiceyDecisions</h1>
          </Link>
        </header>

        <main className="container mx-auto px-4 py-8 flex items-center justify-center">
          <Card className="w-full max-w-md bg-white/10 border-white/20 backdrop-blur-sm">
            <CardHeader className="text-center">
              <div className="flex justify-center mb-4">
                <div className="p-4 bg-green-600/20 rounded-full">
                  <Dice1 className="h-12 w-12 text-green-400" />
                </div>
              </div>
              <CardTitle className="text-2xl text-white">Room Created!</CardTitle>
              <CardDescription className="text-gray-300">
                Share this code with your friends
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="text-center">
                <div className="bg-white/10 rounded-lg p-6 mb-4">
                  <p className="text-gray-300 mb-2">Room Code</p>
                  <p className="text-4xl font-bold text-purple-400 tracking-widest">{roomCode}</p>
                </div>
                <div className="flex gap-2">
                  <Button onClick={copyRoomCode} variant="outline" className="flex-1 text-white border-white hover:bg-white/10">
                    <Copy className="h-4 w-4 mr-2" />
                    Copy Code
                  </Button>
                  <Button onClick={shareLink} className="flex-1 bg-purple-600 hover:bg-purple-700">
                    Share Link
                  </Button>
                </div>
              </div>
              
              <div className="text-center space-y-4">
                <Button 
                  size="lg" 
                  className="w-full bg-green-600 hover:bg-green-700"
                  onClick={() => navigate(`/rooms/${roomCode}`)}
                >
                  Enter Room
                </Button>
                <Link to="/dashboard">
                  <Button variant="ghost" className="w-full text-gray-300 hover:text-white">
                    Back to Dashboard
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-pink-900">
      <header className="container mx-auto px-4 py-6">
        <div className="flex justify-between items-center">
          <Link to="/" className="flex items-center gap-2">
            <Dice1 className="h-8 w-8 text-purple-400 dice-animation" />
            <h1 className="text-2xl font-bold text-white">DiceyDecisions</h1>
          </Link>
          <Link to="/dashboard">
            <Button variant="outline" className="text-white border-white hover:bg-white/10">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          </Link>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-white mb-4">Create Decision Room</h2>
            <p className="text-gray-300">Set up a space for your group to submit options and vote</p>
          </div>

          <Card className="bg-white/10 border-white/20 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-white">Room Details</CardTitle>
              <CardDescription className="text-gray-300">
                Give your decision room a name and description
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="title" className="text-white">Room Title *</Label>
                  <Input
                    id="title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g., Where should we eat dinner?"
                    className="bg-white/10 border-white/20 text-white placeholder:text-gray-400"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description" className="text-white">Description</Label>
                  <Textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Add any additional context or rules..."
                    className="bg-white/10 border-white/20 text-white placeholder:text-gray-400 min-h-[100px]"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="maxParticipants" className="text-white">Maximum Participants</Label>
                  <div className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-gray-300" />
                    <Input
                      id="maxParticipants"
                      type="number"
                      min="2"
                      max="50"
                      value={maxParticipants}
                      onChange={(e) => setMaxParticipants(parseInt(e.target.value))}
                      className="bg-white/10 border-white/20 text-white w-32"
                    />
                    <span className="text-gray-300">people</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-white">Room Theme</Label>
                  <div className="flex gap-3">
                    {themeOptions.map(opt => (
                      <button
                        type="button"
                        key={opt.value}
                        className={`w-8 h-8 rounded-full border-2 ${opt.color} ${theme === opt.value ? 'ring-2 ring-white' : ''}`}
                        onClick={() => setTheme(opt.value)}
                        aria-label={opt.value}
                      />
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-white">Room Emoji</Label>
                  <div className="flex gap-2 flex-wrap">
                    {emojiOptions.map(opt => (
                      <button
                        type="button"
                        key={opt}
                        className={`text-2xl rounded-full border-2 px-2 ${emoji === opt ? 'border-white bg-white/20' : 'border-transparent'}`}
                        onClick={() => setEmoji(opt)}
                        aria-label={opt}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                </div>

                <Button 
                  type="submit" 
                  size="lg"
                  className="w-full bg-purple-600 hover:bg-purple-700"
                  disabled={isLoading || !title.trim()}
                >
                  {isLoading ? 'Creating Room...' : 'Create Room'}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default CreateRoom;

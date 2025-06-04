import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dice1, Plus, Clock, Users, Trophy, LogOut, Trash2, ArrowRight } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import confetti from 'canvas-confetti';

interface PastDecision {
  id: string;
  title: string;
  final_option_text?: string;
  resolved_at: string;
  tiebreaker_method?: string;
  participant_count: number;
  creator_id: string;
  archived?: boolean;
  theme?: string;
}

const badgeList = [
  {
    key: 'firstRoom',
    label: 'First Room Created',
    description: 'Create your first room.',
    unlock: (stats: any) => stats.roomsCreated >= 1,
  },
  {
    key: 'fiveRooms',
    label: '5 Rooms Created',
    description: 'Create 5 rooms.',
    unlock: (stats: any) => stats.roomsCreated >= 5,
  },
  {
    key: 'firstDecision',
    label: 'First Decision',
    description: 'Complete your first decision.',
    unlock: (stats: any) => stats.decisionsMade >= 1,
  },
  {
    key: 'tenDecisions',
    label: '10 Decisions',
    description: 'Complete 10 decisions.',
    unlock: (stats: any) => stats.decisionsMade >= 10,
  },
  {
    key: 'tiebreaker',
    label: 'Tiebreaker!',
    description: 'Win a decision with a tiebreaker.',
    unlock: (stats: any) => stats.tiebreakersUsed >= 1,
  },
  {
    key: 'archivist',
    label: 'Archivist',
    description: 'Archive a decision.',
    unlock: (stats: any) => stats.archived >= 1,
  },
  {
    key: 'stylish',
    label: 'Stylish',
    description: 'Create a room with a custom theme.',
    unlock: (stats: any) => stats.customTheme >= 1,
  },
];

const badgeIcons = {
  firstRoom: '🏠',
  fiveRooms: '🏠',
  firstDecision: '🎯',
  tenDecisions: '🎯',
  tiebreaker: '⚡',
  archivist: '📦',
  stylish: '🎨',
};

const Dashboard = () => {
  const { signOut, user } = useAuth();
  const navigate = useNavigate();
  const [pastDecisions, setPastDecisions] = useState<PastDecision[]>([]);
  const [loading, setLoading] = useState(true);
  const [roomCode, setRoomCode] = useState('');
  const [isJoining, setIsJoining] = useState(false);
  const [liveRooms, setLiveRooms] = useState<any[]>([]);
  const [badges, setBadges] = useState<{ [key: string]: boolean }>({});
  const [showArchived, setShowArchived] = useState(false);
  const [archivedRooms, setArchivedRooms] = useState<any[]>([]);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const rootBg = isDarkMode
    ? 'bg-gradient-to-br from-[#1a1333] via-[#2d1e4d] to-[#3a206e] min-h-screen transition-colors duration-500 dark'
    : 'bg-gradient-to-br from-[#6a4cff] via-[#a084ee] to-[#f1f1f1] min-h-screen transition-colors duration-500';
  const welcomeRef = useRef(null);
  const [welcomeVisible, setWelcomeVisible] = useState(false);
  const prevBadges = useRef<{ [key: string]: boolean }>({});

  useEffect(() => {
    fetchPastDecisions();
    fetchLiveRooms();
    fetchArchivedRooms();
  }, []);

  useEffect(() => {
    calculateBadges();
  }, [pastDecisions]);

  useEffect(() => {
    if (welcomeRef.current) {
      welcomeRef.current.classList.add('animate-slidein');
    }
  }, []);

  useEffect(() => {
    setTimeout(() => setWelcomeVisible(true), 100); // trigger animation after mount
  }, []);

  const fetchPastDecisions = async () => {
    try {
      const { data, error } = await supabase
        .from('rooms')
        .select(`
          id,
          title,
          resolved_at,
          tiebreaker_method,
          options!rooms_final_option_id_fkey (
            text
          ),
          participants (
            id
          ),
          creator_id,
          archived,
          theme
        `)
        .not('resolved_at', 'is', null)
        .order('resolved_at', { ascending: false });

      if (error || !Array.isArray(data)) throw error;

      const formattedDecisions = data.map(room => ({
        id: room.id,
        title: room.title,
        final_option_text: room.options?.[0]?.text,
        resolved_at: room.resolved_at,
        tiebreaker_method: room.tiebreaker_method,
        participant_count: room.participants?.length || 0,
        creator_id: room.creator_id,
        archived: room.archived,
        theme: room.theme,
      }));

      setPastDecisions(formattedDecisions);
    } catch (error: any) {
      console.error('Error fetching past decisions:', error);
      toast({
        title: "Error",
        description: "Failed to load past decisions",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchLiveRooms = async () => {
    try {
      const { data, error } = await supabase
        .from('rooms')
        .select('id, title, code, emoji, theme, creator_id, is_open, archived, voting_ended')
        .eq('archived', false)
        .eq('is_open', true)
        .eq('voting_ended', false);
      if (error) throw error;
      // Only show rooms where user is a participant
      const { data: participantData } = await supabase
        .from('participants')
        .select('room_id')
        .eq('user_id', user?.id);
      const userRoomIds = participantData?.map((p: any) => p.room_id) || [];
      setLiveRooms((data || []).filter((room: any) => userRoomIds.includes(room.id)));
    } catch (error) {
      setLiveRooms([]);
    }
  };

  const fetchArchivedRooms = async () => {
    try {
      const { data, error } = await supabase
        .from('rooms')
        .select('id, title, code, emoji, theme, creator_id, resolved_at, tiebreaker_method, participants (id), final_option_id, archived')
        .eq('archived', true)
        .order('resolved_at', { ascending: false });
      if (error) throw error;
      // Only show rooms where user is a participant
      const { data: participantData } = await supabase
        .from('participants')
        .select('room_id')
        .eq('user_id', user?.id);
      const userRoomIds = participantData?.map((p: any) => p.room_id) || [];
      setArchivedRooms((data || []).filter((room: any) => userRoomIds.includes(room.id)));
    } catch (error) {
      setArchivedRooms([]);
    }
  };

  const deleteRoom = async (roomId: string) => {
    try {
      const { error } = await supabase
        .from('rooms')
        .delete()
        .eq('id', roomId);
      if (error) throw error;
      toast({ title: 'Room deleted!', description: 'Room deleted successfully.' });
      fetchLiveRooms();
      fetchPastDecisions();
      fetchArchivedRooms();
      calculateBadges();
    } catch (error: any) {
      toast({ title: 'Error', description: 'Failed to delete room.', variant: 'destructive' });
    }
  };

  const archiveRoom = async (roomId: string) => {
    try {
      const { error } = await supabase
        .from('rooms')
        .update({ archived: true })
        .eq('id', roomId);
      if (error) throw error;
      toast({ title: 'Room archived!', description: 'Room archived successfully.' });
      fetchPastDecisions();
      fetchLiveRooms();
      fetchArchivedRooms();
      calculateBadges();
    } catch (error: any) {
      toast({ title: 'Error', description: 'Failed to archive room.', variant: 'destructive' });
    }
  };

  const unarchiveRoom = async (roomId: string) => {
    try {
      const { error } = await supabase
        .from('rooms')
        .update({ archived: false })
        .eq('id', roomId);
      if (error) throw error;
      toast({ title: 'Room unarchived!', description: 'Room is back in your past decisions.' });
      fetchPastDecisions();
      fetchLiveRooms();
      fetchArchivedRooms();
      calculateBadges();
    } catch (error: any) {
      toast({ title: 'Error', description: 'Failed to unarchive room.', variant: 'destructive' });
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getTiebreakerIcon = (method: string | null | undefined) => {
    switch (method) {
      case 'dice':
        return <Dice1 className="h-4 w-4 text-purple-400" />;
      case 'spinner':
        return <div className="h-4 w-4 rounded-full border-2 border-blue-400 border-t-transparent"></div>;
      case 'coin':
        return <div className="h-4 w-4 rounded-full bg-yellow-400"></div>;
      default:
        return <Trophy className="h-4 w-4 text-green-400" />;
    }
  };

  const handleJoinRoom = async () => {
    if (!roomCode.trim()) return;
    
    setIsJoining(true);
    try {
      // Check if room exists
      const { data: room, error: roomError } = await supabase
        .from('rooms')
        .select('*')
        .eq('code', roomCode.trim().toUpperCase())
        .single();

      if (roomError) throw new Error('Room not found');

      // Navigate to room
      navigate(`/rooms/${room.code}`);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Room not found. Please check the code and try again.",
        variant: "destructive",
      });
    } finally {
      setIsJoining(false);
      setRoomCode('');
    }
  };

  const calculateBadges = () => {
    // Calculate stats from rooms and decisions
    let roomsCreated = 0;
    let decisionsMade = 0;
    let tiebreakersUsed = 0;
    let archived = 0;
    let customTheme = 0;
    pastDecisions.forEach((d) => {
      if (d.creator_id === user?.id) roomsCreated++;
      if (d.resolved_at) decisionsMade++;
      if (d.tiebreaker_method) tiebreakersUsed++;
      if (d.archived) archived++;
      if (d.theme && d.theme !== 'purple') customTheme++;
    });
    const newBadges = {
      firstRoom: roomsCreated >= 1,
      fiveRooms: roomsCreated >= 5,
      firstDecision: decisionsMade >= 1,
      tenDecisions: decisionsMade >= 10,
      tiebreaker: tiebreakersUsed >= 1,
      archivist: archived >= 1,
      stylish: customTheme >= 1,
    };
    // Confetti and sound for new badge unlock
    Object.keys(newBadges).forEach(key => {
      if (newBadges[key] && !prevBadges.current[key]) {
        confetti({ particleCount: 80, spread: 70, origin: { y: 0.6 } });
        const audio = new Audio('/firework.mp3');
        audio.play();
      }
    });
    prevBadges.current = newBadges;
    setBadges(newBadges);
  };

  if (loading) {
    return (
      <div className={rootBg}>
        <div className="text-white text-xl">Loading dashboard...</div>
      </div>
    );
  }

  return (
    <div className={rootBg}>
      {/* Header */}
      <header className="container mx-auto px-4 py-8 flex justify-between items-center">
        <Link to="/" className="flex items-center gap-2">
          <Dice1 className="h-8 w-8 text-purple-400 dice-animation" />
          <h1 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-blue-300 tracking-tight font-mono drop-shadow-lg">DiceyDecisions</h1>
        </Link>
        <div className="flex gap-2 items-center">
          {/* Dark mode toggle with improved tooltip */}
          <div className="relative group">
            <Button onClick={() => setIsDarkMode(v => !v)} className={`mr-2 px-4 py-2 rounded-full font-bold shadow-lg transition-all duration-300 ${isDarkMode ? 'bg-yellow-400 text-black' : 'bg-black/70 text-yellow-300 hover:bg-black/90'}`}>{isDarkMode ? 'Default Mode' : 'Dark Mode'}</Button>
          </div>
          {/* Profile dropdown */}
          <div className="relative group">
            <button className="flex items-center gap-2 text-white border-white hover:bg-white/10 px-3 py-2 rounded-full focus:outline-none shadow-lg">
              <span className="w-8 h-8 rounded-full bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center text-lg font-bold uppercase border-2 border-white shadow-md">
                {user?.user_metadata?.full_name?.[0] || user?.email?.[0] || 'U'}
              </span>
              <span className="font-semibold text-lg">{user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User'}</span>
              <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
            </button>
            <div className="absolute right-0 mt-2 w-40 bg-white rounded shadow-lg opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity z-50">
              <button onClick={handleSignOut} className="block w-full text-left px-4 py-2 text-gray-700 hover:bg-purple-100 font-semibold">Logout</button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-12">
        {/* Welcome Section */}
        <div className="mb-12 text-left max-w-3xl mx-auto">
          <div className={`transition-all duration-700 ${welcomeVisible ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-16'}`}>
            <h2 className="text-5xl font-extrabold mb-2 tracking-tight text-white drop-shadow-lg dark:text-yellow-200">
              Welcome back, <span className="bg-gradient-to-r from-purple-300 to-blue-300 text-transparent bg-clip-text dark:from-yellow-400 dark:to-pink-400">{user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User'}</span>!
            </h2>
            <p className="text-blue-100 text-lg mb-8 font-medium drop-shadow dark:text-yellow-100">
              Ready to make some decisions? Your friends are waiting to see what you'll choose next.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-8 mt-4">
            <Link to="/rooms/create">
              <Button size="lg" className="bg-gradient-to-r from-purple-600 to-teal-400 hover:from-teal-400 hover:to-purple-600 text-white font-bold px-12 py-6 rounded-2xl shadow-2xl text-2xl flex items-center gap-4">
                <span className="text-3xl">🪙</span> Create New Room
              </Button>
            </Link>
            <Dialog>
              <DialogTrigger asChild>
                <Button size="lg" variant="outline" className="border-4 border-purple-300 text-purple-100 hover:bg-purple-800 font-bold px-12 py-6 rounded-2xl shadow-2xl text-2xl flex items-center gap-4">
                  <span className="text-3xl">🔍</span> Join Room
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-blue-900/90 border-white/20 backdrop-blur-sm rounded-2xl">
                <DialogHeader>
                  <DialogTitle className="text-purple-200 font-bold">Join a Room</DialogTitle>
                  <DialogDescription className="text-blue-100">
                    Enter the 6-character room code to join
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <Input
                    value={roomCode}
                    onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                    placeholder="Enter room code"
                    className="bg-blue-900 border border-purple-400 text-purple-200 placeholder:text-blue-200 rounded-full px-4 py-2"
                    maxLength={6}
                  />
                  <Button
                    onClick={handleJoinRoom}
                    disabled={isJoining || roomCode.length !== 6}
                    className="w-full bg-gradient-to-r from-purple-600 to-teal-400 hover:from-teal-400 hover:to-purple-600 text-white font-bold px-6 py-3 rounded-full shadow-lg transition-all duration-300"
                  >
                    {isJoining ? 'Joining...' : 'Join Room'}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid md:grid-cols-3 gap-8 mb-8">
          <div className="rounded-2xl bg-purple-50 shadow-lg p-6 flex flex-col items-center">
            <span className="text-2xl mb-1">🎯</span>
            <span className="text-xl font-extrabold text-purple-700">{pastDecisions.length}</span>
            <span className="text-base text-gray-500 font-semibold mt-1">Decisions Made</span>
          </div>
          <div className="rounded-2xl bg-teal-50 shadow-lg p-6 flex flex-col items-center">
            <span className="text-2xl mb-1">👥</span>
            <span className="text-xl font-extrabold text-teal-700">{pastDecisions.reduce((sum, decision) => sum + decision.participant_count, 0)}</span>
            <span className="text-base text-gray-500 font-semibold mt-1">Total Participants</span>
          </div>
          <div className="rounded-2xl bg-purple-50 shadow-lg p-6 flex flex-col items-center">
            <span className="text-2xl mb-1">⚡</span>
            <span className="text-xl font-extrabold text-yellow-500">{pastDecisions.filter(d => d.tiebreaker_method).length}</span>
            <span className="text-base text-gray-500 font-semibold mt-1">Tiebreakers Used</span>
          </div>
        </div>

        {/* Achievements/Badges */}
        <div className="mb-10">
          <h3 className="text-2xl font-bold mb-4 flex items-center gap-2">
            Achievements <span className="flex-1 border-b-2 border-purple-200"></span>
          </h3>
          <div className="flex flex-wrap gap-4 justify-center">
            {badgeList.map((badge, idx) => (
              <div key={badge.key} className={`rounded-2xl p-4 flex flex-col items-center shadow-md transition-all duration-300 ${badges[badge.key] ? 'bg-yellow-50 border-2 border-yellow-300 scale-105' : 'bg-gray-50 border border-gray-200 opacity-60'}`}
                style={{ minWidth: 110 }}>
                <span className="text-2xl mb-1">{badgeIcons[badge.key] || '⭐'}</span>
                <span className="font-bold text-base mb-1">{badge.label}</span>
                <span className="text-xs text-gray-500 mb-1">{badge.description}</span>
                <span className={`text-xs font-semibold ${badges[badge.key] ? 'text-yellow-600' : 'text-gray-400'}`}>{badges[badge.key] ? 'Unlocked' : 'Locked'}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Live Rooms Section */}
        <div className="mb-10">
          <div className="flex items-center gap-2 mb-4">
            <h3 className="text-2xl font-bold">Live Rooms</h3>
            <span className="ml-2 text-green-600 font-semibold">• {liveRooms.length} active</span>
            <span className="flex-1 border-b-2 border-purple-200"></span>
          </div>
          <div className="flex flex-wrap gap-6">
            {liveRooms.map(room => (
              <div key={room.id} className="rounded-2xl bg-white shadow-xl p-6 flex flex-col items-start min-w-[280px] max-w-xs border-t-4 border-purple-300 relative">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-lg font-bold text-gray-700">{room.title}</span>
                  {room.emoji && <span className="text-2xl ml-1">{room.emoji}</span>}
                </div>
                <p className="text-xs text-gray-400 mb-1">Created by: {room.creator_id === user?.id ? 'You' : 'Private'}</p>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs text-gray-400">Code:</span>
                  <span className="px-2 py-1 rounded bg-purple-100 text-purple-700 font-mono text-xs font-bold">{room.code}</span>
                </div>
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-xs text-gray-400">Participants</span>
                  <span className="font-bold text-lg text-gray-700">{room.participants?.length || 0}</span>
                  {room.max_participants && <span className="text-xs text-gray-400">/ {room.max_participants}</span>}
                </div>
                <div className="w-full h-2 bg-purple-100 rounded-full mb-4">
                  <div className="h-2 rounded-full bg-gradient-to-r from-purple-400 to-teal-400" style={{ width: `${((room.participants?.length || 0) / (room.max_participants || 8)) * 100}%` }}></div>
                </div>
                <Link to={`/rooms/${room.code}`} className="w-full">
                  <Button className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-pink-500 hover:to-purple-500 text-white font-bold py-2 rounded-xl shadow-md transition-all duration-300">Enter Room</Button>
                </Link>
              </div>
            ))}
          </div>
        </div>

        {/* Past Decisions */}
        <div className="mb-10">
          <h3 className="text-2xl font-bold mb-4 flex items-center gap-2 text-[#2d1e4d] dark:text-yellow-100">
            Past Decisions <span className="flex-1 border-b-2 border-purple-200 dark:border-yellow-300"></span>
          </h3>
          <div className="flex flex-col gap-6">
            {pastDecisions.filter(d => !d.archived).map((decision) => (
              <div key={decision.id} className="rounded-2xl bg-white dark:bg-[#2d1e4d] shadow-xl p-8 flex flex-col md:flex-row md:items-center justify-between border-t-4 border-purple-300 dark:border-yellow-400">
                <div className="flex-1 mb-4 md:mb-0">
                  <h4 className="font-bold text-xl text-[#2d1e4d] dark:text-yellow-100 mb-2">{decision.title}</h4>
                  <p className="text-sm text-gray-500 dark:text-yellow-200 mb-1">Created by: {decision.creator_id === user?.id ? 'You' : 'Private'}</p>
                  {decision.final_option_text && (
                    <p className="text-purple-600 dark:text-yellow-300 font-medium mb-2">
                      Winner: {decision.final_option_text}
                    </p>
                  )}
                  <div className="flex items-center gap-6 text-sm text-gray-500 dark:text-yellow-200">
                    <span className="flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      {formatDate(decision.resolved_at)}
                    </span>
                    <span className="flex items-center gap-1">
                      <Users className="h-4 w-4" />
                      {decision.participant_count} participants
                    </span>
                    {decision.tiebreaker_method ? (
                      <span className="flex items-center gap-1">
                        {getTiebreakerIcon(decision.tiebreaker_method)}
                        Decided by {decision.tiebreaker_method} tiebreaker
                      </span>
                    ) : (
                      <span className="flex items-center gap-1">
                        <Trophy className="h-4 w-4 text-green-400" />
                        Winner by Majority
                      </span>
                    )}
                  </div>
                </div>
                {user && decision.creator_id === user.id && (
                  <div className="flex gap-2 ml-4">
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-yellow-400 border-yellow-400 dark:text-yellow-200 dark:border-yellow-200"
                      onClick={() => archiveRoom(decision.id)}
                    >
                      Archive
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => deleteRoom(decision.id)}
                    >
                      Delete
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
          {/* Show Archived Button */}
          <div className="mt-6 text-center">
            <Button variant="outline" className="text-white border-white" onClick={() => setShowArchived(v => !v)}>
              {showArchived ? 'Hide Archived' : 'Show Archived'}
            </Button>
          </div>
          {/* Archived List */}
          {showArchived && (
            <div className="mt-6 space-y-4">
              <h4 className="text-lg font-bold text-yellow-400 mb-2">Archived Decisions</h4>
              {archivedRooms.length === 0 ? (
                <div className="text-gray-300">No archived decisions.</div>
              ) : (
                archivedRooms.map((room) => (
                  <div key={room.id} className="flex items-center justify-between p-4 bg-yellow-900/20 rounded-lg border border-yellow-400/30">
                    <div className="flex-1">
                      <h3 className="font-semibold text-white mb-1">{room.title}</h3>
                      <div className="flex items-center gap-4 text-sm text-gray-300">
                        <span className="flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          {formatDate(room.resolved_at)}
                        </span>
                        {room.tiebreaker_method ? (
                          <span className="flex items-center gap-1">
                            {getTiebreakerIcon(room.tiebreaker_method)}
                            Decided by {room.tiebreaker_method} tiebreaker
                          </span>
                        ) : (
                          <span className="flex items-center gap-1">
                            <Trophy className="h-4 w-4 text-green-400" />
                            Winner by Majority
                          </span>
                        )}
                      </div>
                    </div>
                    {user && room.creator_id === user.id && (
                      <Button size="sm" variant="outline" className="text-green-400 border-green-400 ml-4" onClick={() => unarchiveRoom(room.id)}>
                        Unarchive
                      </Button>
                    )}
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default Dashboard;
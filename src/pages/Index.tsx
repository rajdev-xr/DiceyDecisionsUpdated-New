
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dice1, Users, Vote, Trophy } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

const Index = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Redirect authenticated users to dashboard
  useEffect(() => {
    if (user) {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-pink-900">
      {/* Header */}
      <header className="container mx-auto px-4 py-6">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Dice1 className="h-8 w-8 text-purple-400 dice-animation" />
            <h1 className="text-2xl font-bold text-white">DiceyDecisions</h1>
          </div>
          <div className="flex gap-2">
            <Link to="/login">
              <Button variant="outline" className="text-white border-white hover:bg-white/10">
                Login
              </Button>
            </Link>
            <Link to="/register">
              <Button className="bg-purple-600 hover:bg-purple-700">
                Sign Up
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="container mx-auto px-4 py-12">
        <div className="text-center mb-16">
          <h2 className="text-5xl font-bold text-white mb-6">
            Can't Decide? <span className="text-purple-400">Let's Roll!</span>
          </h2>
          <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto">
            The fun way to make group decisions. Create a room, gather options, vote together, 
            and let fate decide with animated tiebreakers!
          </p>
          <div className="flex gap-4 justify-center">
            <Link to="/register">
              <Button size="lg" className="bg-purple-600 hover:bg-purple-700 text-lg px-8 py-3">
                Get Started
              </Button>
            </Link>
            <Link to="/login">
              <Button size="lg" variant="outline" className="text-white border-white hover:bg-white/10 text-lg px-8 py-3">
                Sign In
              </Button>
            </Link>
          </div>
        </div>

        {/* Features */}
        <div className="grid md:grid-cols-3 gap-8 mb-16">
          <Card className="bg-white/10 border-white/20 backdrop-blur-sm">
            <CardHeader className="text-center">
              <Users className="h-12 w-12 text-purple-400 mx-auto mb-4" />
              <CardTitle className="text-white">Gather Friends</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-gray-300 text-center">
                Share a room code and let everyone submit their ideas. The more options, the merrier!
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="bg-white/10 border-white/20 backdrop-blur-sm">
            <CardHeader className="text-center">
              <Vote className="h-12 w-12 text-blue-400 mx-auto mb-4" />
              <CardTitle className="text-white">Vote Together</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-gray-300 text-center">
                Anonymous voting ensures everyone's voice is heard equally. No pressure, just fun!
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="bg-white/10 border-white/20 backdrop-blur-sm">
            <CardHeader className="text-center">
              <Trophy className="h-12 w-12 text-pink-400 mx-auto mb-4" />
              <CardTitle className="text-white">Let Fate Decide</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-gray-300 text-center">
                Tied votes? Watch the dice roll, spinner spin, or coin flip to break the tie!
              </CardDescription>
            </CardContent>
          </Card>
        </div>

        {/* Demo Section */}
        <div className="text-center">
          <h3 className="text-3xl font-bold text-white mb-8">How It Works</h3>
          <div className="grid md:grid-cols-4 gap-4 max-w-4xl mx-auto">
            <div className="bg-white/10 rounded-lg p-6 backdrop-blur-sm">
              <div className="text-2xl font-bold text-purple-400 mb-2">1</div>
              <p className="text-white font-semibold mb-2">Create Room</p>
              <p className="text-gray-300 text-sm">Set up your decision room with a catchy title</p>
            </div>
            <div className="bg-white/10 rounded-lg p-6 backdrop-blur-sm">
              <div className="text-2xl font-bold text-blue-400 mb-2">2</div>
              <p className="text-white font-semibold mb-2">Add Options</p>
              <p className="text-gray-300 text-sm">Everyone submits their ideas</p>
            </div>
            <div className="bg-white/10 rounded-lg p-6 backdrop-blur-sm">
              <div className="text-2xl font-bold text-pink-400 mb-2">3</div>
              <p className="text-white font-semibold mb-2">Vote</p>
              <p className="text-gray-300 text-sm">Cast your vote secretly</p>
            </div>
            <div className="bg-white/10 rounded-lg p-6 backdrop-blur-sm">
              <div className="text-2xl font-bold text-yellow-400 mb-2">4</div>
              <p className="text-white font-semibold mb-2">Decide</p>
              <p className="text-gray-300 text-sm">See results or break ties with fun animations</p>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="container mx-auto px-4 py-8 text-center text-gray-400">
        <p>© 2024 DiceyDecisions - Making group decisions fun again!</p>
      </footer>
    </div>
  );
};

export default Index;

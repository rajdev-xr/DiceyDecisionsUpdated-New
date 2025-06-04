import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dice1 } from 'lucide-react';
import type { Database } from '@/integrations/supabase/types';
import confetti from 'canvas-confetti';

type TiebreakerMethod = Database['public']['Enums']['tiebreaker_method'];

interface Room {
  id: string;
  title: string;
}

interface Option {
  id: string;
  text: string;
}

interface TiebreakerAnimationProps {
  room: Room;
  tiedOptions: Option[];
  onComplete: (method: TiebreakerMethod, winnerOptionId: string) => void;
  isCreator: boolean;
}

const diceFaces = [
  // SVGs for dice faces 1-6
  <svg key={1} viewBox="0 0 64 64" className="w-24 h-24 mx-auto mb-4"><rect width="64" height="64" rx="16" fill="#a78bfa"/><circle cx="32" cy="32" r="6" fill="#fff"/></svg>,
  <svg key={2} viewBox="0 0 64 64" className="w-24 h-24 mx-auto mb-4"><rect width="64" height="64" rx="16" fill="#a78bfa"/><circle cx="18" cy="18" r="6" fill="#fff"/><circle cx="46" cy="46" r="6" fill="#fff"/></svg>,
  <svg key={3} viewBox="0 0 64 64" className="w-24 h-24 mx-auto mb-4"><rect width="64" height="64" rx="16" fill="#a78bfa"/><circle cx="18" cy="18" r="6" fill="#fff"/><circle cx="32" cy="32" r="6" fill="#fff"/><circle cx="46" cy="46" r="6" fill="#fff"/></svg>,
  <svg key={4} viewBox="0 0 64 64" className="w-24 h-24 mx-auto mb-4"><rect width="64" height="64" rx="16" fill="#a78bfa"/><circle cx="18" cy="18" r="6" fill="#fff"/><circle cx="46" cy="18" r="6" fill="#fff"/><circle cx="18" cy="46" r="6" fill="#fff"/><circle cx="46" cy="46" r="6" fill="#fff"/></svg>,
  <svg key={5} viewBox="0 0 64 64" className="w-24 h-24 mx-auto mb-4"><rect width="64" height="64" rx="16" fill="#a78bfa"/><circle cx="18" cy="18" r="6" fill="#fff"/><circle cx="46" cy="18" r="6" fill="#fff"/><circle cx="32" cy="32" r="6" fill="#fff"/><circle cx="18" cy="46" r="6" fill="#fff"/><circle cx="46" cy="46" r="6" fill="#fff"/></svg>,
  <svg key={6} viewBox="0 0 64 64" className="w-24 h-24 mx-auto mb-4"><rect width="64" height="64" rx="16" fill="#a78bfa"/><circle cx="18" cy="18" r="6" fill="#fff"/><circle cx="46" cy="18" r="6" fill="#fff"/><circle cx="18" cy="32" r="6" fill="#fff"/><circle cx="46" cy="32" r="6" fill="#fff"/><circle cx="18" cy="46" r="6" fill="#fff"/><circle cx="46" cy="46" r="6" fill="#fff"/></svg>,
];

const coinSVG = (side: 'heads' | 'tails') => (
  <svg viewBox="0 0 64 64" className="w-24 h-24 mx-auto mb-4 animate-flip">
    <circle cx="32" cy="32" r="28" fill="#fde68a" stroke="#f59e42" strokeWidth="4" />
    {side === 'heads' ? (
      <text x="32" y="40" textAnchor="middle" fontSize="28" fill="#f59e42" fontWeight="bold">H</text>
    ) : (
      <text x="32" y="40" textAnchor="middle" fontSize="28" fill="#f59e42" fontWeight="bold">T</text>
    )}
  </svg>
);

const spinnerSVG = (angle: number) => (
  <svg viewBox="0 0 64 64" className="w-24 h-24 mx-auto mb-4">
    <circle cx="32" cy="32" r="28" fill="#a5b4fc" stroke="#6366f1" strokeWidth="4" />
    <g transform={`rotate(${angle} 32 32)`}>
      <rect x="30" y="8" width="4" height="24" rx="2" fill="#f59e42" />
      <polygon points="32,4 38,18 26,18" fill="#f59e42" />
    </g>
  </svg>
);

const TiebreakerAnimation: React.FC<TiebreakerAnimationProps> = ({
  room,
  tiedOptions,
  onComplete,
  isCreator
}) => {
  const [selectedMethod, setSelectedMethod] = useState<TiebreakerMethod | null>(null);
  const [animating, setAnimating] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [diceFace, setDiceFace] = useState(0);
  const [coinSide, setCoinSide] = useState<'heads' | 'tails'>('heads');
  const [spinnerAngle, setSpinnerAngle] = useState(0);

  const playSound = (method: TiebreakerMethod) => {
    let src = '';
    if (method === 'dice') src = '/dice-roll.mp3';
    if (method === 'spinner') src = '/spinner.mp3';
    if (method === 'coin') src = '/coin-flip.mp3';
    if (src) {
      const audio = new Audio(src);
      audio.play();
    }
  };

  const runTiebreaker = async (method: TiebreakerMethod) => {
    setSelectedMethod(method);
    setAnimating(true);
    playSound(method);

    if (method === 'dice') {
      // Animate dice face
      let rolls = 10;
      for (let i = 0; i < rolls; i++) {
        setDiceFace(Math.floor(Math.random() * 6));
        await new Promise(r => setTimeout(r, 120));
      }
    }
    if (method === 'coin') {
      // Animate coin flip
      for (let i = 0; i < 8; i++) {
        setCoinSide(i % 2 === 0 ? 'heads' : 'tails');
        await new Promise(r => setTimeout(r, 100));
      }
    }
    if (method === 'spinner') {
      // Animate spinner
      for (let i = 0; i < 24; i++) {
        setSpinnerAngle(i * 15);
        await new Promise(r => setTimeout(r, 40));
      }
    }

    // Simulate animation delay
    await new Promise(resolve => setTimeout(resolve, 800));

    // Use crypto.getRandomValues for better randomness
    const array = new Uint32Array(1);
    crypto.getRandomValues(array);
    const randomIndex = array[0] % tiedOptions.length;
    const winner = tiedOptions[randomIndex];

    // Set final animation state for result
    if (method === 'dice') setDiceFace((randomIndex % 6));
    if (method === 'coin') setCoinSide(randomIndex % 2 === 0 ? 'heads' : 'tails');
    if (method === 'spinner') setSpinnerAngle(360 + randomIndex * (360 / tiedOptions.length));

    setResult(winner.id);
    setAnimating(false);

    // Confetti and sound on result
    setTimeout(() => {
      confetti({ particleCount: 100, spread: 80, origin: { y: 0.6 } });
      const audio = new Audio('/firework.mp3');
      audio.play();
      onComplete(method, winner.id);
    }, 2000);
  };

  const renderAnimation = () => {
    if (!selectedMethod || !animating) return null;
    switch (selectedMethod) {
      case 'dice':
        return (
          <div className="text-center py-8">
            {diceFaces[diceFace]}
            <p className="text-white text-xl">Rolling the dice...</p>
          </div>
        );
      case 'spinner':
        return (
          <div className="text-center py-8">
            {spinnerSVG(spinnerAngle)}
            <p className="text-white text-xl">Spinning the wheel...</p>
          </div>
        );
      case 'coin':
        return (
          <div className="text-center py-8">
            {coinSVG(coinSide)}
            <p className="text-white text-xl">Flipping the coin...</p>
          </div>
        );
      default:
        return null;
    }
  };

  const getResultText = () => {
    const winner = tiedOptions.find(option => option.id === result);
    return winner ? winner.text : '';
  };

  if (result) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-pink-900 flex items-center justify-center">
        <Card className="w-full max-w-md bg-white/10 border-white/20 backdrop-blur-sm">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl text-white">Tiebreaker Result!</CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <div className="py-8">
              <p className="text-3xl font-bold text-green-400 mb-4">{getResultText()}</p>
              <p className="text-gray-300">Decided by {selectedMethod}!</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (animating) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-pink-900 flex items-center justify-center">
        <Card className="w-full max-w-md bg-white/10 border-white/20 backdrop-blur-sm">
          <CardContent>
            {renderAnimation()}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-pink-900 flex items-center justify-center">
      <Card className="w-full max-w-md bg-white/10 border-white/20 backdrop-blur-sm">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl text-white">It's a Tie!</CardTitle>
          <p className="text-gray-300 mt-2">
            {tiedOptions.length} options are tied. Choose how to break the tie:
          </p>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {tiedOptions.map((option) => (
              <div
                key={option.id}
                className="p-3 bg-white/10 rounded-lg border border-white/20"
              >
                <p className="text-white font-medium">{option.text}</p>
              </div>
            ))}
          </div>

          {isCreator && (
            <div className="mt-6 space-y-3">
              <p className="text-white font-medium text-center">Choose a tiebreaker method:</p>
              <div className="grid grid-cols-3 gap-3">
                <Button
                  onClick={() => runTiebreaker('dice')}
                  className="bg-purple-600 hover:bg-purple-700 flex flex-col items-center py-6"
                >
                  <Dice1 className="h-8 w-8 mb-2" />
                  Dice
                </Button>
                <Button
                  onClick={() => runTiebreaker('spinner')}
                  className="bg-blue-600 hover:bg-blue-700 flex flex-col items-center py-6"
                >
                  <div className="h-8 w-8 mb-2 rounded-full border-2 border-white border-t-transparent"></div>
                  Spinner
                </Button>
                <Button
                  onClick={() => runTiebreaker('coin')}
                  className="bg-yellow-600 hover:bg-yellow-700 flex flex-col items-center py-6"
                >
                  <div className="h-8 w-8 mb-2 rounded-full bg-white"></div>
                  Coin
                </Button>
              </div>
            </div>
          )}

          {!isCreator && (
            <div className="mt-6 text-center">
              <p className="text-gray-300">Waiting for the room creator to select a tiebreaker method...</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default TiebreakerAnimation;

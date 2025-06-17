import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Palette, Users, Zap } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { v4 as uuidv4 } from "uuid";
import { socketService } from "@/services/socketService";

const Index = () => {
  const [username, setUsername] = useState("");
  const [roomId, setRoomId] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const validateInputs = () => {
    if (!username.trim()) {
      toast({
        title: "Username required",
        description: "Please enter a username to continue",
        variant: "destructive"
      });
      return false;
    }
    if (!roomId.trim()) {
      toast({
        title: "Room ID required", 
        description: "Please enter a room ID to continue",
        variant: "destructive"
      });
      return false;
    }
    if (!password.trim()) {
      toast({
        title: "Password required",
        description: "Please enter a password to continue", 
        variant: "destructive"
      });
      return false;
    }
    return true;
  };

  const handleCreateRoom = async () => {
    if (!validateInputs()) return;
    
    setIsLoading(true);
    
    try {
      // Connect to socket
      const socket = socketService.connect();
      
      // Set up event listeners
      socketService.onRoomCreated((data) => {
        const { creatorToken } = data;
        
        // Store session data
        localStorage.setItem("username", username);
        localStorage.setItem("roomId", roomId);
        localStorage.setItem("password", password);
        localStorage.setItem("isCreator", "true");
        localStorage.setItem("creatorToken", creatorToken);
        
        toast({
          title: "Room created!",
          description: `Created room "${roomId}" successfully`
        });
        
        // Navigate to whiteboard
        navigate(`/room/${roomId}`);
        setIsLoading(false);
      });

      socketService.onRoomError((error) => {
        toast({
          title: "Error creating room",
          description: error.message,
          variant: "destructive"
        });
        setIsLoading(false);
        socketService.disconnect();
      });

      // Create room
      socketService.createRoom(roomId, password, username);
      
    } catch (error) {
      toast({
        title: "Connection error",
        description: "Failed to connect to server. Please try again.",
        variant: "destructive"
      });
      setIsLoading(false);
    }
  };

  const handleJoinRoom = async () => {
    if (!validateInputs()) return;
    
    setIsLoading(true);
    
    try {
      // Connect to socket
      const socket = socketService.connect();
      
      // Set up event listeners
      socketService.onRoomJoined((data) => {
        // Store session data
        localStorage.setItem("username", username);
        localStorage.setItem("roomId", roomId);
        localStorage.setItem("password", password);
        localStorage.setItem("isCreator", "false");
        
        toast({
          title: "Joined room!",
          description: `Connected to room "${roomId}"`
        });
        
        // Navigate to whiteboard
        navigate(`/room/${roomId}`);
        setIsLoading(false);
      });

      socketService.onRoomError((error) => {
        toast({
          title: "Error joining room",
          description: error.message,
          variant: "destructive"
        });
        setIsLoading(false);
        socketService.disconnect();
      });

      // Join room
      socketService.joinRoom(roomId, password, username);
      
    } catch (error) {
      toast({
        title: "Connection error",
        description: "Failed to connect to server. Please try again.",
        variant: "destructive"
      });
      setIsLoading(false);
    }
  };

  const generateRoomId = () => {
    const randomId = Math.random().toString(36).substring(2, 8).toUpperCase();
    setRoomId(randomId);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center p-4">
      <div className="w-full max-w-4xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
              <Palette className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              QuickBoard
            </h1>
          </div>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Create or join a collaborative whiteboard room and start drawing together in real-time
          </p>
        </div>

        {/* Main Form */}
        <Card className="mx-auto max-w-lg shadow-xl border-0 bg-white/80 backdrop-blur-sm">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">Enter Room Details</CardTitle>
            <CardDescription>
              Fill in all fields to create or join a whiteboard room
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                placeholder="Enter your display name"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="text-lg"
              />
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="roomId">Room ID</Label>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={generateRoomId}
                  className="text-xs"
                >
                  Generate
                </Button>
              </div>
              <Input
                id="roomId"
                placeholder="Enter or generate room ID"
                value={roomId}
                onChange={(e) => setRoomId(e.target.value.toUpperCase())}
                className="text-lg font-mono"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="password">Room Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Enter room password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="text-lg"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4 pt-4">
              <Button 
                onClick={handleCreateRoom}
                disabled={isLoading}
                className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700"
              >
                {isLoading ? "Creating..." : "Create Room"}
              </Button>
              <Button 
                onClick={handleJoinRoom}
                disabled={isLoading}
                variant="outline"
                className="border-2"
              >
                {isLoading ? "Joining..." : "Join Room"}
              </Button>
            </div>
          </CardContent>
        </Card>
        
        <div className="text-center mt-8 text-sm text-muted-foreground">
          <p>No signup required • Start drawing immediately • Share your room ID with others</p>
        </div>
      </div>
    </div>
  );
};

export default Index;

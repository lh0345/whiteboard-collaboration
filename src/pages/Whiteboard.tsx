import React, { useEffect, useRef, useState, useCallback } from 'react';
import fabric from 'fabric';
import { useParams, useNavigate } from 'react-router-dom';
import { Canvas as FabricCanvas, PencilBrush, Path } from 'fabric';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Palette, Eraser, Trash2, Users, LogOut, Maximize2, Minimize2, Download } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { socketService, User, DrawingEvent } from '@/services/socketService';

const Whiteboard = () => {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fabricCanvas = useRef<FabricCanvas | null>(null);

  const [users, setUsers] = useState<User[]>([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [brushColor, setBrushColor] = useState('#000000');
  const [brushSize, setBrushSize] = useState(5);
  const [isErasing, setIsErasing] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  // --- NEW: Undo/Redo stacks for current client session ---
  const undoStack = useRef<DrawingEvent[]>([]);
  const redoStack = useRef<DrawingEvent[]>([]);

  // --- NEW: Fullscreen toggle state ---
  const [isFullScreen, setIsFullScreen] = useState(false);

  // Session data
  const username = localStorage.getItem('username') || 'Anonymous';
  const password = localStorage.getItem('password') || '';
  const isCreator = localStorage.getItem('isCreator') === 'true';
  const creatorToken = localStorage.getItem('creatorToken');

  const colors = [
    '#000000', '#FF0000', '#00FF00', '#0000FF', '#FFFF00',
    '#FF00FF', '#00FFFF', '#FFA500', '#800080', '#FFC0CB'
  ];

  const initBrush = (canvas: FabricCanvas) => {
    const brush = new PencilBrush(canvas);
    brush.color = brushColor;
    brush.width = brushSize;
    canvas.freeDrawingBrush = brush;
  };

  useEffect(() => {
if (!canvasRef.current) return;

const canvas = new FabricCanvas(canvasRef.current, {
  isDrawingMode: true,
  width: 800,
  height: 600,
  backgroundColor: 'white'
});

// Create a new PencilBrush and assign to freeDrawingBrush
const brush = new PencilBrush(canvas);
brush.color = brushColor;
brush.width = brushSize;
canvas.freeDrawingBrush = brush;

canvas.selection = false;

fabricCanvas.current = canvas;

    return () => {
      canvas.dispose();
    };
  }, []);

  useEffect(() => {
    if (fabricCanvas.current) {
      if (isErasing) {
        const brush = new PencilBrush(fabricCanvas.current);
        brush.width = brushSize * 2;
        brush.color = 'rgba(0,0,0,1)'; // color doesn't matter
        fabricCanvas.current.freeDrawingBrush = brush;
      } else {
        const brush = new PencilBrush(fabricCanvas.current);
        brush.color = brushColor;
        brush.width = brushSize;
        fabricCanvas.current.freeDrawingBrush = brush;
      }
    }
  }, [brushColor, brushSize, isErasing]);

  useEffect(() => {
    if (!roomId) {
      navigate('/');
      return;
    }

    const socket = socketService.connect();

    socketService.onConnect(() => {
      setIsConnected(true);
      socketService.joinRoom(roomId, password, username, creatorToken);
    });

    socketService.onDisconnect(() => {
      setIsConnected(false);
    });

    socketService.onRoomJoined((data) => {
      setCurrentUser(data.user);
      setUsers(data.users);

      if (data.drawings && fabricCanvas.current) {
        // --- NEW: Clear undo/redo on load ---
        undoStack.current = [];
        redoStack.current = [];

        data.drawings.forEach((drawing: DrawingEvent) => {
          applyDrawingEvent(drawing, false);
        });
      }
    });

    socketService.onRoomError((error) => {
      toast({
        title: "Room Error",
        description: error.message,
        variant: "destructive"
      });
      navigate('/');
    });

    socketService.onUsersUpdated(setUsers);

    socketService.onUserJoined((user) => {
      toast({ title: "User Joined", description: `${user.username} joined the room` });
    });

    socketService.onUserLeft((user) => {
      toast({ title: "User Left", description: `${user.username} left the room` });
    });

    socketService.onDrawingEvent((event) => {
      // If the event is from other users, add to undo stack here if you want to sync undo/redo globally (optional)
      applyDrawingEvent(event, true);
    });

    socketService.onBoardCleared(() => {
      if (fabricCanvas.current) {
        fabricCanvas.current.clear();
        fabricCanvas.current.backgroundColor = 'white';
        fabricCanvas.current.renderAll();

        // Clear local undo/redo stacks
        undoStack.current = [];
        redoStack.current = [];
      }
    });

    socketService.onRoomTerminated(() => {
      toast({
        title: "Room Terminated",
        description: "The room has been terminated by the creator"
      });
      navigate('/');
    });

    return () => {
      socketService.disconnect();
    };
  }, [roomId, navigate, username, password, creatorToken]);

  useEffect(() => {
    if (!fabricCanvas.current) return;

    const canvas = fabricCanvas.current;

    const handlePathCreated = (e: any) => {
    const path = e.path;
    if (!path) return;

    if (isErasing) {
      path.globalCompositeOperation = 'destination-out';
    }

    const drawingEvent: DrawingEvent = {
      type: isErasing ? 'erase' : 'path',
      data: path.toObject(),
      color: isErasing ? 'transparent' : brushColor,
      userId: currentUser?.id || 'anonymous',       // add userId
      username: currentUser?.username || username,  // add username
      timestamp: new Date()      
    };

    // --- NEW: Push event into undo stack & clear redo ---
    undoStack.current.push(drawingEvent);
    redoStack.current = [];

    socketService.sendDrawingEvent(drawingEvent);
};

    canvas.on('path:created', handlePathCreated);

    return () => {
      canvas.off('path:created', handlePathCreated);
    };
  }, [brushColor, isErasing]);

  const applyDrawingEvent = (event: DrawingEvent, pushToUndo = false) => {
    if (!fabricCanvas.current) return;

    if (event.type === 'clear') {
      fabricCanvas.current.clear();
      fabricCanvas.current.backgroundColor = 'white';
      fabricCanvas.current.renderAll();

      if (pushToUndo) {
        undoStack.current.push(event);
        redoStack.current = [];
      }
    } else if (event.type === 'path' || event.type === 'erase') {
      Path.fromObject(event.data).then((path: Path) => {
        if (!path || !fabricCanvas.current) return;

        if (event.type === 'erase') {
          path.globalCompositeOperation = 'destination-out';
        } else {
          path.stroke = event.color;
        }
        fabricCanvas.current.add(path);
        fabricCanvas.current.renderAll();

        if (pushToUndo) {
          undoStack.current.push(event);
          redoStack.current = [];
        }
      });
    }
  };

  // --- NEW: Undo handler ---
  const handleUndo = () => {
    if (!fabricCanvas.current) return;
    if (undoStack.current.length === 0) return;

    const lastEvent = undoStack.current.pop()!;
    redoStack.current.push(lastEvent);

    // For undo, just clear canvas and replay all except last event
    fabricCanvas.current.clear();
    fabricCanvas.current.backgroundColor = 'white';

    // Replay remaining undo stack
    undoStack.current.forEach(event => applyDrawingEvent(event, false));
    fabricCanvas.current.renderAll();

    // Inform others? (optional - for now local only)
  };

  // --- NEW: Redo handler ---
  const handleRedo = () => {
    if (!fabricCanvas.current) return;
    if (redoStack.current.length === 0) return;

    const event = redoStack.current.pop()!;
    undoStack.current.push(event);

    applyDrawingEvent(event, false);
  };

  const handleClearBoard = () => {
    if (!fabricCanvas.current) return;

    fabricCanvas.current.clear();
    fabricCanvas.current.backgroundColor = 'white';
    fabricCanvas.current.renderAll();

    undoStack.current.push({
      type: 'clear',
      data: null,
      userId: currentUser?.id || 'anonymous',
      username: currentUser?.username || username,
      timestamp: new Date(),
      color: 'transparent'
    });
    redoStack.current = [];

    socketService.clearBoard();
  };

  const handleTerminateRoom = () => {
    if (creatorToken) {
      socketService.terminateRoom(creatorToken);
    }
  };

  const handleLeaveRoom = () => {
    localStorage.removeItem('username');
    localStorage.removeItem('roomId');
    localStorage.removeItem('password');
    localStorage.removeItem('isCreator');
    localStorage.removeItem('creatorToken');
    navigate('/');
  };

  // --- NEW: Fullscreen toggle handler ---
  const toggleFullScreen = () => {
    setIsFullScreen(!isFullScreen);
  };

  // --- NEW: Export canvas as PNG ---
  const handleExportPNG = () => {
    if (!fabricCanvas.current) return;
    const dataURL = fabricCanvas.current.toDataURL({
      format: 'png',
      multiplier: 2,
      quality: 1,
      enableRetinaScaling: true,
    });

    const link = document.createElement('a');
    link.href = dataURL;
    link.download = `whiteboard-${roomId}.png`;
    link.click();
  };

  return (
    <div className={`min-h-screen bg-gray-50 p-4 ${isFullScreen ? 'fixed inset-0 z-50 bg-white' : ''}`}>
      <div className={`max-w-7xl mx-auto ${isFullScreen ? 'h-full flex flex-col' : ''}`}>
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <h1 className="text-2xl font-bold">Room: {roomId}</h1>
            <Badge>{isCreator ? 'Creator' : 'Participant'}</Badge>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" size="sm" onClick={toggleFullScreen} aria-label="Toggle Fullscreen">
              {isFullScreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
            </Button>
            <Button variant="outline" size="sm" onClick={handleExportPNG} aria-label="Export as PNG">
              <Download size={18} />
            </Button>
            <Button variant="outline" size="sm" onClick={handleLeaveRoom} aria-label="Leave Room">
              <LogOut size={18} />
            </Button>
          </div>
        </div>

        <div className={`flex gap-6 ${isFullScreen ? 'flex-grow' : ''}`}>
          {/* Canvas Area */}
          <Card
            className={`flex-grow p-0 ${isFullScreen ? 'h-full' : 'h-[600px]'}`}
          >
            <canvas
              ref={canvasRef}
              style={{ width: '100%', height: '100%', display: 'block' }}
            />
          </Card>

          {/* Controls */}
          {!isFullScreen && (
            <Card className="w-72 flex flex-col gap-4 p-4">
              <h2 className="text-lg font-semibold">Tools</h2>

              {/* Brush Color */}
              <div>
                <p className="mb-2 font-medium">Colors</p>
                <div className="flex flex-wrap gap-2">
                  {colors.map(color => (
                    <button
                      key={color}
                      onClick={() => {
                        setBrushColor(color);
                        setIsErasing(false);
                      }}
                      style={{
                        backgroundColor: color,
                        width: 24,
                        height: 24,
                        borderRadius: '50%',
                        border: brushColor === color ? '2px solid black' : 'none',
                      }}
                      aria-label={`Select color ${color}`}
                    />
                  ))}
                </div>
              </div>

              {/* Brush Size */}
              <div>
                <p className="mb-2 font-medium">Brush Size</p>
                <input
                  type="range"
                  min="1"
                  max="50"
                  value={brushSize}
                  onChange={e => setBrushSize(parseInt(e.target.value))}
                />
              </div>

              {/* Eraser Toggle */}
              <Button
                variant={isErasing ? 'destructive' : 'outline'}
                onClick={() => setIsErasing(!isErasing)}
              >
                <Eraser className="mr-2" /> Eraser
              </Button>

              {/* Undo/Redo */}
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={handleUndo}
                  disabled={undoStack.current.length === 0}
                >
                  Undo
                </Button>
                <Button
                  variant="outline"
                  onClick={handleRedo}
                  disabled={redoStack.current.length === 0}
                >
                  Redo
                </Button>
              </div>

              {/* Clear Board */}
              {isCreator && (
                <Button variant="destructive" onClick={handleClearBoard}>
                  <Trash2 className="mr-2" /> Clear Board
                </Button>
              )}

              {/* Terminate Room */}
              {isCreator && (
                <Button variant="destructive" onClick={handleTerminateRoom}>
                  Terminate Room
                </Button>
              )}

              {/* Users list */}
              <div>
                <p className="mb-2 font-medium flex items-center gap-2">
                  <Users /> Users ({users.length})
                </p>
                <div className="flex flex-col gap-2 max-h-40 overflow-y-auto">
                  {users.map(user => (
                    <div
                      key={user.id}
                      className={`flex items-center gap-2 p-1 rounded ${
                        currentUser?.id === user.id ? 'bg-gray-200' : ''
                      }`}
                    >
                      <Avatar>
                        <AvatarFallback>{user.username[0]}</AvatarFallback>
                      </Avatar>
                      <span>{user.username}</span>
                      {user.id === (currentUser?.id ?? '') && <Badge>Me</Badge>}
                      {user.isCreator && <Badge variant="secondary">Creator</Badge>}
                    </div>
                  ))}
                </div>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default Whiteboard;

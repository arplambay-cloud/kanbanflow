import React, { createContext, useContext, useState, useEffect, ReactNode, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  User,
  Board,
  Column,
  Task,
  TaskComment,
  TaskAttachment,
  Notification,
  ActivityLog,
  Workspace,
  ActivePage,
  Priority,
} from '../types';
import {
  initialUsers,
  initialWorkspace,
  initialBoards,
  initialColumns,
  initialTasks,
  initialNotifications,
  initialActivityLogs,
} from '../data/initialData';
import { useAuth } from './AuthContext';

interface TaskModalState {
  isOpen: boolean;
  task: Task | null;
  initialBoardId?: string;
  initialColumnId?: string;
}

interface AppContextType {
  workspace: Workspace;
  updateWorkspace: (partial: Partial<Workspace>) => void;
  users: User[];
  currentUser: User;
  setCurrentUser: (user: User) => void;
  addUser: (user: Omit<User, 'id'>) => void;
  updateUser: (id: string, updates: Partial<User>) => void;
  deleteUser: (id: string) => void;
  boards: Board[];
  activeBoardId: string | null;
  setActiveBoardId: (id: string | null) => void;
  createBoard: (title: string, description?: string, color?: string) => string;
  updateBoard: (id: string, partial: Partial<Board>) => void;
  deleteBoard: (id: string) => void;
  columns: Column[];
  createColumn: (boardId: string, title: string) => void;
  updateColumn: (id: string, title: string) => void;
  deleteColumn: (id: string) => void;
  tasks: Task[];
  createTask: (data: {
    boardId: string;
    columnId: string;
    title: string;
    description: string;
    assigneeId?: string;
    dueDate?: string;
    priority: Priority;
  }) => Task;
  updateTask: (id: string, updates: Partial<Task>) => void;
  deleteTask: (id: string) => void;
  moveTask: (taskId: string, targetColumnId: string, newOrder: number) => void;
  addComment: (taskId: string, content: string) => void;
  deleteComment: (taskId: string, commentId: string) => void;
  addAttachment: (taskId: string, fileData: { name: string; size: number; type: string; url: string }) => void;
  deleteAttachment: (taskId: string, attachmentId: string) => void;
  notifications: Notification[];
  unreadNotificationCount: number;
  markNotificationAsRead: (id: string) => void;
  markAllNotificationsAsRead: () => void;
  clearNotifications: () => void;
  activityLogs: ActivityLog[];
  activePage: ActivePage;
  setActivePage: (page: ActivePage) => void;
  navigateToBoard: (boardId: string) => void;
  taskModalState: TaskModalState;
  openTaskModal: (task?: Task, initialBoardId?: string, initialColumnId?: string) => void;
  closeTaskModal: () => void;
  resetToDefaultData: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const LOCAL_STORAGE_KEYS = {
  WORKSPACE: 'kf_workspace_v3',
  USERS: 'kf_users_v3',
  CURRENT_USER_ID: 'kf_current_user_id_v3',
  BOARDS: 'kf_boards_v3',
  COLUMNS: 'kf_columns_v3',
  TASKS: 'kf_tasks_v3',
  NOTIFICATIONS: 'kf_notifications_v3',
  ACTIVITY: 'kf_activity_v3',
};

function loadStorage<T>(key: string, defaultValue: T): T {
  try {
    const saved = localStorage.getItem(key);
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (e) {
    console.error(`Error reading ${key} from localStorage`, e);
  }
  return defaultValue;
}

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user: authUser } = useAuth();

  const [workspace, setWorkspace] = useState<Workspace>(() =>
    loadStorage(LOCAL_STORAGE_KEYS.WORKSPACE, initialWorkspace)
  );

  const [users, setUsers] = useState<User[]>(() =>
    loadStorage(LOCAL_STORAGE_KEYS.USERS, initialUsers)
  );

  const [currentUserId, setCurrentUserId] = useState<string>(() =>
    loadStorage(LOCAL_STORAGE_KEYS.CURRENT_USER_ID, initialUsers[0]?.id || '')
  );

  const [boards, setBoards] = useState<Board[]>(() =>
    loadStorage(LOCAL_STORAGE_KEYS.BOARDS, initialBoards)
  );

  const [columns, setColumns] = useState<Column[]>(() =>
    loadStorage(LOCAL_STORAGE_KEYS.COLUMNS, initialColumns)
  );

  const [tasks, setTasks] = useState<Task[]>(() =>
    loadStorage(LOCAL_STORAGE_KEYS.TASKS, initialTasks)
  );

  const [notifications, setNotifications] = useState<Notification[]>(() =>
    loadStorage(LOCAL_STORAGE_KEYS.NOTIFICATIONS, initialNotifications)
  );

  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>(() =>
    loadStorage(LOCAL_STORAGE_KEYS.ACTIVITY, initialActivityLogs)
  );

  const navigate = useNavigate();
  const location = useLocation();

  // Derive activePage and activeBoardId directly from current URL pathname
  const { activePage, activeBoardId } = useMemo<{ activePage: ActivePage; activeBoardId: string | null }>(() => {
    const cleanPath = location.pathname.replace(/\/$/, '') || '/';
    if (cleanPath === '/' || cleanPath === '/dashboard') {
      return { activePage: 'dashboard', activeBoardId: null };
    }
    if (cleanPath === '/boards') {
      return { activePage: 'boards', activeBoardId: null };
    }
    if (cleanPath.startsWith('/boards/')) {
      const bId = cleanPath.replace('/boards/', '');
      return { activePage: 'board-detail', activeBoardId: bId };
    }
    if (cleanPath === '/tasks') {
      return { activePage: 'tasks', activeBoardId: null };
    }
    if (cleanPath === '/users') {
      return { activePage: 'users', activeBoardId: null };
    }
    if (cleanPath === '/notifications') {
      return { activePage: 'notifications', activeBoardId: null };
    }
    if (cleanPath === '/profile') {
      return { activePage: 'profile', activeBoardId: null };
    }
    if (cleanPath === '/settings') {
      return { activePage: 'settings', activeBoardId: null };
    }
    return { activePage: 'dashboard', activeBoardId: null };
  }, [location.pathname]);

  const [taskModalState, setTaskModalState] = useState<TaskModalState>({
    isOpen: false,
    task: null,
  });

  // Sync authenticated user into workspace users list
  useEffect(() => {
    if (authUser) {
      setUsers((prev) => {
        const exists = prev.find((u) => u.id === authUser.id || (authUser.email && u.email === authUser.email));
        if (exists) {
          return prev.map((u) => (u.id === exists.id ? { ...u, ...authUser } : u));
        }
        return [authUser, ...prev];
      });
      setCurrentUserId(authUser.id);
    }
  }, [authUser]);

  const defaultAdminUser: User = {
    id: authUser?.id || 'admin-user',
    name: authUser?.name || 'Workspace Admin',
    email: authUser?.email || 'admin@workspace.io',
    avatar: authUser?.avatar || '',
    role: (authUser?.role as 'admin' | 'member') || 'admin',
    jobTitle: authUser?.jobTitle || 'Team Lead',
  };

  // Current active user object: merges auth session with local profile updates
  const currentUser = useMemo<User>(() => {
    const fromUsers = users.find((u) => u.id === currentUserId || (authUser?.id && u.id === authUser.id));
    if (fromUsers) {
      return {
        ...defaultAdminUser,
        ...(authUser || {}),
        ...fromUsers,
      };
    }
    return authUser || defaultAdminUser;
  }, [users, currentUserId, authUser]);

  // Persist to localStorage whenever state changes
  useEffect(() => {
    localStorage.setItem(LOCAL_STORAGE_KEYS.WORKSPACE, JSON.stringify(workspace));
  }, [workspace]);

  useEffect(() => {
    localStorage.setItem(LOCAL_STORAGE_KEYS.USERS, JSON.stringify(users));
  }, [users]);

  useEffect(() => {
    localStorage.setItem(LOCAL_STORAGE_KEYS.CURRENT_USER_ID, JSON.stringify(currentUserId));
  }, [currentUserId]);

  useEffect(() => {
    localStorage.setItem(LOCAL_STORAGE_KEYS.BOARDS, JSON.stringify(boards));
  }, [boards]);

  useEffect(() => {
    localStorage.setItem(LOCAL_STORAGE_KEYS.COLUMNS, JSON.stringify(columns));
  }, [columns]);

  useEffect(() => {
    localStorage.setItem(LOCAL_STORAGE_KEYS.TASKS, JSON.stringify(tasks));
  }, [tasks]);

  useEffect(() => {
    localStorage.setItem(LOCAL_STORAGE_KEYS.NOTIFICATIONS, JSON.stringify(notifications));
  }, [notifications]);

  useEffect(() => {
    localStorage.setItem(LOCAL_STORAGE_KEYS.ACTIVITY, JSON.stringify(activityLogs));
  }, [activityLogs]);

  // Helper to log activities
  const logActivity = (
    action: ActivityLog['action'],
    entityTitle: string,
    boardTitle?: string,
    details?: string
  ) => {
    const newLog: ActivityLog = {
      id: `act-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      userId: currentUser.id,
      userName: currentUser.name,
      userAvatar: currentUser.avatar,
      action,
      entityTitle,
      boardTitle,
      details,
      timestamp: new Date().toISOString(),
    };
    setActivityLogs((prev) => [newLog, ...prev.slice(0, 49)]); // keep latest 50
  };

  // Helper to create in-app notification
  const notifyUser = (
    recipientId: string,
    type: Notification['type'],
    message: string,
    taskId?: string,
    taskTitle?: string,
    boardId?: string
  ) => {
    // Don't notify self
    if (recipientId === currentUser.id) return;

    const newNotif: Notification = {
      id: `notif-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      recipientId,
      senderId: currentUser.id,
      senderName: currentUser.name,
      senderAvatar: currentUser.avatar,
      taskId,
      taskTitle,
      boardId,
      type,
      message,
      isRead: false,
      createdAt: new Date().toISOString(),
    };

    setNotifications((prev) => [newNotif, ...prev]);
  };

  // Workspace Actions
  const updateWorkspace = (partial: Partial<Workspace>) => {
    setWorkspace((prev) => ({ ...prev, ...partial }));
  };

  // User Actions
  const setCurrentUser = (user: User) => {
    setCurrentUserId(user.id);
  };

  const addUser = (userData: Omit<User, 'id'>) => {
    const newUser: User = {
      ...userData,
      id: `user-${Date.now()}`,
    };
    setUsers((prev) => [...prev, newUser]);
  };

  const updateUser = (id: string, updates: Partial<User>) => {
    setUsers((prev) =>
      prev.map((u) => (u.id === id ? { ...u, ...updates } : u))
    );
  };

  const deleteUser = (id: string) => {
    setUsers((prev) => prev.filter((u) => u.id !== id));
  };

  // Board Actions
  const createBoard = (title: string, description = '', color = '#4f46e5'): string => {
    const boardId = `board-${Date.now()}`;
    const newBoard: Board = {
      id: boardId,
      title,
      description,
      color,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Automatically create the 3 standard default columns for every new board
    const defaultCols: Column[] = [
      { id: `col-${Date.now()}-todo`, boardId, title: 'To Do', order: 0 },
      { id: `col-${Date.now()}-inprogress`, boardId, title: 'In Progress', order: 1 },
      { id: `col-${Date.now()}-done`, boardId, title: 'Done', order: 2 },
    ];

    setBoards((prev) => [newBoard, ...prev]);
    setColumns((prev) => [...prev, ...defaultCols]);

    logActivity('created_board', title, title, 'Created new board with default columns');
    return boardId;
  };

  const updateBoard = (id: string, partial: Partial<Board>) => {
    setBoards((prev) =>
      prev.map((b) =>
        b.id === id ? { ...b, ...partial, updatedAt: new Date().toISOString() } : b
      )
    );
  };

  const deleteBoard = (id: string) => {
    const boardToDelete = boards.find((b) => b.id === id);
    setBoards((prev) => prev.filter((b) => b.id !== id));
    setColumns((prev) => prev.filter((c) => c.boardId !== id));
    setTasks((prev) => prev.filter((t) => t.boardId !== id));
    if (activeBoardId === id) {
      setActiveBoardId(null);
      setActivePage('boards');
    }
  };

  // Column Actions
  const createColumn = (boardId: string, title: string) => {
    const boardColumns = columns.filter((c) => c.boardId === boardId);
    const newCol: Column = {
      id: `col-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      boardId,
      title,
      order: boardColumns.length,
    };
    setColumns((prev) => [...prev, newCol]);

    const board = boards.find((b) => b.id === boardId);
    logActivity('created_column', title, board?.title, 'Added new column to board');
  };

  const updateColumn = (id: string, title: string) => {
    setColumns((prev) => prev.map((c) => (c.id === id ? { ...c, title } : c)));
  };

  const deleteColumn = (id: string) => {
    const colToDelete = columns.find((c) => c.id === id);
    if (!colToDelete) return;

    // Remove the column and its tasks
    setColumns((prev) => prev.filter((c) => c.id !== id));
    setTasks((prev) => prev.filter((t) => t.columnId !== id));
  };

  // Task Actions
  const createTask = (data: {
    boardId: string;
    columnId: string;
    title: string;
    description: string;
    assigneeId?: string;
    dueDate?: string;
    priority: Priority;
  }): Task => {
    const columnTasks = tasks.filter((t) => t.columnId === data.columnId);
    const newTask: Task = {
      id: `task-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      boardId: data.boardId,
      columnId: data.columnId,
      title: data.title,
      description: data.description,
      assigneeId: data.assigneeId,
      dueDate: data.dueDate,
      priority: data.priority,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      order: columnTasks.length,
    };

    setTasks((prev) => [...prev, newTask]);

    const board = boards.find((b) => b.id === data.boardId);
    const column = columns.find((c) => c.id === data.columnId);

    logActivity('created_task', newTask.title, board?.title, `Added to ${column?.title || 'column'}`);

    // If assigned to a user, send an assignment notification
    if (newTask.assigneeId && newTask.assigneeId !== currentUser.id) {
      const assignee = users.find((u) => u.id === newTask.assigneeId);
      if (assignee) {
        notifyUser(
          newTask.assigneeId,
          'task_assigned',
          `assigned a new task to you: "${newTask.title}"`,
          newTask.id,
          newTask.title,
          newTask.boardId
        );
        logActivity('assigned_task', newTask.title, board?.title, `Assigned to ${assignee.name}`);
      }
    }

    return newTask;
  };

  const updateTask = (id: string, updates: Partial<Task>) => {
    const existingTask = tasks.find((t) => t.id === id);
    if (!existingTask) return;

    const updatedTask = {
      ...existingTask,
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    setTasks((prev) => prev.map((t) => (t.id === id ? updatedTask : t)));

    const board = boards.find((b) => b.id === updatedTask.boardId);

    // If assignee changed to another user, trigger notification
    if (
      updates.assigneeId !== undefined &&
      updates.assigneeId !== existingTask.assigneeId &&
      updates.assigneeId !== '' &&
      updates.assigneeId !== currentUser.id
    ) {
      const newAssignee = users.find((u) => u.id === updates.assigneeId);
      if (newAssignee) {
        notifyUser(
          updates.assigneeId,
          'task_assigned',
          `assigned a task to you: "${updatedTask.title}"`,
          updatedTask.id,
          updatedTask.title,
          updatedTask.boardId
        );
        logActivity('assigned_task', updatedTask.title, board?.title, `Assigned to ${newAssignee.name}`);
      }
    }

    // Check if column changed
    if (updates.columnId && updates.columnId !== existingTask.columnId) {
      const newCol = columns.find((c) => c.id === updates.columnId);
      if (newCol?.title.toLowerCase().includes('done')) {
        logActivity('completed_task', updatedTask.title, board?.title, 'Completed task');
      } else {
        logActivity('moved_task', updatedTask.title, board?.title, `Moved to ${newCol?.title || 'column'}`);
      }
    }
  };

  const deleteTask = (id: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== id));
  };

  const moveTask = (taskId: string, targetColumnId: string, newOrder: number) => {
    setTasks((prevTasks) => {
      const taskIndex = prevTasks.findIndex((t) => t.id === taskId);
      if (taskIndex === -1) return prevTasks;

      const movingTask = { ...prevTasks[taskIndex] };
      const sourceColumnId = movingTask.columnId;
      const isSameColumn = sourceColumnId === targetColumnId;

      movingTask.columnId = targetColumnId;
      movingTask.updatedAt = new Date().toISOString();

      // Tasks in target column without moving task
      const targetColumnTasks = prevTasks
        .filter((t) => t.columnId === targetColumnId && t.id !== taskId)
        .sort((a, b) => a.order - b.order);

      // Insert at new index
      targetColumnTasks.splice(newOrder, 0, movingTask);

      // Re-index target column tasks
      const reindexedTargetTasks = targetColumnTasks.map((t, idx) => ({
        ...t,
        order: idx,
      }));

      let resultTasks = prevTasks.filter(
        (t) => t.columnId !== targetColumnId && t.id !== taskId
      );

      if (!isSameColumn) {
        // Also re-index source column
        const sourceColumnTasks = prevTasks
          .filter((t) => t.columnId === sourceColumnId && t.id !== taskId)
          .sort((a, b) => a.order - b.order)
          .map((t, idx) => ({ ...t, order: idx }));

        resultTasks = resultTasks.filter((t) => t.columnId !== sourceColumnId);
        resultTasks = [...resultTasks, ...sourceColumnTasks];
      }

      return [...resultTasks, ...reindexedTargetTasks];
    });

    const targetCol = columns.find((c) => c.id === targetColumnId);
    const task = tasks.find((t) => t.id === taskId);
    const board = boards.find((b) => b.id === task?.boardId);

    if (task && targetCol) {
      if (targetCol.title.toLowerCase().includes('done')) {
        logActivity('completed_task', task.title, board?.title, 'Marked as Done');
      } else {
        logActivity('moved_task', task.title, board?.title, `Moved to ${targetCol.title}`);
      }
    }
  };

  // Notification Actions
  const unreadNotificationCount = notifications.filter(
    (n) => n.recipientId === currentUser.id && !n.isRead
  ).length;

  const markNotificationAsRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
    );
  };

  const markAllNotificationsAsRead = () => {
    setNotifications((prev) =>
      prev.map((n) =>
        n.recipientId === currentUser.id ? { ...n, isRead: true } : n
      )
    );
  };

  const clearNotifications = () => {
    setNotifications((prev) =>
      prev.filter((n) => n.recipientId !== currentUser.id || !n.isRead)
    );
  };

  // Navigation Helpers using real URL routes
  const setActivePage = (page: ActivePage) => {
    switch (page) {
      case 'dashboard':
        navigate('/dashboard');
        break;
      case 'boards':
        navigate('/boards');
        break;
      case 'board-detail':
        if (activeBoardId) {
          navigate(`/boards/${activeBoardId}`);
        } else if (boards.length > 0) {
          navigate(`/boards/${boards[0].id}`);
        } else {
          navigate('/boards');
        }
        break;
      case 'tasks':
        navigate('/tasks');
        break;
      case 'notifications':
        navigate('/notifications');
        break;
      case 'users':
        navigate('/users');
        break;
      case 'profile':
        navigate('/profile');
        break;
      case 'settings':
        navigate('/settings');
        break;
      default:
        navigate('/dashboard');
    }
  };

  const setActiveBoardId = (id: string | null) => {
    if (id) {
      navigate(`/boards/${id}`);
    } else {
      navigate('/boards');
    }
  };

  const navigateToBoard = (boardId: string) => {
    navigate(`/boards/${boardId}`);
  };

  // Modal Handlers
  const openTaskModal = (task?: Task, initialBoardId?: string, initialColumnId?: string) => {
    setTaskModalState({
      isOpen: true,
      task: task || null,
      initialBoardId,
      initialColumnId,
    });
  };

  const closeTaskModal = () => {
    setTaskModalState({
      isOpen: false,
      task: null,
    });
  };

  // Reset to default
  const resetToDefaultData = () => {
    setWorkspace(initialWorkspace);
    setUsers(initialUsers);
    setCurrentUserId(initialUsers[0].id);
    setBoards(initialBoards);
    setColumns(initialColumns);
    setTasks(initialTasks);
    setNotifications(initialNotifications);
    setActivityLogs(initialActivityLogs);
    navigate('/dashboard');
  };

  const addComment = (taskId: string, content: string) => {
    if (!content.trim()) return;
    const comment: TaskComment = {
      id: `comment-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      taskId,
      userId: currentUser.id,
      userName: currentUser.name,
      userAvatar: currentUser.avatar,
      content: content.trim(),
      createdAt: new Date().toISOString(),
    };

    setTasks((prev) =>
      prev.map((t) => {
        if (t.id !== taskId) return t;
        return {
          ...t,
          comments: [...(t.comments || []), comment],
          updatedAt: new Date().toISOString(),
        };
      })
    );

    const task = tasks.find((t) => t.id === taskId);
    if (task) {
      const board = boards.find((b) => b.id === task.boardId);
      logActivity('created_task', task.title, board?.title, `Added comment: "${content.trim().substring(0, 30)}"`);
      if (task.assigneeId && task.assigneeId !== currentUser.id) {
        notifyUser(
          task.assigneeId,
          'task_assigned',
          `commented on "${task.title}": "${content.trim().substring(0, 40)}${content.trim().length > 40 ? '...' : ''}"`,
          task.id,
          task.title,
          task.boardId
        );
      }
    }
  };

  const deleteComment = (taskId: string, commentId: string) => {
    setTasks((prev) =>
      prev.map((t) => {
        if (t.id !== taskId) return t;
        return {
          ...t,
          comments: (t.comments || []).filter((c) => c.id !== commentId),
          updatedAt: new Date().toISOString(),
        };
      })
    );
  };

  const addAttachment = (
    taskId: string,
    fileData: { name: string; size: number; type: string; url: string }
  ) => {
    const attachment: TaskAttachment = {
      id: `att-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      taskId,
      name: fileData.name,
      size: fileData.size,
      type: fileData.type,
      url: fileData.url,
      uploadedAt: new Date().toISOString(),
      uploadedBy: currentUser.name,
    };

    setTasks((prev) =>
      prev.map((t) => {
        if (t.id !== taskId) return t;
        return {
          ...t,
          attachments: [...(t.attachments || []), attachment],
          updatedAt: new Date().toISOString(),
        };
      })
    );

    const task = tasks.find((t) => t.id === taskId);
    if (task) {
      const board = boards.find((b) => b.id === task.boardId);
      logActivity('created_task', task.title, board?.title, `Attached file: ${fileData.name}`);
    }
  };

  const deleteAttachment = (taskId: string, attachmentId: string) => {
    setTasks((prev) =>
      prev.map((t) => {
        if (t.id !== taskId) return t;
        return {
          ...t,
          attachments: (t.attachments || []).filter((a) => a.id !== attachmentId),
          updatedAt: new Date().toISOString(),
        };
      })
    );
  };

  return (
    <AppContext.Provider
      value={{
        workspace,
        updateWorkspace,
        users,
        currentUser,
        setCurrentUser,
        addUser,
        updateUser,
        deleteUser,
        boards,
        activeBoardId,
        setActiveBoardId,
        createBoard,
        updateBoard,
        deleteBoard,
        columns,
        createColumn,
        updateColumn,
        deleteColumn,
        tasks,
        createTask,
        updateTask,
        deleteTask,
        moveTask,
        addComment,
        deleteComment,
        addAttachment,
        deleteAttachment,
        notifications,
        unreadNotificationCount,
        markNotificationAsRead,
        markAllNotificationsAsRead,
        clearNotifications,
        activityLogs,
        activePage,
        setActivePage,
        navigateToBoard,
        taskModalState,
        openTaskModal,
        closeTaskModal,
        resetToDefaultData,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = (): AppContextType => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import {
  User,
  Board,
  Column,
  Task,
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
  addUser: (user: Omit<User, 'id' | 'initials'>) => void;
  boards: Board[];
  activeBoardId: string | null;
  setActiveBoardId: (id: string | null) => void;
  createBoard: (title: string, description?: string) => string;
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

const STORAGE_KEYS = {
  WORKSPACE: 'kf2_workspace_v1',
  USERS: 'kf2_users_v1',
  CURRENT_USER_ID: 'kf2_current_user_id_v1',
  BOARDS: 'kf2_boards_v1',
  COLUMNS: 'kf2_columns_v1',
  TASKS: 'kf2_tasks_v1',
  NOTIFICATIONS: 'kf2_notifications_v1',
  ACTIVITY: 'kf2_activity_v1',
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
  const [workspace, setWorkspace] = useState<Workspace>(() =>
    loadStorage(STORAGE_KEYS.WORKSPACE, initialWorkspace)
  );

  const [users, setUsers] = useState<User[]>(() =>
    loadStorage(STORAGE_KEYS.USERS, initialUsers)
  );

  const [currentUserId, setCurrentUserId] = useState<string>(() =>
    loadStorage(STORAGE_KEYS.CURRENT_USER_ID, initialUsers[0].id)
  );

  const [boards, setBoards] = useState<Board[]>(() =>
    loadStorage(STORAGE_KEYS.BOARDS, initialBoards)
  );

  const [columns, setColumns] = useState<Column[]>(() =>
    loadStorage(STORAGE_KEYS.COLUMNS, initialColumns)
  );

  const [tasks, setTasks] = useState<Task[]>(() =>
    loadStorage(STORAGE_KEYS.TASKS, initialTasks)
  );

  const [notifications, setNotifications] = useState<Notification[]>(() =>
    loadStorage(STORAGE_KEYS.NOTIFICATIONS, initialNotifications)
  );

  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>(() =>
    loadStorage(STORAGE_KEYS.ACTIVITY, initialActivityLogs)
  );

  const [activePage, setActivePage] = useState<ActivePage>('dashboard');
  const [activeBoardId, setActiveBoardId] = useState<string | null>(null);

  const [taskModalState, setTaskModalState] = useState<TaskModalState>({
    isOpen: false,
    task: null,
  });

  const currentUser = users.find((u) => u.id === currentUserId) || users[0] || initialUsers[0];

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.WORKSPACE, JSON.stringify(workspace));
  }, [workspace]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
  }, [users]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.CURRENT_USER_ID, JSON.stringify(currentUserId));
  }, [currentUserId]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.BOARDS, JSON.stringify(boards));
  }, [boards]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.COLUMNS, JSON.stringify(columns));
  }, [columns]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify(tasks));
  }, [tasks]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.NOTIFICATIONS, JSON.stringify(notifications));
  }, [notifications]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.ACTIVITY, JSON.stringify(activityLogs));
  }, [activityLogs]);

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
      userInitials: currentUser.initials,
      action,
      entityTitle,
      boardTitle,
      details,
      timestamp: new Date().toISOString(),
    };
    setActivityLogs((prev) => [newLog, ...prev.slice(0, 49)]);
  };

  const notifyUser = (
    recipientId: string,
    type: Notification['type'],
    message: string,
    taskId?: string,
    taskTitle?: string,
    boardId?: string
  ) => {
    if (recipientId === currentUser.id) return;

    const newNotif: Notification = {
      id: `notif-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      recipientId,
      senderId: currentUser.id,
      senderName: currentUser.name,
      senderInitials: currentUser.initials,
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

  const updateWorkspace = (partial: Partial<Workspace>) => {
    setWorkspace((prev) => {
      const updatedName = partial.name ?? prev.name;
      const initials = updatedName
        .split(' ')
        .map((w) => w[0])
        .join('')
        .toUpperCase()
        .substring(0, 2);
      return { ...prev, ...partial, initials };
    });
  };

  const setCurrentUser = (user: User) => {
    setCurrentUserId(user.id);
  };

  const addUser = (userData: Omit<User, 'id' | 'initials'>) => {
    const initials = userData.name
      .split(' ')
      .map((w) => w[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);

    const newUser: User = {
      ...userData,
      id: `usr-${Date.now()}`,
      initials,
    };
    setUsers((prev) => [...prev, newUser]);
  };

  const createBoard = (title: string, description = ''): string => {
    const boardId = `brd-${Date.now()}`;
    const newBoard: Board = {
      id: boardId,
      title,
      description,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const defaultCols: Column[] = [
      { id: `col-${Date.now()}-todo`, boardId, title: 'To Do', order: 0 },
      { id: `col-${Date.now()}-inprogress`, boardId, title: 'In Progress', order: 1 },
      { id: `col-${Date.now()}-done`, boardId, title: 'Done', order: 2 },
    ];

    setBoards((prev) => [newBoard, ...prev]);
    setColumns((prev) => [...prev, ...defaultCols]);

    logActivity('created_board', title, title, 'Created board with default columns');
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
    setBoards((prev) => prev.filter((b) => b.id !== id));
    setColumns((prev) => prev.filter((c) => c.boardId !== id));
    setTasks((prev) => prev.filter((t) => t.boardId !== id));
    if (activeBoardId === id) {
      setActiveBoardId(null);
      setActivePage('boards');
    }
  };

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
    logActivity('created_column', title, board?.title, 'Added workflow column');
  };

  const updateColumn = (id: string, title: string) => {
    setColumns((prev) => prev.map((c) => (c.id === id ? { ...c, title } : c)));
  };

  const deleteColumn = (id: string) => {
    setColumns((prev) => prev.filter((c) => c.id !== id));
    setTasks((prev) => prev.filter((t) => t.columnId !== id));
  };

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
      id: `tsk-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
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

    if (newTask.assigneeId && newTask.assigneeId !== currentUser.id) {
      const assignee = users.find((u) => u.id === newTask.assigneeId);
      if (assignee) {
        notifyUser(
          newTask.assigneeId,
          'task_assigned',
          `assigned a task to you: "${newTask.title}"`,
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

      const targetColumnTasks = prevTasks
        .filter((t) => t.columnId === targetColumnId && t.id !== taskId)
        .sort((a, b) => a.order - b.order);

      targetColumnTasks.splice(newOrder, 0, movingTask);

      const reindexedTargetTasks = targetColumnTasks.map((t, idx) => ({
        ...t,
        order: idx,
      }));

      let resultTasks = prevTasks.filter(
        (t) => t.columnId !== targetColumnId && t.id !== taskId
      );

      if (!isSameColumn) {
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

  const navigateToBoard = (boardId: string) => {
    setActiveBoardId(boardId);
    setActivePage('board-detail');
  };

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

  const resetToDefaultData = () => {
    setWorkspace(initialWorkspace);
    setUsers(initialUsers);
    setCurrentUserId(initialUsers[0].id);
    setBoards(initialBoards);
    setColumns(initialColumns);
    setTasks(initialTasks);
    setNotifications(initialNotifications);
    setActivityLogs(initialActivityLogs);
    setActivePage('dashboard');
    setActiveBoardId(null);
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

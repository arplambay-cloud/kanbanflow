import React, { createContext, useContext, useState, useEffect, ReactNode, useMemo, useCallback, useRef } from 'react';
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
import { supabase, isSupabaseConfigured } from '../lib/supabaseClient';
import { reorderTasks, tasksNeedingPersist, resolveColumnForBoard } from '../utils/taskReorder';
import { notifySyncFailure } from '../utils/toast';

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
  refreshRemoteData: () => Promise<void>;
  isLoadingRemote: boolean;
  setIsDragging: (isDragging: boolean) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const LOCAL_STORAGE_KEYS = {
  WORKSPACE: 'kf_workspace_v4',
  USERS: 'kf_users_v4',
  CURRENT_USER_ID: 'kf_current_user_id_v4',
  BOARDS: 'kf_boards_v4',
  COLUMNS: 'kf_columns_v4',
  TASKS: 'kf_tasks_v4',
  NOTIFICATIONS: 'kf_notifications_v4',
  ACTIVITY: 'kf_activity_v4',
};

function safeStorageLoad<T>(key: string, defaultValue: T): T {
  try {
    const saved = localStorage.getItem(key);
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (e) {
    console.error('Error reading ' + key + ' from localStorage', e);
  }
  return defaultValue;
}

function safeStorageSave(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.warn('Storage quota exceeded or error writing ' + key, e);
  }
}

const generateRandomSlug = (length = 8): string => {
  const chars = 'abcdefghijklmnopqrstuvwxyz';
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(bytes[i] % chars.length);
  }
  return result;
};

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user: authUser, deleteMember } = useAuth();
  const [isLoadingRemote, setIsLoadingRemote] = useState(false);

  // In-flight local write timestamp & dragging state references
  const localWriteTimestampRef = useRef<number>(0);
  const isDraggingRef = useRef<boolean>(false);
  const pendingRemoteRefetchRef = useRef<boolean>(false);
  const realtimeDebounceTimerRef = useRef<any>(null);

  const markLocalWrite = useCallback(() => {
    localWriteTimestampRef.current = Date.now();
  }, []);

  const setIsDragging = useCallback((isDragging: boolean) => {
    isDraggingRef.current = isDragging;
    if (!isDragging && pendingRemoteRefetchRef.current) {
      pendingRemoteRefetchRef.current = false;
      fetchRemoteWorkspaceData();
    }
  }, []);

  const [workspace, setWorkspace] = useState<Workspace>(() =>
    safeStorageLoad(LOCAL_STORAGE_KEYS.WORKSPACE, initialWorkspace)
  );

  const [users, setUsers] = useState<User[]>(() =>
    safeStorageLoad(LOCAL_STORAGE_KEYS.USERS, initialUsers)
  );

  const [currentUserId, setCurrentUserId] = useState<string>(() =>
    safeStorageLoad(LOCAL_STORAGE_KEYS.CURRENT_USER_ID, authUser?.id || initialUsers[0]?.id || '')
  );

  const [boards, setBoards] = useState<Board[]>(() =>
    safeStorageLoad(LOCAL_STORAGE_KEYS.BOARDS, initialBoards)
  );

  const [columns, setColumns] = useState<Column[]>(() =>
    safeStorageLoad(LOCAL_STORAGE_KEYS.COLUMNS, initialColumns)
  );

  const [tasks, setTasks] = useState<Task[]>(() =>
    safeStorageLoad(LOCAL_STORAGE_KEYS.TASKS, initialTasks)
  );

  const [notifications, setNotifications] = useState<Notification[]>(() =>
    safeStorageLoad(LOCAL_STORAGE_KEYS.NOTIFICATIONS, initialNotifications)
  );

  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>(() =>
    safeStorageLoad(LOCAL_STORAGE_KEYS.ACTIVITY, initialActivityLogs)
  );

  const navigate = useNavigate();
  const location = useLocation();

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
    if (cleanPath === '/notifications') {
      return { activePage: 'notifications', activeBoardId: null };
    }
    if (cleanPath === '/users') {
      return { activePage: 'users', activeBoardId: null };
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

  const defaultAdminUser: User = useMemo(() => ({
    id: authUser?.id || 'admin-user',
    name: authUser?.name || 'Workspace Admin',
    email: authUser?.email || 'admin@workspace.io',
    avatar: authUser?.avatar || '',
    role: (authUser?.role as 'admin' | 'member') || 'admin',
    jobTitle: authUser?.jobTitle || 'Team Lead',
  }), [authUser]);

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
  }, [users, currentUserId, authUser, defaultAdminUser]);

  // Fetch Remote Workspace Data
  const fetchRemoteWorkspaceData = useCallback(async () => {
    if (!isSupabaseConfigured || !supabase || !authUser?.id) return;

    try {
      setIsLoadingRemote(true);

      // 1. Profiles
      const { data: dbProfiles } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: true });

      // Avatars are resolved from here for notifications and activity logs
      // rather than being copied into every one of those rows.
      const avatarById = new Map<string, string>();
      (dbProfiles || []).forEach((p: { id?: string; avatar_url?: string }) => {
        if (p?.id) avatarById.set(p.id, p.avatar_url || '');
      });

      if (dbProfiles && dbProfiles.length > 0) {
        const mappedUsers: User[] = dbProfiles.map((p: any) => ({
          id: p.id,
          name: p.full_name || p.email.split('@')[0],
          email: p.email,
          avatar: p.avatar_url || '',
          role: (p.role as 'admin' | 'member') || 'member',
          jobTitle: p.job_title || 'Team Member',
        }));
        setUsers(mappedUsers);
        safeStorageSave(LOCAL_STORAGE_KEYS.USERS, mappedUsers);
      }

      // 2. Workspace
      const { data: dbWorkspaces } = await supabase
        .from('workspaces')
        .select('*')
        .limit(1);

      if (dbWorkspaces && dbWorkspaces.length > 0) {
        const ws = dbWorkspaces[0];
        const mappedWorkspace: Workspace = {
          id: ws.id,
          name: ws.name,
          description: ws.description || '',
          accentColor: ws.accent_color || '#4f46e5',
          createdAt: ws.created_at,
        };
        setWorkspace(mappedWorkspace);
        safeStorageSave(LOCAL_STORAGE_KEYS.WORKSPACE, mappedWorkspace);
      } else if (authUser?.role === 'admin') {
        await supabase.from('workspaces').upsert({
          id: 'ws-default',
          name: 'My Workspace',
          description: 'Collaborative team workspace for managing projects and tasks.',
          accent_color: '#4f46e5',
        });
      }

      // 3. Boards
      const { data: dbBoards } = await supabase
        .from('boards')
        .select('*')
        .order('created_at', { ascending: true });

      if (dbBoards && dbBoards.length > 0) {
        const mappedBoards: Board[] = dbBoards.map((b: any) => ({
          id: b.id,
          title: b.title,
          description: b.description || '',
          color: b.color || '#4f46e5',
          createdAt: b.created_at,
          updatedAt: b.updated_at || b.created_at,
        }));
        setBoards(mappedBoards);
        safeStorageSave(LOCAL_STORAGE_KEYS.BOARDS, mappedBoards);
      } else if (authUser?.role === 'admin') {
        const seedBoardId = 'pjxmtkwq';
        await supabase.from('boards').upsert({
          id: seedBoardId,
          workspace_id: 'ws-default',
          title: 'Main Project Board',
          description: 'Central Kanban board for tracking tasks and sprints.',
          color: '#4f46e5',
        });
        const starterCols = [
          { id: 'col-' + seedBoardId + '-todo', board_id: seedBoardId, title: 'To Do', order: 0 },
          { id: 'col-' + seedBoardId + '-inprogress', board_id: seedBoardId, title: 'In Progress', order: 1 },
          { id: 'col-' + seedBoardId + '-review', board_id: seedBoardId, title: 'In Review', order: 2 },
          { id: 'col-' + seedBoardId + '-done', board_id: seedBoardId, title: 'Done', order: 3 },
        ];
        await supabase.from('columns').upsert(starterCols);

        setBoards(initialBoards);
        setColumns(initialColumns);
      }

      // 4. Columns
      const { data: dbColumns } = await supabase
        .from('columns')
        .select('*')
        .order('order', { ascending: true });

      if (dbColumns && dbColumns.length > 0) {
        const mappedCols: Column[] = dbColumns.map((c: any) => ({
          id: c.id,
          boardId: c.board_id,
          title: c.title,
          order: c.order,
        }));
        setColumns(mappedCols);
        safeStorageSave(LOCAL_STORAGE_KEYS.COLUMNS, mappedCols);
      }

      // 5. Comments & Attachments
      const [{ data: dbComments }, { data: dbAttachments }] = await Promise.all([
        supabase.from('task_comments').select('*').order('created_at', { ascending: true }),
        // NOTE: this table's timestamp column is `uploaded_at`, not `created_at`.
        // Ordering by a non-existent column made the query error and silently
        // return null, so attachments never loaded.
        supabase.from('task_attachments').select('*').order('uploaded_at', { ascending: true }),
      ]);

      const commentsByTask: Record<string, TaskComment[]> = {};
      (dbComments || []).forEach((c: any) => {
        if (!commentsByTask[c.task_id]) commentsByTask[c.task_id] = [];
        commentsByTask[c.task_id].push({
          id: c.id,
          taskId: c.task_id,
          userId: c.user_id,
          userName: c.user_name,
          userAvatar: c.user_avatar || '',
          content: c.content,
          createdAt: c.created_at,
        });
      });

      const attachmentsByTask: Record<string, TaskAttachment[]> = {};
      (dbAttachments || []).forEach((a: any) => {
        if (!attachmentsByTask[a.task_id]) attachmentsByTask[a.task_id] = [];
        attachmentsByTask[a.task_id].push({
          id: a.id,
          taskId: a.task_id,
          name: a.name,
          size: a.size || 0,
          type: a.type || '',
          url: a.url,
          uploadedAt: a.uploaded_at,
          uploadedBy: a.uploaded_by || '',
        });
      });

      // 6. Tasks
      const { data: dbTasks } = await supabase
        .from('tasks')
        .select('*')
        .order('order', { ascending: true });

      if (dbTasks) {
        const mappedTasks: Task[] = dbTasks.map((t: any) => ({
          id: t.id,
          boardId: t.board_id,
          columnId: t.column_id,
          title: t.title,
          description: t.description || '',
          assigneeId: t.assignee_id || undefined,
          dueDate: t.due_date || undefined,
          priority: (t.priority as Priority) || 'medium',
          order: t.order || 0,
          createdAt: t.created_at,
          updatedAt: t.updated_at || t.created_at,
          comments: commentsByTask[t.id] || [],
          attachments: attachmentsByTask[t.id] || [],
        }));
        setTasks(mappedTasks);
        safeStorageSave(LOCAL_STORAGE_KEYS.TASKS, mappedTasks);
      }

      // 7. Notifications
      const { data: dbNotifications } = await supabase
        .from('notifications')
        .select('*')
        .eq('recipient_id', authUser.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (dbNotifications) {
        const mappedNotifs: Notification[] = dbNotifications.map((n: any) => ({
          id: n.id,
          recipientId: n.recipient_id,
          senderId: n.sender_id || '',
          senderName: n.sender_name || 'Team Member',
          // Resolved from profiles, not read from the row — see avatarById.
          senderAvatar: avatarById.get(n.sender_id) || n.sender_avatar || '',
          type: n.type,
          message: n.message,
          taskId: n.task_id || undefined,
          taskTitle: n.task_title || undefined,
          boardId: n.board_id || undefined,
          isRead: Boolean(n.is_read),
          createdAt: n.created_at,
        }));
        setNotifications(mappedNotifs);
        safeStorageSave(LOCAL_STORAGE_KEYS.NOTIFICATIONS, mappedNotifs);
      }

      // 8. Activity Logs
      const { data: dbActivities } = await supabase
        .from('activity_logs')
        .select('*')
        .order('timestamp', { ascending: false })
        .limit(50);

      if (dbActivities) {
        const mappedActivities: ActivityLog[] = dbActivities.map((a: any) => ({
          id: a.id,
          userId: a.user_id || '',
          userName: a.user_name || 'Member',
          // Resolved from profiles, not read from the row — see avatarById.
          userAvatar: avatarById.get(a.user_id) || a.user_avatar || '',
          action: a.action,
          entityTitle: a.entity_title,
          boardTitle: a.board_title || '',
          details: a.details || '',
          timestamp: a.timestamp,
        }));
        setActivityLogs(mappedActivities);
        safeStorageSave(LOCAL_STORAGE_KEYS.ACTIVITY, mappedActivities);
      }
    } catch (err) {
      console.warn('Error fetching workspace data from Supabase:', err);
    } finally {
      setIsLoadingRemote(false);
    }
  }, [authUser]);

  // Initial load and Realtime listener with Self-Echo filter and Drag guard
  useEffect(() => {
    if (authUser) {
      fetchRemoteWorkspaceData();

      if (isSupabaseConfigured && supabase) {
        const client = supabase;

        const onRemoteDataChanged = () => {
          // 1. Skip self-echoes triggered within 2500ms of local optimistic writes
          if (Date.now() - localWriteTimestampRef.current < 2500) {
            return;
          }

          // 2. If a drag is actively in flight, queue the refetch until the drop finishes
          if (isDraggingRef.current) {
            pendingRemoteRefetchRef.current = true;
            return;
          }

          // 3. Debounce rapid events
          if (realtimeDebounceTimerRef.current) {
            clearTimeout(realtimeDebounceTimerRef.current);
          }
          realtimeDebounceTimerRef.current = setTimeout(() => {
            fetchRemoteWorkspaceData();
          }, 300);
        };

        const channel = client
          .channel('kanbanflow_realtime')
          .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, onRemoteDataChanged)
          .on('postgres_changes', { event: '*', schema: 'public', table: 'columns' }, onRemoteDataChanged)
          .on('postgres_changes', { event: '*', schema: 'public', table: 'boards' }, onRemoteDataChanged)
          .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications' }, onRemoteDataChanged)
          .subscribe();

        return () => {
          if (realtimeDebounceTimerRef.current) {
            clearTimeout(realtimeDebounceTimerRef.current);
          }
          client.removeChannel(channel);
        };
      }
    }
  }, [authUser, fetchRemoteWorkspaceData]);

  useEffect(() => {
    if (authUser) {
      setCurrentUserId(authUser.id);
      safeStorageSave(LOCAL_STORAGE_KEYS.CURRENT_USER_ID, authUser.id);
    }
  }, [authUser]);

  useEffect(() => {
    safeStorageSave(LOCAL_STORAGE_KEYS.WORKSPACE, workspace);
  }, [workspace]);

  useEffect(() => {
    safeStorageSave(LOCAL_STORAGE_KEYS.BOARDS, boards);
  }, [boards]);

  useEffect(() => {
    safeStorageSave(LOCAL_STORAGE_KEYS.COLUMNS, columns);
  }, [columns]);

  useEffect(() => {
    safeStorageSave(LOCAL_STORAGE_KEYS.TASKS, tasks);
  }, [tasks]);

  useEffect(() => {
    safeStorageSave(LOCAL_STORAGE_KEYS.NOTIFICATIONS, notifications);
  }, [notifications]);

  useEffect(() => {
    safeStorageSave(LOCAL_STORAGE_KEYS.ACTIVITY, activityLogs);
  }, [activityLogs]);

  // Workspace Actions
  const updateWorkspace = async (partial: Partial<Workspace>) => {
    markLocalWrite();
    setWorkspace((prev) => ({ ...prev, ...partial }));
    if (isSupabaseConfigured && supabase) {
      try {
        const { error: writeError } = await supabase
          .from('workspaces')
          .update({
            name: partial.name !== undefined ? partial.name : workspace.name,
            description: partial.description !== undefined ? partial.description : workspace.description,
            accent_color: partial.accentColor !== undefined ? partial.accentColor : workspace.accentColor,
            updated_at: new Date().toISOString(),
          })
          .eq('id', workspace.id || 'ws-default');
          if (writeError) throw writeError;
      } catch (err) {
        console.warn('Supabase updateWorkspace error:', err);
        notifySyncFailure("Workspace settings", err);
      }
    }
  };

  // User Actions
  const setCurrentUser = (userObj: User) => {
    setCurrentUserId(userObj.id);
  };

  const addUser = (newUser: Omit<User, 'id'>) => {
    const id = 'user-' + Date.now();
    const userWithId: User = { ...newUser, id };
    setUsers((prev) => [userWithId, ...prev]);
  };

  const updateUser = (id: string, updates: Partial<User>) => {
    setUsers((prev) =>
      prev.map((u) => (u.id === id ? { ...u, ...updates } : u))
    );
  };

  /**
   * Remove a member.
   *
   * Goes through the admin API, not a client-side delete: RLS has no DELETE
   * policy on profiles, and Supabase reports a blocked delete as zero rows with
   * NO error — so the old `from('profiles').delete()` looked like it succeeded
   * and the member came straight back on the next refresh. The endpoint also
   * removes the auth.users record, without which the account could sign back in
   * and have its profile recreated by the handle_new_user trigger.
   */
  const deleteUser = async (id: string) => {
    markLocalWrite();
    const previous = users;
    setUsers((prev) => prev.filter((u) => u.id !== id));

    if (!isSupabaseConfigured || !supabase) return;

    const { error } = await deleteMember(id);
    if (error) {
      // Put the member back rather than leaving the UI claiming a delete that
      // never happened.
      setUsers(previous);
      notifySyncFailure('Removing the member', error);
    }
  };

  // Board Actions
  const createBoard = (title: string, description = '', color = '#4f46e5'): string => {
    markLocalWrite();
    // Guarantee the slug is unused before claiming it — 26^8 is large but not
    // collision-proof, and a duplicate board id would corrupt routing.
    const takenIds = new Set(boards.map((b) => b.id));
    let boardId = generateRandomSlug(8);
    while (takenIds.has(boardId)) {
      boardId = generateRandomSlug(8);
    }

    const newBoard: Board = {
      id: boardId,
      title,
      description,
      color,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const defaultCols: Column[] = [
      { id: 'col-' + boardId + '-todo', boardId, title: 'To Do', order: 0 },
      { id: 'col-' + boardId + '-inprogress', boardId, title: 'In Progress', order: 1 },
      { id: 'col-' + boardId + '-done', boardId, title: 'Done', order: 2 },
    ];

    setBoards((prev) => [newBoard, ...prev]);
    setColumns((prev) => [...prev, ...defaultCols]);

    if (isSupabaseConfigured && supabase) {
      const client = supabase;
      (async () => {
        try {
          const { error: boardError } = await client.from('boards').insert({
            id: boardId,
            workspace_id: workspace.id || 'ws-default',
            title,
            description,
            color,
          });
          if (boardError) throw boardError;

          const dbCols = defaultCols.map((c) => ({
            id: c.id,
            board_id: boardId,
            title: c.title,
            order: c.order,
          }));
          const { error: colError } = await client.from('columns').insert(dbCols);
          if (colError) throw colError;
        } catch (err) {
          console.warn('Supabase createBoard error:', err);
          notifySyncFailure("The new board", err);
        }
      })();
    }

    logActivity('created_board', title, title, 'Created new board with default columns');
    return boardId;
  };

  const updateBoard = (id: string, partial: Partial<Board>) => {
    markLocalWrite();
    setBoards((prev) =>
      prev.map((b) =>
        b.id === id ? { ...b, ...partial, updatedAt: new Date().toISOString() } : b
      )
    );

    if (isSupabaseConfigured && supabase) {
      const client = supabase;
      (async () => {
        try {
          const { error: writeError } = await client
            .from('boards')
            .update({
              ...(partial.title !== undefined ? { title: partial.title } : {}),
              ...(partial.description !== undefined ? { description: partial.description } : {}),
              ...(partial.color !== undefined ? { color: partial.color } : {}),
              updated_at: new Date().toISOString(),
            })
            .eq('id', id);
            if (writeError) throw writeError;
        } catch (err) {
          console.warn('Supabase updateBoard error:', err);
          notifySyncFailure("Board changes", err);
        }
      })();
    }
  };

  const deleteBoard = (id: string) => {
    markLocalWrite();
    const targetBoard = boards.find((b) => b.id === id);
    setBoards((prev) => prev.filter((b) => b.id !== id));
    setColumns((prev) => prev.filter((c) => c.boardId !== id));
    setTasks((prev) => prev.filter((t) => t.boardId !== id));

    if (isSupabaseConfigured && supabase) {
      const client = supabase;
      (async () => {
        try {
          const { error: writeError } = await client.from('boards').delete().eq('id', id);
            if (writeError) throw writeError;
        } catch (err) {
          console.warn('Supabase deleteBoard error:', err);
          notifySyncFailure("Deleting the board", err);
        }
      })();
    }

    if (targetBoard) {
      logActivity('deleted_board', targetBoard.title, targetBoard.title, 'Deleted board');
    }

    if (activeBoardId === id) {
      navigate('/boards');
    }
  };

  const setActiveBoardId = (id: string | null) => {
    if (id) {
      navigate('/boards/' + id);
    } else {
      navigate('/boards');
    }
  };

  const navigateToBoard = (boardId: string) => {
    navigate('/boards/' + boardId);
  };

  // Column Actions
  const createColumn = (boardId: string, title: string) => {
    markLocalWrite();
    const existingForBoard = columns.filter((c) => c.boardId === boardId);
    const colId = 'col-' + Date.now() + '-' + generateRandomSlug(4);
    const newCol: Column = {
      id: colId,
      boardId,
      title,
      order: existingForBoard.length,
    };
    setColumns((prev) => [...prev, newCol]);

    if (isSupabaseConfigured && supabase) {
      const client = supabase;
      (async () => {
        try {
          const { error: writeError } = await client.from('columns').insert({
            id: colId,
            board_id: boardId,
            title,
            order: existingForBoard.length,
          });
            if (writeError) throw writeError;
        } catch (err) {
          console.warn('Supabase createColumn error:', err);
          notifySyncFailure("The new column", err);
        }
      })();
    }

    const board = boards.find((b) => b.id === boardId);
    logActivity('created_column', title, board?.title, 'Added column "' + title + '"');
  };

  const updateColumn = (id: string, title: string) => {
    markLocalWrite();
    setColumns((prev) =>
      prev.map((c) => (c.id === id ? { ...c, title } : c))
    );

    if (isSupabaseConfigured && supabase) {
      const client = supabase;
      (async () => {
        try {
          const { error: writeError } = await client.from('columns').update({ title }).eq('id', id);
            if (writeError) throw writeError;
        } catch (err) {
          console.warn('Supabase updateColumn error:', err);
          notifySyncFailure("Column changes", err);
        }
      })();
    }
  };

  const deleteColumn = (id: string) => {
    markLocalWrite();
    setColumns((prev) => prev.filter((c) => c.id !== id));
    setTasks((prev) => prev.filter((t) => t.columnId !== id));

    if (isSupabaseConfigured && supabase) {
      const client = supabase;
      (async () => {
        try {
          const { error: writeError } = await client.from('columns').delete().eq('id', id);
            if (writeError) throw writeError;
        } catch (err) {
          console.warn('Supabase deleteColumn error:', err);
          notifySyncFailure("Deleting the column", err);
        }
      })();
    }
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
    markLocalWrite();
    const taskId = 'task-' + Date.now() + '-' + generateRandomSlug(4);
    const tasksInColumn = tasks.filter((t) => t.columnId === data.columnId);
    const newTask: Task = {
      id: taskId,
      ...data,
      order: tasksInColumn.length,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      comments: [],
      attachments: [],
    };

    setTasks((prev) => [newTask, ...prev]);

    if (isSupabaseConfigured && supabase) {
      const client = supabase;
      (async () => {
        try {
          const { error: writeError } = await client.from('tasks').insert({
            id: taskId,
            board_id: data.boardId,
            column_id: data.columnId,
            title: data.title,
            description: data.description || '',
            priority: data.priority || 'medium',
            due_date: data.dueDate || null,
            assignee_id: data.assigneeId || null,
            order: tasksInColumn.length,
          });
            if (writeError) throw writeError;
        } catch (err) {
          console.warn('Supabase createTask error:', err);
          notifySyncFailure("The new task", err);
        }
      })();
    }

    const board = boards.find((b) => b.id === data.boardId);
    logActivity('created_task', data.title, board?.title, 'Created task "' + data.title + '"');

    if (data.assigneeId && data.assigneeId !== currentUser.id) {
      notifyUser({
        recipientId: data.assigneeId,
        type: 'task_assigned',
        message: currentUser.name + ' assigned you a new task: "' + data.title + '"',
        taskId,
        taskTitle: data.title,
        boardId: data.boardId,
      });
    }

    return newTask;
  };

  const updateTask = (id: string, updates: Partial<Task>) => {
    markLocalWrite();
    const existing = tasks.find((t) => t.id === id);
    if (!existing) return;

    const merged: Task = {
      ...existing,
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    // A task must always sit in a column that belongs to its own board.
    // If a move left them mismatched, land it at the end of the target board's
    // first column rather than writing a row that renders nowhere.
    const resolvedColumn = resolveColumnForBoard(merged.boardId, merged.columnId, columns);
    if (resolvedColumn && resolvedColumn !== merged.columnId) {
      merged.columnId = resolvedColumn;
      merged.order = tasks.filter(
        (t) => t.id !== id && t.columnId === resolvedColumn
      ).length;
    }

    const updatedTask: Task = merged;
    updates = {
      ...updates,
      boardId: merged.boardId,
      columnId: merged.columnId,
      order: merged.order,
    };

    setTasks((prev) => prev.map((t) => (t.id === id ? updatedTask : t)));

    if (isSupabaseConfigured && supabase) {
      const client = supabase;
      (async () => {
        try {
          const dbUpdates: any = { updated_at: new Date().toISOString() };
          if (updates.title !== undefined) dbUpdates.title = updates.title;
          if (updates.description !== undefined) dbUpdates.description = updates.description;
          if (updates.priority !== undefined) dbUpdates.priority = updates.priority;
          if (updates.dueDate !== undefined) dbUpdates.due_date = updates.dueDate || null;
          // board_id must be written whenever it changes. Without it, moving a
          // task to another board saved the NEW column_id against the OLD
          // board_id — so the task rendered on a board whose columns did not
          // include it, and disappeared from the UI entirely.
          if (updates.boardId !== undefined) dbUpdates.board_id = updates.boardId;
          if (updates.columnId !== undefined) dbUpdates.column_id = updates.columnId;
          if (updates.order !== undefined) dbUpdates.order = updates.order;
          if (updates.assigneeId !== undefined) {
            dbUpdates.assignee_id = updates.assigneeId || null;
          }

          const { error: writeError } = await client.from('tasks').update(dbUpdates).eq('id', id);
            if (writeError) throw writeError;
        } catch (err) {
          console.warn('Supabase updateTask error:', err);
          notifySyncFailure("Task changes", err);
        }
      })();
    }

    if (
      updates.assigneeId &&
      updates.assigneeId !== existing.assigneeId &&
      updates.assigneeId !== currentUser.id
    ) {
      notifyUser({
        recipientId: updates.assigneeId,
        type: 'task_assigned',
        message: currentUser.name + ' assigned you a task: "' + updatedTask.title + '"',
        taskId: id,
        taskTitle: updatedTask.title,
        boardId: updatedTask.boardId,
      });
    }
  };

  const deleteTask = (id: string) => {
    markLocalWrite();
    const task = tasks.find((t) => t.id === id);
    setTasks((prev) => prev.filter((t) => t.id !== id));

    if (isSupabaseConfigured && supabase) {
      const client = supabase;
      (async () => {
        try {
          const { error: writeError } = await client.from('tasks').delete().eq('id', id);
            if (writeError) throw writeError;
        } catch (err) {
          console.warn('Supabase deleteTask error:', err);
          notifySyncFailure("Deleting the task", err);
        }
      })();
    }

    if (task) {
      const board = boards.find((b) => b.id === task.boardId);
      logActivity('deleted_task', task.title, board?.title, 'Deleted task "' + task.title + '"');
    }
  };

  // Move task and persist all reindexed siblings across columns
  const moveTask = (
    taskId: string,
    targetColumnId: string,
    newOrder: number
  ) => {
    markLocalWrite();
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;

    // Pure, unit-tested reorder logic — see src/utils/taskReorder.ts
    const updatedTasks = reorderTasks(tasks, taskId, targetColumnId, newOrder);

    setTasks(updatedTasks);

    // Persist ALL reindexed siblings to Supabase so positions stay perfectly consistent
    if (isSupabaseConfigured && supabase) {
      const client = supabase;
      (async () => {
        try {
          const changedTasks = tasksNeedingPersist(tasks, updatedTasks);
          if (changedTasks.length === 0) return;

          const { error: writeError } = await client.from('tasks').upsert(
            changedTasks.map((t) => ({
              id: t.id,
              board_id: t.boardId,
              column_id: t.columnId,
              title: t.title,
              description: t.description || '',
              priority: t.priority || 'medium',
              due_date: t.dueDate || null,
              assignee_id: t.assigneeId || null,
              order: t.order,
              updated_at: t.updatedAt,
            })),
            { onConflict: 'id' }
          );
            if (writeError) throw writeError;
        } catch (err) {
          console.warn('Supabase moveTask error:', err);
          notifySyncFailure("Moving the task", err);
        }
      })();
    }

    const targetColumn = columns.find((c) => c.id === targetColumnId);
    const board = boards.find((b) => b.id === task.boardId);

    if (targetColumn?.title.toLowerCase().includes('done')) {
      logActivity('completed_task', task.title, board?.title, 'Completed task "' + task.title + '"');
    } else {
      logActivity('moved_task', task.title, board?.title, 'Moved to ' + (targetColumn?.title || 'column'));
    }
  };

  // Task Comments & Attachments
  const addComment = (taskId: string, content: string) => {
    markLocalWrite();
    const commentId = 'comment-' + Date.now() + '-' + generateRandomSlug(4);
    const newComment: TaskComment = {
      id: commentId,
      taskId,
      userId: currentUser.id,
      userName: currentUser.name,
      userAvatar: currentUser.avatar,
      content,
      createdAt: new Date().toISOString(),
    };

    setTasks((prev) =>
      prev.map((t) =>
        t.id === taskId
          ? { ...t, comments: [...(t.comments || []), newComment] }
          : t
      )
    );

    if (isSupabaseConfigured && supabase) {
      const client = supabase;
      (async () => {
        try {
          const { error: writeError } = await client.from('task_comments').insert({
            id: commentId,
            task_id: taskId,
            user_id: currentUser.id || authUser?.id,
            user_name: currentUser.name,
            user_avatar: '', // resolved from profiles on read; never store a copy here
            content,
          });
            if (writeError) throw writeError;
        } catch (err) {
          console.warn('Supabase addComment error:', err);
          notifySyncFailure("Your comment", err);
        }
      })();
    }

    const task = tasks.find((t) => t.id === taskId);
    if (task) {
      const board = boards.find((b) => b.id === task.boardId);
      logActivity('comment_added', task.title, board?.title, 'Added comment: "' + content.slice(0, 40) + (content.length > 40 ? '...' : '') + '"');
    }

    if (task && task.assigneeId && task.assigneeId !== currentUser.id) {
      notifyUser({
        recipientId: task.assigneeId,
        type: 'comment_added',
        message: currentUser.name + ' commented on "' + task.title + '": "' + content.slice(0, 50) + (content.length > 50 ? '...' : '') + '"',
        taskId,
        taskTitle: task.title,
        boardId: task.boardId,
      });
    }
  };

  const deleteComment = (taskId: string, commentId: string) => {
    markLocalWrite();
    setTasks((prev) =>
      prev.map((t) =>
        t.id === taskId
          ? { ...t, comments: (t.comments || []).filter((c) => c.id !== commentId) }
          : t
      )
    );

    if (isSupabaseConfigured && supabase) {
      const client = supabase;
      (async () => {
        try {
          const { error: writeError } = await client.from('task_comments').delete().eq('id', commentId);
            if (writeError) throw writeError;
        } catch (err) {
          console.warn('Supabase deleteComment error:', err);
          notifySyncFailure("Deleting the comment", err);
        }
      })();
    }
  };

  const addAttachment = (
    taskId: string,
    fileData: { name: string; size: number; type: string; url: string }
  ) => {
    markLocalWrite();
    const attachmentId = 'att-' + Date.now() + '-' + generateRandomSlug(4);
    const newAttachment: TaskAttachment = {
      id: attachmentId,
      taskId,
      ...fileData,
      uploadedAt: new Date().toISOString(),
      uploadedBy: currentUser.name,
    };

    setTasks((prev) =>
      prev.map((t) =>
        t.id === taskId
          ? {
              ...t,
              attachments: [...(t.attachments || []), newAttachment],
            }
          : t
      )
    );

    if (isSupabaseConfigured && supabase) {
      const client = supabase;
      (async () => {
        try {
          // `uploaded_by` is NOT NULL on the deployed table; omitting it made
          // every attachment insert fail a not-null violation.
          const { error: writeError } = await client.from('task_attachments').insert({
            id: attachmentId,
            task_id: taskId,
            name: fileData.name,
            size: fileData.size,
            type: fileData.type,
            url: fileData.url,
            uploaded_by: currentUser.name || '',
          });
            if (writeError) throw writeError;
        } catch (err) {
          console.warn('Supabase addAttachment error:', err);
          notifySyncFailure("The attachment", err);
        }
      })();
    }
  };

  const deleteAttachment = (taskId: string, attachmentId: string) => {
    markLocalWrite();
    setTasks((prev) =>
      prev.map((t) =>
        t.id === taskId
          ? {
              ...t,
              attachments: (t.attachments || []).filter(
                (a) => a.id !== attachmentId
              ),
            }
          : t
      )
    );

    if (isSupabaseConfigured && supabase) {
      const client = supabase;
      (async () => {
        try {
          const { error: writeError } = await client.from('task_attachments').delete().eq('id', attachmentId);
            if (writeError) throw writeError;
        } catch (err) {
          console.warn('Supabase deleteAttachment error:', err);
          notifySyncFailure("Deleting the attachment", err);
        }
      })();
    }
  };

  // Notification Actions
  const notifyUser = (data: {
    recipientId: string;
    type: any;
    message: string;
    taskId?: string;
    taskTitle?: string;
    boardId?: string;
  }) => {
    markLocalWrite();
    const notifId = 'notif-' + Date.now() + '-' + generateRandomSlug(4);
    const newNotif: Notification = {
      id: notifId,
      recipientId: data.recipientId,
      senderId: currentUser.id,
      senderName: currentUser.name,
      senderAvatar: currentUser.avatar,
      type: data.type,
      message: data.message,
      taskId: data.taskId,
      taskTitle: data.taskTitle,
      boardId: data.boardId,
      isRead: false,
      createdAt: new Date().toISOString(),
    };

    if (data.recipientId === currentUser.id) {
      setNotifications((prev) => [newNotif, ...prev]);
    }

    if (isSupabaseConfigured && supabase) {
      const client = supabase;
      (async () => {
        try {
          const { error: writeError } = await client.from('notifications').insert({
            id: notifId,
            recipient_id: data.recipientId,
            sender_id: currentUser.id || authUser?.id,
            sender_name: currentUser.name,
            sender_avatar: '', // resolved from profiles on read; never store a copy here
            type: data.type,
            message: data.message,
            task_id: data.taskId || null,
            task_title: data.taskTitle || null,
            board_id: data.boardId || null,
            is_read: false,
          });
            if (writeError) throw writeError;
        } catch (err) {
          console.warn('Supabase notifyUser error:', err);
        }
      })();
    }
  };

  const markNotificationAsRead = (id: string) => {
    markLocalWrite();
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
    );

    if (isSupabaseConfigured && supabase) {
      const client = supabase;
      (async () => {
        try {
          const { error: writeError } = await client.from('notifications').update({ is_read: true }).eq('id', id);
            if (writeError) throw writeError;
        } catch (err) {
          console.warn('Supabase markRead error:', err);
        }
      })();
    }
  };

  const markAllNotificationsAsRead = () => {
    markLocalWrite();
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));

    if (isSupabaseConfigured && supabase && authUser?.id) {
      const client = supabase;
      (async () => {
        try {
          const { error: writeError } = await client.from('notifications').update({ is_read: true }).eq('recipient_id', authUser.id);
            if (writeError) throw writeError;
        } catch (err) {
          console.warn('Supabase markAllRead error:', err);
        }
      })();
    }
  };

  const clearNotifications = () => {
    markLocalWrite();
    setNotifications([]);

    if (isSupabaseConfigured && supabase && authUser?.id) {
      const client = supabase;
      (async () => {
        try {
          const { error: writeError } = await client.from('notifications').delete().eq('recipient_id', authUser.id);
            if (writeError) throw writeError;
        } catch (err) {
          console.warn('Supabase clearNotifications error:', err);
          notifySyncFailure("Clearing notifications", err);
        }
      })();
    }
  };

  const unreadNotificationCount = notifications.filter((n) => !n.isRead).length;

  // Activity Logging
  const logActivity = (
    action: ActivityLog['action'],
    entityTitle: string,
    boardTitle?: string,
    details?: string
  ) => {
    markLocalWrite();
    const logId = 'act-' + Date.now() + '-' + generateRandomSlug(4);
    const newLog: ActivityLog = {
      id: logId,
      userId: currentUser.id,
      userName: currentUser.name,
      userAvatar: currentUser.avatar,
      action,
      entityTitle,
      boardTitle,
      details,
      timestamp: new Date().toISOString(),
    };

    setActivityLogs((prev) => [newLog, ...prev.slice(0, 49)]);

    if (isSupabaseConfigured && supabase) {
      const client = supabase;
      (async () => {
        try {
          const { error: writeError } = await client.from('activity_logs').insert({
            id: logId,
            workspace_id: workspace.id || 'ws-default',
            user_id: currentUser.id || authUser?.id,
            user_name: currentUser.name,
            user_avatar: '', // resolved from profiles on read; never store a copy here
            action,
            entity_title: entityTitle,
            board_title: boardTitle || '',
            details: details || '',
          });
            if (writeError) throw writeError;
        } catch (err) {
          console.warn('Supabase logActivity error:', err);
        }
      })();
    }
  };

  const setActivePage = (page: ActivePage) => {
    switch (page) {
      case 'dashboard':
        navigate('/dashboard');
        break;
      case 'boards':
        navigate('/boards');
        break;
      case 'board-detail':
        if (activeBoardId) navigate('/boards/' + activeBoardId);
        else navigate('/boards');
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

  const openTaskModal = (
    task?: Task,
    initialBoardId?: string,
    initialColumnId?: string
  ) => {
    setTaskModalState({
      isOpen: true,
      task: task || null,
      initialBoardId,
      initialColumnId,
    });
  };

  const closeTaskModal = () => {
    setTaskModalState({ isOpen: false, task: null });
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
        refreshRemoteData: fetchRemoteWorkspaceData,
        isLoadingRemote,
        setIsDragging,
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

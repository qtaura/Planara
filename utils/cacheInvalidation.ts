import { invalidateCache } from '../middlewares/cache.js';

// Cache invalidation patterns for different entity types
export const CachePatterns = {
  // User-related cache invalidation
  users: {
    all: () => invalidateCache('.*users.*'),
    byId: (userId: string) => invalidateCache(`.*users.*${userId}.*`),
    profile: (userId: string) => invalidateCache(`.*users.*${userId}.*profile.*`),
    sessions: (userId: string) => invalidateCache(`.*users.*${userId}.*sessions.*`)
  },

  // Project-related cache invalidation
  projects: {
    all: () => invalidateCache('.*projects.*'),
    byId: (projectId: string) => invalidateCache(`.*projects.*${projectId}.*`),
    byUser: (userId: string) => invalidateCache(`.*projects.*userId.*${userId}.*`),
    byTeam: (teamId: string) => invalidateCache(`.*projects.*teamId.*${teamId}.*`)
  },

  // Task-related cache invalidation
  tasks: {
    all: () => invalidateCache('.*tasks.*'),
    byId: (taskId: string) => invalidateCache(`.*tasks.*${taskId}.*`),
    byProject: (projectId: string) => invalidateCache(`.*tasks.*projectId.*${projectId}.*`),
    byUser: (userId: string) => invalidateCache(`.*tasks.*userId.*${userId}.*`)
  },

  // Team-related cache invalidation
  teams: {
    all: () => invalidateCache('.*teams.*'),
    byId: (teamId: string) => invalidateCache(`.*teams.*${teamId}.*`),
    members: (teamId: string) => invalidateCache(`.*teams.*${teamId}.*members.*`),
    byUser: (userId: string) => invalidateCache(`.*teams.*userId.*${userId}.*`)
  },

  // Milestone-related cache invalidation
  milestones: {
    all: () => invalidateCache('.*milestones.*'),
    byId: (milestoneId: string) => invalidateCache(`.*milestones.*${milestoneId}.*`),
    byProject: (projectId: string) => invalidateCache(`.*milestones.*projectId.*${projectId}.*`)
  },

  // Comment-related cache invalidation
  comments: {
    all: () => invalidateCache('.*comments.*'),
    byTask: (taskId: string) => invalidateCache(`.*comments.*taskId.*${taskId}.*`),
    byUser: (userId: string) => invalidateCache(`.*comments.*userId.*${userId}.*`)
  },

  // Organization-related cache invalidation
  organizations: {
    all: () => invalidateCache('.*orgs.*'),
    byId: (orgId: string) => invalidateCache(`.*orgs.*${orgId}.*`),
    byUser: (userId: string) => invalidateCache(`.*orgs.*userId.*${userId}.*`)
  },

  // Search-related cache invalidation
  search: {
    all: () => invalidateCache('.*search.*'),
    byQuery: (query: string) => invalidateCache(`.*search.*${encodeURIComponent(query)}.*`)
  },

  // Global cache operations
  global: {
    clear: () => invalidateCache(),
    clearByUser: (userId: string) => invalidateCache(`.*userId.*${userId}.*`),
    clearByTeam: (teamId: string) => invalidateCache(`.*teamId.*${teamId}.*`)
  }
};

// Helper function to invalidate multiple cache patterns
export function invalidateMultiple(patterns: (() => void)[]): void {
  patterns.forEach(pattern => {
    try {
      pattern();
    } catch (error) {
      console.warn('Cache invalidation failed:', error);
    }
  });
}

// Middleware to automatically invalidate cache on write operations
export function autoInvalidateCache(entityType: keyof typeof CachePatterns, entityId?: string) {
  return (req: any, res: any, next: any) => {
    const originalSend = res.send;
    
    res.send = function(body: any) {
      // Only invalidate on successful write operations (2xx status codes)
      if (res.statusCode >= 200 && res.statusCode < 300) {
        try {
          const patterns = CachePatterns[entityType];
          if (patterns && typeof patterns === 'object') {
            // Invalidate all entries for this entity type
            if ('all' in patterns && typeof patterns.all === 'function') {
              patterns.all();
            }
            
            // Invalidate specific entity if ID is provided
            if (entityId && 'byId' in patterns && typeof patterns.byId === 'function') {
              patterns.byId(entityId);
            }
            
            // Invalidate user-specific cache if userId is available
            const userId = req.userId;
            if (userId && 'byUser' in patterns && typeof patterns.byUser === 'function') {
              patterns.byUser(userId);
            }
            
            // Invalidate team-specific cache if teamId is available
            const teamId = req.teamId;
            if (teamId && 'byTeam' in patterns && typeof patterns.byTeam === 'function') {
              patterns.byTeam(teamId);
            }
          }
        } catch (error) {
          console.warn('Auto cache invalidation failed:', error);
        }
      }
      
      return originalSend.call(this, body);
    };
    
    next();
  };
}
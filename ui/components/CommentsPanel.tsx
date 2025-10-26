import React, { useEffect, useMemo, useState } from 'react';
import { listComments, createComment, createReply, reactToComment } from '../lib/api';

type CommentType = {
  id: number;
  content: string;
  taskId: number;
  authorId?: number;
  parentCommentId?: number | null;
  threadId?: number | null;
  createdAt?: string;
  reactions?: Record<string, number>;
};

type TaskRef = { id: number; projectId?: number };

function ReactionBar({
  comment,
  onReact,
}: {
  comment: CommentType;
  onReact: (type: string, op?: 'add' | 'remove') => void;
}) {
  const types: Array<{ key: keyof NonNullable<CommentType['reactions']>; label: string }> = [
    { key: 'thumbs_up' as any, label: '👍' },
    { key: 'heart' as any, label: '❤️' },
    { key: 'laugh' as any, label: '😄' },
    { key: 'hooray' as any, label: '🎉' },
    { key: 'rocket' as any, label: '🚀' },
    { key: 'eyes' as any, label: '👀' },
  ];
  const r = comment.reactions || {};
  return (
    <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
      {types.map((t) => (
        <button
          key={String(t.key)}
          onClick={() => onReact(String(t.key), 'add')}
          title={`React with ${String(t.key)}`}
          style={{
            padding: '2px 6px',
            borderRadius: 6,
            border: '1px solid #ddd',
            background: '#fff',
            cursor: 'pointer',
          }}
        >
          {t.label} {r[String(t.key)] ? ` ${r[String(t.key)]}` : ''}
        </button>
      ))}
    </div>
  );
}

function CommentItem({
  comment,
  depth,
  children,
  onReply,
  onReact,
}: {
  comment: CommentType;
  depth: number;
  children: React.ReactNode;
  onReply: (parentId: number, content: string) => void;
  onReact: (commentId: number, type: string, op?: 'add' | 'remove') => void;
}) {
  const [replyText, setReplyText] = useState('');
  const canReply = depth < 3; // respect max thread depth
  return (
    <div style={{ marginLeft: depth * 16, padding: 8, borderLeft: '2px solid #eee' }}>
      <div style={{ whiteSpace: 'pre-wrap' }}>{comment.content}</div>
      <ReactionBar comment={comment} onReact={(type, op) => onReact(comment.id, type, op)} />
      {canReply && (
        <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
          <input
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            placeholder="Reply..."
            style={{ flex: 1, padding: '6px 8px', borderRadius: 6, border: '1px solid #ddd' }}
          />
          <button
            onClick={() => {
              if (replyText.trim().length === 0) return;
              onReply(comment.id, replyText.trim());
              setReplyText('');
            }}
            style={{
              padding: '6px 10px',
              borderRadius: 6,
              border: '1px solid #ddd',
              background: '#f8f8f8',
              cursor: 'pointer',
            }}
          >
            Reply
          </button>
        </div>
      )}
      <div style={{ marginTop: 6 }}>{children}</div>
    </div>
  );
}

export default function CommentsPanel({ task }: { task: TaskRef }) {
  const [comments, setComments] = useState<CommentType[]>([]);
  const [newText, setNewText] = useState('');
  const [loading, setLoading] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const list = await listComments(task.id);
      setComments(list as any);
    } catch (e) {
      console.error('Failed to load comments', e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    const handler = () => load();
    window.addEventListener('comments:changed', handler as any);
    return () => window.removeEventListener('comments:changed', handler as any);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [task?.id]);

  const tree = useMemo(() => {
    const byId = new Map<number, CommentType>();
    const children = new Map<number, CommentType[]>();
    const roots: CommentType[] = [];
    for (const c of comments) {
      byId.set(c.id, c);
    }
    for (const c of comments) {
      const pid = c.parentCommentId || null;
      if (!pid) {
        roots.push(c);
      } else {
        const arr = children.get(pid) || [];
        arr.push(c);
        children.set(pid, arr);
      }
    }
    function renderNode(node: CommentType, depth: number): React.ReactNode {
      const ch = children.get(node.id) || [];
      return (
        <CommentItem
          key={node.id}
          comment={node}
          depth={depth}
          onReply={async (parentId, content) => {
            await createReply(parentId, content).then(load).catch(console.error);
          }}
          onReact={async (commentId, type, op) => {
            await reactToComment(commentId, type as any, op)
              .then(load)
              .catch(console.error);
          }}
        >
          {ch.map((kid) => renderNode(kid, Math.min(depth + 1, 3)))}
        </CommentItem>
      );
    }
    return roots.map((r) => renderNode(r, 0));
  }, [comments]);

  return (
    <div style={{ marginTop: 16 }}>
      <h3 style={{ margin: 0, fontSize: 16 }}>Comments</h3>
      <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
        <input
          value={newText}
          onChange={(e) => setNewText(e.target.value)}
          placeholder="Write a comment... Use @mentions to notify."
          style={{ flex: 1, padding: '8px 10px', borderRadius: 8, border: '1px solid #ddd' }}
        />
        <button
          onClick={async () => {
            if (!newText.trim()) return;
            await createComment({ taskId: task.id, content: newText.trim() })
              .then(() => {
                setNewText('');
                load();
              })
              .catch(console.error);
          }}
          style={{
            padding: '8px 12px',
            borderRadius: 8,
            border: '1px solid #ddd',
            background: '#f7f7f7',
            cursor: 'pointer',
          }}
        >
          Add
        </button>
      </div>
      <div style={{ marginTop: 12 }}>
        {loading ? (
          <div>Loading comments…</div>
        ) : tree.length === 0 ? (
          <div style={{ color: '#666' }}>No comments yet.</div>
        ) : (
          <div>{tree}</div>
        )}
      </div>
    </div>
  );
}

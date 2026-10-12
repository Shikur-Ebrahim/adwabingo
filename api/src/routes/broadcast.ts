/**
 * api/src/routes/broadcast.ts
 * Admin Broadcast / Post management
 *
 * Endpoints:
 *  GET    /api/broadcast            – list all posts (admin)
 *  POST   /api/broadcast            – create post (draft or scheduled)
 *  PUT    /api/broadcast/:id        – update post
 *  DELETE /api/broadcast/:id        – delete post (also deletes R2 image)
 *  POST   /api/broadcast/:id/send   – immediately send/publish a post
 *  POST   /api/broadcast/presign    – get R2 presigned URL for image upload
 */

import { Router, Response, NextFunction } from 'express';
import { AuthRequest, validateTelegramAuth } from '../middleware/auth';
import { supabase } from '../services/supabase';
import { getPresignedUploadUrl, deleteFromR2 } from '../services/r2';
import crypto from 'crypto';

const router = Router();

// ── Middleware: admin only ────────────────────────────────────────────────────
const requireAdmin = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  const telegramId = req.telegramUser!.id.toString();
  const { data } = await supabase.from('users').select('role').eq('telegram_id', telegramId).single();
  if (!data || data.role !== 'admin') {
    res.status(403).json({ error: 'Admin only' });
    return;
  }
  next();
};

// ── Helper: send one Telegram message ────────────────────────────────────────
async function sendTelegramMessage(
  botToken: string,
  chatId: string,
  body: string,
  imageUrl?: string | null
): Promise<boolean> {
  try {
    const base = `https://api.telegram.org/bot${botToken}`;
    if (imageUrl) {
      const r = await fetch(`${base}/sendPhoto`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          photo: imageUrl,
          caption: body,
          parse_mode: 'Markdown',
        }),
      });
      return r.ok;
    } else {
      const r = await fetch(`${base}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text: body,
          parse_mode: 'Markdown',
        }),
      });
      return r.ok;
    }
  } catch {
    return false;
  }
}

// ── Core: broadcast a post to all eligible users and/or channel ───────────────
async function executeBroadcast(postId: string): Promise<void> {
  const { data: post } = await supabase
    .from('broadcast_posts')
    .select('*')
    .eq('id', postId)
    .single();

  if (!post) return;

  const botToken = process.env.BOT_TOKEN;
  const channelId = process.env.TELEGRAM_CHANNEL_ID; // e.g. "@mychannel" or "-1001234567890"

  if (!botToken) {
    await supabase.from('broadcast_posts').update({
      status: 'failed',
      updated_at: new Date().toISOString(),
    }).eq('id', postId);
    console.error('[Broadcast] BOT_TOKEN not set');
    return;
  }

  // Mark as sending
  await supabase.from('broadcast_posts').update({
    status: 'sending',
    updated_at: new Date().toISOString(),
  }).eq('id', postId);

  let sentCount = 0;
  let failedCount = 0;

  // ── Send to channel if requested ────────────────────────────────────────────
  const sendToChannel = (post.send_to === 'channel' || post.send_to === 'both') && channelId;
  if (sendToChannel) {
    const ok = await sendTelegramMessage(botToken, channelId!, post.body, post.image_url);
    if (ok) sentCount++; else failedCount++;
  }

  // ── Send to all users (role = 'user' only) ──────────────────────────────────
  const sendToBot = post.send_to === 'bot' || post.send_to === 'both';
  if (sendToBot) {
    // Fetch in batches of 100
    let page = 0;
    const pageSize = 100;

    while (true) {
      const { data: users } = await supabase
        .from('users')
        .select('telegram_id')
        .eq('role', 'user')
        .eq('is_blocked', false)
        .range(page * pageSize, (page + 1) * pageSize - 1);

      if (!users || users.length === 0) break;

      for (const u of users) {
        // Throttle: Telegram allows ~30 msg/sec to different chats
        await new Promise(r => setTimeout(r, 35));
        const ok = await sendTelegramMessage(botToken, u.telegram_id, post.body, post.image_url);
        if (ok) sentCount++; else failedCount++;
      }

      if (users.length < pageSize) break;
      page++;
    }
  }

  // Mark as sent
  await supabase.from('broadcast_posts').update({
    status: 'sent',
    sent_at: new Date().toISOString(),
    sent_count: sentCount,
    failed_count: failedCount,
    updated_at: new Date().toISOString(),
  }).eq('id', postId);

  console.log(`[Broadcast] Post ${postId} sent: ${sentCount} ok, ${failedCount} failed`);
}

// ── Background scheduler: check every 30 seconds for due scheduled posts ─────
let schedulerRunning = false;
export function startBroadcastScheduler() {
  if (schedulerRunning) return;
  schedulerRunning = true;

  setInterval(async () => {
    try {
      const { data: duePosts } = await supabase
        .from('broadcast_posts')
        .select('id')
        .eq('status', 'scheduled')
        .lte('scheduled_at', new Date().toISOString());

      if (!duePosts || duePosts.length === 0) return;

      for (const p of duePosts) {
        console.log(`[Broadcast] Scheduled post due: ${p.id}`);
        executeBroadcast(p.id).catch(e => console.error('[Broadcast Scheduler]', e));
      }
    } catch (e) {
      console.error('[Broadcast Scheduler]', e);
    }
  }, 30_000);

  console.log('📢 Broadcast scheduler running');
}

// ── GET /api/broadcast ────────────────────────────────────────────────────────
router.get('/', validateTelegramAuth, requireAdmin, async (_req, res) => {
  const { data, error } = await supabase
    .from('broadcast_posts')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(100);

  if (error) { res.status(500).json({ error: error.message }); return; }
  res.json({ posts: data || [] });
});

// ── POST /api/broadcast/presign ───────────────────────────────────────────────
// Get a presigned URL to upload a post image to R2
router.post('/presign', validateTelegramAuth, requireAdmin, async (req: AuthRequest, res) => {
  const { filename, contentType } = req.body;
  if (!filename || !contentType) {
    res.status(400).json({ error: 'filename and contentType required' }); return;
  }
  const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
  if (!allowed.includes(contentType)) {
    res.status(400).json({ error: 'Only image files allowed' }); return;
  }
  const ext = filename.split('.').pop() || 'jpg';
  const key = `posts/${crypto.randomBytes(10).toString('hex')}.${ext}`;
  try {
    const uploadUrl = await getPresignedUploadUrl(key, contentType);
    const publicUrl = `${process.env.R2_PUBLIC_URL}/${key}`;
    res.json({ uploadUrl, publicUrl, key });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/broadcast ───────────────────────────────────────────────────────
// Create a new post (draft or scheduled). Does NOT send immediately.
router.post('/', validateTelegramAuth, requireAdmin, async (req: AuthRequest, res) => {
  const telegramId = req.telegramUser!.id.toString();
  const { title, body, image_url, image_key, send_to, scheduled_at } = req.body;

  if (!body || !body.trim()) {
    res.status(400).json({ error: 'Post body is required' }); return;
  }
  const sendTo = ['bot', 'channel', 'both'].includes(send_to) ? send_to : 'bot';
  const status = scheduled_at ? 'scheduled' : 'draft';

  const { data, error } = await supabase
    .from('broadcast_posts')
    .insert({
      title: title || '',
      body: body.trim(),
      image_url: image_url || null,
      image_key: image_key || null,
      send_to: sendTo,
      status,
      scheduled_at: scheduled_at || null,
      created_by: telegramId,
    })
    .select()
    .single();

  if (error) { res.status(500).json({ error: error.message }); return; }
  res.json({ post: data });
});

// ── PUT /api/broadcast/:id ────────────────────────────────────────────────────
router.put('/:id', validateTelegramAuth, requireAdmin, async (req, res) => {
  const { id } = req.params;
  const { title, body, image_url, image_key, send_to, scheduled_at } = req.body;

  const { data: existing } = await supabase.from('broadcast_posts').select('status, image_key').eq('id', id).single();
  if (!existing) { res.status(404).json({ error: 'Post not found' }); return; }
  if (existing.status === 'sent' || existing.status === 'sending') {
    res.status(400).json({ error: 'Cannot edit a post that is already sent or sending' }); return;
  }

  // If image changed, clean up old R2 object
  if (image_key && existing.image_key && image_key !== existing.image_key) {
    deleteFromR2(existing.image_key).catch(() => {});
  }

  const sendTo = ['bot', 'channel', 'both'].includes(send_to) ? send_to : 'bot';
  const status = scheduled_at ? 'scheduled' : 'draft';

  const { data, error } = await supabase
    .from('broadcast_posts')
    .update({
      title: title || '',
      body: body?.trim(),
      image_url: image_url || null,
      image_key: image_key || null,
      send_to: sendTo,
      status,
      scheduled_at: scheduled_at || null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single();

  if (error) { res.status(500).json({ error: error.message }); return; }
  res.json({ post: data });
});

// ── DELETE /api/broadcast/:id ─────────────────────────────────────────────────
router.delete('/:id', validateTelegramAuth, requireAdmin, async (req, res) => {
  const { id } = req.params;
  const { data: existing } = await supabase.from('broadcast_posts').select('image_key').eq('id', id).single();
  if (!existing) { res.status(404).json({ error: 'Not found' }); return; }

  if (existing.image_key) {
    deleteFromR2(existing.image_key).catch(() => {});
  }

  const { error } = await supabase.from('broadcast_posts').delete().eq('id', id);
  if (error) { res.status(500).json({ error: error.message }); return; }
  res.json({ success: true });
});

// ── POST /api/broadcast/:id/send ─────────────────────────────────────────────
// Immediately publish/send a post (regardless of scheduled_at)
router.post('/:id/send', validateTelegramAuth, requireAdmin, async (req, res) => {
  const { id } = req.params;
  const { data: post } = await supabase.from('broadcast_posts').select('status').eq('id', id).single();
  if (!post) { res.status(404).json({ error: 'Post not found' }); return; }
  if (post.status === 'sending') { res.status(400).json({ error: 'Already sending' }); return; }
  if (post.status === 'sent') { res.status(400).json({ error: 'Already sent' }); return; }

  // Fire and forget — respond immediately so admin sees spinner feedback
  res.json({ success: true, message: 'Broadcast started' });
  executeBroadcast(id).catch(e => console.error('[Broadcast Send]', e));
});

export default router;

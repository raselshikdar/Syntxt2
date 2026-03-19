import { db } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // Create mock users
    const users = await Promise.all([
      db.user.upsert({
        where: { handle: 'neo' },
        update: {},
        create: { 
          handle: 'neo', 
          displayName: 'Neo',
          bio: 'The One. Code enthusiast. Breaking boundaries in the digital realm.' 
        },
      }),
      db.user.upsert({
        where: { handle: 'cipher' },
        update: {},
        create: { 
          handle: 'cipher', 
          displayName: 'Cipher',
          bio: 'Encrypting thoughts, decrypting meaning.' 
        },
      }),
      db.user.upsert({
        where: { handle: 'kernel' },
        update: {},
        create: { 
          handle: 'kernel', 
          displayName: 'Kernel',
          bio: 'Core systems. Deep thoughts.' 
        },
      }),
      db.user.upsert({
        where: { handle: 'nvidia' },
        update: {},
        create: { 
          handle: 'nvidia', 
          displayName: 'NVIDIA',
          bio: 'Rendering reality, one frame at a time.' 
        },
      }),
      db.user.upsert({
        where: { handle: 'overflow' },
        update: {},
        create: { 
          handle: 'overflow', 
          displayName: 'Overflow',
          bio: 'Stack it high, solve it all.' 
        },
      }),
      // Admin user
      db.user.upsert({
        where: { handle: 'admin' },
        update: {},
        create: { 
          handle: 'admin', 
          displayName: 'Administrator',
          bio: 'System administrator. Keeping things running smoothly.',
          role: 'ADMIN'
        },
      }),
    ]);

    // Create mock posts
    const posts = await Promise.all([
      db.post.create({
        data: {
          content: 'Just shipped a new feature at 3am. The code was clean, the tests passed. Sometimes the best work happens when the world sleeps. `git push origin main`',
          authorId: users[0].id,
        },
      }),
      db.post.create({
        data: {
          content: 'The best algorithms are the ones you can explain to a rubber duck. Clarity over cleverness, always.',
          authorId: users[1].id,
        },
      }),
      db.post.create({
        data: {
          content: 'Spent the day refactoring legacy code. Deleted 500 lines, added 50. Productivity isn\'t about lines written—it\'s about complexity removed.',
          authorId: users[2].id,
        },
      }),
      db.post.create({
        data: {
          content: 'Hot take: The best documentation is code that doesn\'t need documentation. Self-explanatory naming, clear structure, obvious intent.',
          authorId: users[3].id,
        },
      }),
      db.post.create({
        data: {
          content: 'Learning Rust this weekend. The borrow checker is strict but fair. Feels like having a strict teacher who actually wants you to succeed.',
          authorId: users[4].id,
        },
      }),
      db.post.create({
        data: {
          content: '`console.log("Hello, syntxt_")` — First post on this beautiful, minimal platform. Text only. No noise. Just thoughts.',
          authorId: users[0].id,
        },
      }),
      db.post.create({
        data: {
          content: 'The command line never lies. `grep`, `sed`, `awk` — the holy trinity of text manipulation. Master these, master the terminal.',
          authorId: users[1].id,
        },
      }),
      db.post.create({
        data: {
          content: 'Debugging is like being a detective in a crime movie where you are also the murderer. Every bug was put there by past you.',
          authorId: users[2].id,
        },
      }),
      db.post.create({
        data: {
          content: 'TIL: You can use `git commit --amend` to fix your last commit message. Game changer for those "typo in commit" moments.',
          authorId: users[3].id,
        },
      }),
      db.post.create({
        data: {
          content: 'The beauty of monospace fonts: every character has its place. No kerning surprises. Predictable. Reliable. Like good code should be.',
          authorId: users[4].id,
        },
      }),
    ]);

    // Create some follows
    await Promise.all([
      db.follow.create({ data: { followerId: users[0].id, followingId: users[1].id } }).catch(() => {}),
      db.follow.create({ data: { followerId: users[0].id, followingId: users[2].id } }).catch(() => {}),
      db.follow.create({ data: { followerId: users[1].id, followingId: users[0].id } }).catch(() => {}),
      db.follow.create({ data: { followerId: users[2].id, followingId: users[3].id } }).catch(() => {}),
      db.follow.create({ data: { followerId: users[3].id, followingId: users[0].id } }).catch(() => {}),
      db.follow.create({ data: { followerId: users[4].id, followingId: users[0].id } }).catch(() => {}),
    ]);

    // Create some likes
    await Promise.all([
      db.like.create({ data: { postId: posts[0].id, userId: users[1].id } }).catch(() => {}),
      db.like.create({ data: { postId: posts[0].id, userId: users[2].id } }).catch(() => {}),
      db.like.create({ data: { postId: posts[1].id, userId: users[0].id } }).catch(() => {}),
      db.like.create({ data: { postId: posts[2].id, userId: users[3].id } }).catch(() => {}),
      db.like.create({ data: { postId: posts[3].id, userId: users[0].id } }).catch(() => {}),
      db.like.create({ data: { postId: posts[4].id, userId: users[1].id } }).catch(() => {}),
    ]);

    // Create some notifications
    await Promise.all([
      db.notification.create({ 
        data: { 
          userId: users[0].id, 
          type: 'like', 
          title: '@cipher liked your post', 
          relatedId: posts[0].id 
        } 
      }).catch(() => {}),
      db.notification.create({ 
        data: { 
          userId: users[0].id, 
          type: 'follow', 
          title: '@nvidia started following you',
          relatedId: users[3].id 
        } 
      }).catch(() => {}),
    ]);

    // Create some messages
    await Promise.all([
      db.message.create({ 
        data: { 
          senderId: users[1].id, 
          receiverId: users[0].id, 
          content: 'Hey! Love your latest post about the 3am coding session.' 
        } 
      }).catch(() => {}),
      db.message.create({ 
        data: { 
          senderId: users[0].id, 
          receiverId: users[1].id, 
          content: 'Thanks! Sometimes the night is the best time to code.' 
        } 
      }).catch(() => {}),
    ]);

    return NextResponse.json({ 
      success: true, 
      message: 'Database seeded successfully',
      users: users.length,
      posts: posts.length 
    });
  } catch (error) {
    console.error('Seed error:', error);
    return NextResponse.json({ error: 'Failed to seed database' }, { status: 500 });
  }
}

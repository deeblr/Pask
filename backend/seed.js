/**
 * seed.js — creates many test accounts + 1 server "pask support"
 * Run: node seed.js
 */
require('dotenv').config();
process.env.JWT_SECRET = process.env.JWT_SECRET || 'pask_fallback_secret_please_set_env';

const mongoose = require('mongoose');
const User     = require('./models/User');
const Server   = require('./models/Server');
const Channel  = require('./models/Channel');

// ---------- predefined users (10) ----------
const PREDEFINED_USERS = [
  { username: 'nova',    email: 'nova@pask.dev',    bio: 'frontend dev. coffee addict.' },
  { username: 'ryo',     email: 'ryo@pask.dev',     bio: 'building things at night.' },
  { username: 'zara',    email: 'zara@pask.dev',    bio: 'designer & color theory nerd.' },
  { username: 'kael',    email: 'kael@pask.dev',    bio: 'systems engineer. arch linux user.' },
  { username: 'mira',    email: 'mira@pask.dev',    bio: 'ml researcher. tea over coffee.' },
  { username: 'dex',     email: 'dex@pask.dev',     bio: 'game dev. pixel art enthusiast.' },
  { username: 'lyra',    email: 'lyra@pask.dev',    bio: 'open source contributor.' },
  { username: 'colt',    email: 'colt@pask.dev',    bio: 'devops & infra. k8s fanatic.' },
  { username: 'senna',   email: 'senna@pask.dev',   bio: 'security researcher.' },
  { username: 'felix',   email: 'felix@pask.dev',   bio: 'full stack. ship it.' },
];

// ---------- generate many extra users ----------
const EXTRA_COUNT = 40; // total will be 50

const BANNER_COLORS = [
  '#e8a245', '#4caf7d', '#6a9fc0', '#c95f5f',
  '#9b59b6', '#e67e22', '#1abc9c', '#e91e63',
  '#3498db', '#f39c12',
];

const STATUSES = ['online', 'online', 'online', 'idle', 'dnd', 'offline', 'online', 'idle', 'online', 'offline'];

const BIO_PREFIXES = [
  'enthusiast', 'hacker', 'dreamer', 'builder', 'creator',
  'explorer', 'thinker', 'tinkerer', 'writer', 'musician'
];

function getRandomItem(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function generateExtraUsers(count, startIndex) {
  const users = [];
  for (let i = 0; i < count; i++) {
    const num = startIndex + i;
    users.push({
      username: `user_${num}`,
      email: `user_${num}@pask.dev`,
      bio: `${getRandomItem(BIO_PREFIXES)} · passionate about tech.`,
    });
  }
  return users;
}

const allUsers = [...PREDEFINED_USERS, ...generateExtraUsers(EXTRA_COUNT, PREDEFINED_USERS.length)];

// ---------- seed ----------
async function seed() {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/pask123');
  console.log('✅ MongoDB connected\n');

  const created = [];

  // 1. Create all users
  for (let i = 0; i < allUsers.length; i++) {
    const { username, email, bio } = allUsers[i];
    await User.deleteOne({ $or: [{ username }, { email }] });

    const user = new User({
      username,
      email,
      password: 'password123',
      bio,
      status: STATUSES[i % STATUSES.length],
      bannerColor: BANNER_COLORS[i % BANNER_COLORS.length],
    });
    await user.save();
    created.push(user);
    console.log(`  👤  ${username}  <${email}>`);
  }

  // 2. Make first 4 users friends (optional)
  for (let i = 0; i < 4; i++) {
    for (let j = i + 1; j < 4; j++) {
      if (!created[i].friends.includes(created[j]._id)) {
        created[i].friends.push(created[j]._id);
        created[j].friends.push(created[i]._id);
      }
    }
  }
  await Promise.all(created.slice(0, 4).map(u => u.save()));

  // 3. Create ONLY ONE server: "pask support"
  const serverName = 'pask support';
  await Server.deleteOne({ name: serverName });

  const owner = created[0];
  const server = new Server({
    name: serverName,
    description: 'Support server for Pask – help, questions, and community.',
    owner: owner._id,
    members: created.map((u, i) => ({
      user: u._id,
      role: u._id.equals(owner._id) ? 'owner' : (i < 5 ? 'admin' : 'member'),
    })),
  });
  await server.save();

  // 4. Create channels
  await Channel.deleteMany({ server: server._id });
  await Channel.insertMany([
    { name: 'general',      type: 'text',  server: server._id, category: 'Text Channels',  position: 0 },
    { name: 'announcements',type: 'announcement', server: server._id, category: 'Text Channels', position: 1 },
    { name: 'off-topic',    type: 'text',  server: server._id, category: 'Text Channels',  position: 2 },
    { name: 'Support',      type: 'text',  server: server._id, category: 'Text Channels',  position: 3 },
    { name: 'Lounge',       type: 'voice', server: server._id, category: 'Voice Channels', position: 0 },
  ]);

  console.log(`\n  🖥  Server: "${server.name}" (code: ${server.inviteCode})`);
  console.log(`     Members: ${server.members.length}`);

  console.log('\n─────────────────────────────────');
  console.log('All accounts use password: password123');
  console.log('─────────────────────────────────\n');

  await mongoose.disconnect();
  console.log('✅ Done!');
}

seed().catch(err => { console.error(err); process.exit(1); });
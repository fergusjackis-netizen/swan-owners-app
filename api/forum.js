// Discourse forum integration for Smart Yacht.
//
// Lets the Claude agent search the Swan 48 owners' forum (swan48.discourse.group)
// and cite real owner discussions — same tool-use pattern as the wiring tools.
// All calls run server-side with a READ-ONLY API key so the key stays secret and
// there is no CORS / 403 problem from the browser.
//
// Required env (set in Vercel):
//   DISCOURSE_API_KEY       — a read-only API key (Admin -> API -> Keys)
//   DISCOURSE_API_USERNAME  — the username the key is tied to (e.g. your admin user or "system")
// Optional:
//   DISCOURSE_URL           — defaults to https://swan48.discourse.group

const BASE = (process.env.DISCOURSE_URL || 'https://swan48.discourse.group').replace(/\/$/, '');

export const forumEnabled = () => Boolean(process.env.DISCOURSE_API_KEY);

function headers() {
  return {
    'Api-Key': process.env.DISCOURSE_API_KEY || '',
    'Api-Username': process.env.DISCOURSE_API_USERNAME || 'system',
    'Accept': 'application/json',
    'User-Agent': 'SwanOwnersApp/1.0',
  };
}

async function getJSON(path) {
  const res = await fetch(`${BASE}${path}`, { headers: headers() });
  if (!res.ok) throw new Error(`Discourse ${res.status} on ${path}`);
  return res.json();
}

// Search the forum and return the most relevant topics with a link and snippet.
async function searchForum(query, limit = 5) {
  if (!forumEnabled()) return { error: 'Forum search is not configured (missing DISCOURSE_API_KEY).' };
  const q = String(query || '').trim();
  if (!q) return { error: 'Empty search query.' };
  try {
    const data = await getJSON(`/search.json?q=${encodeURIComponent(q)}`);
    const topics = data.topics || [];
    // Map a representative blurb to each topic from the returned posts.
    const blurbByTopic = {};
    for (const p of data.posts || []) {
      if (p.topic_id != null && !blurbByTopic[p.topic_id] && p.blurb) blurbByTopic[p.topic_id] = p.blurb;
    }
    const results = topics.slice(0, limit).map(t => ({
      title: t.title,
      url: `${BASE}/t/${t.slug}/${t.id}`,
      replies: typeof t.posts_count === 'number' ? Math.max(0, t.posts_count - 1) : undefined,
      blurb: blurbByTopic[t.id] || undefined,
    }));
    return { query: q, count: results.length, results };
  } catch (e) {
    return { error: e.message };
  }
}

// Latest forum topics — for a "Community" feed in the app.
async function latestTopics(limit = 10) {
  if (!forumEnabled()) return { error: 'Forum is not configured (missing DISCOURSE_API_KEY).' };
  try {
    const data = await getJSON('/latest.json');
    const topics = (data.topic_list && data.topic_list.topics) || [];
    return {
      results: topics.slice(0, limit).map(t => ({
        title: t.title,
        url: `${BASE}/t/${t.slug}/${t.id}`,
        replies: typeof t.posts_count === 'number' ? Math.max(0, t.posts_count - 1) : undefined,
        last_activity: t.last_posted_at || t.bumped_at,
      })),
    };
  } catch (e) {
    return { error: e.message };
  }
}

// Anthropic tool definition — only advertised when the key is configured.
export const FORUM_TOOLS = [
  {
    name: 'search_forum',
    description: "Search the Swan 48 owners' community forum for real discussions by other owners about a problem, fix, upgrade or part. Use ALONGSIDE the wiring tools when an owner asks about a fault, modification or 'has anyone else had this' — to surface and cite relevant threads.",
    input_schema: {
      type: 'object',
      properties: { query: { type: 'string', description: 'Search terms, e.g. "bow thruster overheating", "watermaker membrane", "B&G autopilot drift".' } },
      required: ['query'],
    },
  },
];

const HANDLERS = {
  search_forum: input => searchForum(input.query),
};

export async function runForumTool(name, input) {
  const handler = HANDLERS[name];
  if (!handler) return { error: `Unknown tool '${name}'` };
  try {
    return await handler(input || {});
  } catch (e) {
    return { error: e.message };
  }
}

export const isForumTool = name => Object.prototype.hasOwnProperty.call(HANDLERS, name);

export { searchForum, latestTopics };

export const FORUM_SYSTEM_HINT =
  "You can also search the Swan 48 owners' community forum via the search_forum tool. When an owner " +
  'asks about a problem, fix, upgrade, part or "has anyone else seen this", search the forum and, if there ' +
  'are relevant threads, summarise them and link the owner to the discussion (include the URL). The forum is ' +
  'the community knowledge base — prefer citing a real thread over guessing, and always point owners to it for ongoing discussion.';

import axios from "axios";
import safe from "../utils/safeReply.js";
import ChatThread from "../models/ChatThreadModel.js";
import ChatMessage from "../models/ChatMessageModel.js";
import { ENV } from "../config/env.js";

const fmt = (o, q) => {
    if (!o) return `OMDb error: empty`;
    if (o.Response === "False") {
        const e = o.Error || "Not found";
        return `OMDb: ${e} — "${q}"`;
    }
    const t = o.Title || q;
    const y = o.Year || "n/a";
    const ty = o.Type || "n/a";
    const r = o.imdbRating || "n/a";
    return `“${t}” — info:
Title: ${t}
Year: ${y}
Type: ${ty}
IMDB: ${r}`;
};

const parseQuery = (q) => {
    const m = q.match(/(.+)\s+(\d{4})$/);
    return { title: (m ? m[1] : q).trim(), year: m ? m[2] : undefined };
};

const omdbGet = async (params) => {
    const res = await axios.get("https://www.omdbapi.com/", {
        params: { apikey: ENV.omdbKey, r: "json", ...params },
        timeout: 8000,
        validateStatus: () => true,
    });
    return res.data;
};

const fetchByTitle = async (title, year) =>
    omdbGet({ t: title, plot: "short", ...(year ? { y: year } : {}) });

const searchAndPick = async (title, year) => {
    const d = await omdbGet({ s: title, ...(year ? { y: year } : {}) });
    if (d.Response === "False" || !d.Search?.length) return d;
    const low = title.toLowerCase();
    const best =
        d.Search.find((it) => (it?.Title || "").toLowerCase() === low) ||
        d.Search[0];
    return omdbGet({ i: best.imdbID, plot: "short" });
};

const fetchOmdb = async (q) => {
    const { title, year } = parseQuery(q);
    let d = await fetchByTitle(title, year);
    if (d.Response === "False" && /api key/i.test(d?.Error || "")) {
        throw new Error("OMDB_KEY_INVALID");
    }
    if (d.Response === "False") d = await searchAndPick(title, year);
    return d;
};

const nextChatTitle = async (uid) => {
    const rows = await ChatThread.find(
        { userId: uid, title: /^Chat\s+\d+$/i },
        { title: 1, _id: 0 }
    ).lean();

    const used = new Set(
        rows
            .map((r) => Number((r.title.match(/(\d+)$/) || [])[1]))
            .filter(Boolean)
    );
    let n = 1;
    while (used.has(n)) n++;
    return `Chat ${n}`;
};

export const sendMessage = async (req, res) => {
    try {
        const uid = req.user?.id;
        if (!uid) return safe.fail(res, "UNAUTHORIZED", "Not authorized", 401);

        const { text, threadId } = req.body || {};
        const q = (text || "").trim();
        if (!q) return safe.fail(res, "BAD_REQUEST", "Text required", 400);

        let th = null;

        if (threadId) {
            th = await ChatThread.findOne({ _id: threadId, userId: uid });
            if (!th)
                return safe.fail(res, "NOT_FOUND", "Thread not found", 404);
        } else {
            let title = (req.body?.title || "").trim();

            if (!title || (await ChatThread.exists({ userId: uid, title }))) {
                title = await nextChatTitle(uid);
            }

            th = await ChatThread.create({ title, userId: uid });
        }

        const um = await ChatMessage.create({
            threadId: th._id,
            role: "user",
            text: q,
        });

        let omdb = null;
        try {
            omdb = await fetchOmdb(q);
        } catch (e) {
            // eslint-disable-next-line no-console
            console.error("OMDb fetch error:", e?.message || e);
            omdb = { Response: "False", Error: e?.message || "Fetch failed" };
        }

        const reply = fmt(omdb, q);
        const bm = await ChatMessage.create({
            threadId: th._id,
            role: "bot",
            text: reply,
            omdb,
        });

        await ChatThread.updateOne(
            { _id: th._id },
            { $set: { updatedAt: new Date() } }
        );

        return safe.ok(
            res,
            {
                threadId: th._id,
                title: th.title,
                user: { id: um._id, text: um.text, ts: um.createdAt },
                bot: { id: bm._id, text: bm.text, ts: bm.createdAt },
            },
            threadId ? 200 : 201
        );
    } catch {
        return safe.fail(res, "INTERNAL", "Internal error", 500);
    }
};

export const listThreads = async (req, res) => {
    try {
        const uid = req.user?.id;
        if (!uid) return safe.fail(res, "UNAUTHORIZED", "Not authorized", 401);

        const items = await ChatThread.find({ userId: uid })
            .select({ _id: 1, title: 1, updatedAt: 1 })
            .sort({ updatedAt: -1 })
            .lean();

        return safe.ok(res, { items });
    } catch {
        return safe.fail(res, "INTERNAL", "Internal error", 500);
    }
};

export const history = async (req, res) => {
    try {
        const uid = req.user?.id;
        if (!uid) return safe.fail(res, "UNAUTHORIZED", "Not authorized", 401);

        const id = req.query.threadId || "";
        const lim = Math.min(
            200,
            Math.max(1, parseInt(req.query.limit || "100", 10))
        );

        const th = await ChatThread.findOne({ _id: id, userId: uid });
        if (!th) return safe.fail(res, "NOT_FOUND", "Thread not found", 404);

        const msgs = await ChatMessage.find({ threadId: th._id })
            .sort({ createdAt: 1 })
            .limit(lim)
            .lean();

        return safe.ok(res, {
            threadId: th._id,
            title: th.title,
            msgs: msgs.map((m) => ({
                id: m._id,
                role: m.role,
                text: m.text,
                ts: m.createdAt,
            })),
        });
    } catch {
        return safe.fail(res, "INTERNAL", "Internal error", 500);
    }
};

export const wipeMine = async (req, res) => {
    try {
        const uid = req.user?.id;
        if (!uid) return safe.fail(res, "UNAUTHORIZED", "Not authorized", 401);

        const ids = await ChatThread.find({ userId: uid }).distinct("_id");
        if (ids.length) {
            await ChatMessage.deleteMany({ threadId: { $in: ids } });
            await ChatThread.deleteMany({ _id: { $in: ids } });
        }
        return safe.ok(res, { message: "Wiped" });
    } catch {
        return safe.fail(res, "INTERNAL", "Internal error", 500);
    }
};

export const deleteThread = async (req, res) => {
    try {
        const uid = req.user?.id;
        if (!uid) return safe.fail(res, "UNAUTHORIZED", "Not authorized", 401);

        const id = req.params.id;
        const th = await ChatThread.findOne({ _id: id, userId: uid });
        if (!th) return safe.fail(res, "NOT_FOUND", "Thread not found", 404);

        await ChatMessage.deleteMany({ threadId: th._id });
        await ChatThread.deleteOne({ _id: th._id });

        return safe.ok(res, { threadId: String(th._id) });
    } catch {
        return safe.fail(res, "INTERNAL", "Internal error", 500);
    }
};

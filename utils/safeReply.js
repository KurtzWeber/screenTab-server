const ok = (res, data, status = 200) => {
    return res.status(status).json({ ok: true, data });
};

const fail = (
    res,
    code = "INTERNAL",
    message = "Internal error",
    status = 500
) => {
    return res.status(status).json({
        ok: false,
        code,
        message,
    });
};

export default { ok, fail };

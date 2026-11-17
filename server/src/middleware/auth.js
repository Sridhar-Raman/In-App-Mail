import jwt from 'jsonwebtoken';

export const COOKIE_NAME = 'sricr_token';
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

export const signToken = (userId) => jwt.sign({ sub: userId }, process.env.JWT_SECRET, { expiresIn: '7d' });

/** httpOnly cookie so scripts can't read the token. `remember` = 7 days, otherwise a session cookie. */
export const setAuthCookie = (res, token, remember) => res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    ...(remember ? { maxAge: WEEK_MS } : {}),
});

export const clearAuthCookie = (res) => res.clearCookie(COOKIE_NAME, {
    httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production',
});

/** Sets req.userId from the cookie, or answers 401. */
export const requireAuth = (req, res, next) => {
    try {
        req.userId = jwt.verify(req.cookies?.[COOKIE_NAME], process.env.JWT_SECRET).sub;
        next();
    } catch {
        res.status(401).json({ message: 'Not signed in' });
    }
};

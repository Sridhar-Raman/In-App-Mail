import jwt from 'jsonwebtoken';

/** Signed login token. "Keep me signed in" = 7 days, otherwise 1 day. */
export const signToken = (userId, remember = true) => jwt.sign({ sub: userId }, process.env.JWT_SECRET, { expiresIn: remember ? '7d' : '1d' });

/** Requires `Authorization: Bearer <token>`; sets req.userId, or answers 401. */
export const requireAuth = (req, res, next) => {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;
    try {
        req.userId = jwt.verify(token, process.env.JWT_SECRET).sub;
        next();
    } catch {
        res.status(401).json({ message: 'Not signed in' });
    }
};

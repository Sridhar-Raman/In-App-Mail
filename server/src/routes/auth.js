import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import User from '../models/User.js';
import { clearAuthCookie, requireAuth, setAuthCookie, signToken } from '../middleware/auth.js';

const router = Router();

const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 50,
    standardHeaders: true,
    legacyHeaders: false,
    message: { message: 'Too many attempts, please try again later.' },
});

const email = z.string().trim().toLowerCase().email('Enter a valid email');

const signupSchema = z.object({
    fullName: z.string().trim().min(2, 'Enter your full name').max(100),
    email,
    password: z.string().min(8, 'At least 8 characters').regex(/[A-Za-z]/, 'Include a letter').regex(/\d/, 'Include a number').max(128),
});

const loginSchema = z.object({
    email,
    password: z.string().min(1).max(128),
    remember: z.boolean().optional(),
});

const parse = (schema, body, res) => {
    const result = schema.safeParse(body);
    if (result.success)
        return result.data;
    res.status(400).json({ message: result.error.issues[0].message });
    return null;
};

router.post('/signup', limiter, async (req, res, next) => {
    try {
        const data = parse(signupSchema, req.body, res);
        if (!data) return;
        if (await User.exists({ email: data.email }))
            return res.status(409).json({ message: 'An account with this email already exists.' });
        const user = await User.create({
            fullName: data.fullName,
            email: data.email,
            passwordHash: await User.hashPassword(data.password),
        });
        res.status(201).json({ user: user.toPublic() });
    } catch (err) {
        if (err.code === 11000)
            return res.status(409).json({ message: 'An account with this email already exists.' });
        next(err);
    }
});

router.post('/login', limiter, async (req, res, next) => {
    try {
        const data = parse(loginSchema, req.body, res);
        if (!data) return;
        const user = await User.findOne({ email: data.email }).select('+passwordHash');
        if (!user || !(await user.verifyPassword(data.password)))
            return res.status(401).json({ message: 'Invalid email or password.' });
        setAuthCookie(res, signToken(user.id), !!data.remember);
        res.json({ user: user.toPublic() });
    } catch (err) {
        next(err);
    }
});

router.post('/logout', (_req, res) => {
    clearAuthCookie(res);
    res.json({ ok: true });
});

router.get('/me', requireAuth, async (req, res, next) => {
    try {
        const user = await User.findById(req.userId);
        if (!user) {
            clearAuthCookie(res);
            return res.status(401).json({ message: 'Not signed in' });
        }
        res.json({ user: user.toPublic() });
    } catch (err) {
        next(err);
    }
});

export default router;

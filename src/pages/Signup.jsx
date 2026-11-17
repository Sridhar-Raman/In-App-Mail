import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import AuthLayout from '../components/AuthLayout';
import Field from '../components/Field';
import { useAuth } from '../context/AuthContext';

const schema = z.object({
    fullName: z.string().trim().min(2, 'Enter your full name'),
    email: z.string().min(1, 'Email is required').email('Enter a valid email'),
    password: z.string()
        .min(8, 'At least 8 characters')
        .regex(/[A-Za-z]/, 'Include a letter')
        .regex(/\d/, 'Include a number'),
    confirmPassword: z.string().min(1, 'Confirm your password'),
    terms: z.literal(true, { error: 'You must accept the terms' }),
}).refine((v) => v.password === v.confirmPassword, {
    path: ['confirmPassword'],
    message: 'Passwords do not match',
});

const Signup = () => {
    const { signup } = useAuth();
    const navigate = useNavigate();
    const [serverError, setServerError] = useState('');
    const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({
        resolver: zodResolver(schema),
        defaultValues: { fullName: '', email: '', password: '', confirmPassword: '', terms: false },
    });

    const onSubmit = async (values) => {
        setServerError('');
        try {
            await signup(values);
            navigate('/login', { replace: true });
        } catch (e) {
            setServerError(e.message);
        }
    };

    return (
        <AuthLayout title="Create your account" subtitle="Start sending secure mail in minutes"
            footer={<>Already registered? <Link to="/login">Sign in</Link></>}>
            <form onSubmit={handleSubmit(onSubmit)} noValidate>
                {serverError && <div className="alert" role="alert">{serverError}</div>}
                <Field id="fullName" label="Full name" autoComplete="name" error={errors.fullName?.message} {...register('fullName')} />
                <Field id="email" label="Email" type="email" autoComplete="email" error={errors.email?.message} {...register('email')} />
                <Field id="password" label="Password" type="password" autoComplete="new-password" error={errors.password?.message} {...register('password')} />
                <Field id="confirmPassword" label="Confirm password" type="password" autoComplete="new-password" error={errors.confirmPassword?.message} {...register('confirmPassword')} />
                <label className="check"><input type="checkbox" {...register('terms')} /> I agree to the Terms and Privacy Policy</label>
                {errors.terms && <span className="field-error" role="alert">{errors.terms.message}</span>}
                <button className="btn btn-primary btn-block" disabled={isSubmitting}>
                    {isSubmitting ? 'Creating…' : 'Create account'}
                </button>
            </form>
        </AuthLayout>
    );
};
export default Signup;

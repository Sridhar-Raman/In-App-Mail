import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import AuthLayout from '../components/AuthLayout';
import Field from '../components/Field';
import { useAuth } from '../context/AuthContext';

const schema = z.object({
    email: z.string().min(1, 'Email is required').email('Enter a valid email'),
    password: z.string().min(1, 'Password is required'),
    remember: z.boolean().optional(),
});

const Login = () => {
    const { login } = useAuth();
    const navigate = useNavigate();
    const [serverError, setServerError] = useState('');
    const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({
        resolver: zodResolver(schema),
        defaultValues: { email: '', password: '', remember: true },
    });

    const onSubmit = async (values) => {
        setServerError('');
        try {
            await login(values);
            navigate('/home', { replace: true });
        } catch (e) {
            setServerError(e.message);
        }
    };

    return (
        <AuthLayout title="Welcome back" subtitle="Sign in to your mailbox"
            footer={<>New here? <Link to="/signup">Create an account</Link></>}>
            <form onSubmit={handleSubmit(onSubmit)} noValidate>
                {serverError && <div className="alert" role="alert">{serverError}</div>}
                <Field id="email" label="Email" type="email" autoComplete="email" error={errors.email?.message} {...register('email')} />
                <Field id="password" label="Password" type="password" autoComplete="current-password" error={errors.password?.message} {...register('password')} />
                <label className="check"><input type="checkbox" {...register('remember')} /> Keep me signed in</label>
                <button className="btn btn-primary btn-block" disabled={isSubmitting}>
                    {isSubmitting ? 'Signing in…' : 'Sign in'}
                </button>
            </form>
        </AuthLayout>
    );
};
export default Login;

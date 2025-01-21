'use client';

import { signIn, useSession } from 'next-auth/react';
import Image from 'next/image';
import styles from './login.module.css';

export default function LoginPage() {
    const { data: session, status } = useSession();
    
    const handleLogin = () => {
        signIn('casdoor', { callbackUrl: '/' });
    };

    return (
        <div className={styles.container}>
            <div className={styles.loginCard}>
                <h1 className={styles.title}>需要登录</h1>
                
                {status === 'authenticated' && session.user && (
                    <div className={styles.userInfo}>
                        {session.user.image && (
                            <Image
                                src={session.user.image}
                                alt="User Avatar"
                                width={48}
                                height={48}
                                className={styles.avatar}
                            />
                        )}
                        <div className={styles.userDetails}>
                            <p className={styles.userName}>{session.user.name || '用户'}</p>
                            <p className={styles.userEmail}>{session.user.email}</p>
                        </div>
                    </div>
                )}
                
                <button 
                    onClick={handleLogin}
                    className={styles.loginButton}
                >
                   Galentwww 统一认证平台
                </button>
            </div>
        </div>
    );
} 
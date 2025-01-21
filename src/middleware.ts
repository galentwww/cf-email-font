import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";
import type { NextRequestWithAuth } from "next-auth/middleware";

export default withAuth(
    function middleware(request: NextRequestWithAuth) {
        return NextResponse.next();
    },
    {
        callbacks: {
            authorized: ({ token }) => !!token
        },
        pages: {
            signIn: '/login'
        }
    }
);

// 配置需要保护的路由
export const config = {
    matcher: [
        // 保护根路径
        '/',
        // 排除不需要保护的路由
        '/((?!api|_next/static|_next/image|favicon.ico|login).*)',
    ]
}; 
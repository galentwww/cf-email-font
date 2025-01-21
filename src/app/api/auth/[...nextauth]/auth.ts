// app/api/auth/[...nextauth]/auth.ts
import { AuthOptions } from "next-auth";

export const authOptions: AuthOptions = {
    providers: [
        {
            id: "casdoor",
            name: "Casdoor",
            type: "oauth",
            wellKnown: `${process.env.CASDOOR_URL}/.well-known/openid-configuration`,
            authorization: {
                params: {
                    scope: "openid email profile",
                    response_type: "code"
                }
            },
            clientId: process.env.CASDOOR_ID,
            clientSecret: process.env.CASDOOR_SECRET,
            idToken: true,
            checks: ["pkce", "state"],
            profile(profile) {
                //console.log("Profile received:", profile);  // 添加日志
                return {
                    id: profile.sub,
                    name: profile.name ?? profile.preferred_username ?? profile.sub,
                    email: profile.email,
                    image: profile.avatar || profile.picture,
                }
            },
        },
    ],
    callbacks: {
        async jwt({ token, user, account }) {
            //console.log("JWT callback:", { token, user, account });  // 添加日志
            if (account && user) {
                return {
                    ...token,
                    accessToken: account.access_token,
                };
            }
            return token;
        },
        async session({ session, token }) {
            //console.log("Session callback:", { session, token });  // 添加日志
            if (session) {
                session.accessToken = token.accessToken as string;
            }
            return session;
        },
    },
    debug: false,
    pages: {
        signIn: '/login',
    },
};
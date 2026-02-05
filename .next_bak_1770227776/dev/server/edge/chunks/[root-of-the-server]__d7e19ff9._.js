(globalThis.TURBOPACK || (globalThis.TURBOPACK = [])).push(["chunks/[root-of-the-server]__d7e19ff9._.js",
"[externals]/node:buffer [external] (node:buffer, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("node:buffer", () => require("node:buffer"));

module.exports = mod;
}),
"[externals]/node:async_hooks [external] (node:async_hooks, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("node:async_hooks", () => require("node:async_hooks"));

module.exports = mod;
}),
"[project]/beprofesional/middleware.ts [middleware-edge] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "config",
    ()=>config,
    "middleware",
    ()=>middleware
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$beprofesional$2f$node_modules$2f2e$pnpm$2f40$supabase$2b$ssr$40$0$2e$6$2e$1_$40$supabase$2b$supabase$2d$js$40$2$2e$94$2e$1$2f$node_modules$2f40$supabase$2f$ssr$2f$dist$2f$module$2f$index$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/beprofesional/node_modules/.pnpm/@supabase+ssr@0.6.1_@supabase+supabase-js@2.94.1/node_modules/@supabase/ssr/dist/module/index.js [middleware-edge] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$beprofesional$2f$node_modules$2f2e$pnpm$2f40$supabase$2b$ssr$40$0$2e$6$2e$1_$40$supabase$2b$supabase$2d$js$40$2$2e$94$2e$1$2f$node_modules$2f40$supabase$2f$ssr$2f$dist$2f$module$2f$createServerClient$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/beprofesional/node_modules/.pnpm/@supabase+ssr@0.6.1_@supabase+supabase-js@2.94.1/node_modules/@supabase/ssr/dist/module/createServerClient.js [middleware-edge] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$beprofesional$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$2_9d8d1bf7a8807769963b5151bd760c41$2f$node_modules$2f$next$2f$dist$2f$esm$2f$api$2f$server$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/beprofesional/node_modules/.pnpm/next@16.1.6_@babel+core@7.2_9d8d1bf7a8807769963b5151bd760c41/node_modules/next/dist/esm/api/server.js [middleware-edge] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$beprofesional$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$2_9d8d1bf7a8807769963b5151bd760c41$2f$node_modules$2f$next$2f$dist$2f$esm$2f$server$2f$web$2f$exports$2f$index$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/beprofesional/node_modules/.pnpm/next@16.1.6_@babel+core@7.2_9d8d1bf7a8807769963b5151bd760c41/node_modules/next/dist/esm/server/web/exports/index.js [middleware-edge] (ecmascript)");
;
;
async function middleware(request) {
    let response = __TURBOPACK__imported__module__$5b$project$5d2f$beprofesional$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$2_9d8d1bf7a8807769963b5151bd760c41$2f$node_modules$2f$next$2f$dist$2f$esm$2f$server$2f$web$2f$exports$2f$index$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["NextResponse"].next({
        request: {
            headers: request.headers
        }
    });
    const supabaseUrl = ("TURBOPACK compile-time value", "https://mgspkubcuscsmgisezec.supabase.co");
    const supabaseAnonKey = ("TURBOPACK compile-time value", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1nc3BrdWJjdXNjc21naXNlemVjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAyMDMxMzYsImV4cCI6MjA4NTc3OTEzNn0.zIfm671ZWWLRv0NyF28RDNRA5e8Ftsd9aPuL5Vp1uZc");
    // Si no hay configuracion de Supabase, dejar pasar
    if ("TURBOPACK compile-time falsy", 0) //TURBOPACK unreachable
    ;
    const supabase = (0, __TURBOPACK__imported__module__$5b$project$5d2f$beprofesional$2f$node_modules$2f2e$pnpm$2f40$supabase$2b$ssr$40$0$2e$6$2e$1_$40$supabase$2b$supabase$2d$js$40$2$2e$94$2e$1$2f$node_modules$2f40$supabase$2f$ssr$2f$dist$2f$module$2f$createServerClient$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["createServerClient"])(supabaseUrl, supabaseAnonKey, {
        cookies: {
            get (name) {
                return request.cookies.get(name)?.value;
            },
            set (name, value, options) {
                request.cookies.set({
                    name,
                    value,
                    ...options
                });
                response = __TURBOPACK__imported__module__$5b$project$5d2f$beprofesional$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$2_9d8d1bf7a8807769963b5151bd760c41$2f$node_modules$2f$next$2f$dist$2f$esm$2f$server$2f$web$2f$exports$2f$index$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["NextResponse"].next({
                    request: {
                        headers: request.headers
                    }
                });
                response.cookies.set({
                    name,
                    value,
                    ...options
                });
            },
            remove (name, options) {
                request.cookies.set({
                    name,
                    value: '',
                    ...options
                });
                response = __TURBOPACK__imported__module__$5b$project$5d2f$beprofesional$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$2_9d8d1bf7a8807769963b5151bd760c41$2f$node_modules$2f$next$2f$dist$2f$esm$2f$server$2f$web$2f$exports$2f$index$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["NextResponse"].next({
                    request: {
                        headers: request.headers
                    }
                });
                response.cookies.set({
                    name,
                    value: '',
                    ...options
                });
            }
        }
    });
    const { data: { session } } = await supabase.auth.getSession();
    const pathname = request.nextUrl.pathname;
    // Rutas de autenticacion (login, registro)
    const authRoutes = [
        '/login',
        '/registro'
    ];
    const isAuthRoute = authRoutes.some((route)=>pathname === route);
    // Rutas de onboarding
    const isOnboardingRoute = pathname.startsWith('/onboarding');
    // Rutas protegidas que requieren perfil completo
    const protectedRoutes = [
        '/unirse',
        '/equipos',
        '/equipo'
    ];
    const isProtectedRoute = protectedRoutes.some((route)=>pathname.startsWith(route));
    // Si no hay sesion
    if (!session) {
        // Permitir rutas de auth
        if (isAuthRoute) {
            return response;
        }
        // Redirigir a login si intenta acceder a ruta protegida u onboarding
        if (isProtectedRoute || isOnboardingRoute) {
            return __TURBOPACK__imported__module__$5b$project$5d2f$beprofesional$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$2_9d8d1bf7a8807769963b5151bd760c41$2f$node_modules$2f$next$2f$dist$2f$esm$2f$server$2f$web$2f$exports$2f$index$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["NextResponse"].redirect(new URL('/login', request.url));
        }
        return response;
    }
    // Si hay sesion, verificar estado del perfil
    const { data: perfil } = await supabase.from('perfiles').select('nombre, genero, edad, peso_kg, altura_cm, perfil_completo').eq('id', session.user.id).single();
    // Determinar si el perfil esta completo
    const perfilCompleto = perfil && (perfil.perfil_completo === true || perfil.nombre && perfil.genero && perfil.edad && perfil.peso_kg && perfil.altura_cm);
    // Si hay sesion y esta en ruta de auth -> redirigir segun perfil
    if (isAuthRoute) {
        if (perfilCompleto) {
            return __TURBOPACK__imported__module__$5b$project$5d2f$beprofesional$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$2_9d8d1bf7a8807769963b5151bd760c41$2f$node_modules$2f$next$2f$dist$2f$esm$2f$server$2f$web$2f$exports$2f$index$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["NextResponse"].redirect(new URL('/equipos', request.url));
        } else {
            return __TURBOPACK__imported__module__$5b$project$5d2f$beprofesional$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$2_9d8d1bf7a8807769963b5151bd760c41$2f$node_modules$2f$next$2f$dist$2f$esm$2f$server$2f$web$2f$exports$2f$index$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["NextResponse"].redirect(new URL('/onboarding/nombre', request.url));
        }
    }
    // Si el perfil NO esta completo
    if (!perfilCompleto) {
        // Permitir onboarding
        if (isOnboardingRoute) {
            return response;
        }
        // Bloquear rutas protegidas -> redirigir a onboarding
        if (isProtectedRoute) {
            return __TURBOPACK__imported__module__$5b$project$5d2f$beprofesional$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$2_9d8d1bf7a8807769963b5151bd760c41$2f$node_modules$2f$next$2f$dist$2f$esm$2f$server$2f$web$2f$exports$2f$index$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["NextResponse"].redirect(new URL('/onboarding/nombre', request.url));
        }
    }
    // Si el perfil esta completo y esta en onboarding -> redirigir a equipos
    if (perfilCompleto && isOnboardingRoute) {
        return __TURBOPACK__imported__module__$5b$project$5d2f$beprofesional$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$2_9d8d1bf7a8807769963b5151bd760c41$2f$node_modules$2f$next$2f$dist$2f$esm$2f$server$2f$web$2f$exports$2f$index$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["NextResponse"].redirect(new URL('/equipos', request.url));
    }
    return response;
}
const config = {
    matcher: [
        '/login',
        '/registro',
        '/unirse',
        '/equipos',
        '/equipos/:path*',
        '/equipo/:path*',
        '/onboarding/:path*'
    ]
};
}),
]);

//# sourceMappingURL=%5Broot-of-the-server%5D__d7e19ff9._.js.map
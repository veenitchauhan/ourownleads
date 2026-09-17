<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureSuperadmin
{
    /**
     * Handle an incoming request.
     */
    public function handle(Request $request, Closure $next): Response
    {
        if ($request->session()->get('is_superadmin') !== true) {
            if ($request->expectsJson()) {
                return response()->json(['error' => 'Unauthorized superadmin access.'], 403);
            }

            return redirect()->route('superadmin.login');
        }

        return $next($request);
    }
}

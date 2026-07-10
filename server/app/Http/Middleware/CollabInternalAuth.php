<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class CollabInternalAuth
{
    public function handle(Request $request, Closure $next): Response
    {
        $expected = config('collab.internal_secret');

        if (!$expected || $request->header('X-Collab-Secret') !== $expected) {
            return response()->json([
                'error' => [
                    'code'    => 'unauthorized',
                    'message' => 'Invalid or missing collab internal secret.',
                    'details' => null,
                ],
            ], 401);
        }

        return $next($request);
    }
}

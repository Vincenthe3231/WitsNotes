<?php

namespace App\Support;

use Illuminate\Http\JsonResponse;

class ApiError
{
    public static function render(string $code, string $message, int $status, ?array $details = null): JsonResponse
    {
        return response()->json(
            [
                'error' => [
                    'code' => $code,
                    'message' => $message,
                    'details' => $details,
                ],
            ],
            $status
        );
    }
}

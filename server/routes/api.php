<?php

use App\Http\Controllers\AuthController;
use App\Http\Controllers\BoardController;
use App\Http\Controllers\CardController;
use App\Http\Controllers\AttachmentController;
use App\Http\Controllers\UnfurlController;
use Illuminate\Support\Facades\Route;

// Public auth
Route::post('/register', [AuthController::class, 'register']);
Route::post('/login',    [AuthController::class, 'login']);

// Authenticated
Route::middleware('auth:sanctum')->group(function () {
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/me',      [AuthController::class, 'me']);

    // Must precede the shallow cards resource so /cards/search isn't bound as /cards/{card}
    Route::get('/cards/search', [CardController::class, 'search']);

    Route::apiResource('boards', BoardController::class);
    Route::apiResource('boards.cards', CardController::class)->shallow();

    Route::get('/unfurl',       UnfurlController::class);
    Route::post('/attachments',             [AttachmentController::class, 'store']);
    Route::delete('/attachments/{attachment}', [AttachmentController::class, 'destroy']);
});

<?php

use App\Http\Controllers\AuthController;
use App\Http\Controllers\BoardController;
use App\Http\Controllers\CardController;
use App\Http\Controllers\AttachmentController;
use App\Http\Controllers\CollabController;
use App\Http\Controllers\CollabInternalController;
use App\Http\Controllers\BoardMemberController;
use App\Http\Controllers\ConnectionController;
use App\Http\Controllers\TemplateController;
use App\Http\Controllers\UnfurlController;
use App\Http\Middleware\CollabInternalAuth;
use Illuminate\Support\Facades\Route;

// Internal sidecar endpoints — shared-secret auth, not session
Route::middleware(CollabInternalAuth::class)->prefix('internal')->group(function () {
    Route::get('/boards/{board}/ydoc',  [CollabInternalController::class, 'show']);
    Route::put('/boards/{board}/ydoc',  [CollabInternalController::class, 'store']);
});

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
    Route::apiResource('boards.connections', ConnectionController::class)
        ->shallow()->only(['index', 'store', 'destroy']);

    Route::post('/boards/{board}/vault',            [BoardController::class, 'setVault']);
    Route::get('/boards/{board}/collab-ticket',     [CollabController::class, 'ticket']);
    Route::get('/boards/{board}/members',           [BoardMemberController::class, 'index']);
    Route::post('/boards/{board}/members',          [BoardMemberController::class, 'store']);
    Route::patch('/boards/{board}/members/{member}',[BoardMemberController::class, 'update']);
    Route::delete('/boards/{board}/members/{member}',[BoardMemberController::class, 'destroy']);

    Route::get('/templates',                [TemplateController::class, 'index']);
    Route::post('/templates/{template}/use', [TemplateController::class, 'use']);

    Route::get('/unfurl',       UnfurlController::class);
    Route::post('/attachments',             [AttachmentController::class, 'store']);
    Route::delete('/attachments/{attachment}', [AttachmentController::class, 'destroy']);
});

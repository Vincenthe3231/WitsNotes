<?php

namespace App\Http\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class AttachmentController extends Controller
{
    public function store(Request $request): JsonResponse
    {
        $request->validate(['file' => 'required|file|max:51200']);

        $path = $request->file('file')->store('attachments', 'public');

        return response()->json(['url' => Storage::disk('public')->url($path)]);
    }
}

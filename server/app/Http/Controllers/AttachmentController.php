<?php

namespace App\Http\Controllers;

use App\Models\Attachment;
use App\Models\Card;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class AttachmentController extends Controller
{
    private function bucketKeyFor(string $mime): string
    {
        if (str_starts_with($mime, 'image/')) {
            return 'image';
        }
        if (str_starts_with($mime, 'audio/')) {
            return 'audio';
        }
        return 'file';
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'file'    => 'required|file|max:51200',
            'card_id' => 'required|uuid|exists:cards,id',
        ]);

        $card = Card::findOrFail($data['card_id']);
        $this->authorize('update', $card->board);

        $file      = $request->file('file');
        $bucketKey = $this->bucketKeyFor($file->getMimeType());
        $disk      = config("attachments.disks.$bucketKey");
        $folder    = config("attachments.folders.$bucketKey") ?: 'attachments';

        $name    = (string) Str::uuid() . '.' . $file->getClientOriginalExtension();
        $path    = "$folder/$name";
        $options = [
            'CacheControl' => 'public, max-age=31536000, immutable',
            'ContentType'  => $file->getMimeType(),
        ];

        if ($bucketKey === 'file') {
            $options['ContentDisposition'] = 'attachment; filename="' . addslashes($file->getClientOriginalName()) . '"';
        }

        Storage::disk($disk)->putFileAs($folder, $file, $name, $options);

        $attachment = Attachment::create([
            'card_id'       => $card->id,
            'disk'          => $disk,
            'path'          => $path,
            'mime'          => $file->getMimeType(),
            'size'          => $file->getSize(),
            'original_name' => $file->getClientOriginalName(),
        ]);

        return response()->json([
            'id'            => $attachment->id,
            'url'           => Storage::disk($disk)->url($path),
            'mime'          => $attachment->mime,
            'size'          => $attachment->size,
            'original_name' => $attachment->original_name,
        ], 201);
    }

    public function destroy(Attachment $attachment): JsonResponse
    {
        $this->authorize('update', $attachment->card->board);
        $attachment->delete();
        return response()->json(null, 204);
    }
}

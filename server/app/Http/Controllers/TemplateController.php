<?php

namespace App\Http\Controllers;

use App\Models\Template;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class TemplateController extends Controller
{
    public function index(): JsonResponse
    {
        return response()->json(Template::orderBy('category')->orderBy('name')->get());
    }

    /**
     * Clones a template's blueprint into a brand-new board owned by the
     * requesting user: one board (from doc.board) plus its cards (from
     * doc.cards), preserving each card's relative x/y/w/h/z/rotation.
     */
    public function use(Request $request, Template $template): JsonResponse
    {
        $data = $request->validate([
            'title' => ['sometimes', 'string', 'max:255'],
        ]);

        $doc = $template->doc;
        $boardBlueprint = $doc['board'] ?? [];
        $cardBlueprints = $doc['cards'] ?? [];

        $board = $request->user()->boards()->create([
            'title'       => $data['title'] ?? $template->name,
            'description' => $boardBlueprint['description'] ?? null,
            'style'       => $boardBlueprint['style'] ?? null,
        ]);

        foreach ($cardBlueprints as $cardBlueprint) {
            $board->cards()->create([
                'created_by'   => $request->user()->id,
                'type'         => $cardBlueprint['type'],
                'title'        => $cardBlueprint['title'] ?? null,
                'x'            => $cardBlueprint['x'] ?? 0,
                'y'            => $cardBlueprint['y'] ?? 0,
                'w'            => $cardBlueprint['w'] ?? 320,
                'h'            => $cardBlueprint['h'] ?? 200,
                'z'            => $cardBlueprint['z'] ?? 10,
                'rotation'     => $cardBlueprint['rotation'] ?? 0,
                'style'        => $cardBlueprint['style'] ?? null,
                'content'      => $cardBlueprint['content'] ?? null,
                'content_text' => $cardBlueprint['content_text'] ?? null,
            ]);
        }

        // fresh() ensures column defaults (e.g. is_vault) applied by Postgres
        // are reflected — the client's BoardSchema requires is_vault present.
        return response()->json($board->fresh()->load('cards'), 201);
    }
}

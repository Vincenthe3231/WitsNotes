<?php

namespace App\Http\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;

class UnfurlController extends Controller
{
    public function __invoke(Request $request): JsonResponse
    {
        $request->validate(['url' => ['required', 'url', 'max:2048']]);
        $url = $request->input('url');

        if (!str_starts_with($url, 'http://') && !str_starts_with($url, 'https://')) {
            return response()->json(['error' => 'Only http/https URLs allowed'], 422);
        }

        try {
            $response = Http::timeout(5)
                ->withHeaders(['User-Agent' => 'WitsNote-Unfurl/1.0'])
                ->get($url);

            if (!$response->successful()) {
                return response()->json([]);
            }

            $html = $response->body();
            $result = [];

            // og:title or <title>
            if (preg_match('/<meta[^>]+property=["\']og:title["\'][^>]+content=["\'](.*?)["\'][^>]*>/i', $html, $m)
             || preg_match('/<meta[^>]+content=["\'](.*?)["\'][^>]+property=["\']og:title["\'][^>]*>/i', $html, $m)) {
                $result['title'] = html_entity_decode($m[1], ENT_QUOTES | ENT_HTML5, 'UTF-8');
            } elseif (preg_match('/<title[^>]*>(.*?)<\/title>/is', $html, $m)) {
                $result['title'] = html_entity_decode(trim($m[1]), ENT_QUOTES | ENT_HTML5, 'UTF-8');
            }

            // og:description
            if (preg_match('/<meta[^>]+property=["\']og:description["\'][^>]+content=["\'](.*?)["\'][^>]*>/i', $html, $m)
             || preg_match('/<meta[^>]+content=["\'](.*?)["\'][^>]+property=["\']og:description["\'][^>]*>/i', $html, $m)) {
                $result['description'] = html_entity_decode($m[1], ENT_QUOTES | ENT_HTML5, 'UTF-8');
            }

            // og:image
            if (preg_match('/<meta[^>]+property=["\']og:image["\'][^>]+content=["\'](.*?)["\'][^>]*>/i', $html, $m)
             || preg_match('/<meta[^>]+content=["\'](.*?)["\'][^>]+property=["\']og:image["\'][^>]*>/i', $html, $m)) {
                $result['image'] = $m[1];
            }

            // og:site_name
            if (preg_match('/<meta[^>]+property=["\']og:site_name["\'][^>]+content=["\'](.*?)["\'][^>]*>/i', $html, $m)
             || preg_match('/<meta[^>]+content=["\'](.*?)["\'][^>]+property=["\']og:site_name["\'][^>]*>/i', $html, $m)) {
                $result['site_name'] = $m[1];
            }

            return response()->json($result);
        } catch (\Throwable) {
            return response()->json([]);
        }
    }
}
